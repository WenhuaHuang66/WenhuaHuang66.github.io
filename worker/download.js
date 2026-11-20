// Compound Structure Search App — Paid Download Worker
// 双模式：
//   1. Webhook 接收（POST /webhook）：Waffo 付款成功后调用 → RSA 签名验证 → 存 KV
//   2. 下载验证（GET /download?email=xxx&order=xxx）：thanks 页调用 → 查 KV → 预签名 URL → 302

const DOWNLOAD_URL_TTL_SECONDS = 3600; // 预签名 URL 有效期 1 小时

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Signature",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === "/checkout" && request.method === "GET") {
        return await handleCheckout(url, env, corsHeaders);
      }
      if (path === "/webhook" && request.method === "POST") {
        return await handleWebhook(request, env, corsHeaders);
      }
      if (path === "/download" && request.method === "GET") {
        return await handleDownload(url, env, corsHeaders);
      }
      if (path === "/api/order-lookup" && request.method === "GET") {
        return await handleOrderLookup(url, env, corsHeaders);
      }
      if (path === "/" && request.method === "GET") {
        return new Response(JSON.stringify({ ok: true, service: "compound-search-download", endpoints: ["/checkout", "/webhook", "/download", "/api/order-lookup", "/robots.txt"] }), { headers: corsHeaders });
      }
      if (path === "/robots.txt" && request.method === "GET") {
        return new Response(ROBOTS_TXT, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      }
      if (path === "/baidu_verify_codeva-5klZIDbrm9.html" && request.method === "GET") {
        return new Response("b41da193b0afcf776284fb9ebc9a24be", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      }
      return jsonError("Not found", 404, corsHeaders);
    } catch (err) {
      console.error("Worker error:", err);
      return jsonError("Internal server error: " + err.message, 500, corsHeaders);
    }
  },
};

// ---- Checkout Session 创建（动态，永远不会过期）----

async function handleCheckout(url, env, corsHeaders) {
  const productId = url.searchParams.get("pid") || "PROD_0gi1Ii835HYjHQkofJCzr1";
  const productType = url.searchParams.get("type") || "onetime";
  const currency = url.searchParams.get("currency") || "USD";
  const storeSlug = env.WAFFO_STORE_SLUG || "7txh4wil"; // 如果配了 secret 用 secret，否则用默认
  const storeSlugFull = env.WAFFO_STORE_SLUG_FULL || "煌文骅网络科技工作室-7txh4wil";

  console.log(`Creating checkout session: pid=${productId}, slug=${storeSlug}`);

  // 先尝试短 slug，不行再用完整 slug
  const slugsToTry = [storeSlug, storeSlugFull];
  let lastError = null;

  for (const slug of slugsToTry) {
    try {
      const resp = await fetch("https://api.waffo.ai/v1/actions/checkout/create-session", {
        method: "POST",
        headers: {
          "X-Store-Slug": slug,
          "X-Environment": "prod",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          productType,
          currency,
        }),
      });

      const data = await resp.json();
      console.log(`Waffo API response (slug=${slug}):`, JSON.stringify(data).substring(0, 300));

      if (resp.ok && data?.data?.checkoutUrl) {
        console.log("✅ Checkout URL created:", data.data.checkoutUrl);
        return Response.redirect(data.data.checkoutUrl, 302);
      }

      if (resp.ok && data?.data?.url) {
        console.log("✅ Checkout URL (alt field):", data.data.url);
        return Response.redirect(data.data.url, 302);
      }

      lastError = JSON.stringify(data.errors || data).substring(0, 200);
      console.warn(`Slug ${slug} failed:`, lastError);
    } catch (err) {
      lastError = err.message;
      console.warn(`Slug ${slug} exception:`, err.message);
    }
  }

  // 两个都失败了，返回有用的错误
  return new Response(JSON.stringify({
    error: "Failed to create checkout session",
    details: lastError,
    triedSlugs: slugsToTry,
    hint: "Check Waffo Store Slug in Dashboard → Integration page",
  }), { status: 502, headers: corsHeaders });
}

// ---- Webhook 接收（Waffo RSA 签名验证）----

async function handleWebhook(request, env, corsHeaders) {
  const body = await request.text();

  // 1. 获取 Waffo RSA 公钥（通过 wrangler secret put 写入）
  const publicKeyPEM = env.WAFFO_PUBLIC_KEY;
  let sigVerified = false;

  if (publicKeyPEM) {
    // Waffo signature header: X-Waffo-Signature: t=<timestamp>,v1=<signature>
    const rawSig = request.headers.get("X-Waffo-Signature");
    if (rawSig) {
      // 提取 v1=<signature> 部分
      const sigMatch = rawSig.match(/v1=([^,]+)/);
      const signature = sigMatch ? sigMatch[1] : rawSig;
      sigVerified = await verifyRsaSignature(publicKeyPEM, body, signature);
      if (sigVerified) {
        console.log("✅ Webhook RSA signature verified");
      } else {
        console.warn("⚠️ Webhook RSA signature verification FAILED — will still store");
      }
    } else {
      console.warn("⚠️ Webhook missing X-Waffo-Signature header — will still store (dev mode)");
    }
  } else {
    console.warn("⚠️ WAFFO_PUBLIC_KEY not set — storing without signature verification");
  }

  // ---- RSA 验证工具 ----
  async function verifyRsaSignature(pem, body, signatureBase64) {
    try {
      // 去掉 PEM 头尾，提取 base64 DER
      const base64Der = pem
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/\s+/g, "");
      // 解码 DER
      const derBytes = base64ToBytes(base64Der);
      // 导入 RSA 公钥（SPKI 格式）
      const publicKey = await crypto.subtle.importKey(
        "spki", derBytes,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false, ["verify"]
      );
      // 解码签名 base64
      const sigBytes = base64ToBytes(signatureBase64.trim());
      // 验证
      const bodyBytes = new TextEncoder().encode(body);
      return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sigBytes, bodyBytes);
    } catch (e) {
      console.error("RSA verification error:", e);
      return false;
    }
  }

  function base64ToBytes(str) {
    const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
    const bin = atob(padded);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }

  const payload = JSON.parse(body);

  // 🔧 调试：把原始 payload 存进 KV（不解析，事后可查）
  try {
    const rawKey = `raw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await env.TX_CACHE.put(rawKey, body, { expirationTtl: 7 * 24 * 3600 });
    console.log(`🔧 Raw payload saved to KV: ${rawKey}`);
    console.log(`🔧 Full payload: ${body.substring(0, 500)}`);
  } catch (e) {
    console.warn(`🔧 Save raw payload failed: ${e.message}`);
  }

  // Waffo 真实 payload 格式:
  // { id, eventType, mode, data: { orderId, buyerEmail, chargedAmount, currency, ... } }
  const eventType = payload.eventType || payload.type || payload.event || "";
  const data = payload.data || {};

  console.log(`📨 Webhook received: eventType=${eventType}, mode=${payload.mode || "unknown"}`);

  // 只处理 order.completed
  if (eventType !== "order.completed") {
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: `eventType=${eventType}` }), {
      headers: corsHeaders,
    });
  }

  // 从 data 提取订单信息（Waffo 官方字段）
  const orderId = data.orderId || `unknown-${Date.now()}`;
  const email = (data.buyerEmail || data.email || "").toLowerCase();
  const amount = data.chargedAmount || data.amount || data.total || "0";
  const currency = data.currency || "USD";

  if (!email) {
    // 测试事件可能没有真实订单数据，宽容返回 200 避免 Waffo 重试
    console.warn("⚠️ No buyerEmail — likely a test event, returning 200");
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: "no buyerEmail (test event?)" }), {
      status: 200, headers: corsHeaders,
    });
  }

  // 存 KV：key = order_<orderId>，同时按 email 建索引
  const orderData = JSON.stringify({
    orderId, email, amount, currency,
    createdAt: new Date().toISOString(),
    downloaded: false,
  });

  await env.TX_CACHE.put(`order_${orderId}`, orderData, { expirationTtl: 30 * 24 * 3600 }); // 30 天
  await env.TX_CACHE.put(`email_${email}:${orderId}`, "1", { expirationTtl: 30 * 24 * 3600 });

  console.log(`✅ Order stored: ${orderId} (${email}, ${amount} ${currency})`);

  return new Response(JSON.stringify({ ok: true, orderId, email }), { headers: corsHeaders });
}

// ---- 下载验证（thanks 页调用）----

async function handleDownload(url, env, corsHeaders) {
  const email = (url.searchParams.get("email") || "").toLowerCase();
  const orderId = url.searchParams.get("order") || "";

  console.log(`DEBUG /download: email=${email}, order=${orderId}`);
  console.log(`DEBUG env.TX_CACHE: ${env.TX_CACHE ? "EXISTS" : "MISSING"}`);

  if (!email && !orderId) {
    return jsonError("Missing email or order parameter", 400, corsHeaders);
  }

  // 方式 A：用 orderId 直接查
  let orderData = null;
  if (orderId && env.TX_CACHE) {
    const raw = await env.TX_CACHE.get(`order_${orderId}`);
    console.log(`DEBUG KV.get('order_${orderId}'): ${raw ? "FOUND" : "NULL"}`);
    if (raw) orderData = JSON.parse(raw);
  } else if (!env.TX_CACHE) {
    console.error("TX_CACHE binding MISSING!");
  }

  // 方式 B：用 email 查最近的订单（遍历 keys）
  if (!orderData && email) {
    const keys = await env.TX_CACHE.list({ prefix: `email_${email}:`, limit: 10 });
    for (const key of keys.keys) {
      const orderKey = `order_${key.name.split(":")[1]}`;
      const raw = await env.TX_CACHE.get(orderKey);
      if (raw) {
        orderData = JSON.parse(raw);
        break;
      }
    }
  }

  if (!orderData) {
    return jsonError(
      "Order not found. Please wait a moment after payment, or contact support with your order ID.",
      404, corsHeaders
    );
  }

  // 从 R2 Bucket 读取 zip 文件（根据 productId 或 lang 参数选英文版/中文版）
  let zipKey = "Compound-Search-App.zip";
  let zipFilename = "Compound-Search-App.zip";
  const lang = url.searchParams.get("lang") || "";
  const productId = orderData.productId || "";

  // 中文版产品：PROD_2c7qUNjx0U4DS4mrtpwV5X
  if (lang === "zh" || productId === "PROD_2c7qUNjx0U4DS4mrtpwV5X") {
    zipKey = "Compound-Search-App-zh.zip";
    zipFilename = "Compound-Search-App-zh.zip";
  }

  const zipObject = await env.DOWNLOAD_BUCKET.get(zipKey);
  if (!zipObject) {
    console.error(`R2 bucket: ${zipKey} NOT FOUND`);
    return jsonError("Download file not found. Please contact support.", 500, corsHeaders);
  }
  console.log(`✅ R2 file found: ${zipKey}, size=${zipObject.size}`);

  // 标记已下载（可选：防止同一订单无限下载）
  if (!orderData.downloaded) {
    orderData.downloaded = true;
    orderData.downloadedAt = new Date().toISOString();
    await env.TX_CACHE.put(`order_${orderData.orderId}`, JSON.stringify(orderData), {
      expirationTtl: 30 * 24 * 3600,
    });
  }

  // 直接返回 zip 文件流（浏览器会自动下载）
  return new Response(zipObject.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"`,
      "Content-Length": zipObject.size.toString(),
    },
  });
}

function jsonError(message, status, headers) {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

// ---- 邮箱查询最近订单 ----

async function handleOrderLookup(url, env, corsHeaders) {
  const email = (url.searchParams.get("email") || "").toLowerCase().trim();

  if (!email) {
    return jsonError("Missing email parameter", 400, corsHeaders);
  }

  if (!env.TX_CACHE) {
    return jsonError("KV not configured", 500, corsHeaders);
  }

  // 列出这个邮箱的所有订单索引
  const keys = await env.TX_CACHE.list({ prefix: `email_${email}:`, limit: 10 });

  const orders = [];
  for (const key of keys.keys) {
    const orderKey = `order_${key.name.split(":")[1]}`;
    const raw = await env.TX_CACHE.get(orderKey);
    if (raw) {
      try {
        const order = JSON.parse(raw);
        orders.push({
          orderId: order.orderId,
          email: order.email,
          amount: order.amount,
          currency: order.currency,
          createdAt: order.createdAt,
          downloaded: order.downloaded || false,
        });
      } catch (e) { /* skip corrupt */ }
    }
  }

  // 按时间倒序，最新的排前面
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (orders.length === 0) {
    return new Response(JSON.stringify({ found: false, message: "No paid order found for this email." }), {
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ found: true, count: orders.length, orders }), {
    headers: corsHeaders,
  });
}

// ---- robots.txt（覆盖 Cloudflare Content Signals 注入的垃圾）----

const ROBOTS_TXT = `User-agent: *
Allow: /

# 国内搜索引擎
User-agent: Baiduspider
Allow: /

User-agent: Bytespider
Allow: /

User-agent: PetalBot
Allow: /

User-agent: 360Spider
Allow: /

User-agent: YandexBot
Allow: /

# 国际搜索引擎
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Applebot
Allow: /

# 禁止爬虫
User-agent: ChatGPT-User
Disallow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Perplexity-User
Disallow: /

Sitemap: https://wenhuahuang.com/sitemap.xml
`;

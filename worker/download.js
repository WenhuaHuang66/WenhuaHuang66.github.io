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
      if (path === "/" && request.method === "GET") {
        return new Response(JSON.stringify({ ok: true, service: "compound-search-download", endpoints: ["/checkout", "/webhook", "/download"] }), { headers: corsHeaders });
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
    const signature = request.headers.get("X-Signature");
    if (signature) {
      sigVerified = await verifyRsaSignature(publicKeyPEM, body, signature);
      if (sigVerified) {
        console.log("✅ Webhook RSA signature verified");
      } else {
        console.warn("⚠️ Webhook RSA signature verification FAILED — will still store");
      }
    } else {
      console.warn("⚠️ Webhook missing X-Signature header — will still store (dev mode)");
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

  // 只处理订单完成事件
  const eventType = payload.type || payload.event || "";
  const isOrderComplete =
    eventType.includes("order") && (eventType.includes("complete") || eventType.includes("success") || eventType.includes("paid")) ||
    (payload.order && payload.order.status === "completed");

  if (!isOrderComplete) {
    return new Response(JSON.stringify({ ok: true, ignored: true, reason: "not an order complete event" }), {
      headers: corsHeaders,
    });
  }

  // 提取订单信息（Waffo payload 字段，可能不同版本略有差异）
  const order = payload.order || payload.data?.order || {};
  const orderId = order.id || order.orderId || order.shortId || payload.orderId || `unknown-${Date.now()}`;
  const email = (order.buyer?.email || order.customer?.email || order.email || payload.customerEmail || "").toLowerCase();
  const amount = order.amount || order.total || payload.amount || 0;
  const currency = order.currency || payload.currency || "CNY";

  if (!email) {
    console.error("No email in webhook payload:", JSON.stringify(payload).substring(0, 500));
    return new Response(JSON.stringify({ ok: false, error: "no email" }), {
      status: 400, headers: corsHeaders,
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

  // 从 R2 Bucket 读取 zip 文件
  const zipObject = await env.DOWNLOAD_BUCKET.get("Compound-Search-App.zip");
  if (!zipObject) {
    console.error("R2 bucket: Compound-Search-App.zip NOT FOUND");
    return jsonError("Download file not found. Please contact support.", 500, corsHeaders);
  }
  console.log(`✅ R2 file found: size=${zipObject.size}`);

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
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="Compound-Search-App.zip"',
      "Content-Length": zipObject.size.toString(),
      ...corsHeaders,
    },
  });
}

function jsonError(message, status, headers) {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

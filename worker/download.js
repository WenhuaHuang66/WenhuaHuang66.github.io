// Compound Structure Search App — Paid Download Worker
// 双模式：
//   1. Webhook 接收（POST /webhook）：Waffo 付款成功后调用 → 存 KV
//   2. 下载验证（GET /download?email=xxx&order=xxx）：thanks 页调用 → 查 KV → 预签名 URL

const DOWNLOAD_URL_TTL_SECONDS = 3600; // 预签名 URL 有效期 1 小时

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Waffo-Signature",
      "Content-Type": "application/json",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Webhook 接收端点（Waffo 付款成功后 POST）
      if (path === "/webhook" && request.method === "POST") {
        return await handleWebhook(request, env, corsHeaders);
      }

      // 下载验证端点（thanks 页调）
      if (path === "/download" && request.method === "GET") {
        return await handleDownload(url, env, corsHeaders);
      }

      // 根路径健康检查
      if (path === "/" && request.method === "GET") {
        return new Response(JSON.stringify({ ok: true, service: "compound-search-download" }), {
          headers: corsHeaders,
        });
      }

      return jsonError("Not found", 404, corsHeaders);

    } catch (err) {
      console.error("Worker error:", err);
      return jsonError("Internal server error: " + err.message, 500, corsHeaders);
    }
  },
};

// ---- Webhook 接收 ----

async function handleWebhook(request, env, corsHeaders) {
  const body = await request.text();

  // 验证签名（如果 Waffo 提供）
  // 先宽松处理：如果有 WAFFO_WEBHOOK_SECRET，就验证
  const secret = env.WAFFO_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("X-Waffo-Signature") || request.headers.get("X-Signature");
    if (sig) {
      // HMAC-SHA256 验证
      const encoder = new TextEncoder();
      const keyData = await crypto.subtle.importKey(
        "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
      );
      const expectedSig = await crypto.subtle.sign("HMAC", keyData, encoder.encode(body));
      const expectedSigB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSig)));
      if (sig !== expectedSigB64 && sig !== "sha256=" + expectedSigB64) {
        console.warn("Webhook signature mismatch");
        // 不返回错误——Waffo 会重试；但我们拒绝处理
        return jsonError("Invalid signature", 401, corsHeaders);
      }
    }
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

  if (!email && !orderId) {
    return jsonError("Missing email or order parameter", 400, corsHeaders);
  }

  // 方式 A：用 orderId 直接查
  let orderData = null;
  if (orderId) {
    const raw = await env.TX_CACHE.get(`order_${orderId}`);
    if (raw) orderData = JSON.parse(raw);
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

  // 生成预签名 URL
  const presignedUrl = await env.DOWNLOAD_BUCKET.get(
    "Compound-Search-App.zip", {
      httpMethod: "GET",
      expiresIn: DOWNLOAD_URL_TTL_SECONDS,
    }
  );

  // 标记已下载（可选：防止同一订单无限下载）
  if (!orderData.downloaded) {
    orderData.downloaded = true;
    orderData.downloadedAt = new Date().toISOString();
    await env.TX_CACHE.put(`order_${orderData.orderId}`, JSON.stringify(orderData), {
      expirationTtl: 30 * 24 * 3600,
    });
  }

  // 直接 302 重定向到下载 URL
  return Response.redirect(presignedUrl, 302);
}

function jsonError(message, status, headers) {
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

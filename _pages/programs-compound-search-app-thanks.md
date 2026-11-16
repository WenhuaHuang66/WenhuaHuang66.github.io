---
title: "Download — Compound Structure Search App"
permalink: /programs/compound-search-app/thanks/
classes: wide
---

## Thank you for your purchase!

<div id="download-status" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;">

  <p id="download-message" style="font-size:1.1em;color:#333;">Verifying your payment...</p>

  <div id="download-spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>

  <p style="margin-top:1em;font-size:0.9em;color:#666;">If download doesn't start within 15 seconds, click the button below.</p>

  <a id="download-btn" href="#" style="display:none;display:inline-block;margin-top:0.8em;padding:0.9em 2.2em;background:#E67E22;color:#fff;text-decoration:none;border-radius:8px;font-size:1.05em;font-weight:700;">
    📥 Download Now
  </a>

</div>

<div id="download-error" style="display:none;padding:2em;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;margin:1.5em 0;">
  <h3 style="color:#dc2626;margin-top:0;">Sorry, we couldn't verify your payment automatically.</h3>
  <p id="error-detail" style="color:#666;"></p>
  <p>Please email <a href="mailto:csa-support@wenhuahuang.com">csa-support@wenhuahuang.com</a> with your Waffo order receipt, and we'll send you the download link right away.</p>
</div>

<style>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<script>
(function() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';
  const order = params.get('order') || '';
  const status = document.getElementById('download-status');
  const message = document.getElementById('download-message');
  const spinner = document.getElementById('download-spinner');
  const btn = document.getElementById('download-btn');
  const errorBox = document.getElementById('download-error');
  const errorDetail = document.getElementById('error-detail');

  // Worker URL — 国内可能超时，需要超时降级
  const WORKER_URL = 'https://checkout.wenhuahuang.com';

  // 超时降级：15 秒后如果 Worker 没响应，提示手动下载
  let timedOut = false;
  const timeoutTimer = setTimeout(function() {
    timedOut = true;
    spinner.style.display = 'none';
    message.textContent = 'Verification is taking longer than expected.';
    btn.style.display = 'inline-block';
    btn.textContent = '📧 Email me the download link';
    btn.href = 'mailto:csa-support@wenhuahuang.com?subject=Compound%20Search%20App%20Download%20Request&body=Order%20ID%3A%20' + encodeURIComponent(order) + '%0APayer%20Email%3A%20' + encodeURIComponent(email) + '%0APlease%20send%20me%20the%20download%20link.';
  }, 15000);

  if (!email && !order) {
    clearTimeout(timeoutTimer);
    showError('No order information found. Please return to the product page and contact support.');
    return;
  }

  // 调 Worker /download 端点（带 email + order 参数）
  fetch(WORKER_URL + '/download?email=' + encodeURIComponent(email) + '&order=' + encodeURIComponent(order), {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
  }).then(async function(res) {
    clearTimeout(timeoutTimer);
    if (timedOut) return; // 已经超时降级了

    if (res.ok && res.redirected) {
      const finalUrl = res.url;
      message.textContent = '✅ Your download is ready!';
      spinner.style.display = 'none';
      btn.style.display = 'inline-block';
      btn.textContent = '📥 Click here if download did not start';
      btn.href = finalUrl;
      // 自动触发下载
      window.location.href = finalUrl;
    } else if (res.status === 404) {
      // Worker 返回 404 = KV 里没找到订单（Webhook 还没收到）
      message.textContent = '⏳ Your payment is being verified...';
      spinner.style.display = 'block';
      // 10 秒后自动重试一次
      setTimeout(function() {
        window.location.reload();
      }, 10000);
    } else {
      const err = await res.json().catch(() => ({}));
      btn.style.display = 'inline-block';
      btn.textContent = '📧 Email me the download link';
      btn.href = 'mailto:csa-support@wenhuahuang.com?subject=Compound%20Search%20App%20Download%20Request&body=Order%20ID%3A%20' + encodeURIComponent(order) + '%0APayer%20Email%3A%20' + encodeURIComponent(email);
      showError(err.error || 'Verification failed. Please contact support.');
    }
  }).catch(function(err) {
    clearTimeout(timeoutTimer);
    if (timedOut) return;
    // workers.dev 超时 → 提示手动下载
    message.textContent = 'Network verification unavailable.';
    spinner.style.display = 'none';
    btn.style.display = 'inline-block';
    btn.textContent = '📧 Email me the download link';
    btn.href = 'mailto:csa-support@wenhuahuang.com?subject=Compound%20Search%20App%20Download%20Request&body=Order%20ID%3A%20' + encodeURIComponent(order) + '%0APayer%20Email%3A%20' + encodeURIComponent(email);
  });

  function showError(msg) {
    status.style.display = 'none';
    errorBox.style.display = 'block';
    errorDetail.textContent = msg;
  }
})();
</script>

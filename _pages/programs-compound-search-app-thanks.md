---
title: "Download — Compound Structure Search App"
permalink: /programs/compound-search-app/thanks/
classes: wide
---

## Thank you for your purchase!

<div id="download-status" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;">

  <p id="download-message" style="font-size:1.1em;color:#333;">Verifying your payment...</p>

  <div id="download-spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>

  <p style="margin-top:1em;font-size:0.9em;color:#666;">If download doesn't start within 10 seconds, click the button below.</p>

  <a id="download-btn" href="#" class="btn btn--primary" style="display:none;min-width:200px;">Download Now</a>

</div>

<div id="download-error" style="display:none;padding:2em;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;margin:1.5em 0;">
  <h3 style="color:#dc2626;margin-top:0;">Sorry, we couldn't verify your payment.</h3>
  <p id="error-detail" style="color:#666;"></p>
  <p>Please return to the <a href="/programs/compound-search-app/">product page</a> and try again, or email <a href="mailto:huangwenhua66@icloud.com">huangwenhua66@icloud.com</a> with your PayPal receipt.</p>
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
  const tx = params.get('tx');
  const st = params.get('st');
  const status = document.getElementById('download-status');
  const message = document.getElementById('download-message');
  const spinner = document.getElementById('download-spinner');
  const btn = document.getElementById('download-btn');
  const errorBox = document.getElementById('download-error');
  const errorDetail = document.getElementById('error-detail');

  // Worker URL — 部署后替换
  const WORKER_URL = 'https://compound-search-download.huangwh.workers.dev';

  if (!tx) {
    showError('No transaction ID found in the URL.');
    return;
  }

  if (st && st !== 'Completed') {
    showError('PayPal returned status: ' + st);
    return;
  }

  // 自动触发下载
  fetch(WORKER_URL + '?tx=' + encodeURIComponent(tx), {
    method: 'GET',
    redirect: 'follow',
  }).then(async function(res) {
    if (res.ok && res.redirected) {
      // Worker 返回 302，浏览器应该自动跟随下载
      const finalUrl = res.url;
      message.textContent = 'Download ready! If it didn\\'t start automatically, click the button below.';
      spinner.style.display = 'none';
      btn.style.display = 'inline-block';
      btn.href = finalUrl;
      // 自动触发下载
      window.location.href = finalUrl;
    } else {
      const err = await res.json();
      showError(err.error || 'Verification failed.');
    }
  }).catch(function(err) {
    showError('Network error. Please try again.');
  });

  function showError(msg) {
    status.style.display = 'none';
    errorBox.style.display = 'block';
    errorDetail.textContent = msg;
  }
})();
</script>

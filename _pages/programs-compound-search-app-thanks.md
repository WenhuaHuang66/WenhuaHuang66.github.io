---
title: "Download — Compound Structure Search App"
permalink: /programs/compound-search-app/thanks/
classes: wide
---

## Thank you for your purchase!

<div id="download-status" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;">

  <p id="download-message" style="font-size:1.1em;color:#333;">Preparing your download...</p>

  <div id="download-spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>

  <p style="margin-top:1em;font-size:0.9em;color:#666;">If download doesn't start automatically within 10 seconds, click the button below.</p>

  <a id="download-btn" href="#" style="display:none;display:inline-block;margin-top:0.8em;padding:0.9em 2.2em;background:#E67E22;color:#fff;text-decoration:none;border-radius:8px;font-size:1.05em;font-weight:700;">
    📥 Download Now
  </a>

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
  const spinner = document.getElementById('download-spinner');
  const message = document.getElementById('download-message');
  const btn = document.getElementById('download-btn');

  const WORKER_URL = 'https://checkout.wenhuahuang.com';
  const downloadUrl = WORKER_URL + '/download?email=' + encodeURIComponent(email) + '&order=' + encodeURIComponent(order);

  // 8 秒后显示手动下载按钮（防止自动下载没触发）
  setTimeout(function() {
    spinner.style.display = 'none';
    message.textContent = 'Your download link is ready!';
    btn.style.display = 'inline-block';
    btn.href = downloadUrl;
    // 也自动触发一次
    window.location.href = downloadUrl;
  }, 3000);

  // 立即触发下载（Worker 返回 Content-Disposition: attachment）
  if (email && order) {
    window.location.href = downloadUrl;
  } else {
    spinner.style.display = 'none';
    message.textContent = 'No order information found. Please contact support with your receipt.';
  }
})();
</script>

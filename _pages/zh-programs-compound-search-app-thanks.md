---
title: "下载 · 化学结构式搜索工具"
permalink: /zh/programs/compound-search-app/thanks/
locale: zh-CN
classes: wide
---

## 感谢您的购买！

<div id="download-status" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;">

  <p id="download-message" style="font-size:1.1em;color:#333;">正在准备下载...</p>

  <div id="download-spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>

  <p style="margin-top:1em;font-size:0.9em;color:#666;">如果 10 秒内没有自动开始下载，请点击下方按钮。</p>

  <a id="download-btn" href="#" style="display:none;display:inline-block;margin-top:0.8em;padding:0.9em 2.2em;background:#E67E22;color:#fff;text-decoration:none;border-radius:8px;font-size:1.05em;font-weight:700;">
    📥 立即下载
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

  // 3 秒后显示手动下载按钮
  setTimeout(function() {
    spinner.style.display = 'none';
    message.textContent = '下载链接已就绪！';
    btn.style.display = 'inline-block';
    btn.href = downloadUrl;
    window.location.href = downloadUrl;
  }, 3000);

  // 立即触发下载
  if (email && order) {
    window.location.href = downloadUrl;
  } else {
    spinner.style.display = 'none';
    message.textContent = '未找到订单信息，请联系客服并附上订单截图。';
  }
})();
</script>

---
title: "下载 · 化学结构式搜索工具"
permalink: /zh/programs/compound-search-app/thanks/
locale: zh-CN
classes: wide
---

## 感谢您的购买！

<div id="download-status" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;">

  <p id="download-message" style="font-size:1.1em;color:#333;">正在验证付款信息...</p>

  <div id="download-spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>

  <p style="margin-top:1em;font-size:0.9em;color:#666;">如果 10 秒内没有自动开始下载，请点击下方按钮。</p>

  <a id="download-btn" href="#" class="btn btn--primary" style="display:none;min-width:200px;">立即下载</a>

</div>

<div id="download-error" style="display:none;padding:2em;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;margin:1.5em 0;">
  <h3 style="color:#dc2626;margin-top:0;">抱歉，无法验证您的付款。</h3>
  <p id="error-detail" style="color:#666;"></p>
  <p>请返回<a href="/zh/programs/compound-search-app/">产品页面</a>重试，或邮件联系 <a href="mailto:csa-support@wenhuahuang.com">csa-support@wenhuahuang.com</a> 并附上 PayPal 交易截图。</p>
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
    showError('URL 中未找到交易号。');
    return;
  }

  if (st && st !== 'Completed') {
    showError('PayPal 返回状态：' + st);
    return;
  }

  fetch(WORKER_URL + '?tx=' + encodeURIComponent(tx), {
    method: 'GET',
    redirect: 'follow',
  }).then(async function(res) {
    if (res.ok && res.redirected) {
      const finalUrl = res.url;
      message.textContent = '下载已就绪！如果没有自动开始，请点击下方按钮。';
      spinner.style.display = 'none';
      btn.style.display = 'inline-block';
      btn.href = finalUrl;
      window.location.href = finalUrl;
    } else {
      const err = await res.json();
      showError(err.error || '验证失败。');
    }
  }).catch(function(err) {
    showError('网络错误，请稍后重试。');
  });

  function showError(msg) {
    status.style.display = 'none';
    errorBox.style.display = 'block';
    errorDetail.textContent = msg;
  }
})();
</script>

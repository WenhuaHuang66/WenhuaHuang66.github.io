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

  <p style="margin-top:1em;font-size:0.9em;color:#666;">如果 15 秒内没有自动开始下载，请点击下方按钮。</p>

  <a id="download-btn" href="#" style="display:none;display:inline-block;margin-top:0.8em;padding:0.9em 2.2em;background:#E67E22;color:#fff;text-decoration:none;border-radius:8px;font-size:1.05em;font-weight:700;">
    📥 立即下载
  </a>

</div>

<div id="download-error" style="display:none;padding:2em;background:#fef2f2;border-radius:8px;border-left:4px solid #dc2626;margin:1.5em 0;">
  <h3 style="color:#dc2626;margin-top:0;">抱歉，无法自动验证您的付款。</h3>
  <p id="error-detail" style="color:#666;"></p>
  <p>请邮件联系 <a href="mailto:csa-support@wenhuahuang.com">csa-support@wenhuahuang.com</a> 并附上 Waffo 订单截图，我们会立即发送下载链接。</p>
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
  const WORKER_URL = 'https://compound-search-download.huangwh.workers.dev';

  // 超时降级：15 秒后如果 Worker 没响应，提示邮件联系
  let timedOut = false;
  const timeoutTimer = setTimeout(function() {
    timedOut = true;
    spinner.style.display = 'none';
    message.textContent = '验证时间较长，请点击下方按钮或邮件联系。';
    btn.style.display = 'inline-block';
    btn.textContent = '📧 邮件获取下载链接';
    btn.href = 'mailto:csa-support@wenhuahuang.com?subject=%E5%8C%96%E5%AD%A6%E7%BB%93%E6%9E%84%E6%90%9C%E7%B4%A2%E5%B7%A5%E5%85%B7%20%E4%B8%8B%E8%BD%BD%E8%AF%B7%E6%B1%82&body=%E8%AE%A2%E5%8D%95%E5%8F%B7%3A%20' + encodeURIComponent(order) + '%0A%E8%B4%AD%E4%B9%B0%E9%82%AE%E7%AE%B1%3A%20' + encodeURIComponent(email) + '%0A%E8%AF%B7%E5%8F%91%E9%80%81%E4%B8%8B%E8%BD%BD%E9%93%BE%E6%8E%A5%E3%80%82';
  }, 15000);

  if (!email && !order) {
    clearTimeout(timeoutTimer);
    showError('URL 中未找到订单信息，请联系客服。');
    return;
  }

  // 调 Worker /download 端点
  fetch(WORKER_URL + '/download?email=' + encodeURIComponent(email) + '&order=' + encodeURIComponent(order), {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
  }).then(async function(res) {
    clearTimeout(timeoutTimer);
    if (timedOut) return;

    if (res.ok && res.redirected) {
      const finalUrl = res.url;
      message.textContent = '✅ 下载已就绪！';
      spinner.style.display = 'none';
      btn.style.display = 'inline-block';
      btn.textContent = '📥 如果没有自动下载，请点击这里';
      btn.href = finalUrl;
      window.location.href = finalUrl;
    } else if (res.status === 404) {
      message.textContent = '⏳ 正在确认付款信息，请稍候...';
      spinner.style.display = 'block';
      setTimeout(function() { window.location.reload(); }, 10000);
    } else {
      const err = await res.json().catch(() => ({}));
      btn.style.display = 'inline-block';
      btn.textContent = '📧 邮件获取下载链接';
      btn.href = 'mailto:csa-support@wenhuahuang.com?subject=%E5%8C%96%E5%AD%A6%E7%BB%93%E6%9E%84%E6%90%9C%E7%B4%A2%E5%B7%A5%E5%85%B7%20%E4%B8%8B%E8%BD%BD%E8%AF%B7%E6%B1%82&body=%E8%AE%A2%E5%8D%95%E5%8F%B7%3A%20' + encodeURIComponent(order) + '%0A%E8%B4%AD%E4%B9%B0%E9%82%AE%E7%AE%B1%3A%20' + encodeURIComponent(email);
      showError(err.error || '验证失败，请联系客服。');
    }
  }).catch(function(err) {
    clearTimeout(timeoutTimer);
    if (timedOut) return;
    message.textContent = '网络验证暂不可用。';
    spinner.style.display = 'none';
    btn.style.display = 'inline-block';
    btn.textContent = '📧 邮件获取下载链接';
    btn.href = 'mailto:csa-support@wenhuahuang.com?subject=%E5%8C%96%E5%AD%A6%E7%BB%93%E6%9E%84%E6%90%9C%E7%B4%A2%E5%B7%A5%E5%85%B7%20%E4%B8%8B%E8%BD%BD%E8%AF%B7%E6%B1%82&body=%E8%AE%A2%E5%8D%95%E5%8F%B7%3A%20' + encodeURIComponent(order) + '%0A%E8%B4%AD%E4%B9%B0%E9%82%AE%E7%AE%B1%3A%20' + encodeURIComponent(email);
  });

  function showError(msg) {
    status.style.display = 'none';
    errorBox.style.display = 'block';
    errorDetail.textContent = msg;
  }
})();
</script>

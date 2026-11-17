---
title: "Download — Compound Structure Search App"
permalink: /programs/compound-search-app/thanks/
classes: wide
---

## Thank you for your purchase!

<div id="download-card" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;max-width:520px;margin-left:auto;margin-right:auto;">

  <!-- 状态区（自动下载时显示） -->
  <div id="auto-status">
    <p style="font-size:1.1em;color:#333;">Preparing your download...</p>
    <div id="spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>
  </div>

  <!-- 邮箱查询区（Waffo Return URL 不带参数时显示） -->
  <div id="email-lookup" style="display:none;">
    <p style="font-size:1.05em;color:#333;margin-bottom:1em;">Enter your purchase email to find your download:</p>
    <form id="lookup-form" style="display:flex;gap:0.5em;justify-content:center;flex-wrap:wrap;">
      <input id="email-input" type="email" required placeholder="your@email.com"
             style="padding:0.75em 1em;font-size:1em;border:2px solid #ddd;border-radius:6px;min-width:220px;width:100%;box-sizing:border-box;" />
      <button id="lookup-btn" type="submit"
              style="padding:0.75em 1.8em;font-size:1em;background:#E67E22;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
        Find My Order
      </button>
    </form>
    <p id="lookup-msg" style="margin-top:0.8em;font-size:0.9em;color:#666;"></p>
  </div>

  <!-- 下载按钮区 -->
  <div id="download-btn-area" style="display:none;margin-top:1em;">
    <p id="order-found-msg" style="color:#28a745;font-size:1.05em;"></p>
    <a id="download-btn" href="#"
       style="display:inline-block;margin-top:0.8em;padding:0.9em 2.2em;background:#E67E22;color:#fff;text-decoration:none;border-radius:8px;font-size:1.05em;font-weight:700;">
      📥 Download Now
    </a>
  </div>

  <p style="margin-top:1.5em;font-size:0.85em;color:#888;">Having trouble? Contact <a href="mailto:csa-support@wenhuahuang.com">csa-support@wenhuahuang.com</a></p>

</div>

<style>
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
#email-input:focus { border-color: #E67E22; outline: none; }
</style>

<script>
(function() {
  const WORKER = 'https://checkout.wenhuahuang.com';
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';
  const order = params.get('order') || '';

  const autoStatus = document.getElementById('auto-status');
  const emailLookup = document.getElementById('email-lookup');
  const downloadBtnArea = document.getElementById('download-btn-area');
  const downloadBtn = document.getElementById('download-btn');
  const spinner = document.getElementById('spinner');
  const lookupMsg = document.getElementById('lookup-msg');

  // 有 email+order 参数 → 直接走下载流程
  if (email && order) {
    const dlUrl = WORKER + '/download?email=' + encodeURIComponent(email) + '&order=' + encodeURIComponent(order);
    // 自动触发（Worker 返回 Content-Disposition: attachment）
    window.location.href = dlUrl;
    // 3 秒后显示手动按钮保底
    setTimeout(function() {
      spinner.style.display = 'none';
      downloadBtn.href = dlUrl;
      downloadBtnArea.style.display = 'block';
      document.querySelector('#auto-status p').textContent = 'Download should have started. If not, click below:';
    }, 3000);
    return;
  }

  // 没有参数 → 显示邮箱输入框
  autoStatus.style.display = 'none';
  emailLookup.style.display = 'block';

  document.getElementById('lookup-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('email-input');
    const lookupBtn = document.getElementById('lookup-btn');
    const queryEmail = input.value.trim();

    if (!queryEmail) return;

    lookupBtn.disabled = true;
    lookupBtn.textContent = 'Searching...';
    lookupMsg.textContent = '';
    downloadBtnArea.style.display = 'none';

    try {
      const resp = await fetch(WORKER + '/api/order-lookup?email=' + encodeURIComponent(queryEmail));
      const data = await resp.json();

      if (data.found && data.orders && data.orders.length > 0) {
        const order = data.orders[0]; // 最新一笔
        const dlUrl = WORKER + '/download?email=' + encodeURIComponent(queryEmail) + '&order=' + encodeURIComponent(order.orderId);

        document.getElementById('order-found-msg').textContent =
          'Found your order (' + (order.currency || '') + ' ' + (order.amount || '') + ' on ' + order.createdAt.slice(0,10) + ')';
        downloadBtn.href = dlUrl;
        downloadBtnArea.style.display = 'block';

        // 也自动触发一次下载
        window.location.href = dlUrl;
      } else {
        lookupMsg.textContent = data.message || 'No paid order found for this email. If you just paid, please wait 30 seconds and try again.';
        lookupMsg.style.color = '#d9534f';
      }
    } catch (err) {
      lookupMsg.textContent = 'Error: ' + err.message;
      lookupMsg.style.color = '#d9534f';
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = 'Find My Order';
    }
  });
})();
</script> 

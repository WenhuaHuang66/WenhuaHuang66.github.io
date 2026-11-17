---
title: "下载 · 化学结构式搜索工具"
permalink: /zh/programs/compound-search-app/thanks/
locale: zh-CN
classes: wide
---

## 感谢您的购买！

<div id="download-card" style="padding:2em;text-align:center;background:#f0f9ff;border-radius:8px;margin:1.5em 0;max-width:520px;margin-left:auto;margin-right:auto;">

  <!-- 状态区（自动下载时显示） -->
  <div id="auto-status">
    <p style="font-size:1.1em;color:#333;">正在准备下载...</p>
    <div id="spinner" style="font-size:2em;animation:spin 1.5s linear infinite;">⏳</div>
  </div>

  <!-- 邮箱查询区（Waffo Return URL 不带参数时显示） -->
  <div id="email-lookup" style="display:none;">
    <p style="font-size:1.05em;color:#333;margin-bottom:1em;">输入您购买时使用的邮箱查找下载：</p>
    <form id="lookup-form" style="display:flex;gap:0.5em;justify-content:center;flex-wrap:wrap;">
      <input id="email-input" type="email" required placeholder="your@email.com"
             style="padding:0.75em 1em;font-size:1em;border:2px solid #ddd;border-radius:6px;min-width:220px;width:100%;box-sizing:border-box;" />
      <button id="lookup-btn" type="submit"
              style="padding:0.75em 1.8em;font-size:1em;background:#E67E22;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">
        查找订单
      </button>
    </form>
    <p id="lookup-msg" style="margin-top:0.8em;font-size:0.9em;color:#666;"></p>
  </div>

  <!-- 下载按钮区 -->
  <div id="download-btn-area" style="display:none;margin-top:1em;">
    <p id="order-found-msg" style="color:#28a745;font-size:1.05em;"></p>
    <a id="download-btn" href="#"
       style="display:inline-block;margin-top:0.8em;padding:0.9em 2.2em;background:#E67E22;color:#fff;text-decoration:none;border-radius:8px;font-size:1.05em;font-weight:700;">
      📥 立即下载
    </a>
  </div>

  <p style="margin-top:1.2em;font-size:0.8em;color:#999;">📌 下载凭证自购买之日起 <strong>30 天内有效</strong>，请及时保存到您的设备。下载成功后，文件归您永久所有。</p>
  <p style="margin-top:0.8em;font-size:0.85em;color:#888;">遇到问题？请联系 <a href="mailto:csa-support@wenhuahuang.com">csa-support@wenhuahuang.com</a></p>

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
    const dlUrl = WORKER + '/download?email=' + encodeURIComponent(email) + '&order=' + encodeURIComponent(order) + '&lang=zh';
    window.location.href = dlUrl;
    setTimeout(function() {
      spinner.style.display = 'none';
      downloadBtn.href = dlUrl;
      downloadBtnArea.style.display = 'block';
      document.querySelector('#auto-status p').textContent = '下载应已自动开始。如果没有，请点击下方按钮：';
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
    lookupBtn.textContent = '查询中...';
    lookupMsg.textContent = '';
    downloadBtnArea.style.display = 'none';

    try {
      const resp = await fetch(WORKER + '/api/order-lookup?email=' + encodeURIComponent(queryEmail));
      const data = await resp.json();

      if (data.found && data.orders && data.orders.length > 0) {
        const order = data.orders[0];
        const dlUrl = WORKER + '/download?email=' + encodeURIComponent(queryEmail) + '&order=' + encodeURIComponent(order.orderId) + '&lang=zh';

        document.getElementById('order-found-msg').textContent =
          '已找到订单 (' + (order.currency || '') + ' ' + (order.amount || '') + '，' + order.createdAt.slice(0,10) + ')';
        downloadBtn.href = dlUrl;
        downloadBtnArea.style.display = 'block';
        window.location.href = dlUrl;
      } else {
        lookupMsg.textContent = data.message || '未找到此邮箱的已付款订单。如果刚付款，请等待 30 秒后再试。';
        lookupMsg.style.color = '#d9534f';
      }
    } catch (err) {
      lookupMsg.textContent = '错误：' + err.message;
      lookupMsg.style.color = '#d9534f';
    } finally {
      lookupBtn.disabled = false;
      lookupBtn.textContent = '查找订单';
    }
  });
})();
</script> 

(() => {
  'use strict';
  const status = document.getElementById('pwa-status');
  const install = document.getElementById('pwa-install');
  const help = document.getElementById('pwa-help');
  const detail = document.getElementById('pwa-help-detail');
  const update = document.getElementById('pwa-update');
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let promptEvent, registration, ready = false;
  function render() {
    install.hidden = standalone();
    status.textContent = !navigator.onLine ? (ready ? '当前离线 · 评估与本机历史记录仍可使用' : '当前离线 · 请先联网完成离线准备') : (ready ? '离线已就绪 · 记录保存在当前设备' : '首次联网打开后，可离线评估');
  }
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); promptEvent = event; install.textContent = '安装 App'; render();
  });
  window.addEventListener('appinstalled', () => { promptEvent = null; install.hidden = true; });
  document.getElementById('pwa-help-close').addEventListener('click', () => help.close());
  help.addEventListener('click', event => { if (event.target === help) { const r = help.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) help.close(); } });
  install.addEventListener('click', async () => {
    if (promptEvent) {
      const pending = promptEvent; promptEvent = null;
      try { await pending.prompt(); await pending.userChoice; } catch (_) { /* 可继续使用手动安装说明 */ }
      install.textContent = '安装到桌面';
      return;
    }
    detail.textContent = location.protocol === 'file:' ? '请先将此项目部署到 HTTPS 网站，再用手机浏览器打开网址。直接打开本地 HTML 文件无法安装或离线缓存。' : isIOS ? '1. 使用 Safari 打开本页面。\n2. 点击分享按钮（或菜单中的分享）。\n3. 选择“添加到主屏幕”。\n4. 如果有“作为网页 App 打开”，将它开启，再点“添加”。' : /android/i.test(navigator.userAgent) ? '1. 使用 Chrome 或支持安装的系统浏览器打开。\n2. 点击浏览器菜单。\n3. 选择“安装应用”或“添加到主屏幕”。\n如果在微信内打开，请先选择“在浏览器打开”。' : '在 Chrome 或 Edge 地址栏点击安装图标，或在浏览器菜单中选择“安装社死评估器”。手机上打开同一网址也可安装。';
    help.showModal();
  });
  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) location.reload();
    else { ready = true; render(); }
  });
  document.getElementById('pwa-update-btn').addEventListener('click', () => {
    if (!registration?.waiting) return;
    refreshing = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
  async function register() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext || !/^https?:$/.test(location.protocol)) {
      status.textContent = '安装与离线模式需通过 HTTPS 网址打开'; return;
    }
    try {
      registration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      const showUpdate = () => { if (registration.waiting && navigator.serviceWorker.controller) update.hidden = false; };
      showUpdate();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') showUpdate(); });
      });
      await navigator.serviceWorker.ready;
      ready = true; render();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) registration.update().catch(() => {}); });
    } catch (error) {
      status.textContent = '离线准备未完成，请联网后重新打开';
      console.warn('PWA registration failed', error);
    }
  }
  render(); register();
})();

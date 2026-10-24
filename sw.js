'use strict';
// 每次发布修改版本号，使新旧文件作为完整的一组进行更新。
const CACHE_PREFIX = 'social-embarrassment-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./data.js",
  "./pwa.css",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./vendor/css/all.min.css",
  "./vendor/webfonts/fa-brands-400.woff2",
  "./vendor/webfonts/fa-brands-400.ttf",
  "./vendor/webfonts/fa-regular-400.woff2",
  "./vendor/webfonts/fa-regular-400.ttf",
  "./vendor/webfonts/fa-solid-900.woff2",
  "./vendor/webfonts/fa-solid-900.ttf",
  "./vendor/webfonts/fa-v4compatibility.woff2",
  "./vendor/webfonts/fa-v4compatibility.ttf"
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode === 'navigate') return (await cache.match('./index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  })());
});

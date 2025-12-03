// public/sw.js
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // จำเป็นต้องมี fetch handler ถึงจะผ่านเกณฑ์ PWA
});

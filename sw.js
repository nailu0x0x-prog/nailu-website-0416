const CACHE = 'nairu-v3';

// インストール時：キャッシュせず即起動
self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

// 古いキャッシュを全削除して即コントロール
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 全リクエストをネットワーク優先（キャッシュしない）
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => new Response('offline', {status: 503})));
});

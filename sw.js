const CACHE = 'nairu-v4';

self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 同一オリジンのみ処理、外部API（Supabase等）はスルー
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// ---- プッシュ通知受信 ----
self.addEventListener('push', e => {
  let data = { title: 'ないる 観測所', message: '新しいお知らせがあるよ！' };
  try { data = e.data.json(); } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: self.location.origin }
    })
  );
});

// 通知クリックでサイトを開く
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || self.location.origin));
});

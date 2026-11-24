// Service worker for new-order desktop/phone notifications on the admin screen.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'New order', body: event.data && event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title || 'New order', {
      body: data.body || '',
      tag: data.tag || 'order',
      renotify: true,
      requireInteraction: true,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: data.url || '/admin' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes('/admin') && 'focus' in c) return c.focus();
      return clients.openWindow(url);
    })
  );
});

// Minimal fetch handler so iOS recognises this as a valid PWA service worker
self.addEventListener('fetch', function () {})

self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Pesan baru'
  const options = {
    body: data.body || '',
    icon: data.icon || '/logo-social.png',
    badge: '/logo-social.png',
    data: { url: data.url || '/' },
    requireInteraction: false,
    tag: data.tag || 'chat',
    renotify: true,
  }

  const notifyClients = self.clients
    .matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      clientList.forEach((client) => client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' }))
    })

  event.waitUntil(
    Promise.all([self.registration.showNotification(title, options), notifyClients])
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

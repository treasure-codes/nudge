self.addEventListener('push', function (event) {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Nudge Alert', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      data: { url: data.url ?? '/' },
      requireInteraction: data.urgent ?? false,
      vibrate: data.urgent ? [300, 100, 300, 100, 300] : [200],
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})

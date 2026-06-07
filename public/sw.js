self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'Svayam'
  const options = {
    body: data.body || '',
    icon: '/icons/sun.png',
    badge: '/icons/sun.png',
    data: { url: data.url || '/' },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})

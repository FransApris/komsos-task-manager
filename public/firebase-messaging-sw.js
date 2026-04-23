// Firebase Messaging Service Worker
// File ini HARUS ada di /public agar diakses di root URL /firebase-messaging-sw.js
// Menggunakan Firebase compat SDK via CDN (tidak bisa pakai import.meta.env)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBWnlLjwPRlRsI37RmSmIv_6ipVXmsUIsQ",
  authDomain: "gen-lang-client-0636649951.firebaseapp.com",
  projectId: "gen-lang-client-0636649951",
  storageBucket: "gen-lang-client-0636649951.firebasestorage.app",
  messagingSenderId: "724852657701",
  appId: "1:724852657701:web:eb2947255763d7c9b639cc",
});

const messaging = firebase.messaging();

// Handler untuk notifikasi saat app tertutup / di background
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'KOMSOS Notification';
  const body = payload.notification?.body || '';

  self.registration.showNotification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
    // Klik notifikasi → buka / fokus ke app
    actions: [{ action: 'open', title: 'Buka App' }],
  });
});

// Klik pada notifikasi → arahkan ke app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = 'https://komsos-task-manager.vercel.app';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.startsWith(url) && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

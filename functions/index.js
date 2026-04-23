/**
 * Firebase Cloud Function — FCM Push Notification Trigger
 *
 * Cara deploy:
 *   cd functions
 *   npm install
 *   cd ..
 *   firebase deploy --only functions
 *
 * Pastikan firebase.json sudah dikonfigurasi (lihat firebase.json di root project).
 * Pastikan Firebase project sudah menggunakan Blaze plan (Functions v1 gratis 125K/bulan).
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Trigger: setiap kali dokumen baru dibuat di collection 'notifications'
 * → ambil FCM token user target → kirim push notification ke device mereka
 */
exports.sendFCMOnNotification = functions.firestore
  .document('notifications/{notifId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return null;

    const { userId, title, message } = data;
    if (!userId || !title) return null;

    try {
      // Ambil FCM token dari dokumen user
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) return null;

      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) {
        // User belum memberikan izin notifikasi atau belum login via PWA
        return null;
      }

      const fcmMessage = {
        token: fcmToken,
        notification: {
          title: title,
          body: message || '',
        },
        webpush: {
          notification: {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            requireInteraction: false,
          },
          fcm_options: {
            link: 'https://komsos-task-manager.vercel.app',
          },
        },
      };

      await messaging.send(fcmMessage);
      console.log(`[FCM] Notifikasi terkirim ke user: ${userId}`);
    } catch (error) {
      // Token tidak valid (user uninstall / revoke permission) → hapus token
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        await db.collection('users').doc(userId).update({ fcmToken: null });
        console.log(`[FCM] Token invalid dihapus untuk user: ${userId}`);
      } else {
        console.error('[FCM] Error kirim notifikasi:', error);
      }
    }

    return null;
  });

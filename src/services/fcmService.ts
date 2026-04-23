import { getMessagingInstance, getToken, onMessage, db, doc, updateDoc } from '../firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

/**
 * Minta izin notifikasi dari user, ambil FCM token, simpan ke Firestore.
 * Dipanggil sekali setelah login berhasil.
 */
export const registerFCMToken = async (uid: string): Promise<void> => {
  try {
    if (!('Notification' in window)) return;
    if (!VAPID_KEY) {
      console.warn('[FCM] VITE_FIREBASE_VAPID_KEY belum diset. Push notification tidak aktif.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const messaging = getMessagingInstance();
    if (!messaging) return;

    // Service worker firebase-messaging-sw.js harus sudah terdaftar
    const swReg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    }
  } catch (error) {
    console.error('[FCM] Gagal mendaftarkan token:', error);
  }
};

/**
 * Hapus FCM token dari Firestore saat logout.
 */
export const clearFCMToken = async (uid: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', uid), { fcmToken: null });
  } catch (_) {
    // Silent fail
  }
};

/**
 * Daftarkan handler untuk pesan FCM saat app sedang TERBUKA (foreground).
 * Menampilkan browser Notification langsung tanpa service worker.
 * Kembalikan fungsi unsubscribe.
 */
export const initForegroundMessaging = (
  onNotification: (title: string, body: string) => void
): (() => void) => {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'Notifikasi Baru';
    const body = payload.notification?.body ?? '';
    onNotification(title, body);

    // Juga tampilkan sebagai browser Notification jika izin diberikan
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });
    }
  });

  return unsubscribe;
};

import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";

/**
 * Mengirim notifikasi ke semua Admin ketika ada aktivitas penting
 */
export const sendNotificationToAdmins = async (title: string, message: string) => {
  try {
    // Cari user dengan role Admin sesuai daftar di firestore.rules
    const adminQuery = query(
      collection(db, "users"), 
      where("role", "in", ["SUPERADMIN", "ADMIN_MULTIMEDIA", "ADMIN_PHOTO_VIDEO", "ADMIN_PUBLICATION"])
    );
    
    const adminSnapshot = await getDocs(adminQuery);

    // Kirim notifikasi ke setiap Admin
    const promises = adminSnapshot.docs.map(adminDoc => {
      return addDoc(collection(db, "notifications"), {
        userId: adminDoc.id,
        title: title,
        message: message,
        read: false, // Status awal belum dibaca
        createdAt: serverTimestamp() // Wajib agar lolos isValidNotification
      });
    });

    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "notifications");
  }
};

/**
 * Memantau notifikasi yang belum dibaca milik user yang sedang login
 */
export const subscribeToUnreadNotifications = (callback: (notifications: any[]) => void) => {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    collection(db, "notifications"),
    where("userId", "==", user.uid), // Memenuhi aturan isOwner
    where("read", "==", false),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(notifs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "notifications");
  });
};

/**
 * Menandai notifikasi sebagai sudah dibaca
 */
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    // Hanya mengubah field 'read', field lain tetap immutable sesuai rules
    await updateDoc(notifRef, { read: true }); 
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
};

/**
 * Menghapus notifikasi dari database
 * Hanya bisa dilakukan oleh pemilik (userId) atau Admin
 */
export const deleteNotification = async (notificationId: string) => {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    await deleteDoc(notifRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notificationId}`);
  }
};
/**
 * Menghapus semua notifikasi milik user yang sedang login
 */
export const deleteAllNotifications = async () => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. Cari semua notifikasi milik user ini
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;

    // 2. Gunakan Batch untuk penghapusan massal (lebih efisien)
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, "notifications");
  }
};
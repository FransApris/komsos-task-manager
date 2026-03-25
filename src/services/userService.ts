import { db } from "../firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { UserAccount } from "../types";

/**
 * Mengambil data profil pengguna berdasarkan UID
 */
export const getUserData = async (userId: string): Promise<UserAccount | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as UserAccount;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};

/**
 * Sinkronisasi Akun (Sangat Penting)
 * Fungsi ini memastikan UID dari Firebase Auth sama dengan dokumen di Firestore.
 * Jika dokumen belum ada, fungsi ini akan membuatnya secara otomatis.
 */
export const syncUserAccount = async (authUser: any) => {
  if (!authUser) return null;

  try {
    const userRef = doc(db, "users", authUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // Jika user baru, buatkan dokumen profil default
      const newUser: Partial<UserAccount> = {
        uid: authUser.uid,
        displayName: authUser.displayName || "Anggota Komsos",
        email: authUser.email,
        img: authUser.photoURL || "1", // "1" sebagai ID avatar default
        role: "USER", // Role default untuk anggota baru
        status: "PENDING", // Status default untuk anggota baru
        createdAt: serverTimestamp(),
        notificationPrefs: {
          taskUpdates: true,
          chatMessages: true,
          massSchedule: true,
          systemAlerts: false
        }
      };

      await setDoc(userRef, newUser);
      return { id: authUser.uid, ...newUser } as UserAccount;
    }

    return { id: snap.id, ...snap.data() } as UserAccount;
  } catch (error) {
    console.error("Error syncing user account:", error);
    throw error;
  }
};

/**
 * Memperbarui preferensi notifikasi (Toggle On/Off)
 */
export const updateNotificationPrefs = async (userId: string, prefs: any) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      notificationPrefs: prefs,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating notification prefs:", error);
    throw error;
  }
};

/**
 * Memperbarui profil dasar (Nama, Foto, Bio)
 */
export const updateUserProfile = async (userId: string, data: Partial<UserAccount>) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...data,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

import { db } from "../firebase";
import { 
  collection, addDoc, query, where, 
  onSnapshot, serverTimestamp, getDocs 
} from "firebase/firestore";

/**
 * Memberikan lencana kepada anggota (Hanya Admin)
 */
export const awardBadge = async (userId: string, badgeName: string, iconType: string) => {
  try {
    return await addDoc(collection(db, "badges"), {
      userId: userId,
      name: badgeName,
      icon: iconType,
      awardedAt: serverTimestamp() // Audit waktu pemberian
    });
  } catch (error) {
    console.error("Gagal memberikan lencana:", error);
    throw error;
  }
};

/**
 * Memantau lencana milik user tertentu secara real-time
 */
export const subscribeToUserBadges = (userId: string, callback: (badges: any[]) => void) => {
  const q = query(collection(db, "badges"), where("userId", "==", userId));
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
};
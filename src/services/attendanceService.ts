import { db, auth } from "../firebase";
import { 
  collection, addDoc, serverTimestamp, query, where, getDocs 
} from "firebase/firestore";

/**
 * Mencatat kehadiran petugas (Check-in)
 * @param targetId ID dari Tugas atau Jadwal Misa
 * @param targetType Jenis absensi: "TASK" atau "MASS"
 */
export const checkInAttendance = async (targetId: string, targetType: "TASK" | "MASS") => {
  const user = auth.currentUser;
  if (!user) throw new Error("Silakan login terlebih dahulu.");

  try {
    // 1. Cek apakah user sudah absen untuk target ini agar tidak ganda
    const q = query(
      collection(db, "attendance"),
      where("targetId", "==", targetId),
      where("userId", "==", user.uid)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      throw new Error("Anda sudah melakukan check-in.");
    }

    // 2. Simpan data absensi sesuai blueprint
    return await addDoc(collection(db, "attendance"), {
      targetId: targetId,
      targetType: targetType,
      userId: user.uid,
      checkInTime: serverTimestamp(), // Wajib untuk integritas data
      status: "PRESENT" // Status default saat check-in
    });
  } catch (error: any) {
    console.error("Gagal absensi:", error.message);
    throw error;
  }
};
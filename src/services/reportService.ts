import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, addDoc, getDocs, query, 
  where, serverTimestamp 
} from "firebase/firestore";

/**
 * Membuat laporan bulanan otomatis berdasarkan aktivitas tugas
 */
export const generateUsageReport = async (title: string, period: string) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // 1. Ambil semua tugas yang sudah selesai
    const taskQuery = query(collection(db, "tasks"), where("status", "==", "COMPLETED"));
    const taskSnap = await getDocs(taskQuery);
    
    // 2. Ambil data user aktif untuk statistik
    const userSnap = await getDocs(collection(db, "users"));

    // 3. Susun data laporan sesuai blueprint
    const reportData = {
      title: title,
      period: period,
      summary: `Laporan aktivitas multimedia Komsos untuk periode ${period}.`,
      stats: {
        totalTasks: taskSnap.size,
        completedTasks: taskSnap.size,
        activeUsers: userSnap.size
      },
      generatedBy: user.uid, // ID Admin pembuat
      createdAt: serverTimestamp() // Wajib untuk rules
    };

    const docRef = await addDoc(collection(db, "reports"), reportData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "reports");
  }
};
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export const getLeaderboardData = async () => {
  try {
    // 1. Ambil semua tugas yang sudah selesai
    const taskQuery = query(collection(db, "tasks"), where("status", "==", "COMPLETED"));
    const taskSnap = await getDocs(taskQuery);

    // 2. Hitung poin per user (1 tugas = 1 poin)
    const pointsMap: Record<string, number> = {};
    taskSnap.docs.forEach(doc => {
      const data = doc.data();
      // Loop melalui assignedUsers karena satu tugas bisa dikerjakan tim
      data.assignedUsers?.forEach((uid: string) => {
        pointsMap[uid] = (pointsMap[uid] || 0) + 1;
      });
    });

    // 3. Ambil data profil user untuk nama & foto
    const userSnap = await getDocs(collection(db, "users"));
    const leaders = userSnap.docs
      .map(doc => ({
        uid: doc.id,
        name: doc.data().name,
        img: doc.data().img,
        points: pointsMap[doc.id] || 0
      }))
      .filter(u => u.points > 0) // Hanya tampilkan yang punya poin
      .sort((a, b) => b.points - a.points); // Urutkan dari yang terbanyak

    return leaders.slice(0, 10); // Ambil Top 10
  } catch (error) {
    console.error("Gagal mengambil leaderboard:", error);
    throw error;
  }
};
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType,
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  arrayUnion,
  increment
} from "../firebase";
import { sendNotificationToAdmins } from "./notificationService";

/**
 * 1. MENAMBAH TUGAS BARU (Hanya untuk Role ADMIN)
 */
export const addTask = async (
  title: string, 
  type: string, 
  date: string, 
  time: string, 
  description: string = "",
  requiredEquipment: string[] = [], 
  teamLeaderId: string = "",         
  linkedScheduleId: string = "",    // <-- TAMBAHAN: ID Agenda
  linkedScheduleTitle: string = ""  // <-- TAMBAHAN: Judul Agenda
) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Silakan login terlebih dahulu.");

    const newTask = {
      title,
      description,
      type,
      date,
      time,
      status: "IN_PROGRESS",
      assignedUsers: teamLeaderId ? [teamLeaderId] : [], 
      teamLeaderId,
      requiredEquipment, 
      linkedScheduleId,     // <-- Disimpan ke Firebase
      linkedScheduleTitle,  // <-- Disimpan ke Firebase
      createdBy: user.uid,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "tasks"), newTask);
    return docRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, 'tasks');
    throw error;
  }
};

/**
 * 2. MEMBACA DAFTAR TUGAS (Real-time)
 */
export const subscribeToTasks = (callback: (tasks: any[]) => void) => {
  const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'tasks');
  });
};

/**
 * 3. MEMPERBARUI STATUS TUGAS
 */
export const updateTaskStatus = async (taskId: string, newStatus: 'IN_PROGRESS' | 'WAITING_VERIFICATION' | 'COMPLETED') => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    
    await updateDoc(taskRef, {
      status: newStatus
    });
    
    return true;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    throw error;
  }
};

/**
 * 4. MENUGASKAN ANGGOTA KE TUGAS
 */
export const assignUserToTask = async (taskId: string, userId: string, taskTitle: string, userName: string) => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    
    await updateDoc(taskRef, {
      assignedUsers: arrayUnion(userId)
    });

    // Pemicu Notifikasi untuk Admin
    await sendNotificationToAdmins(
      "Tugas Baru DIAMBIL",
      `${userName} telah mendaftarkan diri untuk tugas: ${taskTitle}`
    );

    return true;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    throw error;
  }
};

/**
 * 5. MEMBATALKAN VERIFIKASI & MENARIK POIN (Hanya SUPERADMIN)
 */
export const revokeTaskPoints = async (task: any, currentUser: any) => {
  try {
    const taskRef = doc(db, 'tasks', task.id);
    
    // 1. Kembalikan status tugas & Tambah riwayat
    const historyEntry = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'SYSTEM',
      message: `Verifikasi dibatalkan dan poin ditarik kembali oleh Superadmin (${currentUser?.displayName})`,
      userId: currentUser?.uid,
      userName: currentUser?.displayName,
      createdAt: new Date().toISOString()
    };

    await updateDoc(taskRef, {
      status: 'WAITING_VERIFICATION',
      updatedAt: serverTimestamp(),
      history: arrayUnion(historyEntry)
    });

    // 2. Tarik balik poin & skill
    if (task.assignedUsers && task.assignedUsers.length > 0) {
      for (const uid of task.assignedUsers) {
        const isLeader = task.teamLeaderId === uid;
        const pointsToDeduct = isLeader ? 75 : 50;
        
        const userRef = doc(db, 'users', uid);
        
        const userUpdate: any = {
          points: increment(-pointsToDeduct),
          xp: increment(-pointsToDeduct),
          completedTasksCount: increment(-1)
        };

        const typeLower = task.type?.toLowerCase() || '';
        if (typeLower.includes('dokumentasi') || typeLower.includes('foto')) {
          userUpdate['stats.photography'] = increment(-10);
        } else if (typeLower.includes('peliputan') || typeLower.includes('video') || typeLower.includes('obs')) {
          userUpdate['stats.videography'] = increment(-10);
        } else if (typeLower.includes('publikasi') || typeLower.includes('nulis') || typeLower.includes('artikel')) {
          userUpdate['stats.writing'] = increment(-10);
        } else if (typeLower.includes('desain') || typeLower.includes('design')) {
          userUpdate['stats.design'] = increment(-10);
        }

        await updateDoc(userRef, userUpdate);

        // Kirim notifikasi penarikan poin
        await addDoc(collection(db, 'notifications'), {
          userId: uid,
          title: '⚠️ Poin Tugas Ditarik Kembali',
          message: `Verifikasi untuk tugas "${task.title}" telah dibatalkan oleh Superadmin. Poin dan skill yang Anda peroleh dari tugas ini telah ditarik kembali.`,
          type: 'ALERT',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    }
    return true;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.UPDATE, `tasks/${task.id}`);
    throw error;
  }
};

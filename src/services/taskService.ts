import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  arrayUnion
} from "firebase/firestore";
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
  requiredEquipment: string[] = [], // Tambahan: Array ID peralatan
  teamLeaderId: string = ""         // Tambahan: ID Ketua Tim
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
      // Jika ada ketua tim, otomatis masukkan dia ke daftar assignedUsers
      assignedUsers: teamLeaderId ? [teamLeaderId] : [], 
      teamLeaderId,
      requiredEquipment, // Simpan peralatan ke Firebase
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

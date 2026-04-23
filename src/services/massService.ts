import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, addDoc, updateDoc, doc, 
  serverTimestamp, query, orderBy, onSnapshot, arrayUnion 
} from "firebase/firestore";

/**
 * Membuat Agenda Baru (Hanya Admin)
 */
export const addMassSchedule = async (title: string, date: string, time: string, location: string) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    return await addDoc(collection(db, "massSchedules"), {
      title,
      date,
      time,
      location,
      status: "OPEN", // Status pendaftaran dibuka
      assignedUsers: [],
      createdBy: user.uid,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "massSchedules");
  }
};

/**
 * Memantau Agenda secara Real-time
 */
export const subscribeToMassSchedules = (callback: (schedules: any[]) => void) => {
  const q = query(collection(db, "massSchedules"), orderBy("date", "asc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "massSchedules");
  });
};

/**
 * Mendaftar sebagai Petugas Dokumentasi Agenda
 */
export const joinMassAssignment = async (massId: string) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const massRef = doc(db, "massSchedules", massId);
    // Diizinkan oleh rules karena hanya mengubah 'assignedUsers'
    await updateDoc(massRef, {
      assignedUsers: arrayUnion(user.uid)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `massSchedules/${massId}`);
  }
};
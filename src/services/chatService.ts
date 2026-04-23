import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, addDoc, query, where, 
  orderBy, onSnapshot, serverTimestamp 
} from "firebase/firestore";

/**
 * Mengirim pesan chat baru ke dalam sebuah tugas
 */
export const sendChatMessage = async (taskId: string, text: string) => {
  const user = auth.currentUser;
  if (!user || !text.trim()) return;

  try {
    // Memenuhi kriteria isValidChatMessage
    await addDoc(collection(db, "chatMessages"), {
      taskId: taskId,
      senderId: user.uid,
      text: text,
      createdAt: serverTimestamp() // Wajib untuk validasi rules
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, "chatMessages");
  }
};

/**
 * Memantau pesan chat dalam sebuah tugas secara real-time
 */
export const subscribeToChatMessages = (taskId: string, callback: (messages: any[]) => void) => {
  const q = query(
    collection(db, "chatMessages"),
    where("taskId", "==", taskId),
    orderBy("createdAt", "asc") // Urutkan dari pesan terlama ke terbaru
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(messages);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "chatMessages");
  });
};
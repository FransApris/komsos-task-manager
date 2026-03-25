import { db, handleFirestoreError, OperationType } from "../firebase";
import { 
  collection, query, onSnapshot, 
  doc, updateDoc, serverTimestamp 
} from "firebase/firestore";

/**
 * Memantau daftar peralatan secara real-time
 */
export const subscribeToInventory = (callback: (items: any[]) => void) => {
  const q = query(collection(db, "inventory"));
  
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "inventory");
  });
};

/**
 * Memperbarui status alat (Hanya Admin)
 */
export const updateItemStatus = async (itemId: string, status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN', assignedTo: string | null = null) => {
  try {
    const itemRef = doc(db, "inventory", itemId);
    await updateDoc(itemRef, {
      status: status,
      assignedTo: assignedTo,
      lastChecked: serverTimestamp() // Wajib untuk validasi rules
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `inventory/${itemId}`);
  }
};
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Screen, UserAccount, Task } from '../types';

// HANYA ambil db dari file firebase lokal Anda
import { db } from '../firebase'; 

// AMBIL fungsi Firestore langsung dari library resminya agar tidak error
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  orderBy 
} from 'firebase/firestore'; 

import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion'; // Ganti ke framer-motion jika motion/react error

export const SwapRequestScreen: React.FC<{ 
  onNavigate: (s: Screen) => void,
  user?: UserAccount | null,
  tasksDb?: Task[]
}> = ({ onNavigate, user, tasksDb = [] }) => {
  const [activeTab, setActiveTab] = useState<'MINE' | 'BURSA'>('MINE');
  const [showModal, setShowModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  // Array identitas untuk memastikan sinkronisasi Dashboard
  const myIds = [user?.uid, user?.id, user?.email].filter((id): id is string => Boolean(id));

  useEffect(() => {
    // Memastikan data swapRequests diambil secara real-time
    const q = query(collection(db, 'swapRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const myRequests = requests.filter(r => myIds.includes(r.requesterId));
  const tasksInBursaIds = myRequests.filter(r => r.status === 'OPEN' || r.status === 'PENDING_APPROVAL').map(r => r.taskId);

  const mySwappableTasks = tasksDb.filter(t => {
    const isAssignedToMe = t.assignedUsers?.some(userId => myIds.includes(userId));
    const isNotCompleted = t.status !== 'COMPLETED';
    const notYetInBursa = !tasksInBursaIds.includes(t.id);
    return isAssignedToMe && isNotCompleted && notYetInBursa;
  });

  const bursaRequests = requests.filter(r => {
    if (myIds.includes(r.requesterId)) return false; 
    if (r.status !== 'OPEN') return false;             
    const taskTerkait = tasksDb.find(t => t.id === r.taskId);
    if (taskTerkait && taskTerkait.assignedUsers?.some(userId => myIds.includes(userId))) return false;
    return true;
  });

  const handleCreateRequest = async () => {
    if (!selectedTaskId || !reason.trim()) {
      toast.error('Pilih tugas dan isi alasan.');
      return;
    }
    const taskToSwap = tasksDb.find(t => t.id === selectedTaskId);
    const userId = user?.uid || user?.id;

    if (!taskToSwap || !userId) return;

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'swapRequests'), {
        taskId: taskToSwap.id,
        taskTitle: taskToSwap.title,
        taskDate: taskToSwap.date,
        taskTime: taskToSwap.time,
        requesterId: userId, 
        requesterName: user?.displayName || 'Petugas',
        reason: reason,
        status: 'OPEN', 
        createdAt: serverTimestamp()
      });
      toast.success('Permintaan dikirim ke bursa.');
      setShowModal(false);
      setSelectedTaskId('');
      setReason('');
    } catch (error) {
      toast.error('Gagal membuat permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSwap = async (req: any) => {
    const userId = user?.uid || user?.id;
    if (!userId) return;
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'PENDING_APPROVAL',
        acceptedById: userId,
        acceptedByName: user?.displayName || 'Petugas',
        updatedAt: serverTimestamp()
      });
      toast.success('Menunggu persetujuan koordinator.');
    } catch (error) {
      toast.error('Gagal memproses kesepakatan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white relative">
      {/* UI Render Tetap Sama */}
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Bursa Pertukaran</h1>
      </header>

      {/* Bagian Tab dan Konten */}
      <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
        <button onClick={() => setActiveTab('MINE')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'MINE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500'}`}>Permintaan Saya</button>
        <button onClick={() => setActiveTab('BURSA')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BURSA' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500'}`}><RefreshCw className="w-4 h-4" /> Bursa Tukar</button>
      </div>

      <div className="p-5">
        {activeTab === 'MINE' ? (
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                <p className="text-gray-500">Belum ada permintaan.</p>
              </div>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500' : req.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white pr-4">{req.taskTitle}</h4>
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-500'}`}>{req.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400 italic">"{req.reason}"</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Render Bursa Requests */}
            {bursaRequests.map(req => (
              <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{req.requesterName} Butuh Bantuan</span>
                <h4 className="font-extrabold text-white text-lg mb-2">{req.taskTitle}</h4>
                <button onClick={() => handleAcceptSwap(req)} disabled={isLoading} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl active:scale-95 disabled:opacity-50">Ambil Alih Tugas</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-24 right-5 z-30">
        <button onClick={() => setShowModal(true)} className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-lg transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      {/* Modal Buat Permintaan Tetap Sama */}
    </div>
  );
};

export default SwapRequestScreen;
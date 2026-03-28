import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Screen, UserAccount, Task } from '../types';
import { db } from '../firebase';
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
import { motion, AnimatePresence } from 'framer-motion'; // Menggunakan framer-motion yang lebih stabil

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

  // Sinkronisasi ID user agar tugas "Minggu Palma II" terdeteksi
  const currentUserId = user?.uid || user?.id || "";

  useEffect(() => {
    const q = query(collection(db, 'swapRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Connection error:", error);
    });
    return () => unsub();
  }, []);

  const myRequests = requests.filter(r => r.requesterId === currentUserId);
  const tasksInBursaIds = myRequests.filter(r => r.status === 'OPEN' || r.status === 'PENDING_APPROVAL').map(r => r.taskId);

  // Filter Dropdown yang sinkron dengan Dashboard
  const mySwappableTasks = tasksDb.filter(t => {
    const isAssigned = t.assignedUsers && t.assignedUsers.includes(currentUserId);
    const isNotCompleted = t.status !== 'COMPLETED';
    const notInBursa = !tasksInBursaIds.includes(t.id);
    return isAssigned && isNotCompleted && notInBursa;
  });

  const handleCreateRequest = async () => {
    if (!selectedTaskId || !reason.trim()) {
      toast.error('Lengkapi data Anda.');
      return;
    }
    setIsLoading(true);
    try {
      const task = tasksDb.find(t => t.id === selectedTaskId);
      await addDoc(collection(db, 'swapRequests'), {
        taskId: task?.id,
        taskTitle: task?.title,
        taskDate: task?.date,
        taskTime: task?.time,
        requesterId: currentUserId,
        requesterName: user?.displayName || 'Petugas',
        reason: reason,
        status: 'OPEN', 
        createdAt: serverTimestamp()
      });
      toast.success('Permintaan terkirim.');
      setShowModal(false);
      setSelectedTaskId('');
      setReason('');
    } catch (error) {
      toast.error('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSwap = async (req: any) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'PENDING_APPROVAL',
        acceptedById: currentUserId,
        acceptedByName: user?.displayName || 'Petugas',
        updatedAt: serverTimestamp()
      });
      toast.success('Menunggu persetujuan koordinator.');
    } catch (error) {
      toast.error('Gagal memproses.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white relative">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Bursa Pertukaran</h1>
      </header>

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
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500' : 'bg-amber-500'}`}></div>
                  <h4 className="font-bold text-white pr-4">{req.taskTitle}</h4>
                  <p className="text-xs text-gray-400 mt-2 italic">"{req.reason}"</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.filter(r => r.requesterId !== currentUserId && r.status === 'OPEN').map(req => (
              <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                <h4 className="font-extrabold text-white text-lg">{req.taskTitle}</h4>
                <button onClick={() => handleAcceptSwap(req)} disabled={isLoading} className="w-full mt-4 py-3 bg-amber-500 text-black font-bold rounded-xl">Ambil Alih</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-24 right-5 z-30">
        <button onClick={() => setShowModal(true)} className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-lg">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full max-w-md bg-[#151b2b] rounded-t-3xl border border-gray-800 p-6 pb-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white">Buat Permintaan</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none">
                  <option value="" disabled>-- Pilih Tugas Anda --</option>
                  {mySwappableTasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.date})</option>)}
                </select>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pertukaran..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white h-28 resize-none focus:border-amber-500 outline-none" />
                <button onClick={handleCreateRequest} disabled={isLoading || !selectedTaskId || !reason.trim()} className="w-full py-4 font-bold text-black bg-amber-500 rounded-xl disabled:opacity-50">Kirim ke Bursa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwapRequestScreen;
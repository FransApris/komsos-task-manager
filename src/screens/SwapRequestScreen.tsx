import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { Screen, UserAccount, Task } from '../types';

// Pastikan impor Firestore berasal dari library firebase asli untuk menghindari error build
import { db, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc } from '../firebase';
import { arrayUnion, orderBy, arrayRemove } from 'firebase/firestore'; 

import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

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

  // KUNCI SINKRONISASI: Gunakan ID yang konsisten untuk pengecekan tugas
  const currentUserId = user?.uid || user?.id;

  // 1. Ambil Data Bursa secara Real-time agar status 'ACCEPTED' langsung terdeteksi
  useEffect(() => {
    const q = query(collection(db, 'swapRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // --- LOGIKA SINKRONISASI DAFTAR TUGAS ---
  
  // Filter Permintaan Saya
  const myRequests = requests.filter(r => r.requesterId === currentUserId);
  const myOpenRequestsTaskIds = myRequests.filter(r => r.status === 'OPEN').map(r => r.taskId);

  // Dropdown hanya menampilkan tugas yang benar-benar milik user DAN belum ada di bursa
  const mySwappableTasks = tasksDb.filter(t => 
    t.status === 'IN_PROGRESS' && 
    currentUserId && t.assignedUsers?.includes(currentUserId) &&
    !myOpenRequestsTaskIds.includes(t.id) 
  );

  // Filter Bursa Tukar: Jangan tampilkan tugas yang user sudah ada di dalamnya
  const bursaRequests = requests.filter(r => {
    if (r.requesterId === currentUserId) return false; 
    if (r.status !== 'OPEN') return false;             
    
    const taskTerkait = tasksDb.find(t => t.id === r.taskId);
    if (taskTerkait && currentUserId && taskTerkait.assignedUsers?.includes(currentUserId)) {
      return false; 
    }
    
    return true;
  });

  const handleCreateRequest = async () => {
    if (!selectedTaskId || !reason.trim()) {
      toast.error('Pilih tugas dan isi alasan Anda.');
      return;
    }

    const taskToSwap = tasksDb.find(t => t.id === selectedTaskId);
    if (!taskToSwap || !currentUserId) return;

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'swapRequests'), {
        taskId: taskToSwap.id,
        taskTitle: taskToSwap.title,
        taskDate: taskToSwap.date,
        taskTime: taskToSwap.time,
        taskType: taskToSwap.type,
        requesterId: currentUserId,
        requesterName: user?.displayName || 'Petugas',
        reason: reason,
        status: 'OPEN', 
        createdAt: serverTimestamp()
      });
      
      toast.success('Permintaan berhasil dilempar ke Bursa!');
      setShowModal(false);
      setSelectedTaskId('');
      setReason('');
      setActiveTab('MINE');
    } catch (error) {
      console.error(error);
      toast.error('Gagal membuat permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSwap = async (req: any) => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      const taskTerkait = tasksDb.find(t => t.id === req.taskId);
      if (!taskTerkait) throw new Error("Tugas tidak ditemukan");

      // A. Update Permintaan di Bursa
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'ACCEPTED',
        acceptedById: currentUserId,
        acceptedByName: user?.displayName || 'Petugas',
        updatedAt: serverTimestamp()
      });

      // B. Update Daftar Petugas di Koleksi Tasks (Hapus Pemohon, Tambah Pengganti)
      // Kita memfilter manual array-nya untuk memastikan sinkronisasi ID yang akurat
      const newAssigned = (taskTerkait.assignedUsers || []).filter(id => id !== req.requesterId);
      if (!newAssigned.includes(currentUserId)) {
        newAssigned.push(currentUserId);
      }

      const updateData: any = {
        assignedUsers: newAssigned,
        history: arrayUnion({
          id: Date.now().toString(),
          message: `Pertukaran: ${req.requesterName} digantikan oleh ${user?.displayName || 'Petugas'}`,
          userName: 'Sistem Bursa',
          createdAt: new Date().toISOString()
        })
      };

      // C. Update Ketua Tim jika pemohon adalah ketua
      if (taskTerkait.teamLeaderId === req.requesterId) {
        updateData.teamLeaderId = currentUserId;
      }

      await updateDoc(doc(db, 'tasks', req.taskId), updateData);

      toast.success(`Berhasil menggantikan tugas ${req.taskTitle}!`);
      setActiveTab('MINE');
    } catch (error) {
      console.error(error);
      toast.error('Gagal memproses pertukaran.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white relative">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Bursa Pertukaran</h1>
      </header>

      <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
        <button onClick={() => setActiveTab('MINE')} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'MINE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          Permintaan Saya
        </button>
        <button onClick={() => setActiveTab('BURSA')} className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BURSA' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
          <RefreshCw className="w-4 h-4" /> Bursa Tukar
        </button>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'MINE' ? (
            <motion.div key="mine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {myRequests.length === 0 ? (
                <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                  <RefreshCw className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Belum ada permintaan pertukaran.</p>
                </div>
              ) : (
                myRequests.map(req => (
                  <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white pr-4">{req.taskTitle}</h4>
                      <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${req.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        {req.status === 'ACCEPTED' ? 'Selesai' : 'Menunggu'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{req.taskDate} • {req.taskTime}</p>
                    <p className="text-xs text-gray-400 italic">"{req.reason}"</p>
                    {req.status === 'ACCEPTED' && (
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                        <UserCheck className="w-3.5 h-3.5" /> Digantikan oleh {req.acceptedByName}
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="bursa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              {bursaRequests.length === 0 ? (
                <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                  <RefreshCw className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Bursa sedang kosong.</p>
                </div>
              ) : (
                bursaRequests.map(req => (
                  <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gray-800 rounded-lg"><UserX className="w-4 h-4 text-amber-500" /></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{req.requesterName} Butuh Bantuan</span>
                    </div>
                    <h4 className="font-extrabold text-white text-lg leading-tight mb-2">{req.taskTitle}</h4>
                    <div className="flex gap-4 mb-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5"><Calendar size={14} /> {req.taskDate}</div>
                      <div className="flex items-center gap-1.5"><Clock size={14} /> {req.taskTime}</div>
                    </div>
                    <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-4">
                      <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
                    </div>
                    <button onClick={() => handleAcceptSwap(req)} disabled={isLoading} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">
                      {isLoading ? 'Memproses...' : 'Ambil Alih Tugas'}
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-24 right-5 z-30">
        <button onClick={() => setShowModal(true)} className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full max-w-md bg-[#151b2b] rounded-t-3xl border border-gray-800 p-6 pb-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white">Buat Permintaan</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="space-y-4">
                <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none">
                  <option value="" disabled>-- Pilih Tugas Anda --</option>
                  {mySwappableTasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.date})</option>)}
                </select>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan (Contoh: Mendadak sakit...)" className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none h-28 resize-none" />
                <button onClick={handleCreateRequest} disabled={isLoading || !selectedTaskId || !reason.trim()} className="w-full py-4 font-bold text-black bg-amber-500 rounded-xl disabled:opacity-50 transition-all">
                  {isLoading ? 'Memproses...' : 'Kirim ke Bursa'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwapRequestScreen;
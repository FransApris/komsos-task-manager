import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, UserCheck, ShieldCheck, UserX } from 'lucide-react';
import { Screen, UserAccount, Task } from '../types';
import { db, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc } from '../firebase';
import { orderBy } from 'firebase/firestore'; 
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

  // Mengatasi masalah mismatch ID (uid vs id) agar sinkron dengan Dashboard
  const currentUserId = user?.uid || user?.id;

  useEffect(() => {
    const q = query(collection(db, 'swapRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Ambil semua ID tugas yang sedang dalam proses pertukaran milik user
  const myRequests = requests.filter(r => r.requesterId === currentUserId);
  const tasksInBursaIds = myRequests.filter(r => r.status === 'OPEN' || r.status === 'PENDING_APPROVAL').map(r => r.taskId);

  // SINKRONISASI DROPDOWN: Menampilkan tugas yang ditugaskan ke user dan belum selesai
  const mySwappableTasks = tasksDb.filter(t => 
    currentUserId && 
    t.assignedUsers?.includes(currentUserId) &&
    t.status !== 'COMPLETED' && 
    !tasksInBursaIds.includes(t.id) 
  );

  const bursaRequests = requests.filter(r => {
    if (r.requesterId === currentUserId) return false; 
    if (r.status !== 'OPEN') return false;             
    const taskTerkait = tasksDb.find(t => t.id === r.taskId);
    if (taskTerkait && currentUserId && taskTerkait.assignedUsers?.includes(currentUserId)) return false;
    return true;
  });

  const handleCreateRequest = async () => {
    if (!selectedTaskId || !reason.trim()) {
      toast.error('Pilih tugas dan isi alasan pertukaran.');
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
        requesterId: currentUserId,
        requesterName: user?.displayName || 'Petugas',
        reason: reason,
        status: 'OPEN', 
        createdAt: serverTimestamp()
      });
      toast.success('Permintaan pertukaran telah dikirim ke bursa.');
      setShowModal(false);
      setSelectedTaskId('');
      setReason('');
    } catch (error) {
      toast.error('Gagal mengirim ke bursa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSwap = async (req: any) => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      // Alur: Membutuhkan persetujuan koordinator
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'PENDING_APPROVAL',
        acceptedById: currentUserId,
        acceptedByName: user?.displayName || 'Petugas',
        updatedAt: serverTimestamp()
      });
      toast.success('Kesepakatan tercapai! Menunggu verifikasi koordinator.');
    } catch (error) {
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
        <h1 className="text-lg font-extrabold tracking-tight text-white">Bursa Pertukaran</h1>
      </header>

      <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
        <button onClick={() => setActiveTab('MINE')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'MINE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Permintaan Saya</button>
        <button onClick={() => setActiveTab('BURSA')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BURSA' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}><RefreshCw className="w-4 h-4" /> Bursa Tukar</button>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeTab === 'MINE' ? (
            <motion.div key="mine" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {myRequests.length === 0 ? (
                <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                  <p className="text-gray-500 text-sm font-medium">Anda belum memiliki permintaan pertukaran.</p>
                </div>
              ) : (
                myRequests.map(req => (
                  <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500' : req.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white text-sm">{req.taskTitle}</h4>
                      <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500/20 text-blue-400' : req.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{req.taskDate} • {req.taskTime}</p>
                    <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800">
                      <p className="text-xs text-gray-400 italic">"{req.reason}"</p>
                    </div>
                    {req.status === 'PENDING_APPROVAL' && (
                      <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                        <ShieldCheck className="w-3.5 h-3.5" /> Menunggu persetujuan koordinator agar digantikan oleh {req.acceptedByName}
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="bursa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300 leading-relaxed">Bantu temanmu dengan mengambil alih tugas mereka jika kamu memiliki waktu luang.</p>
              </div>
              {bursaRequests.length === 0 ? (
                <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                  <p className="text-gray-500 text-sm font-medium">Bursa pertukaran sedang kosong.</p>
                </div>
              ) : (
                bursaRequests.map(req => (
                  <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">{req.requesterName} butuh bantuan</span>
                    <h4 className="font-extrabold text-white text-lg mb-3">{req.taskTitle}</h4>
                    <div className="flex gap-4 mb-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1.5"><Calendar size={14} /> {req.taskDate}</div>
                      <div className="flex items-center gap-1.5"><Clock size={14} /> {req.taskTime}</div>
                    </div>
                    <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-4">
                      <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
                    </div>
                    <button onClick={() => handleAcceptSwap(req)} disabled={isLoading} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50">Ambil Alih Tugas</button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-24 right-5 z-30">
        <button onClick={() => setShowModal(true)} className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-xl shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm p-5">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full max-w-md bg-[#151b2b] rounded-3xl border border-gray-800 p-6 pb-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white">Buat Permintaan</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pilih Tugas Anda</label>
                  {mySwappableTasks.length === 0 ? (
                    <div className="p-4 bg-[#0a0f18] rounded-xl border border-gray-800 text-[11px] text-gray-500 text-center italic">Tidak ada tugas aktif yang bisa ditukar.</div>
                  ) : (
                    <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-4 text-sm text-white focus:border-amber-500 outline-none">
                      <option value="" disabled>-- Pilih Tugas Anda --</option>
                      {mySwappableTasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.date})</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Alasan Pertukaran</label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tuliskan alasan atau pesan untuk calon pengganti..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-4 text-sm text-white h-32 resize-none focus:border-amber-500 outline-none" />
                </div>
                <button onClick={handleCreateRequest} disabled={isLoading || !selectedTaskId || !reason.trim()} className="w-full py-5 font-black text-black bg-amber-500 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition-all uppercase tracking-widest text-xs">Kirim ke Bursa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwapRequestScreen;
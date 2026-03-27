import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { Screen, UserAccount, Task } from '../types';

// --- PERBAIKAN IMPOR ADA DI SINI ---
import { db, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc } from '../firebase';
import { arrayRemove, arrayUnion, orderBy } from 'firebase/firestore'; 

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

  // 1. Ambil Data Bursa secara Real-time
  useEffect(() => {
    const q = query(collection(db, 'swapRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Filter tugas milik user yang sedang aktif
  const myActiveTasks = tasksDb.filter(t => 
    t.status === 'IN_PROGRESS' && user && t.assignedUsers?.includes(user.uid)
  );

  // Pemisahan Data Tab
  const myRequests = requests.filter(r => r.requesterId === user?.uid);
  const bursaRequests = requests.filter(r => r.requesterId !== user?.uid && r.status === 'OPEN');

  // 2. Fungsi Membuat Permintaan Baru
  const handleCreateRequest = async () => {
    if (!selectedTaskId || !reason.trim()) {
      toast.error('Pilih tugas dan isi alasan Anda.');
      return;
    }

    const taskToSwap = tasksDb.find(t => t.id === selectedTaskId);
    if (!taskToSwap || !user) return;

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'swapRequests'), {
        taskId: taskToSwap.id,
        taskTitle: taskToSwap.title,
        taskDate: taskToSwap.date,
        taskTime: taskToSwap.time,
        taskType: taskToSwap.type,
        requesterId: user.uid,
        requesterName: user.displayName,
        reason: reason,
        status: 'OPEN', // OPEN, ACCEPTED
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

  // 3. Fungsi Mengambil Alih Tugas Orang Lain
  const handleAcceptSwap = async (req: any) => {
    if (!user) return;
    setIsLoading(true);
    try {
      // A. Update Status Permintaan di Bursa
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'ACCEPTED',
        acceptedById: user.uid,
        acceptedByName: user.displayName,
        updatedAt: serverTimestamp()
      });

      // B. Tukar Nama di Database Tugas (Tasks)
      await updateDoc(doc(db, 'tasks', req.taskId), {
        assignedUsers: arrayRemove(req.requesterId), // Hapus yang minta tolong
      });
      await updateDoc(doc(db, 'tasks', req.taskId), {
        assignedUsers: arrayUnion(user.uid),         // Masukkan sang pahlawan penolong
      });

      // C. Tambah Riwayat Perubahan
      const taskRef = doc(db, 'tasks', req.taskId);
      await updateDoc(taskRef, {
        history: arrayUnion({
          id: Date.now().toString(),
          message: `Posisi ${req.requesterName} digantikan oleh ${user.displayName} (Via Bursa)`,
          userName: user.displayName,
          createdAt: new Date().toISOString()
        })
      });

      toast.success(`Berhasil! Anda sekarang bertugas untuk ${req.taskTitle}`);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil alih tugas.');
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

      {/* TABS */}
      <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
        <button 
          onClick={() => setActiveTab('MINE')}
          className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'MINE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Permintaan Saya
        </button>
        <button 
          onClick={() => setActiveTab('BURSA')}
          className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BURSA' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
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
                  <p className="text-gray-500 font-medium">Anda belum memiliki permintaan pertukaran.</p>
                </div>
              ) : (
                myRequests.map(req => (
                  <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 relative overflow-hidden">
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-bold text-white leading-tight pr-4">{req.taskTitle}</h4>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider shrink-0 ${req.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        {req.status === 'ACCEPTED' ? 'Sudah Diambil' : 'Menunggu'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-4">"{req.reason}"</p>
                    {req.status === 'ACCEPTED' && (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                        <UserCheck className="w-4 h-4" />
                        Tugas ini telah diambil alih oleh {req.acceptedByName}.
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div key="bursa" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300 leading-relaxed">
                  Daftar di bawah adalah teman-teman yang membutuhkan pengganti untuk tugas mereka. 
                  Jika Anda memiliki waktu luang, bantu mereka dengan mengambil alih tugasnya.
                </p>
              </div>

              {bursaRequests.length === 0 ? (
                <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                  <RefreshCw className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Bursa pertukaran sedang kosong.</p>
                </div>
              ) : (
                bursaRequests.map(req => (
                  <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-gray-800 rounded-lg"><UserX className="w-4 h-4 text-amber-500" /></div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{req.requesterName} Butuh Bantuan</span>
                    </div>
                    <h4 className="font-extrabold text-white text-lg leading-tight mb-2">{req.taskTitle}</h4>
                    
                    <div className="flex gap-4 mb-3 text-xs text-gray-400 font-medium">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {req.taskDate}</div>
                      <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {req.taskTime}</div>
                    </div>
                    
                    <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-4">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Alasan / Pesan:</p>
                      <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
                    </div>

                    <button 
                      onClick={() => handleAcceptSwap(req)}
                      disabled={isLoading}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {isLoading ? 'Memproses...' : 'Saya Bersedia Menggantikan'}
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- TOMBOL FLOATING UNTUK MEMBUAT PERMINTAAN --- */}
      <div className="fixed bottom-24 right-5 z-30">
        <button 
          onClick={() => setShowModal(true)}
          className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* --- MODAL BUAT PERMINTAAN BARU --- */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md bg-[#151b2b] rounded-t-3xl sm:rounded-3xl border border-gray-800 p-6 pb-10 sm:pb-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black text-white">Buat Permintaan</h3>
                  <p className="text-xs text-gray-500 mt-1">Lempar tugas Anda ke bursa pertukaran.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 bg-gray-800 text-gray-400 rounded-full hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Pilih Tugas yang Ingin Ditukar</label>
                  {myActiveTasks.length === 0 ? (
                    <div className="p-4 bg-[#0a0f18] rounded-xl border border-gray-800 text-sm text-gray-400 text-center">
                      Anda tidak memiliki tugas aktif yang bisa ditukar.
                    </div>
                  ) : (
                    <select 
                      value={selectedTaskId}
                      onChange={(e) => setSelectedTaskId(e.target.value)}
                      className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none"
                    >
                      <option value="" disabled>-- Pilih Tugas --</option>
                      {myActiveTasks.map(t => (
                        <option key={t.id} value={t.id}>{t.title} ({t.date})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Alasan / Pesan untuk Pengganti</label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contoh: Maaf saya mendadak sakit, mohon bantuannya teman-teman..."
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none h-28 resize-none"
                  />
                </div>

                <button 
                  onClick={handleCreateRequest}
                  disabled={isLoading || !selectedTaskId || !reason.trim()}
                  className="w-full py-4 mt-2 font-bold text-black bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {isLoading ? 'Memproses...' : 'Lempar ke Bursa Tukar'}
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
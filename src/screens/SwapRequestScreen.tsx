import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, ShieldCheck, Bug } from 'lucide-react';
import { Screen, UserAccount, Task } from '../types';
import { db, auth } from '../firebase'; // Wajib import auth
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
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showDebug, setShowDebug] = useState(false); // State untuk mode diagnosis

  // 1. SOLUSI MUTLAK: Ambil UID langsung dari inti Firebase Auth, hindari keterlambatan prop
  const currentUserId = auth.currentUser?.uid || user?.uid || user?.id || "";

  useEffect(() => {
    const q = query(collection(db, 'swapRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
    });
    return () => unsub();
  }, []);

  // Semua tugas yang sudah ada di Bursa (dari siapa pun)
  const tasksInBursaIds = requests.filter(r => r.status === 'OPEN' || r.status === 'PENDING_APPROVAL').map(r => r.taskId);
  const myRequests = requests.filter(r => r.requesterId === currentUserId);

  // 2. FILTER TUGAS: Menggunakan .trim() untuk membersihkan spasi tidak kasat mata
  const mySwappableTasks = (tasksDb || []).filter(t => {
    const assigned = t.assignedUsers || [];
    const isAssigned = assigned.some(id => id?.trim() === currentUserId?.trim());
    const isNotCompleted = t.status !== 'COMPLETED';
    const notInBursa = !tasksInBursaIds.includes(t.id);

    return isAssigned && isNotCompleted && notInBursa;
  });

  const handleCreateRequest = async () => {
    if (!selectedTaskId || !reason.trim()) {
      toast.error('Mohon lengkapi data pertukaran.');
      return;
    }
    setIsLoading(true);
    try {
      const task = tasksDb.find(t => t.id === selectedTaskId);
      if (!task) return;

      await addDoc(collection(db, 'swapRequests'), {
        taskId: task.id,
        taskTitle: task.title,
        taskDate: task.date,
        taskTime: task.time,
        requesterId: currentUserId, 
        requesterName: auth.currentUser?.displayName || user?.displayName || 'Petugas',
        reason: reason,
        status: 'OPEN', 
        createdAt: serverTimestamp()
      });
      toast.success('Permintaan berhasil dikirim ke bursa.');
      setShowModal(false);
      setSelectedTaskId('');
      setReason('');
      setActiveTab('MINE');
    } catch (error) {
      toast.error('Gagal mengirim permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSwap = async (req: any) => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'PENDING_APPROVAL',
        acceptedById: currentUserId,
        acceptedByName: auth.currentUser?.displayName || user?.displayName || 'Petugas',
        updatedAt: serverTimestamp()
      });
      toast.success('Menunggu persetujuan koordinator.');
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
              <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800"><p className="text-gray-500">Belum ada permintaan.</p></div>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500' : req.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white pr-4">{req.taskTitle}</h4>
                    <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500/20 text-blue-400' : req.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>{req.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-gray-400 italic">"{req.reason}"</p>
                  {req.status === 'PENDING_APPROVAL' && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                      <ShieldCheck className="w-3.5 h-3.5" /> Menunggu persetujuan koordinator agar digantikan oleh {req.acceptedByName}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
             <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6"><AlertCircle className="w-5 h-5 text-amber-500" /><p className="text-xs text-gray-300">Bantu teman Anda jika Anda memiliki waktu luang.</p></div>
            {requests.filter(r => r.requesterId !== currentUserId && r.status === 'OPEN').map(req => (
              <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{req.requesterName} Butuh Bantuan</span>
                <h4 className="font-extrabold text-white text-lg mb-2">{req.taskTitle}</h4>
                <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-4"><p className="text-sm text-gray-300 italic">"{req.reason}"</p></div>
                <button onClick={() => handleAcceptSwap(req)} disabled={isLoading} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl active:scale-95 disabled:opacity-50">Ambil Alih Tugas</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-24 right-5 z-30">
        <button onClick={() => setShowModal(true)} className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="w-full max-w-md bg-[#151b2b] rounded-t-3xl border border-gray-800 p-6 pb-10 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white">Buat Permintaan</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-gray-400"><X size={24} /></button>
              </div>
              
              {/* === PANEL DEBUG: Akan muncul jika tugas kosong === */}
              {mySwappableTasks.length === 0 && (
                <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-xl mb-4">
                  <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] font-bold text-red-400 flex items-center gap-1 mb-1">
                    <Bug size={12} /> Klik untuk melihat Info Diagnosis
                  </button>
                  {showDebug && (
                    <div className="text-[9px] text-gray-400 font-mono break-all mt-2 space-y-1 bg-black/50 p-2 rounded">
                      <p>UID Aplikasi Saya: <span className="text-white font-bold">{currentUserId || 'KOSONG (Masalah Prop/Auth)'}</span></p>
                      <hr className="border-gray-800 my-1"/>
                      <p>Tugas di Database (Bukan Selesai):</p>
                      {tasksDb.filter(t => t.status !== 'COMPLETED').map(t => (
                        <div key={t.id} className="pl-2 border-l border-gray-700 my-1">
                          <p className="text-yellow-400">{t.title}</p>
                          <p>UID di Database: <span className="text-white">{JSON.stringify(t.assignedUsers)}</span></p>
                          <p>Sudah di Bursa?: {tasksInBursaIds.includes(t.id) ? 'YA (Terblokir)' : 'TIDAK'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Pilih Tugas Anda</label>
                <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none">
                  <option value="" disabled>-- Pilih Tugas Anda --</option>
                  {mySwappableTasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.date})</option>)}
                </select>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pertukaran..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white h-28 resize-none focus:border-amber-500 outline-none" />
                <button onClick={handleCreateRequest} disabled={isLoading || !selectedTaskId || !reason.trim()} className="w-full py-4 font-bold text-black bg-amber-500 rounded-xl disabled:opacity-50 transition-all">Kirim ke Bursa</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwapRequestScreen;
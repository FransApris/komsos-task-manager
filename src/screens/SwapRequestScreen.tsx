import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, X, Calendar, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { Screen, UserAccount, Task, Role } from '../types';
import { db, collection, addDoc, query, onSnapshot, serverTimestamp, doc, updateDoc, orderBy } from '../firebase'; 

import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export const SwapRequestScreen: React.FC<{ 
  onNavigate: (s: Screen) => void,
  user?: UserAccount | null,
  role?: Role,
  tasksDb?: Task[]
}> = ({ onNavigate, user, role, tasksDb = [] }) => {
  const [activeTab, setActiveTab] = useState<'MINE' | 'BURSA' | 'ADMIN'>('MINE');
  const [showModal, setShowModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false); // State untuk mode diagnosis

  // Gunakan user prop yang sudah reaktif dari onAuthStateChanged di App.tsx
  const currentUserId = user?.uid || user?.id || "";
  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  const backScreen: Screen = isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD';

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
  const myRequests = requests.filter(r => r.requesterId?.trim() === currentUserId?.trim());

  // 2. FILTER TUGAS: Menggunakan .trim() untuk membersihkan spasi tidak kasat mata
  const mySwappableTasks = (tasksDb || []).filter(t => {
    const assigned = t.assignedUsers || [];
    // Cek kecocokan ID dengan lebih fleksibel (uid atau id)
    const isAssigned = assigned.some(id => 
      id?.trim() === currentUserId?.trim() || 
      (user?.uid && id?.trim() === user.uid.trim()) || 
      (user?.id && id?.trim() === user.id.trim())
    );
    
    // Konsisten dengan Dashboard: Hanya tugas OPEN atau IN_PROGRESS yang bisa ditukar
    const isSwappableStatus = t.status === 'IN_PROGRESS' || t.status === 'OPEN';
    const notInBursa = !tasksInBursaIds.includes(t.id);

    return isAssigned && isSwappableStatus && notInBursa;
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
        requesterId: currentUserId.trim(), 
        requesterName: user?.displayName || 'Petugas',
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
        accepterId: currentUserId.trim(),
        accepterName: user?.displayName || 'Petugas',
        updatedAt: serverTimestamp()
      });
      toast.success('Menunggu persetujuan koordinator.');
    } catch (error) {
      toast.error('Gagal memproses pertukaran.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminApprove = async (req: any) => {
    setIsLoading(true);
    try {
      // 1. Update Task
      const taskRef = doc(db, 'tasks', req.taskId);
      const task = tasksDb.find(t => t.id === req.taskId);
      
      if (task) {
        let newAssignedUsers = [...(task.assignedUsers || [])];
        // Ganti requester dengan accepter
        newAssignedUsers = newAssignedUsers.filter(uid => uid !== req.requesterId);
        if (req.accepterId) {
          newAssignedUsers.push(req.accepterId);
        }

        const taskUpdate: any = {
          assignedUsers: newAssignedUsers,
          updatedAt: serverTimestamp()
        };

        // Jika requester adalah leader, ganti leader ke accepter
        if (task.teamLeaderId === req.requesterId) {
          taskUpdate.teamLeaderId = req.accepterId;
        }

        await updateDoc(taskRef, taskUpdate);
      }

      // 2. Update Swap Request
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'APPROVED',
        updatedAt: serverTimestamp()
      });

      toast.success("Pertukaran disetujui!");
    } catch (err) {
      console.error("Ralat meluluskan pertukaran:", err);
      toast.error("Gagal meluluskan pertukaran.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminReject = async (req: any) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'swapRequests', req.id), {
        status: 'REJECTED',
        updatedAt: serverTimestamp()
      });
      toast.success("Pertukaran ditolak.");
    } catch (err) {
      console.error("Ralat menolak pertukaran:", err);
      toast.error("Gagal menolak pertukaran.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async (reqId: string) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'swapRequests', reqId), {
        status: 'CANCELLED',
        updatedAt: serverTimestamp()
      });
      toast.success('Permintaan dibatalkan.');
    } catch (error) {
      toast.error('Gagal membatalkan permintaan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white relative">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate(backScreen)} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight flex-1">Bursa Pertukaran</h1>
        <button 
          onClick={() => {
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 500);
            toast.success('Data diperbarui');
          }}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
        <button onClick={() => setActiveTab('MINE')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'MINE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500'}`}>Permintaan Saya</button>
        <button onClick={() => setActiveTab('BURSA')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BURSA' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500'}`}><RefreshCw className="w-4 h-4" /> Bursa Tukar</button>
        {isAdmin && (
          <button onClick={() => setActiveTab('ADMIN')} className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'ADMIN' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'}`}>Persetujuan</button>
        )}
      </div>

      <div className="p-5">
        {activeTab === 'MINE' ? (
          <div className="space-y-4">
            {myRequests.length === 0 ? (
              <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                <p className="text-gray-500 mb-2">Belum ada permintaan.</p>
                <p className="text-[10px] text-gray-600 px-10">Tugas Anda yang bisa ditukar akan muncul di tombol + di bawah.</p>
              </div>
            ) : (
              myRequests.map(req => (
                <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 relative">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500' : req.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white pr-4">{req.taskTitle}</h4>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${req.status === 'PENDING_APPROVAL' ? 'bg-blue-500/20 text-blue-400' : req.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-500' : req.status === 'CANCELLED' ? 'bg-gray-500/20 text-gray-500' : 'bg-amber-500/20 text-amber-500'}`}>{req.status.replace('_', ' ')}</span>
                      {req.status === 'OPEN' && (
                        <button 
                          onClick={() => handleCancelRequest(req.id)}
                          disabled={isLoading}
                          className="text-[10px] font-bold text-red-500 hover:underline"
                        >
                          Batalkan
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 italic">"{req.reason}"</p>
                  {req.status === 'PENDING_APPROVAL' && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">
                      <ShieldCheck className="w-3.5 h-3.5" /> Menunggu persetujuan koordinator agar digantikan oleh {req.accepterName}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'BURSA' ? (
          <div className="space-y-4">
             <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 mb-6"><AlertCircle className="w-5 h-5 text-amber-500" /><p className="text-xs text-gray-300">Bantu teman Anda jika Anda memiliki waktu luang.</p></div>
            {requests.filter(r => r.requesterId?.trim() !== currentUserId?.trim() && r.status === 'OPEN').length === 0 ? (
              <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                <RefreshCw className="w-10 h-10 text-gray-700 mx-auto mb-4 animate-pulse" />
                <p className="text-gray-500 mb-2">Bursa sedang sepi.</p>
                <p className="text-[10px] text-gray-600 px-10">Belum ada teman yang meminta bantuan saat ini.</p>
              </div>
            ) : (
              requests.filter(r => r.requesterId?.trim() !== currentUserId?.trim() && r.status === 'OPEN').map(req => (
                <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-500">
                        {req.requesterName?.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{req.requesterName}</span>
                    </div>
                    <div className="flex flex-col items-end text-[10px] text-gray-500 font-medium">
                      <div className="flex items-center gap-1"><Calendar size={10} /> {req.taskDate}</div>
                      <div className="flex items-center gap-1"><Clock size={10} /> {req.taskTime}</div>
                    </div>
                  </div>
                  <h4 className="font-extrabold text-white text-lg mb-2">{req.taskTitle}</h4>
                  <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-4"><p className="text-sm text-gray-300 italic">"{req.reason}"</p></div>
                  <button onClick={() => handleAcceptSwap(req)} disabled={isLoading} className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl active:scale-95 disabled:opacity-50">Ambil Alih Tugas</button>
                </div>
              ))
            )}
          </div>
        ) : (
          /* TAB ADMIN */
          <div className="space-y-4">
            {requests.filter(r => r.status === 'PENDING_APPROVAL').length === 0 ? (
              <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
                <ShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">Tidak ada antrean.</p>
                <p className="text-[10px] text-gray-600 px-10">Semua permintaan pertukaran telah diproses.</p>
              </div>
            ) : (
              requests.filter(r => r.status === 'PENDING_APPROVAL').map(req => (
                <div key={req.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black bg-blue-500/20 text-blue-400 px-2 py-1 rounded uppercase tracking-widest">Menunggu Persetujuan</span>
                    <span className="text-[10px] text-gray-500">{req.createdAt?.toDate ? new Date(req.createdAt.toDate()).toLocaleDateString() : 'Baru'}</span>
                  </div>
                  <h4 className="font-extrabold text-white text-lg mb-1">{req.taskTitle}</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-amber-500 font-bold">{req.requesterName}</span>
                    <RefreshCw size={12} className="text-gray-600" />
                    <span className="text-xs text-emerald-500 font-bold">{req.accepterName}</span>
                  </div>
                  <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-4">
                    <p className="text-xs text-gray-400 uppercase font-bold mb-1 tracking-wider">Alasan:</p>
                    <p className="text-sm text-gray-300 italic">"{req.reason}"</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleAdminReject(req)} disabled={isLoading} className="flex-1 py-3 bg-red-500/10 text-red-500 font-bold rounded-xl border border-red-500/20 active:scale-95 disabled:opacity-50">Tolak</button>
                    <button onClick={() => handleAdminApprove(req)} disabled={isLoading} className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-xl active:scale-95 disabled:opacity-50">Setujui</button>
                  </div>
                </div>
              ))
            )}
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

              <div className="space-y-4">
                {mySwappableTasks.length === 0 ? (
                  <div className="p-6 bg-[#0a0f18] rounded-2xl border border-dashed border-gray-800 text-center">
                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-bold mb-1">Tidak Ada Tugas Tersedia</p>
                    <p className="text-[10px] text-gray-600 leading-relaxed">
                      Anda tidak memiliki tugas aktif (OPEN/IN_PROGRESS) yang bisa ditukar saat ini, atau tugas Anda sudah ada di bursa.
                    </p>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="mt-6 w-full py-3 bg-gray-800 text-gray-400 font-bold rounded-xl text-xs uppercase tracking-widest"
                    >
                      Tutup
                    </button>
                  </div>
                ) : (
                  <>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block ml-1">Pilih Tugas Anda</label>
                    <select value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 outline-none">
                      <option value="" disabled>-- Pilih Tugas Anda --</option>
                      {mySwappableTasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.date})</option>)}
                    </select>
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Alasan pertukaran..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white h-28 resize-none focus:border-amber-500 outline-none" />
                    <button onClick={handleCreateRequest} disabled={isLoading || !selectedTaskId || !reason.trim()} className="w-full py-4 font-bold text-black bg-amber-500 rounded-xl disabled:opacity-50 transition-all">Kirim ke Bursa</button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwapRequestScreen;
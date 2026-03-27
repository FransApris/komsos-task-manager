import React, { useState, useEffect } from 'react';
import { ChevronLeft, Send, AlertCircle, RefreshCw, User, CheckCircle2, XCircle, Loader2, Users, HandMetal } from 'lucide-react';
import { Screen, UserAccount, Task, SwapRequest } from '../types';
import { db, collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc, doc } from '../firebase';
import { toast } from 'sonner';

interface SwapRequestScreenProps {
  onNavigate: (s: Screen) => void;
  currentUser: UserAccount | null;
  task: Task | null;
}

const SwapRequestScreen: React.FC<SwapRequestScreenProps> = ({ onNavigate, currentUser, task }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requests, setRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'MY_REQUESTS' | 'SWAP_MARKET'>('MY_REQUESTS');

  useEffect(() => {
    if (!currentUser) return;

    // We listen to ALL requests to show them in the market or for admins
    const q = query(collection(db, 'swapRequests'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SwapRequest));
      setRequests(reqs.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
      setLoading(false);
    }, (error) => {
      console.error("SwapRequests Snapshot Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSubmit = async () => {
    if (!task || !currentUser || !reason.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'swapRequests'), {
        taskId: task.id,
        taskTitle: task.title,
        requesterId: currentUser.uid,
        requesterName: currentUser.displayName,
        reason: reason.trim(),
        status: 'PENDING',
        createdAt: serverTimestamp(),
      });
      
      toast.success('Permintaan tukar jadwal berhasil dikirim ke Bursa Pertukaran');
      onNavigate('TASK_DETAIL');
    } catch (error) {
      console.error('Error submitting swap request:', error);
      toast.error('Gagal mengirim permintaan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVolunteer = async (request: SwapRequest) => {
    if (!currentUser || request.requesterId === currentUser.uid) return;

    try {
      await updateDoc(doc(db, 'swapRequests', request.id), {
        suggestedReplacementId: currentUser.uid,
        suggestedReplacementName: currentUser.displayName,
      });
      toast.success('Anda telah bersedia menggantikan. Menunggu persetujuan Admin.');
    } catch (error) {
      toast.error('Gagal mengambil pertukaran');
    }
  };

  const handleApprove = async (request: SwapRequest) => {
    if (!currentUser) return;
    const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role?.startsWith('ADMIN_');
    if (!isAdmin) return;

    try {
      const { arrayUnion, arrayRemove } = await import('../firebase');
      const taskRef = doc(db, 'tasks', request.taskId);
      
      // 1. Update the swap request status
      await updateDoc(doc(db, 'swapRequests', request.id), {
        status: 'APPROVED',
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp(),
      });

      // 2. Handle Task Update
      if (request.suggestedReplacementId) {
        // Case: Swap with replacement
        const taskSnap = await (await import('../firebase')).getDoc(taskRef);
        
        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          const currentAssigned = taskData.assignedUsers || [];
          const newAssigned = currentAssigned.map((uid: string) => 
            uid === request.requesterId ? request.suggestedReplacementId : uid
          );
          
          const historyEntry = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'SWAP',
            message: `Pertukaran disetujui: ${request.requesterName} digantikan oleh ${request.suggestedReplacementName}`,
            userId: currentUser.uid,
            userName: currentUser.displayName,
            createdAt: new Date().toISOString()
          };
          
          const updateData: any = {
            assignedUsers: newAssigned,
            history: arrayUnion(historyEntry),
            updatedAt: serverTimestamp()
          };

          if (taskData.teamLeaderId === request.requesterId) {
            updateData.teamLeaderId = request.suggestedReplacementId;
          }
          
          await updateDoc(taskRef, updateData);

          // Notification for replacement
          await addDoc(collection(db, 'notifications'), {
            userId: request.suggestedReplacementId,
            title: '📅 Penugasan Baru (Tukar Jadwal)',
            message: `Anda telah disetujui untuk menggantikan ${request.requesterName} dalam tugas "${request.taskTitle}".`,
            type: 'TASK',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } else {
        // Case: Approval for "Ijin" (permission) without replacement
        // Remove the user from the task
        const historyEntry = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'SWAP',
          message: `Ijin disetujui untuk ${request.requesterName}. Alasan: ${request.reason}`,
          userId: currentUser.uid,
          userName: currentUser.displayName,
          createdAt: new Date().toISOString()
        };

        await updateDoc(taskRef, {
          assignedUsers: arrayRemove(request.requesterId),
          history: arrayUnion(historyEntry),
          updatedAt: serverTimestamp()
        });
      }

      // Notification for requester
      await addDoc(collection(db, 'notifications'), {
        userId: request.requesterId,
        title: '✅ Permintaan Disetujui',
        message: `Permintaan tukar jadwal/ijin Anda untuk "${request.taskTitle}" telah disetujui oleh Admin.`,
        type: 'TASK',
        read: false,
        createdAt: serverTimestamp()
      });
      
      toast.success('Pertukaran disetujui');
    } catch (error) {
      console.error('Error approving swap:', error);
      toast.error('Gagal menyetujui pertukaran');
    }
  };

  const handleReject = async (request: SwapRequest) => {
    if (!currentUser) return;
    const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role?.startsWith('ADMIN_');
    if (!isAdmin) return;

    try {
      await updateDoc(doc(db, 'swapRequests', request.id), {
        status: 'REJECTED',
        approvedBy: currentUser.uid,
        approvedAt: serverTimestamp(),
      });

      // Notification for requester
      await addDoc(collection(db, 'notifications'), {
        userId: request.requesterId,
        title: '❌ Permintaan Ditolak',
        message: `Permintaan tukar jadwal/ijin Anda untuk "${request.taskTitle}" ditolak oleh Admin.`,
        type: 'ALERT',
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success('Pertukaran ditolak');
    } catch (error) {
      toast.error('Gagal menolak pertukaran');
    }
  };

  const isAdmin = currentUser?.role === 'SUPERADMIN' || currentUser?.role?.startsWith('ADMIN_');
  const myRequests = requests.filter(r => r.requesterId === currentUser?.uid);
  const marketRequests = requests.filter(r => r.requesterId !== currentUser?.uid && r.status === 'PENDING');

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] min-h-screen">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate(task ? 'TASK_DETAIL' : 'USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold text-white">{task ? 'Ajukan Pertukaran' : 'Bursa Pertukaran'}</h1>
      </header>

      {!task && (
        <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
          <button 
            onClick={() => setActiveTab('MY_REQUESTS')}
            className={`flex-1 py-4 text-xs font-bold text-center border-b-2 transition-all ${activeTab === 'MY_REQUESTS' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500'}`}
          >
            Permintaan Saya
          </button>
          <button 
            onClick={() => setActiveTab('SWAP_MARKET')}
            className={`flex-1 py-4 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 ${activeTab === 'SWAP_MARKET' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-500'}`}
          >
            <RefreshCw className="w-4 h-4" /> Bursa Tukar
            {marketRequests.length > 0 && <span className="bg-amber-500 text-[#0a0f18] text-[8px] px-1.5 py-0.5 rounded-full">{marketRequests.length}</span>}
          </button>
        </div>
      )}

      <div className="p-5 space-y-6 flex-1 overflow-y-auto pb-24">
        {task && (
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-2xl">
                <RefreshCw className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Tugas Terkait</p>
                <h2 className="text-lg font-extrabold text-white">{task.title}</h2>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-800">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Alasan Pertukaran / Ijin</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan alasan Anda. User lain dapat melihat ini dan menawarkan diri untuk menggantikan..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl p-4 text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none min-h-[120px] transition-all"
                />
              </div>

              <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 flex gap-3">
                <Users className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Permintaan Anda akan muncul di <strong>Bursa Pertukaran</strong>. User lain dapat menawarkan diri untuk menggantikan Anda sebelum disetujui Admin.
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !reason.trim()}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Tawarkan ke Bursa
              </button>
            </div>
          </div>
        )}

        {!task && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-gray-500 font-bold">Memuat data...</p>
              </div>
            ) : (activeTab === 'MY_REQUESTS' ? myRequests : marketRequests).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-[#151b2b] rounded-3xl border border-gray-800 border-dashed">
                <RefreshCw className="w-12 h-12 text-gray-700" />
                <p className="text-gray-500 font-bold">
                  {activeTab === 'MY_REQUESTS' ? 'Anda belum memiliki permintaan' : 'Bursa pertukaran sedang kosong'}
                </p>
              </div>
            ) : (
              (activeTab === 'MY_REQUESTS' ? myRequests : marketRequests).map(req => (
                <div key={req.id} className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{req.requesterName}</p>
                        <p className="text-[10px] text-gray-500">{req.createdAt?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                      req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' :
                      req.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' :
                      'bg-red-500/10 text-red-500 border border-red-500/30'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="bg-[#0a0f18] p-4 rounded-2xl border border-gray-800/50">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Tugas</p>
                    <p className="text-sm font-bold text-white mb-3">{req.taskTitle}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Alasan</p>
                    <p className="text-sm text-gray-300 italic mb-3">"{req.reason}"</p>
                    
                    {req.suggestedReplacementId && (
                      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                          Bersedia Menggantikan: <span className="text-white">{req.suggestedReplacementName}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {activeTab === 'SWAP_MARKET' && !req.suggestedReplacementId && (
                    <button 
                      onClick={() => handleVolunteer(req)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <HandMetal className="w-4 h-4" /> Saya Bersedia Menggantikan
                    </button>
                  )}

                  {isAdmin && req.status === 'PENDING' && (
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleApprove(req)}
                        className="flex-1 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" /> {req.suggestedReplacementId ? 'Setujui Tukar' : 'Setujui Ijin'}
                      </button>
                      <button 
                        onClick={() => handleReject(req)}
                        className="flex-1 bg-red-600/20 text-red-500 border border-red-500/30 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-600/30 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> Tolak
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapRequestScreen;

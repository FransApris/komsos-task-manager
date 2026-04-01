import React, { useState } from 'react';
import { ChevronLeft, MoreHorizontal, Video, MapPin, Calendar, Clock, CheckCircle2, PlayCircle, Plus, Upload, Award, FileText, Send, MessageSquare, Image as ImageIcon, Crown, Briefcase, Camera, Activity, UserX, Trash2, Edit2, RefreshCw, AlertCircle } from 'lucide-react';
import { Screen, Role, UserAccount, Task, Inventory, TaskType } from '../types';
import { db, doc, updateDoc, serverTimestamp, collection, addDoc, auth, arrayUnion, arrayRemove, increment } from '../firebase';
import { TaskChat } from './TaskChat';
import { getAvatarUrl } from '../lib/avatar';
import { toast } from 'sonner';
import { revokeTaskPoints } from '../services/taskService';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const TaskDetail: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role, 
  usersDb?: UserAccount[],
  taskId: string | null,
  tasksDb?: Task[],
  inventoryDb?: Inventory[],
  taskTypes?: TaskType[],
  currentUser: UserAccount | null
}> = ({ onNavigate, role, usersDb = [], taskId, tasksDb = [], inventoryDb = [], taskTypes = [], currentUser }) => {
  const task = (tasksDb || []).find(t => t.id === taskId);
  const [proofNotes, setProofNotes] = useState('');
  const [showProofModal, setShowProofModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'DETAIL' | 'CHAT'>('DETAIL');
  const [isLoading, setIsLoading] = useState(false);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  if (!task) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] items-center justify-center p-10 text-center">
        <p className="text-gray-500 mb-4">Tugas tidak ditemukan.</p>
        <button onClick={() => onNavigate('TASKS')} className="text-blue-500 font-bold">Kembali ke Daftar Tugas</button>
      </div>
    );
  }

  const status = task.status;
  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  const handleGivePenalty = async (uid: string, userName?: string) => {
    openConfirm(
      'Berikan Penalti',
      `Tandai ${userName || 'petugas'} tidak hadir / melanggar? Mereka akan dicopot dari tugas ini dan mendapatkan PENGURANGAN POIN KINERJA (-20 Poin).`,
      async () => {
        setIsLoading(true);
        try {
          await updateDoc(doc(db, 'tasks', task.id), {
            assignedUsers: arrayRemove(uid),
            missedUsers: arrayUnion(uid)
          });

          await updateDoc(doc(db, 'users', uid), {
            points: increment(-20)
          });

          await addDoc(collection(db, 'notifications'), {
            userId: uid,
            title: '⚠️ Penugasan Dibatalkan (Penalti)',
            message: `Anda telah dicopot dari tugas "${task.title}" karena pelanggaran/tidak hadir. Poin kinerja Anda telah dikurangi sebesar 20 Poin.`,
            type: 'ALERT',
            read: false,
            createdAt: serverTimestamp()
          });

          toast.success("Petugas berhasil dicopot dan penalti dikenakan otomatis.");
        } catch (err) {
          console.error("Error giving penalty:", err);
          toast.error("Gagal memproses penalti.");
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleDeleteProgress = async (progressItem: any) => {
    openConfirm(
      'Hapus Progress',
      "Apakah Anda yakin ingin menghapus laporan progress ini?",
      async () => {
        setIsLoading(true);
        try {
          await updateDoc(doc(db, 'tasks', task.id), {
            progressHistory: arrayRemove(progressItem),
            updatedAt: serverTimestamp()
          });
          toast.success("Progress berhasil dihapus.");
        } catch (err) {
          console.error("Error deleting progress:", err);
          toast.error("Gagal menghapus progress.");
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        status: 'COMPLETED',
        updatedAt: serverTimestamp()
      });

      if (task.assignedUsers && task.assignedUsers.length > 0) {
        for (const uid of task.assignedUsers) {
          const isLeader = task.teamLeaderId === uid;
          const earnedPoints = isLeader ? 75 : 50;
          
          const userRef = doc(db, 'users', uid);
          
          const userUpdate: any = {
            points: increment(earnedPoints),
            xp: increment(earnedPoints),
            completedTasksCount: increment(1)
          };

          const typeLower = task.type?.toLowerCase() || '';
          if (typeLower.includes('dokumentasi') || typeLower.includes('foto')) {
            userUpdate['stats.photography'] = increment(10);
          } else if (typeLower.includes('peliputan') || typeLower.includes('video') || typeLower.includes('obs')) {
            userUpdate['stats.videography'] = increment(10);
          } else if (typeLower.includes('publikasi') || typeLower.includes('nulis') || typeLower.includes('artikel')) {
            userUpdate['stats.writing'] = increment(10);
          } else if (typeLower.includes('desain') || typeLower.includes('design')) {
            userUpdate['stats.design'] = increment(10);
          }

          await updateDoc(userRef, userUpdate);
        }
      }

      toast.success("Tugas disahkan dan poin telah diagihkan!");
    } catch (err) {
      console.error("Error verifying task:", err);
      toast.error("Gagal mengesahkan tugas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokePoints = async () => {
    openConfirm(
      'Batalkan Verifikasi & Tarik Poin',
      'Apakah Anda yakin ingin membatalkan verifikasi tugas ini? Poin dan skill yang telah diberikan kepada petugas akan ditarik kembali, dan status tugas akan dikembalikan ke "Menunggu Verifikasi".',
      async () => {
        setIsLoading(true);
        try {
          await revokeTaskPoints(task, currentUser);
          toast.success("Verifikasi dibatalkan dan poin telah ditarik kembali!");
        } catch (err) {
          console.error("Error revoking points:", err);
          toast.error("Gagal membatalkan verifikasi.");
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const getTaskTimes = (dateStr: string, timeStr: string) => {
    const parts = timeStr.split('-').map(p => p.trim());
    const startStr = parts[0];
    const endStr = parts[1] || parts[0];
    
    let start = new Date(`${dateStr}T${startStr}`);
    if (isNaN(start.getTime())) start = new Date(`${dateStr} ${startStr}`);
    
    let end = new Date(`${dateStr}T${endStr}`);
    if (isNaN(end.getTime())) end = new Date(`${dateStr} ${endStr}`);
    
    // If end time is same as start and it's just "08:00", assume at least 1 hour duration for "ongoing" check
    if (start.getTime() === end.getTime() && !timeStr.includes('-')) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
    
    return { start, end };
  };

  const getTimingStatus = () => {
    if (!task.date || !task.time) return 'NORMAL';
    const { start, end } = getTaskTimes(task.date, task.time);
    const now = new Date();
    
    if (now < start) return 'NOT_STARTED';
    if (now <= end) return 'ONGOING';
    return 'NORMAL';
  };

  const handleSubmitProof = async () => {
    setIsLoading(true);
    try {
      const timingStatus = getTimingStatus();
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        status: 'WAITING_VERIFICATION',
        proofNotes: proofNotes,
        earlyCompletion: timingStatus !== 'NORMAL',
        completionTiming: timingStatus,
        updatedAt: serverTimestamp()
      });
      setShowProofModal(false);
      toast.success(timingStatus === 'NOT_STARTED' 
        ? "Bukti dikirim! (Peringatan: Acara belum dimulai)" 
        : "Bukti berhasil dikirim untuk verifikasi!");
    } catch (err) {
      console.error("Error submitting proof:", err);
      toast.error("Gagal mengirim bukti.");
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    switch(t) {
      case 'peliputan': return <Video className="w-5 h-5 text-blue-500"/>;
      case 'dokumentasi': return <ImageIcon className="w-5 h-5 text-emerald-500"/>;
      case 'publikasi': return <FileText className="w-5 h-5 text-amber-500"/>;
      case 'desain': return <ImageIcon className="w-5 h-5 text-purple-500"/>;
      case 'obs': return <Video className="w-5 h-5 text-red-500"/>;
      case 'editing': return <Video className="w-5 h-5 text-indigo-500"/>;
      case 'tugas lain': return <CheckCircle2 className="w-5 h-5 text-gray-500"/>;
      default: 
        const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
        if (foundType) {
          return <Activity className="w-5 h-5" style={{ color: foundType.color }} />;
        }
        return <CheckCircle2 className="w-5 h-5 text-blue-500"/>;
    }
  };

  const getIconBg = (type: string) => {
    const t = type?.toLowerCase();
    switch(t) {
      case 'peliputan': return 'bg-blue-500/10';
      case 'dokumentasi': return 'bg-emerald-500/10';
      case 'publikasi': return 'bg-amber-500/10';
      case 'desain': return 'bg-purple-500/10';
      case 'obs': return 'bg-red-500/10';
      case 'editing': return 'bg-indigo-500/10';
      case 'tugas lain': return 'bg-gray-500/10';
      default: return 'bg-blue-500/10';
    }
  };

  const customColor = taskTypes.find(tt => tt.name.toLowerCase() === task.type?.toLowerCase())?.color;

  return (
    <div className={`flex-1 flex flex-col bg-[#0a0f18] ${activeTab === 'DETAIL' ? 'overflow-y-auto pb-40' : 'overflow-hidden'}`}>
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate(isAdminRole ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight text-white">Detail Tugas</h1>
        <div className="flex gap-2">
          {isAdminRole && (
            <button 
              className="p-2 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 hover:bg-blue-600/30 transition-all"
              onClick={() => onNavigate('EDIT_TASK')}
              title="Edit Tugas"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
            <MoreHorizontal className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </header>

      <div className="h-48 bg-gray-800 relative">
        <img 
          src="/background.jpg" 
          alt="Latar Belakang Tugas"
          className="w-full h-full object-cover opacity-50" 
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] to-transparent"></div>
        <div className="absolute bottom-4 left-5">
          <div className="flex items-center gap-2 mb-2">
            {status === 'IN_PROGRESS' && <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Sedang Berlangsung</span>}
            {status === 'WAITING_VERIFICATION' && <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Menunggu Verifikasi</span>}
            {status === 'COMPLETED' && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">Selesai</span>}
            <span className="bg-gray-800/80 backdrop-blur text-gray-300 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-gray-700">Tinggi</span>
          </div>
          <h2 className="text-2xl font-extrabold leading-tight text-white">{task.title}</h2>
        </div>
      </div>

      <div className="flex border-b border-gray-800/50 bg-[#0a0f18] sticky top-[72px] z-10">
        <button 
          onClick={() => setActiveTab('DETAIL')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'DETAIL' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Detail Tugas
        </button>
        <button 
          onClick={() => setActiveTab('CHAT')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CHAT' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          <MessageSquare className="w-4 h-4" /> Diskusi Tim
        </button>
      </div>

      {activeTab === 'DETAIL' ? (
        <>
          <div className="p-5 space-y-6">
            <div className="flex items-center justify-between bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
          <div className="flex items-center gap-3">
            <div 
              className={`p-2 rounded-xl ${!customColor ? getIconBg(task.type) : ''}`} 
              style={customColor ? { backgroundColor: `${customColor}20` } : undefined}
            >
              {getIcon(task.type)}
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Kategori</p>
              <p className="font-bold text-sm text-white">{task.type}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-800"></div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl"><MapPin className="w-5 h-5 text-purple-500"/></div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lokasi</p>
              <p className="font-bold text-sm text-white">Gereja Pusat</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Jadwal</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-300">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{task.date}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{task.time}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Tim Penugasan</h3>
          <div className="grid grid-cols-1 gap-3">
            {task.assignedUsers?.map(uid => {
              const user = usersDb.find(u => u.uid === uid || u.id === uid);
              const isLeader = task.teamLeaderId === uid;
              return (
                <div key={uid} className={`flex items-center gap-3 p-3 rounded-xl border ${isLeader ? 'bg-blue-600/10 border-blue-500' : 'bg-[#151b2b] border-gray-800'}`}>
                  <div className={`w-8 h-8 rounded-full overflow-hidden shrink-0 ring-2 ${isLeader ? 'ring-blue-500/30' : 'ring-gray-700'}`}>
                    <img 
                      src={getAvatarUrl(user)} 
                      alt={user?.displayName} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-bold text-gray-200 truncate">{user?.displayName}</span>
                    {isLeader && (
                      <div className="flex items-center gap-1">
                        <Crown className="w-2 h-2 text-blue-400" />
                        <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">Ketua Tim</span>
                      </div>
                    )}
                  </div>
                  
                  {isAdminRole && status !== 'COMPLETED' && (
                    <button 
                      onClick={() => handleGivePenalty(uid, user?.displayName)}
                      disabled={isLoading}
                      className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors ml-auto shadow-sm active:scale-95 disabled:opacity-50"
                      title="Tandai Mangkir / Pelanggaran"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
            {(!task.assignedUsers || task.assignedUsers.length === 0) && (
              <p className="text-xs text-gray-500 italic p-3 bg-[#151b2b] rounded-xl border border-gray-800 text-center">Belum ada petugas. Tugas ini terbuka untuk diambil.</p>
            )}
          </div>
        </div>

        {(task.requiredEquipment || []).length > 0 && (
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Peralatan yang Dibutuhkan</h3>
            <div className="grid grid-cols-2 gap-3">
              {(task.requiredEquipment || []).map(id => {
                const item = inventoryDb.find(i => i.id === id);
                return (
                  <div key={id} className="flex items-center gap-3 p-3 bg-[#151b2b] rounded-xl border border-gray-800">
                    <div className="p-1.5 bg-gray-800 rounded-lg">
                      <Camera className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-gray-200 truncate">{item?.name || "Peralatan"}</span>
                      <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">{item?.category || "Kategori"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {task.assignedUsers?.includes(currentUser?.uid || '') && task.status !== 'COMPLETED' && (
          <div className="pt-2">
            <button 
              onClick={() => onNavigate('SWAP_REQUEST')}
              className="w-full flex items-center justify-center gap-2 bg-amber-600/10 text-amber-500 border border-amber-500/30 py-4 rounded-2xl font-bold hover:bg-amber-600/20 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Ajukan Tukar Jadwal / Ijin
            </button>
          </div>
        )}

        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Deskripsi</h3>
          <p className="text-sm text-gray-300 leading-relaxed bg-[#151b2b] p-4 rounded-xl border border-gray-800">
            {task.description || "Tidak ada deskripsi."}
          </p>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Riwayat Penugasan</h3>
          {task.history && task.history.length > 0 ? (
            <div className="space-y-3">
              {task.history.slice().reverse().map((h, idx) => (
                <div key={h.id || idx} className="bg-[#151b2b] p-4 rounded-xl border border-gray-800 flex gap-3 items-start">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <RefreshCw className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-200 font-medium">{h.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Oleh: {h.userName}</span>
                      <span className="text-[10px] text-gray-500">{new Date(h.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#151b2b] p-4 rounded-xl border border-gray-800 border-dashed text-center">
              <p className="text-xs text-gray-500 italic">Belum ada riwayat perubahan penugasan.</p>
            </div>
          )}
        </div>

        {((task as any).progressHistory && (task as any).progressHistory.length > 0) && (
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Riwayat Progress</h3>
            <div className="space-y-4">
              {(task as any).progressHistory.slice().reverse().map((progress: any, index: number) => {
                const isMyProgress = progress.userId === auth.currentUser?.uid;
                const canDelete = isMyProgress || isAdminRole;

                return (
                  <div key={index} className="bg-[#151b2b] p-4 rounded-xl border border-gray-800 relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div>
                        <span className="text-xs font-bold text-blue-400 block">{progress.userName}</span>
                        <span className="text-[10px] text-gray-500">
                          {new Date(progress.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteProgress(progress)}
                          disabled={isLoading}
                          className="p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                          title="Hapus laporan ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {progress.note && (
                      <p className="text-sm text-gray-300 mb-3 pl-2">{progress.note}</p>
                    )}
                    
                    {progress.images && progress.images.length > 0 ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {progress.images.map((img: string, i: number) => (
                          <div key={i} className="rounded-lg overflow-hidden border border-gray-800 bg-black/30 aspect-square">
                            <img 
                              src={img} 
                              alt={`Bukti Progress ${i + 1}`} 
                              className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                              onClick={() => window.open(img, '_blank')}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ))}
                      </div>
                    ) : progress.img && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-gray-700 bg-black/50">
                        <img 
                          src={progress.img} 
                          alt="Bukti Progress" 
                          className="w-full max-h-60 object-contain cursor-pointer"
                          onClick={() => window.open(progress.img, '_blank')}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status === 'WAITING_VERIFICATION' && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-xl shrink-0"><CheckCircle2 className="w-5 h-5 text-yellow-500" /></div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-yellow-500 mb-1">Menunggu Verifikasi Admin</h3>
                <p className="text-xs text-gray-400 mb-3">Tugas ini telah dilaporkan selesai oleh petugas dan sedang menunggu verifikasi.</p>
                
                <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800 mb-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Catatan Petugas</p>
                  <p className="text-sm text-gray-300">{(task as any).proofNotes || "Tugas telah diselesaikan sesuai instruksi."}</p>
                </div>

                {isAdminRole && (
                  <button 
                    onClick={handleVerify}
                    disabled={isLoading}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 rounded-xl transition-colors text-sm disabled:opacity-50 shadow-lg shadow-yellow-500/20"
                  >
                    {isLoading ? 'Memproses...' : 'Verifikasi & Berikan Poin'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'COMPLETED' && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl shrink-0"><Award className="w-5 h-5 text-emerald-500" /></div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-emerald-500 mb-1">Tugas Selesai & Diverifikasi</h3>
                <p className="text-xs text-gray-400 mb-3">Tugas ini telah diverifikasi oleh Admin.</p>
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30 w-fit">
                    <span className="text-emerald-400 font-bold text-sm">+ Poin Berhasil Diagihkan</span>
                  </div>
                  
                  {role === 'SUPERADMIN' && (
                    <button 
                      onClick={handleRevokePoints}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Batalkan Verifikasi & Tarik Poin
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <TaskChat 
            taskId={task.id} 
            currentUser={currentUser} 
            role={role} 
            usersDb={usersDb}
          />
        </div>
      )}

      {status === 'IN_PROGRESS' && activeTab === 'DETAIL' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 z-20 flex gap-3">
          <button 
            onClick={() => onNavigate('TASK_UPDATE')}
            className="flex-1 bg-[#151b2b] text-white font-bold py-4 rounded-2xl border border-gray-800 active:scale-[0.98] transition-transform"
          >
            Update Progress
          </button>
          {!isAdminRole && (
            <button 
              onClick={() => setShowProofModal(true)}
              className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform"
            >
              Selesaikan Tugas
            </button>
          )}
        </div>
      )}

      {showProofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white mb-2">Selesaikan Tugas</h3>
            <p className="text-sm text-gray-400 mb-6">Kirimkan bukti atau catatan penyelesaian tugas untuk diverifikasi oleh Admin.</p>
            
            {getTimingStatus() !== 'NORMAL' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
                    {getTimingStatus() === 'NOT_STARTED' ? 'Acara Belum Dimulai' : 'Acara Masih Berlangsung'}
                  </p>
                  <p className="text-[10px] text-amber-200/70 leading-relaxed">
                    Anda mencoba menyelesaikan tugas sebelum waktu pelaksanaan berakhir. Pastikan semua pekerjaan benar-benar telah tuntas.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Catatan Penyelesaian</label>
                <textarea 
                  rows={3}
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder="Tuliskan laporan singkat..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowProofModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-400 bg-[#0a0f18] border border-gray-800 hover:bg-gray-800 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleSubmitProof}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Mengirim...' : 'Kirim Bukti'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};
export default TaskDetail;
import React, { useState, useEffect } from 'react';
import { 
  Bell, ClipboardList, Clock, CheckCircle2, LogOut, 
  MessageSquare, MapPin, Calendar, Wrench, Database, 
  FileText, UserCheck, Loader2, ChevronRight, Users, Trophy,
  Settings, Shield, Zap, Activity, BarChart3, Sparkles, X, Gift, Medal, AlertCircle, PlayCircle, Circle, Megaphone, Edit3, RefreshCw, LifeBuoy
} from 'lucide-react';
import { Screen, Role, UserAccount, Task, Notification, SwapRequest } from '../types';
import { Leaderboard } from '../components/Leaderboard';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, serverTimestamp, doc, updateDoc, setDoc, onSnapshot } from '../firebase';
import { toast } from 'sonner';

import { getAvatarUrl } from '../lib/avatar';

import { useChat } from '../contexts/ChatContext';

interface AdminDashboardProps {
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
  role?: Role;
  user?: UserAccount | null;
  usersDb?: UserAccount[];
  tasksDb?: Task[];
  notificationsDb?: Notification[];
  setSelectedTaskId: (id: string) => void;
  isOnline?: boolean;
  swapRequestsDb?: SwapRequest[];
  helpdeskTicketsDb?: any[];
}

const QuickActionBtn = ({ icon, label, onClick, color }: any) => (
  <motion.button 
    whileTap={{ scale: 0.95 }}
    onClick={onClick} 
    className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3 transition-transform hover:border-gray-700 hover:bg-gray-800/50"
  >
    <div className={`p-2.5 ${color} rounded-xl shadow-lg`}>{icon}</div>
    <div className="text-left">
      <p className="text-xs font-bold text-white leading-tight">{label}</p>
    </div>
  </motion.button>
);

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onNavigate, 
  onLogout, 
  role, 
  user, 
  usersDb = [], 
  tasksDb = [],
  notificationsDb = [],
  setSelectedTaskId,
  isOnline = true,
  swapRequestsDb = [],
  helpdeskTicketsDb = []
}) => {
  const { unreadCount: unreadChatCount } = useChat();
  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const [resetPoints, setResetPoints] = useState(true);

  // --- STATE UNTUK PENGUMUMAN ---
  const [announcement, setAnnouncement] = useState('Selamat datang di Sistem Manajemen Tugas Komsos St. Paulus Juanda!');
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
  const [editAnnouncementText, setEditAnnouncementText] = useState('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  // --- MENGAMBIL DATA PENGUMUMAN SECARA REAL-TIME ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'announcement'), (docSnap) => {
      if (docSnap.exists()) {
        setAnnouncement(docSnap.data().text);
      }
    }, (error) => {
      console.error("Announcement Snapshot Error:", error);
    });
    return () => unsub();
  }, []);

  const handleSaveAnnouncement = async () => {
    if (!editAnnouncementText.trim()) return;
    setIsSavingAnnouncement(true);
    try {
      await setDoc(doc(db, 'settings', 'announcement'), {
        text: editAnnouncementText.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.displayName || 'Admin'
      });
      toast.success("Pengumuman berhasil diperbarui!");
      setIsEditingAnnouncement(false);
    } catch (error) {
      console.error("Gagal menyimpan pengumuman:", error);
      toast.error("Gagal memperbarui pengumuman.");
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const onlineUsers = usersDb
    .filter(u => u.isOnline === true && u.uid !== user?.uid)
    .sort((a, b) => {
      const roleWeights: Record<string, number> = {
        'SUPERADMIN': 1, 'ADMIN_MULTIMEDIA': 2, 'ADMIN_PHOTO_VIDEO': 3, 'ADMIN_PUBLICATION': 4, 'USER': 5
      };
      const weightA = roleWeights[a.role || 'USER'] || 99;
      const weightB = roleWeights[b.role || 'USER'] || 99;
      if (weightA !== weightB) return weightA - weightB;
      const nameA = (a.displayName || '').toLowerCase();
      const nameB = (b.displayName || '').toLowerCase();
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });

  const getRoleName = () => {
    if (role === 'SUPERADMIN') return 'Superadmin';
    if (role === 'ADMIN_MULTIMEDIA') return 'Koordinator Multimedia';
    if (role === 'ADMIN_PHOTO_VIDEO') return 'Koord. Photo & Video';
    if (role === 'ADMIN_PUBLICATION') return 'Koord. Publikasi';
    return 'Admin';
  };

  const getStartTime = (timeString?: string) => {
    if (!timeString) return '00:00';
    if (timeString.includes('-')) {
      return timeString.split('-')[0].trim();
    }
    return timeString.trim();
  };

  const activeTasks = tasksDb
    .filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN')
    .sort((a, b) => {
      const startTimeA = getStartTime(a.time);
      const startTimeB = getStartTime(b.time);
      let dateA = new Date(`${a.date}T${startTimeA}`).getTime();
      if (isNaN(dateA)) dateA = new Date(`${a.date} ${startTimeA}`).getTime();
      let dateB = new Date(`${b.date}T${startTimeB}`).getTime();
      if (isNaN(dateB)) dateB = new Date(`${b.date} ${startTimeB}`).getTime();
      return (dateA || Number.MAX_SAFE_INTEGER) - (dateB || Number.MAX_SAFE_INTEGER);
    });
  const pendingVerifications = tasksDb.filter(t => t.status === 'WAITING_VERIFICATION');
  const completedTasks = tasksDb
    .filter(t => t.status === 'COMPLETED')
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt?.seconds * 1000 || 0).getTime();
      const dateB = new Date(b.updatedAt?.seconds * 1000 || 0).getTime();
      return dateB - dateA;
    });
  const pendingUsers = usersDb.filter(u => u.status === 'PENDING');
  const pendingSwaps = swapRequestsDb.filter(r => r.status === 'PENDING_APPROVAL');
  const pendingHelpdesk = (helpdeskTicketsDb || []).filter(t => t.status === 'OPEN');
  const unreadCount = notificationsDb.filter(n => !n.read).length;

  const topUsers = [...usersDb].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);

  const handleDistributeRewards = async () => {
    if (!usersDb || usersDb.length === 0) return;
    setIsRewarding(true);
    try {
      const dateStr = new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      const promises: Promise<any>[] = [];
      const rewards = [
        { title: 'MVP Komsos', desc: `Peraih poin tertinggi Juara 1 di bulan ${dateStr}.`, icon: 'Trophy', color: 'yellow' },
        { title: 'Runner Up', desc: `Peringkat kedua terbaik di bulan ${dateStr}.`, icon: 'Medal', color: 'gray' },
        { title: 'Top 3 Tim', desc: `Peringkat ketiga terbaik di bulan ${dateStr}.`, icon: 'Medal', color: 'amber' }
      ];
      for (let i = 0; i < topUsers.length; i++) {
        if (topUsers[i] && (topUsers[i].points || 0) > 0) {
          promises.push(addDoc(collection(db, 'badges'), {
            userId: topUsers[i].uid,
            title: rewards[i].title,
            description: rewards[i].desc,
            icon: rewards[i].icon,
            color: rewards[i].color,
            status: 'earned',
            approvals: 1,
            requiredApprovals: 1,
            approvedBy: [user?.uid || 'system'],
            createdAt: serverTimestamp()
          }));
          promises.push(addDoc(collection(db, 'notifications'), {
            userId: topUsers[i].uid,
            title: '🎉 Selamat! Anda Juara!',
            message: `Anda mendapatkan badge spesial [${rewards[i].title}] atas dedikasi Anda di bulan ini. Terus pertahankan!`,
            type: 'SYSTEM',
            read: false,
            createdAt: serverTimestamp()
          }));
        }
      }
      if (resetPoints) {
        usersDb.forEach(u => {
          const uId = u.id || u.uid;
          if (uId) {
            promises.push(updateDoc(doc(db, 'users', uId), { points: 0, completedTasksCount: 0 }));
          }
        });
      }
      await Promise.all(promises);
      toast.success("Reward berhasil dibagikan & Tutup Buku selesai!");
      setShowRewardModal(false);
    } catch (error) {
      console.error("Gagal membagikan reward:", error);
      toast.error("Terjadi kesalahan pada server saat memproses reward.");
    } finally {
      setIsRewarding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-blue-500/30">
            <img src={getAvatarUrl(user)} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight">Halo, {user?.displayName?.split(' ')[0] || 'Admin'}</h1>
            <div>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">{getRoleName()}</p>
              {user?.divisions && user.divisions.length > 0 && (
                <p className="text-[9px] text-gray-400 font-medium mb-1">
                  Divisi: {user.divisions.join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)] animate-pulse'}`} />
              <span className={`text-[8px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-[#151b2b] rounded-full border border-gray-800 relative" onClick={() => onNavigate('NOTIFICATIONS')}>
            <Bell className="w-5 h-5 text-gray-300" />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#151b2b]"></span>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-red-500/10 rounded-full border border-red-500/20" onClick={onLogout}>
            <LogOut className="w-5 h-5 text-red-500" />
          </motion.button>
        </div>
      </header>

      <div className="p-5 space-y-6">
        
        {/* --- PAPAN PENGUMUMAN --- */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Megaphone size={100} /></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" /> Papan Pengumuman
              </h3>
              {isAdminRole && (
                <button 
                  onClick={() => { setEditAnnouncementText(announcement); setIsEditingAnnouncement(true); }} 
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors"
                  title="Edit Pengumuman"
                >
                  <Edit3 className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
            <p className="text-sm font-medium text-white leading-relaxed whitespace-pre-wrap">{announcement}</p>
          </div>
        </div>

        {/* SIAPA YANG ONLINE */}
        <div className="bg-[#151b2b]/50 border border-gray-800 p-4 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
               <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500 animate-pulse" /> Anggota Aktif ({onlineUsers.length})
            </h3>
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Live</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 relative z-10">
            {onlineUsers.length > 0 ? onlineUsers.map((u) => (
              <motion.div 
                key={u.uid} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 bg-[#0a0f18]/80 backdrop-blur-sm border border-gray-800 pl-1 pr-3 py-1 rounded-full ring-1 ring-emerald-500/10 shadow-lg hover:ring-emerald-500/30 transition-all cursor-default group/user"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-emerald-500/30 group-hover/user:scale-110 transition-transform">
                  <img src={getAvatarUrl(u)} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 truncate max-w-[80px]">{u.displayName?.split(' ')[0]}</span>
              </motion.div>
            )) : (
              <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium italic py-1">
                <Activity className="w-3 h-3 opacity-30" />
                <span>Hanya Anda yang sedang aktif saat ini.</span>
              </div>
            )}
          </div>
        </div>

        {/* STATISTIK UTAMA */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            whileTap={{ scale: 0.95 }} 
            onClick={() => onNavigate('TASKS')} 
            className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg shadow-blue-500/20 relative overflow-hidden group cursor-pointer hover:opacity-90 transition-all border border-blue-400/20"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500"><ClipboardList size={80} /></div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-white mb-1 drop-shadow-sm">{activeTasks.length}</p>
              <p className="text-[9px] text-blue-100 font-bold uppercase tracking-widest">Tugas Aktif</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileTap={{ scale: 0.95 }} 
            onClick={() => onNavigate('TEAM')} 
            className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden group cursor-pointer hover:bg-gray-800/50 transition-all"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-500"><Users size={80} /></div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-white mb-1">{usersDb.length}</p>
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total Anggota</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileTap={{ scale: 0.95 }} 
            onClick={() => onNavigate('TASK_VERIFICATION')} 
            className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20 shadow-lg relative overflow-hidden group cursor-pointer hover:bg-amber-500/10 transition-all"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-all duration-500 text-amber-500"><CheckCircle2 size={80} /></div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-amber-500 mb-1">{pendingVerifications.length}</p>
              <p className="text-[9px] text-amber-500/70 font-bold uppercase tracking-widest">Verifikasi Tugas</p>
            </div>
          </motion.div>
          
          <motion.div 
            whileTap={{ scale: 0.95 }} 
            onClick={() => onNavigate('USER_VERIFICATION')} 
            className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20 shadow-lg relative overflow-hidden group cursor-pointer hover:bg-red-500/10 transition-all"
          >
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-all duration-500 text-red-500"><UserCheck size={80} /></div>
            <div className="relative z-10">
              <p className="text-3xl font-black text-red-500 mb-1">{pendingUsers.length}</p>
              <p className="text-[9px] text-red-500/70 font-bold uppercase tracking-widest">Pendaftar Baru</p>
            </div>
          </motion.div>
        </div>

        {/* MENU CEPAT (QUICK ACTIONS) */}
        <div>
          {isAdminRole && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Otoritas Pengurus Komsos
                </h3>
                <span className="text-[8px] font-bold text-gray-600 uppercase tracking-tighter">Admin Only</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <QuickActionBtn icon={<UserCheck className="w-5 h-5 text-white" />} label="Verifikasi Pendaftar" color="bg-red-600 shadow-red-500/30" onClick={() => onNavigate('USER_VERIFICATION')} />
                <div className="relative">
                  <QuickActionBtn icon={<LifeBuoy className="w-5 h-5 text-amber-500" />} label="Laporan (Helpdesk)" color="bg-amber-500/10" onClick={() => onNavigate('HELPDESK')} />
                  {pendingHelpdesk.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0f18] shadow-lg animate-bounce">
                      {pendingHelpdesk.length}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <QuickActionBtn icon={<MessageSquare className="w-5 h-5 text-blue-500" />} label="Live Chat Admin" color="bg-blue-500/10" onClick={() => onNavigate('LIVE_CHAT')} />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0f18] shadow-lg animate-bounce">
                      {unreadChatCount}
                    </span>
                  )}
                </div>
                <QuickActionBtn icon={<Users className="w-5 h-5 text-indigo-500" />} label="Manajemen Tim (Role)" color="bg-indigo-500/10" onClick={() => onNavigate('TEAM')} />
                {role === 'SUPERADMIN' && (
                  <>
                    <QuickActionBtn icon={<Database className="w-5 h-5 text-emerald-500" />} label="Database Master" color="bg-emerald-500/10" onClick={() => onNavigate('ADMIN_DATA_MANAGEMENT')} />
                    <QuickActionBtn icon={<Gift className="w-5 h-5 text-amber-500" />} label="Tutup Buku (Reward)" color="bg-amber-500/10" onClick={() => setShowRewardModal(true)} />
                    <div className="relative">
                      <QuickActionBtn icon={<RefreshCw className="w-5 h-5 text-blue-500" />} label="Bursa Pertukaran" color="bg-blue-500/10" onClick={() => onNavigate('SWAP_REQUEST')} />
                      {pendingSwaps.length > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0f18] shadow-lg animate-pulse">
                          {pendingSwaps.length}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Operasional Komsos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionBtn icon={<Sparkles className="w-5 h-5 text-white" />} label="Buat Tugas Baru" color="bg-blue-600 shadow-blue-500/30" onClick={() => onNavigate('CREATE_TASK')} />
              <QuickActionBtn icon={<Calendar className="w-5 h-5 text-purple-500" />} label="Agenda Komsos" color="bg-purple-500/10" onClick={() => onNavigate('MASS_SCHEDULE')} />
              <QuickActionBtn icon={<Wrench className="w-5 h-5 text-gray-400" />} label="Inventaris Alat" color="bg-gray-800" onClick={() => onNavigate('INVENTORY')} />
              <QuickActionBtn icon={<BarChart3 className="w-5 h-5 text-pink-500" />} label="Laporan Kinerja" color="bg-pink-500/10" onClick={() => onNavigate('REPORTS')} />
              <QuickActionBtn icon={<PlayCircle className="w-5 h-5 text-indigo-500" />} label="Pipeline V-Cast" color="bg-indigo-500/10" onClick={() => onNavigate('VCAST_MANAGER')} />
            </div>
          </div>
        </div>

        {/* --- PERBAIKAN LEADERBOARD: Hanya tampil jika ada poin > 0 --- */}
        <div>
          {usersDb.filter(u => (u.points || 0) > 0).length > 0 ? (
            <Leaderboard users={usersDb.filter(u => (u.points || 0) > 0)} />
          ) : (
            <div className="bg-[#151b2b] p-6 rounded-3xl border border-gray-800 text-center">
              <div className="inline-flex p-4 bg-gray-800/50 rounded-full mb-3">
                <Trophy className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="font-extrabold text-white mb-1">Klasemen Masih Kosong</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-[250px] mx-auto">
                Belum ada anggota yang mengumpulkan poin bulan ini.
              </p>
            </div>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tugas Mendesak</h3>
            <button onClick={() => onNavigate('TASKS')} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider">Lihat Semua</button>
          </div>
          <div className="space-y-3">
            {activeTasks.length > 0 ? activeTasks.slice(0, 3).map((task) => (
              <motion.div key={task.id} whileHover={{ x: 5 }} onClick={() => { setSelectedTaskId(task.id); onNavigate('TASK_DETAIL'); }} className="bg-[#151b2b] p-4 rounded-2xl border-l-4 border-l-blue-500 flex justify-between items-center cursor-pointer transition-all hover:bg-gray-800/50 shadow-sm">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white mb-1 line-clamp-1">{task.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    <Calendar size={10} /> {task.date} • <Clock size={10} className="ml-1" /> {task.time}
                  </div>
                  
                  {/* Assigned Users Avatars */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {(task.assignedUsers || []).slice(0, 5).map((uId, idx) => {
                      const u = usersDb.find(user => user.uid === uId || user.id === uId);
                      return (
                        <div key={idx} className="inline-block h-5 w-5 rounded-full ring-2 ring-[#151b2b] bg-gray-800 overflow-hidden">
                          <img src={getAvatarUrl(u)} alt="Avatar" className="h-full w-full object-cover" />
                        </div>
                      );
                    })}
                    {(task.assignedUsers || []).length > 5 && (
                      <div className="flex items-center justify-center h-5 w-5 rounded-full ring-2 ring-[#151b2b] bg-gray-700 text-[8px] font-bold text-gray-300">
                        +{(task.assignedUsers || []).length - 5}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-gray-800 p-2 rounded-lg ml-3">
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-10 bg-[#151b2b] rounded-2xl border border-dashed border-gray-800">
                <CheckCircle2 className="w-8 h-8 text-gray-700 mx-auto mb-2 opacity-50" />
                <p className="text-gray-500 text-xs font-medium">Bagus! Tidak ada tugas mendesak saat ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* --- TUGAS SELESAI TERBARU --- */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tugas Selesai Terbaru</h3>
            <button onClick={() => onNavigate('TASK_VERIFICATION')} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider">Riwayat</button>
          </div>
          <div className="space-y-3">
            {completedTasks.length > 0 ? completedTasks.slice(0, 2).map((task) => (
              <motion.div key={task.id} whileHover={{ x: 5 }} onClick={() => { setSelectedTaskId(task.id); onNavigate('TASK_DETAIL'); }} className="bg-[#151b2b] p-4 rounded-2xl border-l-4 border-l-emerald-500 flex justify-between items-center cursor-pointer transition-all hover:bg-gray-800/50 shadow-sm">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-white mb-1 line-clamp-1">{task.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-2">
                    <CheckCircle2 size={10} className="text-emerald-500" /> Selesai pada {task.date}
                  </div>
                  <div className="flex -space-x-2 overflow-hidden">
                    {(task.assignedUsers || []).slice(0, 3).map((uId, idx) => {
                      const u = usersDb.find(user => user.uid === uId || user.id === uId);
                      return (
                        <div key={idx} className="inline-block h-4 w-4 rounded-full ring-2 ring-[#151b2b] bg-gray-800 overflow-hidden">
                          <img src={getAvatarUrl(u)} alt="Avatar" className="h-full w-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-lg ml-3">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              </motion.div>
            )) : (
              <div className="text-center py-6 bg-[#151b2b] rounded-2xl border border-dashed border-gray-800">
                <p className="text-gray-600 text-[10px] font-medium">Belum ada riwayat tugas selesai.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL EDIT PENGUMUMAN --- */}
      {isEditingAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-md rounded-3xl border border-gray-800 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Megaphone className="text-blue-500" /> Edit Pengumuman
              </h3>
              <button onClick={() => setIsEditingAnnouncement(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Teks Pengumuman</label>
                <textarea 
                  rows={5}
                  value={editAnnouncementText}
                  onChange={(e) => setEditAnnouncementText(e.target.value)}
                  placeholder="Ketikkan pengumuman penting di sini..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>

            <button 
              onClick={handleSaveAnnouncement} 
              disabled={isSavingAnnouncement || !editAnnouncementText.trim()} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingAnnouncement ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isSavingAnnouncement ? 'Menyimpan...' : 'Simpan Pengumuman'}
            </button>
          </div>
        </div>
      )}

      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-md rounded-3xl border border-gray-800 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Gift className="text-amber-500" /> Tutup Buku Bulanan
              </h3>
              <button onClick={() => setShowRewardModal(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">Sistem akan membagikan lencana eksklusif ke 3 anggota dengan skor tertinggi.</p>
            <div className="space-y-3 mb-6">
              {topUsers.map((u, i) => (
                <div key={u.uid} className={`flex items-center gap-3 p-3 rounded-2xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#0a0f18] border-gray-800'}`}>
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-gray-700">
                    <img src={getAvatarUrl(u)} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{u.displayName}</p>
                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{u.points || 0} Poin</p>
                  </div>
                  {i === 0 && <Trophy className="w-6 h-6 text-amber-500 shrink-0" />}
                  {i === 1 && <Medal className="w-6 h-6 text-gray-400 shrink-0" />}
                  {i === 2 && <Medal className="w-6 h-6 text-amber-700 shrink-0" />}
                </div>
              ))}
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={resetPoints} onChange={(e) => setResetPoints(e.target.checked)} className="mt-1 shrink-0 accent-red-500"/>
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">Reset Poin Bulanan</p>
                  <p className="text-[10px] text-red-400/70 leading-relaxed">Centang untuk mereset poin bulanan semua anggota.</p>
                </div>
              </label>
            </div>
            <button onClick={handleDistributeRewards} disabled={isRewarding || topUsers.length === 0} className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              {isRewarding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              {isRewarding ? 'Sedang Memproses...' : 'Bagikan Reward Sekarang'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
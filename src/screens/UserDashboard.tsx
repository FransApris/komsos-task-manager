import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Video, Calendar, Clock, LogOut, Image as ImageIcon, FileText, CheckSquare, UserCheck, Users, Activity, Zap, Star, TrendingUp, Edit3, Save, Timer, Loader2, Globe, Sparkles, CheckCircle, ShieldCheck, ChevronRight, Flame, Trophy, Target, Award, Megaphone, RefreshCw, Circle, HelpCircle, PlayCircle, AlertCircle } from 'lucide-react';
import { Screen, UserAccount, Task, Notification, TaskType, AvailabilityStatus } from '../types';
import { Leaderboard } from '../components/Leaderboard';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db, doc, updateDoc, onSnapshot } from '../firebase';
import { toast } from 'sonner';

import { getAvatarUrl } from '../lib/avatar';

import { useChat } from '../contexts/ChatContext';

export const UserDashboard: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  onLogout: () => void, 
  user?: UserAccount | null,
  tasksDb?: Task[],
  notificationsDb?: Notification[],
  taskTypes?: TaskType[],
  usersDb?: UserAccount[],
  setSelectedTaskId?: (id: string) => void,
  isOnline?: boolean,
  helpdeskTicketsDb?: any[]
}> = ({ onNavigate, onLogout, user, tasksDb = [], notificationsDb = [], taskTypes = [], usersDb = [], setSelectedTaskId = (_id: string) => {}, isOnline = true, helpdeskTicketsDb = [] }) => {
  const { unreadCount: unreadChatCount } = useChat();
  const [quickNotes, setQuickNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  
  const [taskTab, setTaskTab] = useState<'MINE' | 'ALL' | 'COMPLETED'>('MINE');
  const [announcement, setAnnouncement] = useState('Selamat datang di Sistem Manajemen Tugas Komsos St. Paulus Juanda!');

  // Sync quickNotes when user prop changes
  useEffect(() => {
    if (user && user.quickNotes !== undefined) {
      setQuickNotes(user.quickNotes);
    }
  }, [user?.quickNotes, user?.id]);

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

  const getRoleName = () => {
    if (user && user.role === 'SUPERADMIN') return 'Superadmin';
    if (user && user.role && user.role.startsWith('ADMIN_MULTIMEDIA')) return 'Multimedia';
    if (user && user.role && user.role.startsWith('ADMIN_PHOTO_VIDEO')) return 'Photo & Video';
    if (user && user.role && user.role.startsWith('ADMIN_PUBLICATION')) return 'Publikasi';
    return 'Petugas';
  };

  const getStartTime = (timeString?: string) => {
    if (!timeString) return '00:00';
    if (timeString.includes('-')) {
      return timeString.split('-')[0].trim();
    }
    return timeString.trim();
  };

  const allActiveTasks = (tasksDb || [])
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

  const myActiveTasks = allActiveTasks.filter(t => {
    if (!user || !user.uid) return false;
    const assigned = t.assignedUsers || [];
    return assigned.some(id => id?.trim() === user.uid?.trim() || id?.trim() === user.id?.trim());
  });

  const myCompletedTasks = (tasksDb || [])
    .filter(t => t.status === 'COMPLETED')
    .filter(t => {
      if (!user || !user.uid) return false;
      const assigned = t.assignedUsers || [];
      return assigned.some(id => id?.trim() === user.uid?.trim() || id?.trim() === user.id?.trim());
    })
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt?.seconds * 1000 || 0).getTime();
      const dateB = new Date(b.updatedAt?.seconds * 1000 || 0).getTime();
      return dateB - dateA;
    });

  const today = new Date().toISOString().split('T')[0];
  const myOverdueTasks = myActiveTasks.filter(t => t.date < today && (t.status === 'OPEN' || t.status === 'IN_PROGRESS'));
  const myUpcomingTasks = myActiveTasks.filter(t => !(t.date < today && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')));

  const displayedTasks = taskTab === 'MINE' ? myActiveTasks : taskTab === 'ALL' ? allActiveTasks : myCompletedTasks;

  const unreadCount = (notificationsDb || []).filter(n => !n.read).length;
  const repliedHelpdeskCount = (helpdeskTicketsDb || []).filter(t => t.userId === user?.uid && t.status === 'REPLIED').length;
  const totalHelpdeskUnread = unreadChatCount + repliedHelpdeskCount;

  const onlineUsers = useMemo(() =>
    usersDb.filter(u => u.isOnline === true && u.uid !== user?.uid)
      .sort((a, b) => {
        const roleWeights: Record<string, number> = {
          'SUPERADMIN': 1, 'ADMIN_MULTIMEDIA': 2, 'ADMIN_PHOTO_VIDEO': 3, 'ADMIN_PUBLICATION': 4, 'USER': 5
        };
        const weightA = roleWeights[a.role || 'USER'] || 99;
        const weightB = roleWeights[b.role || 'USER'] || 99;
        if (weightA !== weightB) return weightA - weightB;
        return (a.displayName || '').localeCompare(b.displayName || '');
      }),
  [usersDb, user?.uid]);

  const currentXp = (user && user.xp) ? user.xp : 0;
  const xpPerLevel = 1000;
  const levelProgress = (currentXp % xpPerLevel) / xpPerLevel * 100;

  const getSkillProgress = (category: keyof NonNullable<UserAccount['stats']>) => {
    const val = (user && user.stats && user.stats[category]) ? user.stats[category] : 0;
    const nextLevelThreshold = (Math.floor(val / 10) + 1) * 10;
    const currentLevelThreshold = Math.floor(val / 10) * 10;
    return ((val - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;
  };

  // --- HITUNG MUNDUR (TANPA DETIK) ---
  useEffect(() => {
    if (myUpcomingTasks.length === 0) {
      setCountdown(myOverdueTasks.length > 0 ? 'Ada tugas yang terlewat!' : 'Tidak ada tugas terdekat');
      return;
    }

    const nextTask = myUpcomingTasks[0];

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const taskStartTime = getStartTime(nextTask.time);
      
      let taskTime = new Date(`${nextTask.date}T${taskStartTime}`).getTime();
      if (isNaN(taskTime)) {
        taskTime = new Date(`${nextTask.date} ${taskStartTime}`).getTime();
      }

      if (isNaN(taskTime)) {
        setCountdown('Format Waktu Salah');
        clearInterval(timer);
        return;
      }

      const diff = taskTime - now;

      if (diff <= 0) {
        setCountdown('Tugas Sedang Berlangsung');
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          setCountdown(`${days} Hari ${hours}j ${minutes}m`);
        } else {
          setCountdown(`${hours}j ${minutes}m`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tasksDb, user]); 

  const handleSaveNotes = async () => {
    if (!user || !user.id) return;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        quickNotes: quickNotes
      });
      toast.success('Catatan disimpan');
    } catch (error) {
      toast.error('Gagal menyimpan catatan');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!user || !user.id) return;
    setIsTogglingAvailability(true);
    try {
      const nextStatus: AvailabilityStatus = user.availability === 'AVAILABLE' ? 'BUSY' : 
                                             user.availability === 'BUSY' ? 'AWAY' : 'AVAILABLE';
      await updateDoc(doc(db, 'users', user.id), {
        availability: nextStatus
      });
      toast.success(`Status diubah ke ${nextStatus}`);
    } catch (error) {
      toast.error('Gagal mengubah status');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const recommendedTasks = (tasksDb || []).filter(t => {
    if (t.status !== 'IN_PROGRESS') return false;
    if (!user || !user.skills || user.skills.length === 0) return false;
    return user.skills.some(skill => 
      t.title.toLowerCase().includes(skill.toLowerCase()) || 
      (t.description && t.description.toLowerCase().includes(skill.toLowerCase())) ||
      t.type.toLowerCase().includes(skill.toLowerCase())
    );
  }).slice(0, 3);

  const statsData = useMemo(() => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const count = (tasksDb || []).filter(t => {
        const taskDate = t.updatedAt?.seconds
          ? new Date(t.updatedAt.seconds * 1000).toISOString().split('T')[0]
          : t.date;
        return t.status === 'COMPLETED' && taskDate === dateStr;
      }).length;
      return { name: days[d.getDay()], tasks: count };
    });
  }, [tasksDb]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const getIcon = (type: string) => {
    const t = type ? type.toLowerCase() : '';
    switch(t) {
      case 'peliputan': return <Video className="w-4 h-4 text-blue-500"/>;
      case 'dokumentasi': return <ImageIcon className="w-4 h-4 text-emerald-500"/>;
      case 'publikasi': return <FileText className="w-4 h-4 text-amber-500"/>;
      default: 
        const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
        if (foundType) return <Activity className="w-4 h-4" style={{ color: foundType.color }} />;
        return <CheckSquare className="w-4 h-4 text-blue-500"/>;
    }
  };

  const getIconBg = (type: string) => {
    const t = type ? type.toLowerCase() : '';
    switch(t) {
      case 'peliputan': return 'bg-blue-500/10';
      case 'dokumentasi': return 'bg-emerald-500/10';
      case 'publikasi': return 'bg-amber-500/10';
      default: return 'bg-blue-500/10';
    }
  };

  const getTaskImage = (type: string) => {
    const t = type ? type.toLowerCase() : '';
    if (t === 'publikasi' || t === 'publication') return '/publication.jpg';
    if (t === 'peliputan' || t === 'video') return '/video.jpg';
    if (t === 'dokumentasi' || t === 'photo') return '/kamera.jpg';
    return '/background.jpg'; 
  };

  const isDemoUser = user && user.id && user.id.startsWith('demo_');
  const userName = user && user.displayName ? user.displayName.split(' ')[0] : 'User';
  const isSuperAdmin = user && user.role === 'SUPERADMIN';
  const userBio = user && user.bio ? user.bio : '';
  
  const currentStreak = (user && user.streak && user.streak.current) ? user.streak.current : 0;
  const hasStreak = currentStreak > 0;
  
  const userLevel = (user && user.level) ? user.level : 1;
  const userPoints = (user && user.points) ? user.points : 0;
  const completedTasksCount = myCompletedTasks.length;
  
  const sortedUsers = [...usersDb].sort((a, b) => (b.points || 0) - (a.points || 0));
  const userRank = user ? sortedUsers.findIndex(u => (u.uid || u.id) === (user.uid || user.id)) + 1 : 0;
  
  const availability = (user && user.availability) ? user.availability : 'AVAILABLE';
  const availStyles = {
    AVAILABLE: { btn: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500', dot: 'bg-emerald-500', text: 'Tersedia' },
    BUSY: { btn: 'bg-red-500/10 border-red-500/20 text-red-500', dot: 'bg-red-500', text: 'Sibuk' },
    AWAY: { btn: 'bg-amber-500/10 border-amber-500/20 text-amber-500', dot: 'bg-amber-500', text: 'Away' }
  };
  const currentAvail = availStyles[availability as keyof typeof availStyles] || availStyles.AVAILABLE;
  const isOnlineStatus = user?.isOnline ?? isOnline;

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-gray-700">
            <img src={getAvatarUrl(user)} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </motion.div>
          <h1 className="text-lg font-extrabold tracking-tight text-white">Tugas Komsos</h1>
        </div>
        <div className="flex items-center gap-2">
          
          {/* --- TOMBOL PUSAT BANTUAN DI SINI --- */}
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            className="p-2 bg-blue-600/10 rounded-full border border-blue-500/20" 
            onClick={() => onNavigate('HELP_CENTER')}
          >
            <HelpCircle className="w-5 h-5 text-blue-400" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-[#151b2b] rounded-full border border-gray-800 relative" onClick={() => onNavigate('NOTIFICATIONS')}>
            <Bell className="w-5 h-5 text-gray-300" />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#151b2b]"></span>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} className="p-2 bg-red-500/10 rounded-full border border-red-500/20" onClick={onLogout}>
            <LogOut className="w-5 h-5 text-red-500" />
          </motion.button>
        </div>
      </header>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-5">
        {isDemoUser && (
          <motion.div variants={itemVariants} className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Mode Demo Aktif</span>
            </div>
            <span className="text-[9px] text-emerald-500/60 font-medium">Beberapa fitur database mungkin terbatas</span>
          </motion.div>
        )}
        
        <motion.div variants={itemVariants} className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Halo, {userName} 👋</h2>
                {isSuperAdmin && <ShieldCheck className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{getRoleName()}</span>
                <span className="text-gray-400 text-xs font-medium">Paroki Pusat</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnlineStatus ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)] animate-pulse'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isOnlineStatus ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                    {isOnlineStatus ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <motion.button 
              whileTap={{ scale: 0.9 }} onClick={handleToggleAvailability} disabled={isTogglingAvailability}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${currentAvail.btn}`}
            >
              <div className={`w-2 h-2 rounded-full animate-pulse ${currentAvail.dot}`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">{currentAvail.text}</span>
            </motion.button>
          </div>
          {userBio !== '' && <p className="text-sm text-gray-400 italic mt-2 line-clamp-2 max-w-md">"{userBio}"</p>}
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6">
          <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10"><Megaphone size={100} /></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Papan Pengumuman Komsos</h3>
              </div>
              <p className="text-sm font-medium text-white leading-relaxed whitespace-pre-wrap">{announcement}</p>
            </div>
          </div>
        </motion.div>

        {/* SIAPA YANG ONLINE */}
        <motion.div variants={itemVariants} className="bg-[#151b2b]/50 border border-gray-800 p-4 rounded-3xl mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
               <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" /> Anggota Aktif ({onlineUsers.length})
            </h3>
            <div className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[8px] font-bold text-emerald-500/50 uppercase tracking-tighter">Live Update</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {onlineUsers.length > 0 ? onlineUsers.map((u) => (
              <div key={u.uid || u.id} className="flex items-center gap-2 bg-[#0a0f18] border border-gray-800 pl-1 pr-3 py-1 rounded-full ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-emerald-500/30">
                  <img src={getAvatarUrl(u)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <span className="text-[10px] font-bold text-gray-300 truncate max-w-20">{u.displayName?.split(' ')[0]}</span>
              </div>
            )) : (
              <p className="text-[10px] text-gray-600 font-medium italic">Hanya Anda yang sedang aktif saat ini.</p>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className={`p-2 rounded-xl ${hasStreak ? 'bg-orange-500/10' : 'bg-gray-800'}`}>
              <Flame className={`w-5 h-5 ${hasStreak ? 'text-orange-500' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Streak</p>
              <p className="text-lg font-black text-white">{currentStreak} Hari</p>
            </div>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl"><Trophy className="w-5 h-5 text-blue-500" /></div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Peringkat</p>
              <p className="text-lg font-black text-white">#{userRank}</p>
            </div>
          </div>
        </motion.div>

        <div className="mb-6 bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Kemajuan Level</p>
              <p className="text-sm font-black text-white">Level {userLevel}</p>
            </div>
            <p className="text-[10px] font-bold text-blue-500">{Math.round(levelProgress)}% Menuju Level { userLevel + 1 }</p>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} className="h-full bg-linear-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
          </div>
        </div>

        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl"><Target className="w-5 h-5 text-blue-500" /></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Penguasaan Bidang</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Fotografi', key: 'photography' as const, color: 'bg-emerald-500', icon: <ImageIcon size={14} /> },
              { label: 'Videografi', key: 'videography' as const, color: 'bg-blue-500', icon: <Video size={14} /> },
              { label: 'Penulisan', key: 'writing' as const, color: 'bg-amber-500', icon: <FileText size={14} /> },
              { label: 'Desain', key: 'design' as const, color: 'bg-purple-500', icon: <Activity size={14} /> },
            ].map((skill) => (
              <div key={skill.key} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${skill.color}/10`}>{skill.icon}</div>
                    <span className="text-xs font-bold text-white">{skill.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lv. {Math.floor(((user && user.stats && user.stats[skill.key]) ? user.stats[skill.key] : 0) / 10) + 1}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${getSkillProgress(skill.key)}%` }} className={`h-full ${skill.color}`} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-xl"><Award className="w-5 h-5 text-amber-500" /></div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pencapaian Terbaru</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[
              { title: 'Pemula', desc: 'Selesaikan 1 tugas', icon: <CheckCircle size={20} />, unlocked: completedTasksCount >= 1, colorUncloked: 'text-amber-500', bgUnlocked: 'bg-linear-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' },
              { title: 'Konsisten', desc: 'Streak 3 hari', icon: <Flame size={20} />, unlocked: currentStreak >= 3, colorUncloked: 'text-amber-500', bgUnlocked: 'bg-linear-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' },
              { title: 'Spesialis', desc: 'Skill Lv. 5', icon: <Target size={20} />, unlocked: user && user.stats && Object.values(user.stats).some(v => v >= 50), colorUncloked: 'text-amber-500', bgUnlocked: 'bg-linear-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' },
              { title: 'Veteran', desc: 'Level 10', icon: <Trophy size={20} />, unlocked: userLevel >= 10, colorUncloked: 'text-amber-500', bgUnlocked: 'bg-linear-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' },
            ].map((achievement, idx) => (
              <motion.div key={idx} whileHover={{ y: -5 }} className={`min-w-35 p-4 rounded-2xl border transition-all ${achievement.unlocked ? achievement.bgUnlocked : 'bg-[#151b2b] border-gray-800 opacity-50'}`}>
                <div className={`mb-3 ${achievement.unlocked ? achievement.colorUncloked : 'text-gray-600'}`}>{achievement.icon}</div>
                <p className="text-xs font-bold text-white mb-1">{achievement.title}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">{achievement.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6 bg-linear-to-br from-indigo-600 to-purple-700 p-5 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10"><Timer size={120} /></div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl"><Clock className="w-5 h-5 text-white" /></div>
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Tugas Terdekat</p>
          </div>
          <p className="text-3xl font-black text-white mb-1">{countdown}</p>
          <p className="text-[10px] text-indigo-100 font-medium uppercase tracking-widest opacity-80">Waktu Tersisa</p>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-linear-to-br from-blue-600 to-blue-700 p-4 rounded-2xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-white/20 rounded-lg"><Zap className="w-4 h-4 text-white" /></div>
              <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Level {userLevel}</span>
            </div>
            <p className="text-2xl font-black text-white">{userPoints}</p>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Total Poin</p>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg"><Star className="w-4 h-4 text-emerald-500" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pencapaian</span>
            </div>
            <p className="text-2xl font-black text-white">{completedTasksCount}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tugas Selesai</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6 bg-[#151b2b] p-5 rounded-3xl border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statistik Tugas</p>
            </div>
            <span className="text-[10px] font-bold text-gray-500">7 Hari Terakhir</span>
          </div>
          <div className="h-48 w-full min-h-48">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={statsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#151b2b', border: '1px solid #374151', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
                <Area type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6 bg-[#151b2b] p-5 rounded-3xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><Edit3 className="w-5 h-5 text-emerald-500" /></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catatan Cepat</p>
            </div>
            <button onClick={handleSaveNotes} disabled={isSavingNotes} className="p-2 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600/20 transition-colors disabled:opacity-50">
              {isSavingNotes ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            </button>
          </div>
          <textarea value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} placeholder="Tulis catatan penting di sini..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl p-4 text-sm text-gray-300 focus:border-blue-500 transition-all resize-none h-24" />
        </motion.div>

        {recommendedTasks.length > 0 && (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-xl"><Sparkles className="w-5 h-5 text-purple-500" /></div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rekomendasi Untukmu</p>
            </div>
            <div className="space-y-3">
              {recommendedTasks.map((task) => (
                <motion.div key={task.id} whileHover={{ x: 5 }} onClick={() => { setSelectedTaskId(task.id); onNavigate('TASK_DETAIL'); }} className="p-4 bg-[#151b2b] rounded-2xl border border-gray-800 flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${getIconBg(task.type)}`}>{getIcon(task.type)}</div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{task.title}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{task.type}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-blue-500" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onNavigate('MASS_SCHEDULE')} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3 hover:bg-gray-800 transition-colors">
            <div className="p-2 bg-purple-500/10 rounded-xl"><Calendar className="w-5 h-5 text-purple-500" /></div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Agenda</p>
              <p className="text-[10px] text-gray-500">Daftar Petugas</p>
            </div>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onNavigate('ATTENDANCE')} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3 hover:bg-gray-800 transition-colors">
            <div className="p-2 bg-emerald-500/10 rounded-xl"><UserCheck className="w-5 h-5 text-emerald-500" /></div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Presensi</p>
              <p className="text-[10px] text-gray-500">Check In Tugas</p>
            </div>
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 mb-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onNavigate('VCAST_MANAGER')} className="bg-linear-to-r from-indigo-600/20 to-purple-600/20 p-4 rounded-2xl border border-indigo-500/30 flex items-center gap-3 hover:from-indigo-600/30 hover:to-purple-600/30 transition-all group">
            <div className="p-2 bg-indigo-500/20 rounded-xl group-hover:scale-110 transition-transform"><PlayCircle className="w-5 h-5 text-indigo-500" /></div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-indigo-500 uppercase tracking-wider">Pipeline V-Cast</p>
              <p className="text-[10px] text-indigo-200/60">Pantau Progress Produksi Konten</p>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-500/50 ml-auto" />
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 mb-3">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onNavigate('SWAP_REQUEST')} className="bg-linear-to-r from-amber-600/20 to-orange-600/20 p-4 rounded-2xl border border-amber-500/30 flex items-center gap-3 hover:from-amber-600/30 hover:to-orange-600/30 transition-all group">
            <div className="p-2 bg-amber-500/20 rounded-xl group-hover:scale-110 transition-transform"><RefreshCw className="w-5 h-5 text-amber-500" /></div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Bursa Pertukaran</p>
              <p className="text-[10px] text-amber-200/60">Tukar Jadwal atau Cari Pengganti</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500/50 ml-auto" />
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 mb-8">
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onNavigate('HELP_CENTER')} className="bg-linear-to-r from-blue-600/20 to-indigo-600/20 p-4 rounded-2xl border border-blue-500/30 flex items-center gap-3 hover:from-blue-600/30 hover:to-indigo-600/30 transition-all group relative">
            <div className="p-2 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform"><HelpCircle className="w-5 h-5 text-blue-500" /></div>
            <div className="text-left">
              <p className="text-xs font-extrabold text-blue-500 uppercase tracking-wider">Bantuan Segera</p>
              <p className="text-[10px] text-blue-200/60">Chat Admin atau Lapor Kendala</p>
            </div>
            {totalHelpdeskUnread > 0 && (
              <span className="absolute top-2 right-10 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0f18] animate-bounce">
                {totalHelpdeskUnread}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-blue-500/50 ml-auto" />
          </motion.button>
        </motion.div>

        {myOverdueTasks.length > 0 && (
          <motion.div variants={itemVariants} className="mb-4 bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs font-black text-red-500 uppercase tracking-widest">{myOverdueTasks.length} Tugas Terlewat</p>
            </div>
            <div className="space-y-2">
              {myOverdueTasks.map(t => (
                <button key={t.id} onClick={() => { setSelectedTaskId(t.id); onNavigate('TASK_DETAIL'); }} className="w-full text-left p-3 bg-red-500/5 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-colors">
                  <p className="text-xs font-bold text-white">{t.title}</p>
                  <p className="text-[10px] text-red-400 mt-0.5">{t.date} · {t.type}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
          <div className="flex gap-2 bg-[#151b2b] p-1.5 rounded-xl border border-gray-800 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setTaskTab('MINE')}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${taskTab === 'MINE' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Tugas Saya
            </button>
            <button 
              onClick={() => setTaskTab('ALL')}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${taskTab === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Semua Tugas
            </button>
            <button 
              onClick={() => setTaskTab('COMPLETED')}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${taskTab === 'COMPLETED' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Selesai
            </button>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${taskTab === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {displayedTasks.length} {taskTab === 'COMPLETED' ? 'Riwayat' : 'Tugas'}
          </span>
        </motion.div>

        <div className="space-y-4 mb-8">
          {displayedTasks.length > 0 ? displayedTasks.map((task) => {
            const customTypeObj = taskTypes.find(tt => tt.name.toLowerCase() === (task.type ? task.type.toLowerCase() : ''));
            const customColor = customTypeObj ? customTypeObj.color : null;
            const customStyle = customColor ? { backgroundColor: `${customColor}20` } : {};
            const isCompleted = task.status === 'COMPLETED';
            const isOverdue = !isCompleted && task.date < today && (task.status === 'OPEN' || task.status === 'IN_PROGRESS');

            return (
              <motion.div 
                variants={itemVariants}
                key={task.id}
                className={`bg-[#151b2b] rounded-2xl overflow-hidden border ${isOverdue ? 'border-red-500/30' : 'border-gray-800'} shadow-lg cursor-pointer transition-all hover:border-${isCompleted ? 'emerald' : 'blue'}-500/50 relative`} 
                onClick={() => { setSelectedTaskId(task.id); onNavigate('TASK_DETAIL'); }}
                whileTap={{ scale: 0.98 }}
              >
                {taskTab === 'ALL' && user && task.assignedUsers && task.assignedUsers.some(id => id?.trim() === user.uid?.trim()) && (
                  <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 z-10 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                )}

                <div className="h-32 bg-gray-800 relative">
                  <img src={getTaskImage(task.type)} className="w-full h-full object-cover opacity-60 mix-blend-overlay" alt={task.title} referrerPolicy="no-referrer" />
                  <div className={`absolute top-3 left-3 ${isCompleted ? 'bg-emerald-600' : isOverdue ? 'bg-red-600' : 'bg-blue-600'} text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md`}>
                    <span className={`w-1.5 h-1.5 bg-white rounded-full ${!isCompleted && !isOverdue ? 'animate-pulse' : ''}`}></span> {isCompleted ? 'Selesai & Terverifikasi' : isOverdue ? 'Terlewat' : 'Sedang Berlangsung'}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-extrabold text-lg leading-tight text-white pr-4">{task.title}</h4>
                    <div 
                      className={`p-1.5 rounded-lg shrink-0 ${!customColor ? getIconBg(task.type) : ''}`} 
                      style={customStyle}
                    >
                      {getIcon(task.type)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5"><Calendar className="w-3.5 h-3.5" /> {task.type}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-medium"><Clock className="w-3.5 h-3.5" /> {task.time}</div>
                    
                    <div className="flex -space-x-1.5">
                      {(task.assignedUsers || []).slice(0, 3).map((uid, i) => {
                        const u = usersDb?.find(usr => usr.uid?.trim() === uid?.trim() || usr.id?.trim() === uid?.trim());
                        return (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-[#151b2b] bg-gray-800 overflow-hidden shadow-sm relative">
                            {user && uid?.trim() === user.uid?.trim() && <div className="absolute inset-0 border-2 border-emerald-500 rounded-full z-10 pointer-events-none"></div>}
                            <img src={getAvatarUrl(u)} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        );
                      })}
                      {task.assignedUsers && task.assignedUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-[#151b2b] bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-400">
                          +{task.assignedUsers.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <motion.div variants={itemVariants} className="text-center py-10 bg-[#151b2b] rounded-2xl border border-gray-800 border-dashed">
              <p className="text-gray-500 text-sm">
                {taskTab === 'MINE' ? 'Anda tidak memiliki tugas aktif hari ini.' : 'Tidak ada tugas yang sedang berlangsung.'}
              </p>
            </motion.div>
          )}
        </div>

        {/* --- LEADERBOARD DIPINDAH KE BAWAH (Hanya Tampil Jika Ada Poin > 0) --- */}
        <motion.div variants={itemVariants} className="mt-8 mb-8 pt-6 border-t border-gray-800/50">
          {usersDb.filter(u => (u.points || 0) > 0).length > 0 ? (
            <Leaderboard users={usersDb.filter(u => (u.points || 0) > 0)} />
          ) : (
            <div className="bg-[#151b2b] p-6 rounded-3xl border border-gray-800 text-center">
              <div className="inline-flex p-4 bg-gray-800/50 rounded-full mb-3">
                <Trophy className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="font-extrabold text-white mb-1">Klasemen Masih Kosong</h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-62.5 mx-auto">
                Belum ada anggota yang mengumpulkan poin. Ambil tugas dan jadilah yang pertama di puncak klasemen!
              </p>
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
};

export default UserDashboard;
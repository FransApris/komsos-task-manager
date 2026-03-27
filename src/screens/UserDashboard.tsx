import React, { useState, useEffect } from 'react';
import { Bell, Video, Calendar, Clock, LogOut, Image as ImageIcon, FileText, CheckSquare, UserCheck, Users, Activity, Zap, Star, TrendingUp, Edit3, Save, Timer, Loader2, Globe, Sparkles, CheckCircle, ShieldCheck, ChevronRight, Flame, Trophy, Target, Award, Megaphone, RefreshCw } from 'lucide-react';
import { Screen, UserAccount, Task, Notification, TaskType, AvailabilityStatus } from '../types';
import { Leaderboard } from '../components/Leaderboard';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db, doc, updateDoc, onSnapshot } from '../firebase';
import { toast } from 'sonner';

import { getAvatarUrl } from '../lib/avatar';

export const UserDashboard: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  onLogout: () => void, 
  user?: UserAccount | null,
  tasksDb?: Task[],
  notificationsDb?: Notification[],
  taskTypes?: TaskType[],
  usersDb?: UserAccount[],
  setSelectedTaskId?: (id: string) => void,
  isOnline?: boolean
}> = ({ onNavigate, onLogout, user, tasksDb = [], notificationsDb = [], taskTypes = [], usersDb = [], setSelectedTaskId = (_id: string) => {}, isOnline = true }) => {
  const [quickNotes, setQuickNotes] = useState(user?.quickNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  
  // --- STATE PENGUMUMAN BARU ---
  const [announcement, setAnnouncement] = useState('Selamat datang di Sistem Manajemen Tugas Komsos St. Paulus Juanda!');

  // --- MENGAMBIL DATA PENGUMUMAN DARI DATABASE SECARA REAL-TIME ---
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
    if (user?.role === 'SUPERADMIN') return 'Superadmin';
    if (user?.role === 'ADMIN_MULTIMEDIA') return 'Multimedia';
    if (user?.role === 'ADMIN_PHOTO_VIDEO') return 'Photo & Video';
    if (user?.role === 'ADMIN_PUBLICATION') return 'Publikasi';
    return 'Petugas';
  };

  const activeTasks = (tasksDb || []).filter(t => t.status === 'IN_PROGRESS');
  const unreadCount = (notificationsDb || []).filter(n => !n.read).length;

  // Calculate XP Progress
  const currentXp = user?.xp || 0;
  const xpPerLevel = 1000;
  const levelProgress = (currentXp % xpPerLevel) / xpPerLevel * 100;

  const getSkillProgress = (category: keyof NonNullable<UserAccount['stats']>) => {
    const val = user?.stats?.[category] || 0;
    const nextLevelThreshold = (Math.floor(val / 10) + 1) * 10;
    const currentLevelThreshold = Math.floor(val / 10) * 10;
    return ((val - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;
  };

  // --- UPCOMING TASK COUNTDOWN (SUDAH DIPERBAIKI: RENTANG WAKTU & SPESIFIK USER) ---
  useEffect(() => {
    // 1. Filter hanya tugas yang statusnya IN_PROGRESS DAN menugaskan user ini DAN memiliki date & time
    const validTasks = (tasksDb || []).filter(t => 
      t.status === 'IN_PROGRESS' && 
      t.date && 
      t.time &&
      user?.uid && t.assignedUsers?.includes(user.uid)
    );

    if (validTasks.length === 0) {
      setCountdown('Tidak ada tugas terdekat');
      return;
    }

    // Fungsi canggih untuk memisahkan rentang waktu (misal: "06:00 - 08:00" -> ambil "06:00")
    const getStartTime = (timeString: string) => {
      if (timeString.includes('-')) {
        return timeString.split('-')[0].trim();
      }
      return timeString;
    };

    // 2. Urutkan untuk mencari tugas yang paling dekat
    const nextTask = validTasks.sort((a, b) => {
      const startTimeA = getStartTime(a.time);
      const startTimeB = getStartTime(b.time);
      const timeA = new Date(`${a.date}T${startTimeA}`).getTime() || new Date(`${a.date} ${startTimeA}`).getTime();
      const timeB = new Date(`${b.date}T${startTimeB}`).getTime() || new Date(`${b.date} ${startTimeB}`).getTime();
      return timeA - timeB;
    })[0];

    if (!nextTask) {
      setCountdown('Tidak ada tugas terdekat');
      return;
    }

    // 3. Mulai hitung mundur
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const taskStartTime = getStartTime(nextTask.time);
      
      // Parsing waktu dengan aman
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

      // Jika waktu sudah lewat atau sedang berlangsung
      if (diff <= 0) {
        setCountdown('Tugas Sedang Berlangsung');
        clearInterval(timer);
      } else {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours}j ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tasksDb, user?.uid]); 

  const handleSaveNotes = async () => {
    if (!user?.id) return;
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
    if (!user?.id) return;
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

  // Recommended Tasks based on skills
  const recommendedTasks = (tasksDb || []).filter(t => {
    if (t.status !== 'IN_PROGRESS') return false;
    if (!user?.skills || user.skills.length === 0) return false;
    return user.skills.some(skill => 
      t.title.toLowerCase().includes(skill.toLowerCase()) || 
      t.description?.toLowerCase().includes(skill.toLowerCase()) ||
      t.type.toLowerCase().includes(skill.toLowerCase())
    );
  }).slice(0, 3);

  // Mock data for stats
  const statsData = [
    { name: 'Sen', tasks: 2 },
    { name: 'Sel', tasks: 5 },
    { name: 'Rab', tasks: 3 },
    { name: 'Kam', tasks: 8 },
    { name: 'Jum', tasks: 4 },
    { name: 'Sab', tasks: 10 },
    { name: 'Min', tasks: 6 },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    switch(t) {
      case 'peliputan': return <Video className="w-4 h-4 text-blue-500"/>;
      case 'dokumentasi': return <ImageIcon className="w-4 h-4 text-emerald-500"/>;
      case 'publikasi': return <FileText className="w-4 h-4 text-amber-500"/>;
      default: 
        const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
        if (foundType) {
          return <Activity className="w-4 h-4" style={{ color: foundType.color }} />;
        }
        return <CheckSquare className="w-4 h-4 text-blue-500"/>;
    }
  };

  const getIconBg = (type: string) => {
    const t = type?.toLowerCase();
    switch(t) {
      case 'peliputan': return 'bg-blue-500/10';
      case 'dokumentasi': return 'bg-emerald-500/10';
      case 'publikasi': return 'bg-amber-500/10';
      default: return 'bg-blue-500/10';
    }
  };

  const getTaskImage = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'publikasi' || t === 'publication') {
      return '/publication.jpg';
    } else if (t === 'peliputan' || t === 'video') {
      return '/video.jpg';
    } else if (t === 'dokumentasi' || t === 'photo') {
      return '/kamera.jpg';
    } else {
      return '/background.jpg'; 
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-gray-700"
          >
            <img src={getAvatarUrl(user)} alt="Profile" className="w-full h-full object-cover" />
          </motion.div>
          <h1 className="text-lg font-extrabold tracking-tight text-white">Tugas Komsos</h1>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="p-2 bg-[#151b2b] rounded-full border border-gray-800 relative" 
            onClick={() => onNavigate('NOTIFICATIONS')}
          >
            <Bell className="w-5 h-5 text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#151b2b]"></span>
            )}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="p-2 bg-red-500/10 rounded-full border border-red-500/20" 
            onClick={onLogout}
          >
            <LogOut className="w-5 h-5 text-red-500" />
          </motion.button>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="p-5"
      >
        {user?.id?.startsWith('demo_') && (
          <motion.div 
            variants={itemVariants}
            className="mb-6 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between"
          >
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
                <h2 className="text-2xl font-extrabold tracking-tight text-white">Halo, {user?.displayName?.split(' ')[0] || 'User'} 👋</h2>
                {user?.role === 'SUPERADMIN' && <ShieldCheck className="w-5 h-5 text-blue-500" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">{getRoleName()}</span>
                <span className="text-gray-400 text-xs font-medium">Paroki Pusat</span>
                <div className="flex items-center gap-1.5 ml-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)] animate-pulse'}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleAvailability}
              disabled={isTogglingAvailability}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 ${
                user?.availability === 'AVAILABLE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                user?.availability === 'BUSY' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                'bg-amber-500/10 border-amber-500/20 text-amber-500'
              }`}
            >
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                user?.availability === 'AVAILABLE' ? 'bg-emerald-500' :
                user?.availability === 'BUSY' ? 'bg-red-500' :
                'bg-amber-500'
              }`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {user?.availability === 'AVAILABLE' ? 'Tersedia' : user?.availability === 'BUSY' ? 'Sibuk' : 'Away'}
              </span>
            </motion.button>
          </div>
          
          {user?.bio && (
            <p className="text-sm text-gray-400 italic mt-2 line-clamp-2 max-w-md">
              "{user.bio}"
            </p>
          )}
        </motion.div>

        {/* --- PAPAN PENGUMUMAN USER (READ ONLY) --- */}
        <motion.div variants={itemVariants} className="mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-3xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-10"><Megaphone size={100} /></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" /> Papan Pengumuman Komsos
                </h3>
              </div>
              <p className="text-sm font-medium text-white leading-relaxed whitespace-pre-wrap">{announcement}</p>
            </div>
          </div>
        </motion.div>

        {/* Streak & Level Summary */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className={`p-2 rounded-xl ${user?.
import React, { useState, useEffect } from 'react';
import { Bell, Video, Calendar, Clock, LogOut, Image as ImageIcon, FileText, CheckSquare, UserCheck, Users, Activity, Zap, Star, TrendingUp, Edit3, Save, Timer, Loader2, Globe, Sparkles, CheckCircle, ShieldCheck, ChevronRight, Flame, Trophy, Target, Award } from 'lucide-react';
import { Screen, UserAccount, Task, Notification, TaskType, AvailabilityStatus } from '../types';
import { Leaderboard } from '../components/Leaderboard';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { db, doc, updateDoc } from '../firebase';
import { toast } from 'sonner';

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

  // Upcoming Task Countdown
  useEffect(() => {
    const nextTask = [...tasksDb]
      .filter(t => t.status === 'IN_PROGRESS')
      .sort((a, b) => new Date(`${a.date} ${a.time}`).getTime() - new Date(`${b.date} ${b.time}`).getTime())[0];

    if (!nextTask) {
      setCountdown('Tidak ada tugas terdekat');
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const taskTime = new Date(`${nextTask.date} ${nextTask.time}`).getTime();
      const diff = taskTime - now;

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
  }, [tasksDb]);

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
            <img src={user?.img?.startsWith('http') || user?.img?.startsWith('blob:') || user?.img?.startsWith('data:') ? user.img : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${user?.img || '1'}`} alt="Profile" className="w-full h-full object-cover" />
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

          {user?.skills && user.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {user.skills.map((skill, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-800 border border-gray-700 rounded-lg text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  #{skill}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Streak & Level Summary */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className={`p-2 rounded-xl ${user?.streak?.current && user.streak.current > 0 ? 'bg-orange-500/10' : 'bg-gray-800'}`}>
              <Flame className={`w-5 h-5 ${user?.streak?.current && user.streak.current > 0 ? 'text-orange-500' : 'text-gray-600'}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Streak</p>
              <p className="text-lg font-black text-white">{user?.streak?.current || 0} Hari</p>
            </div>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Trophy className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Peringkat</p>
              <p className="text-lg font-black text-white">#{usersDb.sort((a, b) => (b.points || 0) - (a.points || 0)).findIndex(u => u.id === user?.id) + 1}</p>
            </div>
          </div>
        </motion.div>

        {/* Level Progress Bar */}
        <div className="mb-6 bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Kemajuan Level</p>
              <p className="text-sm font-black text-white">Level {user?.level || 1}</p>
            </div>
            <p className="text-[10px] font-bold text-blue-500">{Math.round(levelProgress)}% Menuju Level { (user?.level || 1) + 1 }</p>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </div>
        </div>

        {/* Skill Mastery */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Target className="w-5 h-5 text-blue-500" />
            </div>
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
                    <div className={`p-1.5 rounded-lg ${skill.color}/10 text-white`}>
                      {skill.icon}
                    </div>
                    <span className="text-xs font-bold text-white">{skill.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lv. {Math.floor((user?.stats?.[skill.key] || 0) / 10) + 1}</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${getSkillProgress(skill.key)}%` }}
                    className={`h-full ${skill.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Milestones & Achievements */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pencapaian Terbaru</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {[
              { title: 'Pemula', desc: 'Selesaikan 1 tugas', icon: <CheckCircle size={20} />, unlocked: (user?.completedTasksCount || 0) >= 1 },
              { title: 'Konsisten', desc: 'Streak 3 hari', icon: <Flame size={20} />, unlocked: (user?.streak?.current || 0) >= 3 },
              { title: 'Spesialis', desc: 'Skill Lv. 5', icon: <Target size={20} />, unlocked: Object.values(user?.stats || {}).some(v => v >= 50) },
              { title: 'Veteran', desc: 'Level 10', icon: <Trophy size={20} />, unlocked: (user?.level || 1) >= 10 },
            ].map((achievement, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className={`min-w-[140px] p-4 rounded-2xl border transition-all ${
                  achievement.unlocked ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/30' : 'bg-[#151b2b] border-gray-800 opacity-50'
                }`}
              >
                <div className={`mb-3 ${achievement.unlocked ? 'text-amber-500' : 'text-gray-600'}`}>
                  {achievement.icon}
                </div>
                <p className="text-xs font-bold text-white mb-1">{achievement.title}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider leading-tight">{achievement.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Task Countdown */}
        <motion.div variants={itemVariants} className="mb-6 bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-3xl shadow-xl shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Timer size={120} />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Tugas Terdekat</p>
          </div>
          <p className="text-3xl font-black text-white mb-1">{countdown}</p>
          <p className="text-[10px] text-indigo-100 font-medium uppercase tracking-widest opacity-80">Waktu Tersisa</p>
        </motion.div>

        {/* Gamification Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-white/20 rounded-lg"><Zap className="w-4 h-4 text-white" /></div>
              <span className="text-[10px] font-bold text-blue-100 uppercase tracking-widest">Level {user?.level || 1}</span>
            </div>
            <p className="text-2xl font-black text-white">{user?.points || 0}</p>
            <p className="text-[10px] text-blue-100 font-bold uppercase tracking-widest">Total Poin</p>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg"><Star className="w-4 h-4 text-emerald-500" /></div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pencapaian</span>
            </div>
            <p className="text-2xl font-black text-white">{user?.completedTasksCount || 0}</p>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tugas Selesai</p>
          </div>
        </motion.div>

        {/* Personal Stats Chart */}
        <motion.div variants={itemVariants} className="mb-6 bg-[#151b2b] p-5 rounded-3xl border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statistik Tugas</p>
            </div>
            <span className="text-[10px] font-bold text-gray-500">7 Hari Terakhir</span>
          </div>
          
          {/* === INI ADALAH BAGIAN YANG DIPERBAIKI UNTUK MENGHILANGKAN WARNING RECHARTS === */}
          <div className="h-40 w-full" style={{ minHeight: 0, minWidth: 0 }}>
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={statsData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151b2b', border: '1px solid #374151', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Quick Notes */}
        <motion.div variants={itemVariants} className="mb-6 bg-[#151b2b] p-5 rounded-3xl border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Edit3 className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catatan Cepat</p>
            </div>
            <button 
              onClick={handleSaveNotes}
              disabled={isSavingNotes}
              className="p-2 bg-blue-600/10 text-blue-500 rounded-xl hover:bg-blue-600/20 transition-colors disabled:opacity-50"
            >
              {isSavingNotes ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            </button>
          </div>
          <textarea 
            value={quickNotes}
            onChange={(e) => setQuickNotes(e.target.value)}
            placeholder="Tulis catatan penting di sini..."
            className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl p-4 text-sm text-gray-300 focus:border-blue-500 transition-all resize-none h-24"
          />
        </motion.div>

        {/* Recommended Tasks */}
        {recommendedTasks.length > 0 && (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-xl">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rekomendasi Untukmu</p>
            </div>
            <div className="space-y-3">
              {recommendedTasks.map((task) => (
                <motion.div 
                  key={task.id}
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    onNavigate('TASK_DETAIL');
                  }}
                  className="p-4 bg-[#151b2b] rounded-2xl border border-gray-800 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${getIconBg(task.type)}`}>
                      {getIcon(task.type)}
                    </div>
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

        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 mb-8">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('MASS_SCHEDULE')}
            className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3 hover:bg-gray-800 transition-colors"
          >
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Calendar className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Jadwal Misa</p>
              <p className="text-[10px] text-gray-500">Daftar Petugas</p>
            </div>
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate('ATTENDANCE')}
            className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex items-center gap-3 hover:bg-gray-800 transition-colors"
          >
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <UserCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Presensi</p>
              <p className="text-[10px] text-gray-500">Check In Tugas</p>
            </div>
          </motion.button>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-6 border-b border-gray-800 mb-6">
          <button className="pb-3 border-b-2 border-blue-500 text-blue-400 font-bold text-sm">Aktif</button>
          <button className="pb-3 text-gray-500 font-medium text-sm">Selesai</button>
          <button className="pb-3 text-gray-500 font-medium text-sm">Semua</button>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-between items-center mb-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tugas Hari Ini</h3>
          <span className="text-blue-500 text-[10px] font-bold bg-blue-500/10 px-2 py-1 rounded-md uppercase tracking-wider">{activeTasks.length} Tugas</span>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-8">
          <Leaderboard users={usersDb} />
        </motion.div>

        <div className="space-y-4">
          {activeTasks.length > 0 ? activeTasks.map((task) => (
            <motion.div 
              variants={itemVariants}
              key={task.id}
              className="bg-[#151b2b] rounded-2xl overflow-hidden border border-gray-800 shadow-lg cursor-pointer transition-all hover:border-blue-500/50" 
              onClick={() => {
                setSelectedTaskId(task.id);
                onNavigate('TASK_DETAIL');
              }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="h-32 bg-gray-800 relative">
                <img src={getTaskImage(task.type)} className="w-full h-full object-cover opacity-60 mix-blend-overlay" alt={task.title} />
                <div className="absolute top-3 left-3 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  Sedang Berlangsung
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-extrabold text-lg leading-tight text-white">{task.title}</h4>
                  <div className={`p-1.5 ${getIconBg(task.type)} rounded-lg`} style={taskTypes.find(tt => tt.name.toLowerCase() === task.type?.toLowerCase()) ? { backgroundColor: `${taskTypes.find(tt => tt.name.toLowerCase() === task.type?.toLowerCase())?.color}20` } : {}}>{getIcon(task.type)}</div>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {task.type}
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-4">
                  <Clock className="w-3.5 h-3.5" /> {task.time}
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-blue-500/20"
                >
                  Selesai Tugas
                </motion.button>
              </div>
            </motion.div>
          )) : (
            <motion.div 
              variants={itemVariants}
              className="text-center py-10 bg-[#151b2b] rounded-2xl border border-gray-800 border-dashed"
            >
              <p className="text-gray-500 text-sm">Tidak ada tugas aktif hari ini.</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UserDashboard;
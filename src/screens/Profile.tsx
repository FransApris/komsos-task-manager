import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, LogOut, Settings2, User, Activity, Bell, Award, Camera, Edit3, Heart, Star, Zap, Shield, Target, Globe, Youtube, Instagram, ExternalLink } from 'lucide-react';
import { Screen, UserAccount, Badge, Task } from '../types';
import { db, collection, query, where, onSnapshot, addDoc, serverTimestamp } from '../firebase';
import { getAvatarUrl } from '../lib/avatar';

const badgeIcons: Record<string, any> = {
  Award, Camera, Edit3, Heart, Star, Zap, Shield, Target
};

const SkillBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const pct = Math.min((value / 100) * 100, 100);
  const level = Math.floor(value / 10) + 1;
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>Lv. {level}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const Profile: React.FC<{ onNavigate: (s: Screen) => void, onLogout: () => void, user?: UserAccount | null }> = ({ onNavigate, onLogout, user }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [userTasks, setUserTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'badges'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const badgeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Badge));
      setBadges(badgeList.filter(b => b.status === 'earned'));
    }, (error) => {
      console.error("Profile Badges Snapshot Error:", error);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'tasks'),
      where('assignedUsers', 'array-contains', user.uid),
      where('status', '==', 'COMPLETED')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setUserTasks(taskList);
    }, (error) => {
      console.error("Profile Tasks Snapshot Error:", error);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const claimStarterBadges = async () => {
    if (!user?.uid || isClaiming || badges.length > 0) return;
    setIsClaiming(true);
    const starterBadges = [
      { title: 'Anggota Baru', icon: 'Award', color: '#3b82f6', description: 'Selamat bergabung di Komsos Juanda!', status: 'earned' as const },
      { title: 'Fotografer', icon: 'Camera', color: '#10b981', description: 'Telah mendokumentasikan 5 acara.', status: 'earned' as const },
      { title: 'Penulis Berita', icon: 'Edit3', color: '#f59e0b', description: 'Telah menulis 3 artikel berita.', status: 'earned' as const }
    ];
    for (const b of starterBadges) {
      await addDoc(collection(db, 'badges'), {
        ...b, userId: user.uid, approvals: 1, requiredApprovals: 1,
        approvedBy: ['System'], createdAt: serverTimestamp()
      });
    }
    setIsClaiming(false);
  };

  const getRoleLabel = (r?: string | null) => {
    switch (r) {
      case 'SUPERADMIN': return 'Superadmin';
      case 'ADMIN_MULTIMEDIA': return 'Koord. Multimedia';
      case 'ADMIN_PHOTO_VIDEO': return 'Koord. Photo & Video';
      case 'ADMIN_PUBLICATION': return 'Koord. Publikasi';
      case 'USER': return 'Petugas';
      default: return 'Unknown';
    }
  };

  const XP_PER_LEVEL = 500;
  const totalXp = user?.xp || 0;
  const level = user?.level || Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1);
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const xpPercent = xpInLevel / XP_PER_LEVEL;
  const R = 44;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - xpPercent);

  const availColor = user?.availability === 'AVAILABLE' ? '#10b981' : user?.availability === 'BUSY' ? '#ef4444' : '#f59e0b';
  const availLabel = user?.availability === 'AVAILABLE' ? 'Tersedia' : user?.availability === 'BUSY' ? 'Sibuk' : 'Away';

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button
          className="p-2 bg-[#151b2b] rounded-full border border-gray-800"
          onClick={() => onNavigate(user?.role === 'SUPERADMIN' || user?.role?.startsWith('ADMIN_') ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')}
        >
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight text-white">Profil Saya</h1>
        <button
          onClick={() => onNavigate('EDIT_PROFILE')}
          className="p-2 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 hover:bg-blue-600/30 transition-all"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </header>

      {/* Hero Banner */}
      <div
        className="relative px-5 pt-10 pb-6 flex flex-col items-center overflow-hidden"
        style={{ background: 'linear-gradient(to bottom, #172040 0%, #0a0f18 100%)' }}
      >
        {/* Decorative rings */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full border border-blue-500/5 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full border border-blue-500/5 pointer-events-none" />

        {/* XP Ring + Avatar */}
        <div className="relative w-26 h-26 mb-5">
          <svg width="104" height="104" viewBox="0 0 104 104" className="absolute inset-0 -rotate-90">
            <circle cx="52" cy="52" r={R} fill="none" stroke="#1f2937" strokeWidth="5" />
            <motion.circle
              cx="52" cy="52" r={R}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-2 rounded-full overflow-hidden ring-2 ring-gray-800">
            <img src={getAvatarUrl(user)} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          {/* Online dot */}
          <div
            className="absolute top-2 right-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0f18]"
            style={{ backgroundColor: availColor }}
          />
          {/* Level badge */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full border-2 border-[#0a0f18] whitespace-nowrap shadow-lg shadow-blue-500/30">
            Lv. {level}
          </div>
        </div>

        <h2 className="text-xl font-extrabold mb-1 text-white">{user?.displayName || 'User'}</h2>
        <p className="text-xs text-gray-500 mb-3">{user?.email}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {getRoleLabel(user?.role)}
          </span>
          <span
            className="text-[9px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider"
            style={{ backgroundColor: `${availColor}15`, borderColor: `${availColor}30`, color: availColor }}
          >
            {availLabel}
          </span>
        </div>
      </div>

      <div className="px-5 space-y-5 pt-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Selesai', value: user?.completedTasksCount || userTasks.length, color: 'text-emerald-400' },
            { label: 'Poin', value: user?.points || 0, color: 'text-amber-400' },
            { label: 'XP', value: totalXp, color: 'text-blue-400' },
            { label: 'Streak', value: `${user?.streak?.current || 0}🔥`, color: 'text-orange-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#151b2b] rounded-2xl border border-gray-800 p-3 text-center">
              <p className={`text-base font-black ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-tighter mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* XP Progress Bar */}
        <div className="bg-[#151b2b] rounded-2xl border border-gray-800 p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Progres XP — Level {level}</span>
            <span className="text-[10px] font-bold text-blue-400">{xpInLevel} / {XP_PER_LEVEL} XP</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent * 100}%` }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="h-full rounded-full bg-linear-to-r from-blue-600 to-blue-400"
            />
          </div>
          <p className="text-[9px] text-gray-600 mt-1.5">{XP_PER_LEVEL - xpInLevel} XP lagi untuk Level {level + 1}</p>
        </div>

        {/* Skill Bars */}
        <div className="bg-[#151b2b] rounded-2xl border border-gray-800 p-4">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Penguasaan Skill</h3>
          <div className="space-y-4">
            <SkillBar label="Fotografi" value={user?.stats?.photography || 0} color="#10b981" />
            <SkillBar label="Videografi" value={user?.stats?.videography || 0} color="#3b82f6" />
            <SkillBar label="Penulisan" value={user?.stats?.writing || 0} color="#f59e0b" />
            <SkillBar label="Desain" value={user?.stats?.design || 0} color="#a855f7" />
          </div>
        </div>

        {/* Skills tags */}
        {user?.skills && user.skills.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Keahlian</h3>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill, idx) => (
                <span key={idx} className="bg-gray-800/50 border border-gray-700 text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-xl">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 ? (
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Badge Pencapaian</h3>
            <div className="grid grid-cols-4 gap-3">
              {badges.map((badge) => {
                const Icon = badgeIcons[badge.icon] || Award;
                return (
                  <motion.div
                    key={badge.id}
                    whileHover={{ scale: 1.1 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2 border"
                      style={{
                        backgroundColor: `${badge.color}15`,
                        borderColor: `${badge.color}30`,
                        color: badge.color,
                        boxShadow: `0 0 14px ${badge.color}25`
                      }}
                    >
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-tighter leading-tight">{badge.title || 'Badge'}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Belum ada badge</p>
            <button
              onClick={claimStarterBadges}
              disabled={isClaiming}
              className="text-[10px] font-black text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              {isClaiming ? 'Mengklaim...' : 'Klaim Badge Awal →'}
            </button>
          </div>
        )}

        {/* Portfolio Links */}
        {user?.portfolioLinks && user.portfolioLinks.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3">Portofolio & Karya</h3>
            <div className="grid grid-cols-1 gap-2">
              {user.portfolioLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                      {link.platform.toLowerCase().includes('youtube') ? <Youtube className="w-4 h-4 text-red-500" /> :
                        link.platform.toLowerCase().includes('instagram') ? <Instagram className="w-4 h-4 text-pink-500" /> :
                          <Globe className="w-4 h-4 text-blue-500" />}
                    </div>
                    <span className="text-xs font-bold text-gray-300">{link.platform}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-blue-500 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Recent Works */}
        {userTasks.some(t => t.resultLink) && (
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Riwayat Karya</h3>
            <div className="space-y-3">
              {userTasks.filter(t => t.resultLink).slice(0, 5).map((task) => (
                <div key={task.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-white">{task.title}</h4>
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-wider">{task.type}</span>
                  </div>
                  <a
                    href={task.resultLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-2"
                  >
                    <ExternalLink size={12} /> Lihat Karya
                  </a>
                  {task.feedback && (
                    <div className="bg-[#0a0f18] p-3 rounded-xl border border-gray-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={10} className="text-amber-500" />
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Feedback Koordinator</p>
                      </div>
                      <p className="text-xs text-gray-300 italic">"{task.feedback}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="space-y-3">
          <button onClick={() => onNavigate('EDIT_PROFILE')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl"><User className="w-5 h-5 text-blue-500" /></div>
              <span className="font-bold text-sm text-white">Edit Profil</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <button onClick={() => onNavigate('NOTIFICATION_SETTINGS')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl"><Bell className="w-5 h-5 text-purple-500" /></div>
              <span className="font-bold text-sm text-white">Pengaturan Notifikasi</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <button onClick={() => onNavigate('PERFORMANCE_STATS')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><Activity className="w-5 h-5 text-emerald-500" /></div>
              <span className="font-bold text-sm text-white">Statistik Kinerja</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <button onClick={() => onNavigate('APP_SETTINGS')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/50 rounded-xl"><Settings2 className="w-5 h-5 text-gray-400" /></div>
              <span className="font-bold text-sm text-white">Pengaturan Aplikasi</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 font-bold rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Keluar
        </button>
      </div>
    </div>
  );
};

export default Profile;
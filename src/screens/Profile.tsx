import React, { useEffect, useState } from 'react';
import { ChevronLeft, LogOut, Settings2, User, Activity, Bell, Award, Camera, Edit3, Heart, Star, Zap, Shield, Target, Globe, Youtube, Instagram, ExternalLink, CheckCircle2, AlertCircle, Clock, Flame } from 'lucide-react';
import { Screen, UserAccount, Badge, Task } from '../types';
import { db, collection, query, where, onSnapshot, addDoc } from '../firebase';

const badgeIcons: Record<string, any> = {
  Award, Camera, Edit3, Heart, Star, Zap, Shield, Target
};

export const Profile: React.FC<{ onNavigate: (s: Screen) => void, onLogout: () => void, user?: UserAccount | null }> = ({ onNavigate, onLogout, user }) => {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userTasks, setUserTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, 'badges'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const badgeList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Badge));
      setBadges(badgeList.filter(b => b.status === 'earned'));
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
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const claimStarterBadges = async () => {
    if (!user?.uid) return;
    const starterBadges = [
      { title: 'Anggota Baru', icon: 'Award', color: '#3b82f6', description: 'Selamat bergabung di Komsos Juanda!', status: 'earned' },
      { title: 'Fotografer', icon: 'Camera', color: '#10b981', description: 'Telah mendokumentasikan 5 acara.', status: 'earned' },
      { title: 'Penulis Berita', icon: 'Edit3', color: '#f59e0b', description: 'Telah menulis 3 artikel berita.', status: 'earned' }
    ];

    for (const b of starterBadges) {
      await addDoc(collection(db, 'badges'), {
        ...b,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        approvedBy: 'System',
        approvalCount: 1
      });
    }
  };

  const getRoleLabel = (r?: string | null) => {
    switch(r) {
      case 'SUPERADMIN': return 'Superadmin';
      case 'ADMIN_MULTIMEDIA': return 'Koord. Multimedia';
      case 'ADMIN_PHOTO_VIDEO': return 'Koord. Photo & Video';
      case 'ADMIN_PUBLICATION': return 'Koord. Publikasi';
      case 'USER': return 'Petugas';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate(user?.role === 'SUPERADMIN' || user?.role?.startsWith('ADMIN_') ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight text-white">Profil Saya</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden ring-4 ring-blue-500/20 mb-4">
          <img src={user?.img?.startsWith('http') || user?.img?.startsWith('blob:') || user?.img?.startsWith('data:') ? user.img : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${user?.img || '1'}`} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-xl font-extrabold mb-1 text-white">{user?.displayName || 'User'}</h2>
        <p className="text-sm text-gray-400 font-medium mb-6">{user?.email || 'user@komsos.org'}</p>
        
        <div className="flex gap-2 mb-4">
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{getRoleLabel(user?.role)}</span>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">Level {user?.level || 1}</span>
          <span className="bg-gray-800 border border-gray-700 text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{user?.points || 0} Poin</span>
        </div>

        {/* Availability Status */}
        <div className="w-full grid grid-cols-2 gap-3 mb-8">
          <div className="flex items-center gap-2 px-4 py-3 bg-[#151b2b] rounded-2xl border border-gray-800">
            <div className={`w-2 h-2 rounded-full animate-pulse ${user?.availability === 'AVAILABLE' ? 'bg-emerald-500' : user?.availability === 'BUSY' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {user?.availability === 'AVAILABLE' ? 'Tersedia' : user?.availability === 'BUSY' ? 'Sibuk' : 'Tidak di Tempat'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#151b2b] rounded-2xl border border-gray-800">
            <Flame className={`w-4 h-4 ${user?.streak?.current && user.streak.current > 0 ? 'text-orange-500' : 'text-gray-600'}`} />
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Streak: {user?.streak?.current || 0} Hari
            </span>
          </div>
        </div>

        {/* Mastery Stats Section */}
        <div className="w-full mb-8">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1 italic">Statistik Penguasaan</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Fotografi', key: 'photography' as const, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
              { label: 'Videografi', key: 'videography' as const, color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { label: 'Penulisan', key: 'writing' as const, color: 'text-amber-500', bg: 'bg-amber-500/10' },
              { label: 'Desain', key: 'design' as const, color: 'text-purple-500', bg: 'bg-purple-500/10' },
            ].map((stat) => (
              <div key={stat.key} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{stat.label}</span>
                  <span className={`text-[10px] font-bold ${stat.color}`}>Lv. {Math.floor((user?.stats?.[stat.key] || 0) / 10) + 1}</span>
                </div>
                <p className="text-xl font-black text-white">{user?.stats?.[stat.key] || 0}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-tighter">Tugas Selesai</p>
              </div>
            ))}
          </div>
        </div>

        {/* Skills Section */}
        {user?.skills && user.skills.length > 0 && (
          <div className="w-full mb-8">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 pl-1 italic">Keahlian & Skill</h3>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((skill, idx) => (
                <span key={idx} className="bg-gray-800/50 border border-gray-700 text-gray-300 text-[10px] font-bold px-3 py-1.5 rounded-xl">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Links */}
        {user?.portfolioLinks && user.portfolioLinks.length > 0 && (
          <div className="w-full mb-8">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 pl-1 italic">Portofolio & Karya</h3>
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

        {/* Digital Portfolio (Recent Works) */}
        {userTasks.some(t => t.resultLink) && (
          <div className="w-full mb-8">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1 italic">Riwayat Karya (Digital Portfolio)</h3>
            <div className="space-y-4">
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
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors mb-3"
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

        {/* Badges Section */}
        {badges.length > 0 ? (
          <div className="w-full mb-8">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4 pl-1 italic">Badge Pencapaian</h3>
            <div className="grid grid-cols-4 gap-3">
              {badges.map((badge) => {
                const Icon = badgeIcons[badge.icon] || Award;
                return (
                  <div key={badge.id} className="flex flex-col items-center group">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 border transition-all duration-300 group-hover:scale-110 shadow-lg`} 
                         style={{ 
                           backgroundColor: `${badge.color}10`, 
                           borderColor: `${badge.color}30`,
                           color: badge.color 
                         }}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[9px] font-bold text-gray-400 text-center uppercase tracking-tighter leading-tight">{badge.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full mb-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Belum ada badge</p>
            <button 
              onClick={claimStarterBadges}
              className="text-[10px] font-black text-blue-500 hover:text-blue-400 transition-colors uppercase tracking-widest"
            >
              Klaim Badge Awal →
            </button>
          </div>
        )}

        <div className="w-full space-y-3">
          <button onClick={() => onNavigate('EDIT_PROFILE')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl"><User className="w-5 h-5 text-blue-500"/></div>
              <span className="font-bold text-sm text-white">Edit Profil</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <button onClick={() => onNavigate('NOTIFICATION_SETTINGS')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-xl"><Bell className="w-5 h-5 text-purple-500"/></div>
              <span className="font-bold text-sm text-white">Pengaturan Notifikasi</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <button onClick={() => onNavigate('PERFORMANCE_STATS')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl"><Activity className="w-5 h-5 text-emerald-500"/></div>
              <span className="font-bold text-sm text-white">Statistik Kinerja</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <button onClick={() => onNavigate('APP_SETTINGS')} className="w-full flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-700/50 rounded-xl"><Settings2 className="w-5 h-5 text-gray-400"/></div>
              <span className="font-bold text-sm text-white">Pengaturan Aplikasi</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
        </div>

        <button 
          onClick={onLogout}
          className="w-full mt-8 flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 font-bold rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-colors"
        >
          <LogOut className="w-5 h-5" /> Keluar
        </button>
      </div>
    </div>
  );
};

// INI BAGIAN PENTING YANG BIKIN ERROR HILANG:
export default Profile;
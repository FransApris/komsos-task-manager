import React, { useState } from 'react';
import { 
  Bell, ClipboardList, Clock, CheckCircle2, LogOut, 
  MessageSquare, MapPin, Calendar, Wrench, Database, 
  FileText, UserCheck, Loader2, ChevronRight, Users, Trophy,
  Settings, Shield, Zap, Activity, BarChart3, Sparkles, X, Gift, Medal, AlertCircle, PlayCircle
} from 'lucide-react';
import { Screen, Role, UserAccount, Task, Notification } from '../types';
import { Leaderboard } from '../components/Leaderboard';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, addDoc, serverTimestamp, doc, updateDoc } from '../firebase';
import { toast } from 'sonner';

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
  isOnline = true
}) => {
  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const [resetPoints, setResetPoints] = useState(true);

  const getRoleName = () => {
    if (role === 'SUPERADMIN') return 'Superadmin';
    if (role === 'ADMIN_MULTIMEDIA') return 'Koordinator Multimedia';
    if (role === 'ADMIN_PHOTO_VIDEO') return 'Koord. Photo & Video';
    if (role === 'ADMIN_PUBLICATION') return 'Koord. Publikasi';
    return 'Admin';
  };

  const activeTasks = tasksDb.filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN');
  const pendingVerifications = tasksDb.filter(t => t.status === 'WAITING_VERIFICATION');
  const pendingUsers = usersDb.filter(u => u.status === 'PENDING');
  const unreadCount = notificationsDb.filter(n => !n.read).length;

  // === LOGIKA REWARD & TUTUP BUKU BULANAN ===
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
          // 1. Berikan Badge
          promises.push(addDoc(collection(db, 'badges'), {
            userId: topUsers[i].uid,
            title: rewards[i].title,
            description: rewards[i].desc,
            icon: rewards[i].icon,
            color: rewards[i].color,
            status: 'earned', // Langsung aktif
            approvals: 1,
            requiredApprovals: 1,
            approvedBy: [user?.uid || 'system'],
            createdAt: serverTimestamp()
          }));

          // 2. Kirim Notifikasi ke User Tersebut
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

      // 3. Reset Poin Semua Orang (Jika dicentang)
      if (resetPoints) {
        usersDb.forEach(u => {
          const uId = u.id || u.uid;
          if (uId) {
            promises.push(updateDoc(doc(db, 'users', uId), { 
              points: 0, 
              completedTasksCount: 0 // Opsional: Mereset hitungan tugas bulanan
            }));
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
            <img src={user?.img?.startsWith('http') ? user.img : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${user?.img || '1'}`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight">Halo, {user?.displayName?.split(' ')[0] || 'Admin'}</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{getRoleName()}</p>
              <div className="flex items-center gap-1 ml-1">
                <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)] animate-pulse'}`} />
                <span className={`text-[8px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-500/80' : 'text-red-500/80'}`}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="p-2 bg-[#151b2b] rounded-full border border-gray-800 relative" 
            onClick={() => onNavigate('NOTIFICATIONS')}
          >
            <Bell className="w-5 h-5 text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#151b2b]"></span>
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

      <div className="p-5 space-y-6">
        
        {/* STATISTIK UTAMA */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-lg shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><ClipboardList size={60} /></div>
            <p className="text-3xl font-black text-white mb-1">{activeTasks.length}</p>
            <p className="text-[9px] text-blue-100 font-bold uppercase tracking-wider">Tugas Aktif</p>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 shadow-lg relative overflow-hidden">
            <p className="text-3xl font-black text-white mb-1">{usersDb.length}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Anggota</p>
          </div>
          <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 shadow-lg relative overflow-hidden">
            <p className="text-3xl font-black text-amber-500 mb-1">{pendingVerifications.length}</p>
            <p className="text-[9px] text-amber-500/70 font-bold uppercase tracking-wider">Verifikasi Tugas</p>
          </div>
          <div className="bg-red-500/10 p-4 rounded-2xl border border-red-500/20 shadow-lg relative overflow-hidden cursor-pointer" onClick={() => onNavigate('USER_VERIFICATION')}>
            <p className="text-3xl font-black text-red-500 mb-1">{pendingUsers.length}</p>
            <p className="text-[9px] text-red-500/70 font-bold uppercase tracking-wider">Pendaftar Baru</p>
          </div>
        </div>

        {/* MENU CEPAT (QUICK ACTIONS) */}
        <div>
          {/* --- 1. MENU KHUSUS ADMIN & KOORDINATOR --- */}
          {isAdminRole && (
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> Otoritas Pengurus Komsos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Tombol Verifikasi Pendaftar & Manajemen Tim kini bisa diakses semua Admin */}
                <QuickActionBtn 
                  icon={<UserCheck className="w-5 h-5 text-white" />} 
                  label="Verifikasi Pendaftar" 
                  color="bg-red-600 shadow-red-500/30" 
                  onClick={() => onNavigate('USER_VERIFICATION')} 
                />
                <QuickActionBtn 
                  icon={<Users className="w-5 h-5 text-indigo-500" />} 
                  label="Manajemen Tim (Role)" 
                  color="bg-indigo-500/10" 
                  onClick={() => onNavigate('TEAM')} 
                />
                
                {/* Namun, Database Master & Tutup Buku HANYA untuk SUPERADMIN */}
                {role === 'SUPERADMIN' && (
                  <>
                    <QuickActionBtn 
                      icon={<Database className="w-5 h-5 text-emerald-500" />} 
                      label="Database Master" 
                      color="bg-emerald-500/10" 
                      onClick={() => onNavigate('ADMIN_DATA_MANAGEMENT')} 
                    />
                    <QuickActionBtn 
                      icon={<Gift className="w-5 h-5 text-amber-500" />} 
                      label="Tutup Buku (Reward)" 
                      color="bg-amber-500/10" 
                      onClick={() => setShowRewardModal(true)} 
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* --- 2. MENU OPERASIONAL KOORDINATOR (Juga dilihat Superadmin) --- */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Activity className="w-4 h-4" /> Operasional Komsos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionBtn 
                icon={<Sparkles className="w-5 h-5 text-white" />} 
                label="Buat Tugas Baru" 
                color="bg-blue-600 shadow-blue-500/30" 
                onClick={() => onNavigate('CREATE_TASK')} 
              />
              <QuickActionBtn 
                icon={<Calendar className="w-5 h-5 text-purple-500" />} 
                label="Jadwal Misa" 
                color="bg-purple-500/10" 
                onClick={() => onNavigate('MASS_SCHEDULE')} 
              />
              <QuickActionBtn 
                icon={<Wrench className="w-5 h-5 text-gray-400" />} 
                label="Inventaris Alat" 
                color="bg-gray-800" 
                onClick={() => onNavigate('INVENTORY')} 
              />
              <QuickActionBtn 
                icon={<BarChart3 className="w-5 h-5 text-pink-500" />} 
                label="Laporan Kinerja" 
                color="bg-pink-500/10" 
                onClick={() => onNavigate('REPORTS')} 
              />
              {/* TOMBOL BARU UNTUK V-CAST PIPELINE */}
              <QuickActionBtn 
                icon={<PlayCircle className="w-5 h-5 text-indigo-500" />} 
                label="Pipeline V-Cast" 
                color="bg-indigo-500/10" 
                onClick={() => onNavigate('VCAST_MANAGER')} 
              />
            </div>
          </div>
        </div>

        {/* LEADERBOARD PREVIEW */}
        <div>
          <Leaderboard users={usersDb} />
        </div>

        {/* TUGAS MENDESAK */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tugas Mendesak</h3>
            <button onClick={() => onNavigate('TASKS')} className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider">Lihat Semua</button>
          </div>
          
          <div className="space-y-3">
            {activeTasks.length > 0 ? activeTasks.slice(0, 3).map((task) => (
              <motion.div 
                key={task.id}
                whileHover={{ x: 5 }}
                onClick={() => { setSelectedTaskId(task.id); onNavigate('TASK_DETAIL'); }}
                className="bg-[#151b2b] p-4 rounded-2xl border-l-4 border-l-blue-500 flex justify-between items-center cursor-pointer transition-all hover:bg-gray-800/50 shadow-sm"
              >
                <div>
                  <h4 className="font-bold text-sm text-white mb-1 line-clamp-1">{task.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    <Calendar size={10} /> {task.date} • <Clock size={10} className="ml-1" /> {task.time}
                  </div>
                </div>
                <div className="bg-gray-800 p-2 rounded-lg">
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

      </div>

      {/* === MODAL REWARD & TUTUP BUKU === */}
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
            
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Sistem akan membagikan <strong>Lencana Eksklusif</strong> ke 3 anggota dengan skor tertinggi bulan ini dan memberitahu mereka via Notifikasi.
            </p>

            <div className="space-y-3 mb-6">
              {topUsers.map((u, i) => (
                <div key={u.uid} className={`flex items-center gap-3 p-3 rounded-2xl border ${i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-[#0a0f18] border-gray-800'}`}>
                  <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-gray-700">
                    <img src={u.img?.startsWith('http') ? u.img : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${u.img || '1'}`} alt="Avatar" className="w-full h-full object-cover" />
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
                <input 
                  type="checkbox" 
                  checked={resetPoints} 
                  onChange={(e) => setResetPoints(e.target.checked)} 
                  className="mt-1 shrink-0 accent-red-500"
                />
                <div>
                  <p className="text-sm font-bold text-red-400 mb-1">Reset Poin Bulanan (Disarankan)</p>
                  <p className="text-[10px] text-red-400/70 leading-relaxed">
                    Centang untuk mereset poin dan statistik bulanan semua anggota menjadi 0 agar persaingan bulan depan kembali adil. (Badge & Level tidak akan hilang).
                  </p>
                </div>
              </label>
            </div>

            <button 
              onClick={handleDistributeRewards}
              disabled={isRewarding || topUsers.length === 0}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
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
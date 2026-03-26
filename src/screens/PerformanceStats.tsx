import React from 'react';
import { ChevronLeft, BarChart3, TrendingUp, Award, Target, Loader2 } from 'lucide-react';
import { Screen, Role, Task, Badge, UserAccount } from '../types';
import { motion } from 'motion/react';

// ==========================================
// FIX: VALIDASI DATA UNTUK MENCEGAH RANGEERROR
// ==========================================
export const PerformanceStats: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role,
  tasksDb?: Task[],
  badgesDb?: Badge[],
  currentUser?: UserAccount | null
}> = ({ onNavigate, role, tasksDb = [], badgesDb = [], currentUser }) => {
  
  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  // Proteksi Loading
  if (!tasksDb || !currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-gray-500">
        <Loader2 className="animate-spin mb-2" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Menganalisis Data...</p>
      </div>
    );
  }

  // Hitung statistik dengan pengamanan nilai default (0)
  const myTasks = tasksDb.filter(t => t.assignedUsers?.includes(currentUser.uid));
  const completedTasks = myTasks.filter(t => t.status === 'COMPLETED');
  
  // Mencegah Invalid Array Length pada perhitungan progres
  const totalPoints = currentUser.points || 0;
  const taskCount = completedTasks.length || 0;
  const badgeCount = badgesDb.filter(b => b.userId === currentUser.uid).length || 0;

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-32 text-white">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button 
          onClick={() => onNavigate(isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')} 
          className="p-2 bg-[#151b2b] rounded-full border border-gray-800"
        >
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Statistik Performa</h1>
      </header>

      <div className="p-5 space-y-6">
        {/* CARD RINGKASAN */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden">
            <TrendingUp className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-500/10" />
            <p className="text-2xl font-black text-white">{totalPoints}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Poin</p>
          </div>
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden">
            <Target className="absolute -right-2 -bottom-2 w-12 h-12 text-emerald-500/10" />
            <p className="text-2xl font-black text-white">{taskCount}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tugas Selesai</p>
          </div>
        </div>

        {/* INFO LEVEL */}
        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-6 rounded-3xl border border-blue-500/30">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Level Anggota</p>
              <h2 className="text-2xl font-black text-white">Level {currentUser.level || 1}</h2>
            </div>
            <Award className="w-10 h-10 text-blue-500" />
          </div>
          
          {/* Progress Bar Manual (Lebih aman daripada library grafik yang sering error) */}
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totalPoints % 100), 100)}%` }}
              className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase tracking-tighter">
            {100 - (totalPoints % 100)} Poin lagi menuju Level Selanjutnya
          </p>
        </div>

        {/* DAFTAR BADGE */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Award size={14} /> Pencapaian Badge ({badgeCount})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {badgesDb.filter(b => b.userId === currentUser.uid).length > 0 ? (
              badgesDb.filter(b => b.userId === currentUser.uid).map((badge, idx) => (
                <div key={idx} className="bg-[#151b2b] border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="p-3 bg-blue-600/10 rounded-xl text-blue-500">
                    <Award size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{badge.title}</h4>
                    <p className="text-xs text-gray-500">{badge.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-gray-900/50 rounded-3xl border border-dashed border-gray-800">
                <p className="text-xs text-gray-600">Belum ada badge yang diraih.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceStats;
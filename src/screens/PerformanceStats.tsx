import React from 'react';
import { ChevronLeft, TrendingUp, Award, Target, Loader2, Camera, Edit3, Heart, Star, Zap, Shield, Target as TargetIcon, CheckCircle2, BarChart2, Hourglass } from 'lucide-react';
import { Screen, Role, Task, Badge, UserAccount } from '../types';
import { motion } from 'motion/react';

const badgeIcons: Record<string, any> = {
  Award, Camera, Edit3, Heart, Star, Zap, Shield, Target: TargetIcon
};

export const PerformanceStats: React.FC<{
  onNavigate: (s: Screen) => void,
  role?: Role,
  tasksDb?: Task[],
  badgesDb?: Badge[],
  currentUser?: UserAccount | null
}> = ({ onNavigate, role, tasksDb = [], badgesDb = [], currentUser }) => {

  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  if (!tasksDb || !currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-gray-500">
        <Loader2 className="animate-spin mb-2" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Menganalisis Data...</p>
      </div>
    );
  }

  const myUid = currentUser.uid || currentUser.id || '';
  const myTasks = tasksDb.filter(t => t.assignedUsers?.includes(myUid));
  const completedTasks = myTasks.filter(t => t.status === 'COMPLETED');
  const inProgressTasks = myTasks.filter(t => t.status === 'IN_PROGRESS');
  const waitingTasks = myTasks.filter(t => t.status === 'WAITING_VERIFICATION');

  const totalPoints = currentUser.points || 0;
  const totalXp = currentUser.xp || 0;
  const XP_PER_LEVEL = 500;
  const computedLevel = currentUser.level || Math.max(1, Math.floor(totalXp / XP_PER_LEVEL) + 1);
  const xpInLevel = totalXp % XP_PER_LEVEL;
  const xpLevelPct = Math.min((xpInLevel / XP_PER_LEVEL) * 100, 100);

  // Fix: gunakan myUid dan filter sekali saja
  const myBadges = badgesDb.filter(b => b.userId === myUid);
  const earnedBadges = myBadges.filter(b => b.status === 'earned');
  const pendingBadges = myBadges.filter(b => b.status === 'pending');

  const skillStats = currentUser.stats;
  const skillItems = skillStats ? [
    { label: 'Fotografi', value: skillStats.photography, color: 'bg-amber-500' },
    { label: 'Videografi', value: skillStats.videography, color: 'bg-red-500' },
    { label: 'Penulisan', value: skillStats.writing, color: 'bg-emerald-500' },
    { label: 'Desain', value: skillStats.design, color: 'bg-purple-500' },
  ] : [];

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
        {/* RINGKASAN 4 KARTU */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden">
            <TrendingUp className="absolute -right-2 -bottom-2 w-12 h-12 text-blue-500/10" />
            <p className="text-2xl font-black text-white">{totalPoints}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Poin</p>
          </div>
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden">
            <Zap className="absolute -right-2 -bottom-2 w-12 h-12 text-yellow-500/10" />
            <p className="text-2xl font-black text-white">{totalXp}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total XP</p>
          </div>
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden">
            <CheckCircle2 className="absolute -right-2 -bottom-2 w-12 h-12 text-emerald-500/10" />
            <p className="text-2xl font-black text-white">{completedTasks.length}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tugas Selesai</p>
          </div>
          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden">
            <Award className="absolute -right-2 -bottom-2 w-12 h-12 text-amber-500/10" />
            <p className="text-2xl font-black text-white">{earnedBadges.length}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Badge Diraih</p>
          </div>
        </div>

        {/* BREAKDOWN STATUS TUGAS */}
        <div className="bg-[#151b2b] border border-gray-800 rounded-3xl p-5">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart2 size={14} /> Status Tugas Saya
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Sedang Dikerjakan', count: inProgressTasks.length, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { label: 'Menunggu Verifikasi', count: waitingTasks.length, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
              { label: 'Selesai', count: completedTasks.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            ].map(item => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${item.bg} ${item.border}`}>
                <p className={`text-xs font-bold ${item.color}`}>{item.label}</p>
                <p className={`text-sm font-black ${item.color}`}>{item.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* INFO LEVEL & XP */}
        <div className="bg-linear-to-br from-blue-600/20 to-indigo-600/20 p-6 rounded-3xl border border-blue-500/30">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Level Anggota</p>
              <h2 className="text-2xl font-black text-white">Level {computedLevel}</h2>
            </div>
            <Award className="w-10 h-10 text-blue-500" />
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpLevelPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-3 font-bold uppercase tracking-tighter">
            {xpInLevel} / {XP_PER_LEVEL} XP &mdash; {XP_PER_LEVEL - xpInLevel} XP lagi ke Level {computedLevel + 1}
          </p>
        </div>

        {/* KONTRIBUSI BIDANG */}
        {skillItems.length > 0 && (
          <div className="bg-[#151b2b] border border-gray-800 rounded-3xl p-5">
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Target size={14} /> Kontribusi Bidang
            </h3>
            <div className="space-y-3">
              {skillItems.map(skill => {
                const maxVal = Math.max(...skillItems.map(s => s.value), 1);
                const pct = Math.round((skill.value / maxVal) * 100);
                return (
                  <div key={skill.label}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-xs font-bold text-gray-400">{skill.label}</p>
                      <p className="text-xs font-black text-white">{skill.value}</p>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full rounded-full ${skill.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BADGE DIRAIH */}
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Award size={14} /> Pencapaian Badge ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {earnedBadges.length > 0 ? (
              earnedBadges.map((badge) => {
                const Icon = badgeIcons[badge.icon] || Award;
                return (
                  <div key={badge.id} className="bg-[#151b2b] border border-gray-800 p-4 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-blue-600/10 rounded-xl" style={{ color: badge.color || '#3b82f6' }}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white">{badge.title || 'Badge Tanpa Judul'}</h4>
                      <p className="text-xs text-gray-500">{badge.description || 'Tidak ada deskripsi'}</p>
                    </div>
                    <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full uppercase">Diraih</span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-gray-900/50 rounded-3xl border border-dashed border-gray-800">
                <p className="text-xs text-gray-600">Belum ada badge yang diraih.</p>
              </div>
            )}
          </div>
        </div>

        {/* BADGE PENDING */}
        {pendingBadges.length > 0 && (
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hourglass size={14} /> Menunggu Konfirmasi ({pendingBadges.length})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {pendingBadges.map((badge) => {
                const Icon = badgeIcons[badge.icon] || Award;
                return (
                  <div key={badge.id} className="bg-[#151b2b] border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4 opacity-70">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-white">{badge.title || 'Badge Tanpa Judul'}</h4>
                      <p className="text-xs text-gray-500">{badge.description || 'Tidak ada deskripsi'}</p>
                      <p className="text-[10px] text-amber-400 mt-1">{badge.approvals}/{badge.requiredApprovals} persetujuan</p>
                    </div>
                    <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full uppercase">Pending</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceStats;
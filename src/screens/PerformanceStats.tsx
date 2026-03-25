import React, { useMemo } from 'react';
import { ChevronLeft, TrendingUp, CheckCircle2, Clock, Zap, ShieldCheck, Lightbulb, Award, AlertOctagon } from 'lucide-react';
import { Screen, Role, Task, Badge, UserAccount } from '../types';
import { db, updateDoc, doc, arrayUnion } from '../firebase';

export const PerformanceStats: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role,
  tasksDb?: Task[],
  badgesDb?: Badge[],
  currentUser: UserAccount | null
}> = ({ onNavigate, role, tasksDb = [], badgesDb = [], currentUser }) => {
  
  // 1. Ambil HANYA tugas yang pernah diikuti oleh pengguna yang sedang login
  const myTasks = useMemo(() => (tasksDb || []).filter(t => t.assignedUsers?.includes(currentUser?.uid || '')), [tasksDb, currentUser]);
  
  // 2. Hitung jumlah pelanggaran (tugas di mana user ini dicopot dan diberi penalti)
  const missedTasks = useMemo(() => (tasksDb || []).filter(t => (t as any).missedUsers?.includes(currentUser?.uid || '')), [tasksDb, currentUser]);
  
  const completedTasks = useMemo(() => myTasks.filter(t => t.status === 'COMPLETED'), [myTasks]);
  const verificationTasks = useMemo(() => myTasks.filter(t => t.status === 'WAITING_VERIFICATION'), [myTasks]);
  
  const stats = useMemo(() => {
    const total = myTasks.length;
    const completed = completedTasks.length;
    
    // Perhitungan Base Skor: Persentase tugas selesai
    const baseScore = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // PENGURANGAN POIN (PENALTI): -20 poin per pelanggaran
    const penaltyPoints = missedTasks.length * 20;
    
    // Final Skor (Tidak boleh di bawah 0)
    const finalScore = Math.max(0, baseScore - penaltyPoints);
    
    const monthlyData = [40, 65, 45, 80, 55, finalScore]; 
    
    return {
      score: finalScore,
      monthlyData
    };
  }, [myTasks, completedTasks, missedTasks]);

  const userBadges = useMemo(() => {
    return badgesDb.filter(b => b.userId === currentUser?.uid);
  }, [badgesDb, currentUser]);

  const handleApprove = async (badgeId: string) => {
    if (!currentUser) return;
    try {
      const badge = badgesDb.find(b => b.id === badgeId);
      if (!badge) return;

      const newApprovals = badge.approvals + 1;
      const isEarned = newApprovals >= badge.requiredApprovals;

      await updateDoc(doc(db, 'badges', badgeId), {
        approvals: newApprovals,
        status: isEarned ? 'earned' : 'pending',
        approvedBy: arrayUnion(currentUser.uid)
      });
    } catch (error) {
      console.error("Error approving badge:", error);
    }
  };

  const getBadgeIcon = (iconName: string) => {
    switch(iconName) {
      case 'Zap': return <Zap className="w-6 h-6 text-yellow-500" />;
      case 'ShieldCheck': return <ShieldCheck className="w-6 h-6 text-emerald-500" />;
      case 'Lightbulb': return <Lightbulb className="w-6 h-6 text-purple-500" />;
      default: return <Award className="w-6 h-6 text-blue-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('PROFILE')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Statistik & Apresiasi</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-900 p-5 rounded-3xl relative overflow-hidden shadow-xl shadow-blue-900/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Skor Kinerja Anda</p>
          <div className="flex items-end gap-2 mb-4">
            <h2 className="text-5xl font-extrabold text-white">{stats.score}</h2>
            <span className="text-blue-200 font-medium mb-1">/ 100</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-white bg-black/20 w-fit px-3 py-1.5 rounded-lg backdrop-blur-sm uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Berdasarkan penyelesaian tugas
          </div>
          {missedTasks.length > 0 && (
            <p className="text-[10px] text-red-300 font-medium mt-3 bg-red-900/40 p-2 rounded-lg border border-red-500/30">
              ⚠️ Skor dikurangi {missedTasks.length * 20} poin akibat pelanggaran.
            </p>
          )}
        </div>

        {/* 3 KOTAK STATISTIK TERMASUK PELANGGARAN */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 shadow-lg flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-1.5" />
            <p className="text-2xl font-bold mb-0.5 text-white">{completedTasks.length}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Selesai</p>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 shadow-lg flex flex-col items-center justify-center text-center">
            <Clock className="w-5 h-5 text-purple-500 mb-1.5" />
            <p className="text-2xl font-bold mb-0.5 text-white">{verificationTasks.length}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Diperiksa</p>
          </div>
          <div className="bg-red-500/5 p-4 rounded-2xl border border-red-500/20 shadow-lg flex flex-col items-center justify-center text-center">
            <AlertOctagon className="w-5 h-5 text-red-500 mb-1.5" />
            <p className="text-2xl font-bold mb-0.5 text-red-500">{missedTasks.length}</p>
            <p className="text-[9px] text-red-500/70 font-bold uppercase tracking-wider">Pelanggaran</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-4 text-gray-400 uppercase tracking-wider">Aktivitas 6 Bulan Terakhir</h3>
          <div className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 h-48 flex items-end justify-between gap-2 shadow-lg">
            {stats.monthlyData.map((height, i) => (
              <div key={i} className="w-full flex flex-col items-center gap-2">
                <div className="w-full bg-gray-800/50 rounded-t-lg relative flex-1 flex items-end overflow-hidden">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-1000 ease-out" 
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-gray-500 font-bold">
                  {['Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider">Badges & Apresiasi</h3>
            <div className="flex items-center gap-1 text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
              <Award className="w-3 h-3" />
              <span>{userBadges.filter(b => b.status === 'earned').length} Diperoleh</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {userBadges.map((badge) => (
              <div key={badge.id} className={`bg-[#151b2b] p-4 rounded-2xl border ${badge.status === 'earned' ? `border-${badge.color}-500/30 shadow-lg shadow-${badge.color}-500/10` : 'border-gray-800'} flex flex-col gap-3 relative overflow-hidden`}>
                {badge.status === 'earned' && (
                  <div className={`absolute top-0 right-0 w-16 h-16 bg-${badge.color}-500/10 rounded-bl-full -mr-4 -mt-4`}></div>
                )}
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${badge.status === 'earned' ? `bg-${badge.color}-500/10` : 'bg-gray-800/50 grayscale opacity-50'}`}>
                    {getBadgeIcon(badge.icon)}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-sm ${badge.status === 'earned' ? 'text-white' : 'text-gray-400'}`}>{badge.title}</h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{badge.description}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[...Array(badge.approvals)].map((_, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-blue-500 border-2 border-[#151b2b] flex items-center justify-center">
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            </div>
                          ))}
                          {[...Array(badge.requiredApprovals - badge.approvals)].map((_, i) => (
                            <div key={`empty-${i}`} className="w-5 h-5 rounded-full bg-gray-800 border-2 border-[#151b2b]"></div>
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-gray-500">
                          {badge.status === 'earned' ? `Disetujui ${badge.requiredApprovals} Admin` : `${badge.approvals}/${badge.requiredApprovals} Admin`}
                        </span>
                      </div>
                      
                      {role?.startsWith('ADMIN') && badge.status === 'pending' && !badge.approvedBy?.includes(currentUser?.uid || '') && (
                        <button 
                          onClick={() => handleApprove(badge.id)}
                          className="text-[10px] font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                        >
                          Setujui
                        </button>
                      )}
                      {role?.startsWith('ADMIN') && badge.status === 'pending' && badge.approvedBy?.includes(currentUser?.uid || '') && (
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                          Telah Disetujui
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {userBadges.length === 0 && (
              <div className="text-center py-10 bg-[#151b2b] rounded-2xl border border-gray-800 border-dashed">
                <Award className="w-8 h-8 text-gray-700 mx-auto mb-2 opacity-50" />
                <p className="text-gray-500 text-xs font-medium">Belum ada badge yang tersedia untuk Anda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceStats;
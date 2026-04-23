import React, { useState } from 'react';
import { ChevronLeft, FileText, Plus, BarChart, CheckCircle2, Users } from 'lucide-react';
import { Screen, Role, UserAccount, Task } from '../types';
import { db, collection, addDoc, serverTimestamp, query, where, getDocs } from '../firebase';
import { useData } from '../contexts/DataContext';

export const ReportsScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: Role,
  currentUser: UserAccount | null,
  tasksDb?: Task[],
  usersDb?: UserAccount[]
}> = ({ onNavigate, role, currentUser, tasksDb = [], usersDb = [] }) => {
  const { reports } = useData();
  const [loading, setLoading] = useState(false);

  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  const handleGenerateReport = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Cek duplikat: jangan buat laporan jika periode ini sudah ada
      const existingQ = query(collection(db, 'reports'), where('period', '==', period));
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        const { toast } = await import('sonner');
        toast.error(`Laporan periode ${period} sudah ada.`);
        setLoading(false);
        return;
      }

      const completedTasks = tasksDb.filter(t => t.status === 'COMPLETED').length;
      
      await addDoc(collection(db, 'reports'), {
        title: `Laporan Bulanan Komsos - ${period}`,
        period,
        summary: `Ringkasan aktivitas tim Komsos St. Paulus Juanda untuk periode ${period}.`,
        stats: {
          totalTasks: tasksDb.length,
          completedTasks,
          activeUsers: usersDb.length
        },
        generatedBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      const { toast } = await import('sonner');
      toast.success(`Laporan ${period} berhasil dibuat!`);
    } catch (e) {
      console.error(e);
      const { toast } = await import('sonner');
      toast.error('Gagal membuat laporan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-400">Laporan Bulanan</h1>
        {isAdmin && (
          <button 
            disabled={loading}
            onClick={handleGenerateReport} 
            className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" /> Generate
          </button>
        )}
      </header>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              <CheckCircle2 className="w-3 h-3" /> Efisiensi
            </div>
            <p className="text-2xl font-extrabold text-white">
              {tasksDb.length > 0 ? Math.round((tasksDb.filter(t => t.status === 'COMPLETED').length / tasksDb.length) * 100) : 0}%
            </p>
            <p className="text-[10px] text-gray-500 font-medium">Tugas Selesai</p>
          </div>
          <div className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              <Users className="w-3 h-3" /> Anggota
            </div>
            <p className="text-2xl font-extrabold text-white">{usersDb.length}</p>
            <p className="text-[10px] text-gray-500 font-medium">Total Personil</p>
          </div>
        </div>

        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Arsip Laporan</h2>
        <div className="space-y-3">
          {reports.length > 0 ? reports.map(report => (
            <div key={report.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white mb-0.5">{report.title}</h3>
                    <p className="text-[10px] text-gray-500 font-medium">{report.period}</p>
                  </div>
                </div>

                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-blue-500">{report.stats.activeUsers}</p>
                  <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Aktif</p>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12 bg-[#151b2b] rounded-2xl border border-gray-800 border-dashed">
              <BarChart className="w-10 h-10 text-gray-700 mx-auto mb-3 opacity-20" />
              <p className="text-gray-500 text-xs font-medium">Belum ada laporan yang di-generate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsScreen;
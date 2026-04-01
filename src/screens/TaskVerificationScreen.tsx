import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, CheckCircle2, Video, FileText, Activity, Users, Briefcase, Image as ImageIcon } from 'lucide-react';
import { Screen, Task, UserAccount } from '../types';
import { db, doc, updateDoc, serverTimestamp, increment } from '../firebase';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';

export const TaskVerificationScreen: React.FC<{ 
  onNavigate: (s: Screen) => void,
  setSelectedTaskId: (id: string) => void,
  tasksDb?: Task[],
  usersDb?: UserAccount[]
}> = ({ onNavigate, setSelectedTaskId, tasksDb = [], usersDb = [] }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { taskTypes } = useData();

  const pendingTasks = tasksDb.filter(t => t.status === 'WAITING_VERIFICATION');

  const handleApproveTask = async (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation(); 
    
    setIsLoading(true);
    try {
      // 1. Kemas kini status tugas kepada COMPLETED
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        status: 'COMPLETED',
        updatedAt: serverTimestamp()
      });

      // 2. AUTOMASI PENGAGIHAN MATA & KEMAHIRAN KEPADA PETUGAS
      if (task.assignedUsers && task.assignedUsers.length > 0) {
        for (const uid of task.assignedUsers) {
          const isLeader = task.teamLeaderId === uid;
          const earnedPoints = isLeader ? 75 : 50;
          
          const userRef = doc(db, 'users', uid);
          
          const userUpdate: any = {
            points: increment(earnedPoints),
            xp: increment(earnedPoints),
            completedTasksCount: increment(1)
          };

          const typeLower = task.type?.toLowerCase() || '';
          if (typeLower.includes('dokumentasi') || typeLower.includes('foto')) {
            userUpdate['stats.photography'] = increment(10);
          } else if (typeLower.includes('peliputan') || typeLower.includes('video') || typeLower.includes('obs')) {
            userUpdate['stats.videography'] = increment(10);
          } else if (typeLower.includes('publikasi') || typeLower.includes('nulis') || typeLower.includes('artikel')) {
            userUpdate['stats.writing'] = increment(10);
          } else if (typeLower.includes('desain') || typeLower.includes('design')) {
            userUpdate['stats.design'] = increment(10);
          }

          await updateDoc(userRef, userUpdate);
        }
      }
      
      toast.success("Tugas disahkan dan mata telah diagihkan!");
    } catch (err) {
      console.error("Ralat mengesahkan tugas:", err);
      toast.error("Gagal mengesahkan tugas.");
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    switch(t) {
      case 'peliputan': return <Video className="w-5 h-5 text-blue-500"/>;
      case 'dokumentasi': return <ImageIcon className="w-5 h-5 text-emerald-500"/>;
      case 'publikasi': return <FileText className="w-5 h-5 text-amber-500"/>;
      case 'desain': return <ImageIcon className="w-5 h-5 text-purple-500"/>;
      case 'obs': return <Video className="w-5 h-5 text-red-500"/>;
      case 'editing': return <Video className="w-5 h-5 text-indigo-500"/>;
      case 'tugas lain': return <CheckCircle2 className="w-5 h-5 text-gray-500"/>;
      default: 
        const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
        if (foundType) {
          return <Activity className="w-5 h-5" style={{ color: foundType.color }} />;
        }
        return <CheckCircle2 className="w-5 h-5 text-blue-500"/>;
    }
  };

  const getIconColor = (type: string) => {
    const foundType = taskTypes.find(tt => tt.name.toLowerCase() === type?.toLowerCase());
    return foundType ? foundType.color : null;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('ADMIN_DASHBOARD')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-300">Verifikasi Tugas</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 flex-1 overflow-y-auto pb-20">
        <div className="flex items-center gap-3 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 mb-6 shadow-lg shadow-amber-500/5">
          <div className="p-3 bg-amber-500 rounded-xl"><CheckCircle2 className="w-6 h-6 text-black" /></div>
          <div>
            <h2 className="text-2xl font-black text-amber-500">{pendingTasks.length}</h2>
            <p className="text-xs text-amber-500/70 font-bold uppercase tracking-wider">Tugas Menunggu Verifikasi</p>
          </div>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center bg-[#151b2b] rounded-xl border border-gray-800 mt-10">
            <div className="p-4 bg-gray-800 rounded-full mb-4"><CheckCircle2 className="w-8 h-8 text-gray-500" /></div>
            <p className="text-sm text-gray-400 font-bold">Semua tugas beres!</p>
            <p className="text-xs text-gray-500 leading-relaxed">Saat ini tidak ada tugas yang memerlukan verifikasi.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map(task => {
              const customColor = getIconColor(task.type);
              
              return (
                <motion.div 
                  key={task.id}
                  whileTap={{ scale: 0.98 }}
                  className="bg-[#151b2b] p-4 rounded-xl border border-gray-800 hover:border-amber-500/50 relative overflow-hidden group transition-all cursor-pointer"
                >
                  <div className="absolute -right-6 -top-6 text-amber-500/10 group-hover:scale-110 transition-transform"><CheckCircle2 size={80} /></div>
                  
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-800/50 relative z-10">
                    <div 
                      className={`p-2.5 rounded-xl ${!customColor ? 'bg-blue-500/10' : ''}`} 
                      style={customColor ? { backgroundColor: `${customColor}20` } : undefined}
                    >
                      {getIcon(task.type)}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{task.type}</p>
                      <p className="font-bold text-sm text-white truncate max-w-[200px]">{task.title}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Briefcase className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[11px] font-medium">{task.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[11px] font-medium">{task.assignedUsers?.length || 0} Petugas</span>
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-10">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedTaskId(task.id); 
                        onNavigate('TASK_DETAIL'); 
                      }}
                      className="flex-1 py-3 text-xs font-bold text-gray-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Tinjau Laporan
                    </button>
                    <button 
                      onClick={(e) => handleApproveTask(e, task)}
                      disabled={isLoading}
                      className="flex-1 py-3 text-xs font-bold text-black bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? 'Memproses...' : 'Verifikasi'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskVerificationScreen;
import React from 'react';
import { Screen, Role, Task, UserAccount, TaskType } from '../types';
import { CheckSquare, Clock, Video, Calendar, Plus, Image as ImageIcon, FileText, Loader2, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { getAvatarUrl } from '../lib/avatar';

export const TasksScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role,
  tasksDb?: Task[],
  usersDb?: UserAccount[],
  taskTypes?: TaskType[],
  setSelectedTaskId: (id: string) => void
}> = ({ onNavigate, role, tasksDb = [], usersDb = [], taskTypes = [], setSelectedTaskId }) => { 
  
  const [filter, setFilter] = React.useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  if (!tasksDb || !usersDb) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs font-bold uppercase tracking-widest">Sinkronisasi...</p>
      </div>
    );
  }

  const filteredTasks = tasksDb.filter(task => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') return task.status === 'IN_PROGRESS' || task.status === 'WAITING_VERIFICATION';
    if (filter === 'COMPLETED') return task.status === 'COMPLETED';
    return true;
  });

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

  const counts = {
    all: tasksDb.length,
    active: tasksDb.filter(t => t.status === 'IN_PROGRESS' || t.status === 'WAITING_VERIFICATION').length,
    completed: tasksDb.filter(t => t.status === 'COMPLETED').length
  };

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'peliputan') return <Video className="w-4 h-4 text-blue-500"/>;
    if (t === 'dokumentasi') return <ImageIcon className="w-4 h-4 text-emerald-500"/>;
    if (t === 'publikasi') return <FileText className="w-4 h-4 text-amber-500"/>;
    if (t === 'desain') return <ImageIcon className="w-4 h-4 text-purple-500"/>;
    if (t === 'obs') return <Video className="w-4 h-4 text-red-500"/>;
    if (t === 'editing') return <Video className="w-4 h-4 text-indigo-500"/>;
    
    // Check dynamic task types
    const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
    if (foundType) {
      return <Activity className="w-4 h-4" style={{ color: foundType.color }} />;
    }

    return <CheckSquare className="w-4 h-4 text-gray-500"/>;
  };

  const getIconBg = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'peliputan') return 'bg-blue-500/10';
    if (t === 'dokumentasi') return 'bg-emerald-500/10';
    if (t === 'publikasi') return 'bg-amber-500/10';
    
    // For dynamic types, we can't easily generate a tailwind bg with opacity from hex
    // but we can use inline style for a subtle background
    const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
    if (foundType) {
      return ''; // We'll handle it with style if needed
    }

    return 'bg-gray-500/10';
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'IN_PROGRESS': return 'bg-blue-500';
      case 'WAITING_VERIFICATION': return 'bg-amber-500';
      case 'COMPLETED': return 'bg-emerald-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <h1 className="text-lg font-extrabold tracking-tight text-white">Daftar Tugas</h1>
        {isAdminRole && (
          <button 
            onClick={() => onNavigate('CREATE_TASK')}
            className="p-2 bg-blue-600 rounded-full border border-blue-500 shadow-lg shadow-blue-500/20 active:scale-90 transition-transform"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </header>

      <div className="p-5">
        <div className="flex gap-4 border-b border-gray-800 mb-6">
          <button 
            onClick={() => setFilter('ALL')}
            className={`pb-3 font-bold text-sm transition-all relative ${filter === 'ALL' ? 'text-blue-400' : 'text-gray-500'}`}
          >
            Semua
            <span className="ml-1.5 text-[10px] opacity-60">({counts.all})</span>
            {filter === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}
          </button>
          <button 
            onClick={() => setFilter('ACTIVE')}
            className={`pb-3 font-bold text-sm transition-all relative ${filter === 'ACTIVE' ? 'text-blue-400' : 'text-gray-500'}`}
          >
            Aktif
            <span className="ml-1.5 text-[10px] opacity-60">({counts.active})</span>
            {filter === 'ACTIVE' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}
          </button>
          <button 
            onClick={() => setFilter('COMPLETED')}
            className={`pb-3 font-bold text-sm transition-all relative ${filter === 'COMPLETED' ? 'text-blue-400' : 'text-gray-500'}`}
          >
            Selesai
            <span className="ml-1.5 text-[10px] opacity-60">({counts.completed})</span>
            {filter === 'COMPLETED' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}
          </button>
        </div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {filteredTasks.length > 0 ? filteredTasks.map((task) => (
            <motion.div 
              variants={itemVariants}
              key={task.id} 
              onClick={() => {
                setSelectedTaskId(task.id);
                onNavigate('TASK_DETAIL');
              }} 
              whileTap={{ scale: 0.98 }}
              className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 cursor-pointer transition-all relative overflow-hidden group hover:border-blue-500/50"
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColor(task.status)} group-hover:w-2 transition-all`}></div>
              <div className="pl-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 block">{task.type}</span>
                    <h4 className="font-extrabold text-base leading-tight text-white">{task.title}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`p-1.5 ${getIconBg(task.type)} rounded-lg`} style={taskTypes.find(tt => tt.name.toLowerCase() === task.type?.toLowerCase()) ? { backgroundColor: `${taskTypes.find(tt => tt.name.toLowerCase() === task.type?.toLowerCase())?.color}20` } : {}}>{getIcon(task.type)}</div>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : 
                      task.status === 'WAITING_VERIFICATION' ? 'bg-amber-500/20 text-amber-500' : 
                      'bg-blue-500/20 text-blue-500'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {task.date}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                    <Clock className="w-3.5 h-3.5" /> {task.time}
                  </div>
                  
                  <div className="flex -space-x-1.5">
                    {(task.assignedUsers || []).slice(0, 3).map((uid, i) => {
                      const u = usersDb?.find(user => user.uid === uid || user.id === uid);

                      return (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-[#151b2b] bg-gray-800 overflow-hidden shadow-sm">
                          <img 
                            src={getAvatarUrl(u)} 
                            alt="Avatar" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      );
                    })}
                    {task.assignedUsers && task.assignedUsers.length > 3 && (
                      <div className="w-6 h-6 rounded-full border-2 border-[#151b2b] bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-400">
                        +{task.assignedUsers.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )) : (
            <motion.div 
              variants={itemVariants}
              className="text-center py-12 bg-[#151b2b] rounded-2xl border border-dashed border-gray-800"
            >
              <p className="text-gray-500 text-xs italic">Belum ada tugas terjadwal.</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
export default TasksScreen;

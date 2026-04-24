import React from 'react';
import { Screen, Role, Task, UserAccount, TaskType } from '../types';
import { CheckSquare, Clock, Video, Calendar, Plus, Image as ImageIcon, FileText, Activity, Search, X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAvatarUrl } from '../lib/avatar';
import { TaskCardSkeleton } from '../components/Skeleton';

export const TasksScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role,
  tasksDb?: Task[],
  usersDb?: UserAccount[],
  taskTypes?: TaskType[],
  setSelectedTaskId: (id: string) => void
}> = ({ onNavigate, role, tasksDb = [], usersDb = [], taskTypes = [], setSelectedTaskId }) => { 
  
  const [filter, setFilter] = React.useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('Semua');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [showFilters, setShowFilters] = React.useState(false);
  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  if (!tasksDb || !usersDb) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
        <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
          <div className="h-6 w-32 animate-pulse bg-gray-800 rounded-lg" />
        </header>
        <div className="p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <TaskCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  const getStartTime = (timeString?: string) => {
    if (!timeString) return '00:00';
    if (timeString.includes('-')) {
      return timeString.split('-')[0].trim();
    }
    return timeString.trim();
  };

  const knownTypes = ['Peliputan', 'Dokumentasi', 'Publikasi', 'Desain', 'OBS', 'Editing'];
  const customTypes = taskTypes.map(tt => tt.name).filter(n => !knownTypes.includes(n));
  const allTypeOptions = ['Semua', ...knownTypes, ...customTypes];

  const activeFilterCount = [
    typeFilter !== 'Semua',
    dateFrom !== '',
    dateTo !== '',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setTypeFilter('Semua');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };

  const today = new Date().toISOString().split('T')[0];
  const isTaskOverdue = (task: Task) => task.date < today && (task.status === 'OPEN' || task.status === 'IN_PROGRESS');

  const filteredTasks = tasksDb
    .filter(task => {
      if (filter === 'ALL') return true;
      if (filter === 'ACTIVE') return (task.status === 'OPEN' || task.status === 'IN_PROGRESS' || task.status === 'WAITING_VERIFICATION') && !isTaskOverdue(task);
      if (filter === 'COMPLETED') return task.status === 'COMPLETED';
      if (filter === 'OVERDUE') return isTaskOverdue(task);
      return true;
    })
    .filter(task => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        task.title?.toLowerCase().includes(q) ||
        task.type?.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q)
      );
    })
    .filter(task => {
      if (typeFilter === 'Semua') return true;
      return task.type?.toLowerCase() === typeFilter.toLowerCase();
    })
    .filter(task => {
      if (!dateFrom && !dateTo) return true;
      const taskDate = task.date || '';
      if (dateFrom && taskDate < dateFrom) return false;
      if (dateTo && taskDate > dateTo) return false;
      return true;
    })
    .sort((a, b) => {
      const startTimeA = getStartTime(a.time);
      const startTimeB = getStartTime(b.time);
      
      let dateA = new Date(`${a.date}T${startTimeA}`).getTime();
      if (isNaN(dateA)) dateA = new Date(`${a.date} ${startTimeA}`).getTime();
      
      let dateB = new Date(`${b.date}T${startTimeB}`).getTime();
      if (isNaN(dateB)) dateB = new Date(`${b.date} ${startTimeB}`).getTime();

      if (filter === 'COMPLETED') {
        return (dateB || 0) - (dateA || 0);
      } else {
        return (dateA || Number.MAX_SAFE_INTEGER) - (dateB || Number.MAX_SAFE_INTEGER);
      }
    });

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const counts = {
    all: tasksDb.length,
    active: tasksDb.filter(t => (t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING_VERIFICATION') && !isTaskOverdue(t)).length,
    completed: tasksDb.filter(t => t.status === 'COMPLETED').length,
    overdue: tasksDb.filter(t => isTaskOverdue(t)).length
  };

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'peliputan') return <Video className="w-4 h-4 text-blue-500"/>;
    if (t === 'dokumentasi') return <ImageIcon className="w-4 h-4 text-emerald-500"/>;
    if (t === 'publikasi') return <FileText className="w-4 h-4 text-amber-500"/>;
    if (t === 'desain') return <ImageIcon className="w-4 h-4 text-purple-500"/>;
    if (t === 'obs') return <Video className="w-4 h-4 text-red-500"/>;
    if (t === 'editing') return <Video className="w-4 h-4 text-indigo-500"/>;
    
    const foundType = taskTypes.find(tt => tt.name.toLowerCase() === t);
    if (foundType) return <Activity className="w-4 h-4" style={{ color: foundType.color }} />;

    return <CheckSquare className="w-4 h-4 text-gray-500"/>;
  };

  const getIconBg = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'peliputan') return 'bg-blue-500/10';
    if (t === 'dokumentasi') return 'bg-emerald-500/10';
    if (t === 'publikasi') return 'bg-amber-500/10';
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
          <button onClick={() => onNavigate('CREATE_TASK')} className="p-2 bg-blue-600 rounded-full border border-blue-500 shadow-lg shadow-blue-500/20 active:scale-90 transition-transform">
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </header>

      <div className="p-5">
        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari judul, jenis, deskripsi..."
            className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-9 pr-9 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle Button */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${showFilters ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#151b2b] border-gray-800 text-gray-400 hover:border-gray-700'}`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-black">{activeFilterCount}</span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {(activeFilterCount > 0 || searchQuery) && (
            <button onClick={clearAllFilters} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Expandable Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <div className="bg-[#151b2b] rounded-2xl border border-gray-800 p-4 space-y-4">
                {/* Type Filter */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Jenis Tugas</p>
                  <div className="flex flex-wrap gap-2">
                    {allTypeOptions.map(t => (
                      <button
                        key={t}
                        onClick={() => setTypeFilter(t)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${typeFilter === t ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-[#0a0f18] border-gray-700 text-gray-400 hover:border-gray-600'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Rentang Tanggal</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-600 mb-1 block">Dari</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="w-full bg-[#0a0f18] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors scheme-dark"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-600 mb-1 block">Sampai</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="w-full bg-[#0a0f18] border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors scheme-dark"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 border-b border-gray-800 mb-6 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilter('ALL')} className={`pb-3 font-bold text-sm transition-all relative whitespace-nowrap ${filter === 'ALL' ? 'text-blue-400' : 'text-gray-500'}`}>Semua <span className="ml-1.5 text-[10px] opacity-60">({counts.all})</span>{filter === 'ALL' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}</button>
          <button onClick={() => setFilter('ACTIVE')} className={`pb-3 font-bold text-sm transition-all relative whitespace-nowrap ${filter === 'ACTIVE' ? 'text-blue-400' : 'text-gray-500'}`}>Aktif <span className="ml-1.5 text-[10px] opacity-60">({counts.active})</span>{filter === 'ACTIVE' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}</button>
          <button onClick={() => setFilter('COMPLETED')} className={`pb-3 font-bold text-sm transition-all relative whitespace-nowrap ${filter === 'COMPLETED' ? 'text-blue-400' : 'text-gray-500'}`}>Selesai <span className="ml-1.5 text-[10px] opacity-60">({counts.completed})</span>{filter === 'COMPLETED' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>}</button>
          <button onClick={() => setFilter('OVERDUE')} className={`pb-3 font-bold text-sm transition-all relative whitespace-nowrap ${filter === 'OVERDUE' ? 'text-red-400' : 'text-gray-500'}`}>Terlewat {counts.overdue > 0 && <span className="ml-1.5 text-[10px] opacity-60">({counts.overdue})</span>}{filter === 'OVERDUE' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-full"></div>}</button>
        </div>
        
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
          {filteredTasks.length > 0 ? filteredTasks.map((task) => {
            // --- PENYELESAIAN BUG VERCEL ADA DI SINI ---
            const customColor = taskTypes.find(tt => tt.name.toLowerCase() === task.type?.toLowerCase())?.color;

            return (
              <motion.div 
                variants={itemVariants}
                key={task.id} 
                onClick={() => { setSelectedTaskId(task.id); onNavigate('TASK_DETAIL'); }} 
                whileTap={{ scale: 0.98 }}
                className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 cursor-pointer transition-all relative overflow-hidden group hover:border-blue-500/50"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isTaskOverdue(task) ? 'bg-red-500' : getStatusColor(task.status)} group-hover:w-2 transition-all`}></div>
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 block">{task.type}</span>
                      <h4 className="font-extrabold text-base leading-tight text-white">{task.title}</h4>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div 
                        className={`p-1.5 rounded-lg ${!customColor ? getIconBg(task.type) : ''}`} 
                        style={customColor ? { backgroundColor: `${customColor}20` } : undefined}
                      >
                        {getIcon(task.type)}
                      </div>
                      {isTaskOverdue(task) ? (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter bg-red-500/20 text-red-500">Terlewat</span>
                      ) : (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : task.status === 'WAITING_VERIFICATION' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-1.5"><Calendar className="w-3.5 h-3.5" /> {task.date}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-medium"><Clock className="w-3.5 h-3.5" /> {task.time}</div>
                    <div className="flex -space-x-1.5">
                      {(task.assignedUsers || []).slice(0, 3).map((uid, i) => {
                        const u = usersDb?.find(user => user.uid === uid || user.id === uid);
                        return (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-[#151b2b] bg-gray-800 overflow-hidden shadow-sm">
                            <img src={getAvatarUrl(u)} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                        );
                      })}
                      {task.assignedUsers && task.assignedUsers.length > 3 && (
                        <div className="w-6 h-6 rounded-full border-2 border-[#151b2b] bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-400">+{task.assignedUsers.length - 3}</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <motion.div variants={itemVariants} className="text-center py-12 bg-[#151b2b] rounded-2xl border border-dashed border-gray-800">
              <Search className="w-8 h-8 text-gray-700 mx-auto mb-3 opacity-50" />
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                {searchQuery || typeFilter !== 'Semua' || dateFrom || dateTo
                  ? 'Tidak ada tugas yang cocok dengan filter'
                  : 'Belum ada tugas terjadwal.'}
              </p>
              {(searchQuery || typeFilter !== 'Semua' || dateFrom || dateTo) && (
                <button onClick={clearAllFilters} className="mt-3 text-blue-400 text-xs font-bold hover:underline">Reset filter</button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
export default TasksScreen;
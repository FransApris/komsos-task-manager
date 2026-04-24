import React, { useEffect, useState } from 'react';
import { Screen, Task, UserAccount } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, ChevronRight, Bell, Calendar, Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react';

interface NewTaskAlertScreenProps {
  onNavigate: (s: Screen) => void;
  user: UserAccount | null;
  tasksDb: Task[];
}

export const NewTaskAlertScreen: React.FC<NewTaskAlertScreenProps> = ({ onNavigate, user, tasksDb }) => {
  const [newTasks, setNewTasks] = useState<Task[]>([]);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      onNavigate('LOGIN');
      return;
    }

    // Beri waktu sejenak untuk data tersinkronisasi dari Firestore
    const checkTimer = setTimeout(() => {
      const activeTasks = tasksDb.filter(t => 
        (t.status === 'OPEN' || t.status === 'IN_PROGRESS') && 
        t.assignedUsers?.includes(user.uid || '')
      );

      if (activeTasks.length === 0) {
        onNavigate('USER_DASHBOARD');
      } else {
        setNewTasks(activeTasks);
        setIsChecking(false);
      }
    }, 1500); // Tunggu 1.5 detik untuk sinkronisasi data

    return () => clearTimeout(checkTimer);
  }, [user, tasksDb, onNavigate]);

  if (isChecking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Memeriksa Tugas Baru...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] text-white overflow-hidden">
      <div className="flex-1 flex flex-col p-6 justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/30 relative">
            <Bell className="w-10 h-10 text-blue-500 animate-bounce" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-[#0a0f18]">
              {newTasks.length}
            </div>
          </div>
          <h1 className="text-3xl font-black mb-2 tracking-tight">Tugas Baru Menanti!</h1>
          <p className="text-gray-400 text-sm">Hai {user?.displayName}, ada {newTasks.length} penugasan baru yang perlu Anda perhatikan.</p>
        </motion.div>

        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 no-scrollbar">
          <AnimatePresence mode="popLayout">
            {newTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <ClipboardList size={60} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                      {task.type}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                      <Clock size={10} /> {task.time}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-extrabold mb-2 text-white group-hover:text-blue-400 transition-colors">
                    {task.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-gray-600" />
                      <span>{task.date}</span>
                    </div>
                    {task.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-gray-600" />
                        <span className="truncate max-w-30">{task.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-10"
        >
          <button
            onClick={() => onNavigate('USER_DASHBOARD')}
            className="w-full bg-linear-to-r from-blue-600 to-indigo-600 text-white font-black py-5 rounded-2xl shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 group active:scale-95 transition-all uppercase tracking-widest text-sm"
          >
            Masuk ke Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-center text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-bold">
            Klik tombol di atas untuk melanjutkan
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default NewTaskAlertScreen;

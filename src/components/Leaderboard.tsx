import React from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { UserAccount } from '../types';
import { getAvatarUrl } from '../lib/avatar';
import { motion } from 'motion/react';

interface LeaderboardProps {
  users: UserAccount[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ users }) => {
  const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1: return <Medal className="w-5 h-5 text-gray-400" />;
      case 2: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <Award className="w-5 h-5 text-blue-500/50" />;
    }
  };

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
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="bg-[#151b2b] rounded-3xl border border-gray-800 p-5 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="flex justify-between items-center mb-6 relative z-10">
        <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Leaderboard Tim</h3>
        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest italic">Top 5 Anggota</span>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        className="space-y-4 relative z-10"
      >
        {sortedUsers.map((u, i) => (
          <motion.div 
            variants={itemVariants}
            key={u.uid || u.id} 
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-gray-700/50 group-hover:ring-blue-500/30 transition-all">
                  <img 
                    src={getAvatarUrl(u)} 
                    alt={u.displayName} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + (i * 0.1) }}
                  className="absolute -bottom-1 -right-1 bg-[#0a0f18] rounded-full p-0.5"
                >
                  {getRankIcon(i)}
                </motion.div>
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{u.displayName || 'Tanpa Nama'}</p>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Level {u.level || 1}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-blue-400 leading-tight">{u.points || 0}</p>
              <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Poin</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

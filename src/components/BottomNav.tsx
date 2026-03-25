import React from 'react';
import { Home, ClipboardList, Users, User, Bell } from 'lucide-react';
import { Screen, Role } from '../types';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  role?: Role;
  unreadNotifications?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ 
  currentScreen, 
  onNavigate, 
  role,
  unreadNotifications = 0
}) => {
  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  const dashboardScreen: Screen = isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD';

  const navItems = [
    { id: dashboardScreen, label: 'Beranda', icon: <Home size={20} /> },
    { id: 'TASKS' as Screen, label: 'Tugas', icon: <ClipboardList size={20} /> },
    { id: 'TEAM' as Screen, label: 'Tim', icon: <Users size={20} /> },
    { id: 'PROFILE' as Screen, label: 'Profil', icon: <User size={20} /> },
  ];

  // Only show for main screens
  const mainScreens: Screen[] = [
    'USER_DASHBOARD', 
    'ADMIN_DASHBOARD', 
    'TASKS', 
    'TEAM', 
    'PROFILE', 
    'NOTIFICATIONS',
    'INVENTORY',
    'MASS_SCHEDULE',
    'ATTENDANCE',
    'REPORTS',
    'VCAST_MANAGER'
  ];

  if (!mainScreens.includes(currentScreen)) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-50 safe-area-bottom">
      <div className="bg-[#151b2b]/60 backdrop-blur-2xl border border-white/10 rounded-[32px] p-2 shadow-2xl shadow-black/50 flex justify-between items-center relative overflow-hidden">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id || 
                          (item.id === 'ADMIN_DASHBOARD' && currentScreen === 'USER_DASHBOARD') ||
                          (item.id === 'USER_DASHBOARD' && currentScreen === 'ADMIN_DASHBOARD');
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex-1 flex flex-col items-center justify-center py-3 outline-none group"
            >
              {/* Active Background Indicator */}
              {isActive && (
                <motion.div 
                  layoutId="activePill"
                  className="absolute inset-1 bg-blue-600/20 border border-blue-500/30 rounded-2xl z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-1">
                <motion.div
                  animate={{ 
                    scale: isActive ? 1.1 : 1,
                    color: isActive ? '#3b82f6' : '#9ca3af'
                  }}
                  className="transition-colors"
                >
                  {item.icon}
                  {item.id === 'NOTIFICATIONS' && unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#151b2b] shadow-lg shadow-red-500/50"></span>
                  )}
                </motion.div>
                <span className={`text-[8px] font-black uppercase tracking-[0.15em] transition-colors ${
                  isActive ? 'text-blue-400' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </div>
              
              {/* Subtle Glow for Active Item */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-500/50 blur-md rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

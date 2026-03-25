import React, { useState } from 'react';
import { ChevronLeft, Bell, CheckCircle2, Clock, Video, Info, CheckCheck } from 'lucide-react';
import { Screen, Notification } from '../types';
import { db, doc, updateDoc, writeBatch } from '../firebase'; 

export const Notifications: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: string,
  notificationsDb?: Notification[]
}> = ({ onNavigate, role, notificationsDb = [] }) => {
  const backScreen = role === 'ADMIN_DASHBOARD' || role?.startsWith('ADMIN_') ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD';
  const [isMarking, setIsMarking] = useState(false);
  
  // Menghitung jumlah notifikasi yang belum dibaca
  const unreadCount = notificationsDb.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch(type) {
      case 'TASK': return <Video className="w-4 h-4 text-blue-500"/>;
      case 'SYSTEM': return <Info className="w-4 h-4 text-amber-500"/>;
      case 'ALERT': return <Clock className="w-4 h-4 text-purple-500"/>;
      default: return <Bell className="w-4 h-4 text-gray-500"/>;
    }
  };

  const getBg = (type: string) => {
    switch(type) {
      case 'TASK': return 'bg-blue-500/10';
      case 'SYSTEM': return 'bg-amber-500/10';
      case 'ALERT': return 'bg-purple-500/10';
      default: return 'bg-gray-500/10';
    }
  };

  // FUNGSI 1: Tandai satu notifikasi sebagai sudah dibaca
  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // FUNGSI 2: Tandai SEMUA notifikasi sebagai sudah dibaca menggunakan Batch Write
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    setIsMarking(true);
    try {
      const batch = writeBatch(db);
      notificationsDb.forEach(notif => {
        if (!notif.read && notif.id) {
          const notifRef = doc(db, 'notifications', notif.id);
          batch.update(notifRef, { read: true });
        }
      });
      await batch.commit();
    } catch (error) {
      console.error("Error marking all as read:", error);
      alert("Gagal menandai notifikasi. Periksa koneksi Anda.");
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate(backScreen as Screen)}>
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-white">Notifikasi</h1>
        </div>
        
        {/* Tombol Tandai Semua Dibaca akan muncul jika ada notif yang belum dibaca */}
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            disabled={isMarking}
            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" /> 
            {isMarking ? 'Memproses...' : 'Tandai Semua Dibaca'}
          </button>
        )}
      </header>

      <div className="p-5 space-y-3">
        {(notificationsDb || []).length > 0 ? (
          (notificationsDb || []).map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => !notif.read && notif.id && handleMarkAsRead(notif.id)}
              className={`flex gap-4 p-4 rounded-2xl border transition-all ${!notif.read ? 'bg-[#151b2b] border-blue-500/30 cursor-pointer hover:border-blue-500/50' : 'bg-transparent border-gray-800'}`}
            >
              <div className={`p-2 rounded-xl shrink-0 h-fit ${getBg(notif.type || 'info')}`}>
                {getIcon(notif.type || 'info')}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm font-bold ${!notif.read ? 'text-white' : 'text-gray-400'}`}>{notif.title}</h4>
                  {!notif.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>}
                </div>
                <p className="text-xs text-gray-400 mb-2 leading-relaxed">{notif.message}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {/* Format tanggal jika menggunakan Timestamp dari Firebase */}
                    {notif.createdAt && typeof notif.createdAt === 'object' && 'toDate' in notif.createdAt 
                      ? notif.createdAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                      : (notif.date ? `${notif.date} • ${notif.time}` : 'Baru saja')
                    }
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-[#151b2b] rounded-3xl border border-dashed border-gray-800">
            <Bell className="w-12 h-12 text-gray-700 mb-4 opacity-30" />
            <p className="text-gray-400 font-bold text-sm">Tidak ada notifikasi.</p>
            <p className="text-xs text-gray-500 mt-1">Anda sudah membaca semuanya.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default Notifications;
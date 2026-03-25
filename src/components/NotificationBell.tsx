import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Eraser, Loader2 } from 'lucide-react';
import { 
  subscribeToUnreadNotifications, 
  markNotificationAsRead, 
  deleteNotification, 
  deleteAllNotifications 
} from '../services/notificationService';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Mengambil data secara real-time
  useEffect(() => {
    const unsubscribe = subscribeToUnreadNotifications(setNotifications);
    return () => unsubscribe();
  }, []);

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const handleDelete = async (id: string) => {
    if(confirm("Hapus notifikasi ini?")) {
      await deleteNotification(id);
    }
  };

  return (
    <div className="relative">
      {/* Icon Lonceng dengan Badge Angka */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
      >
        <Bell size={24} />
        {notifications.length > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Notifikasi */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          {/* Header Dropdown */}
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Notifikasi</h3>
            {notifications.length > 0 && (
              <button 
                onClick={() => {
                  if(confirm("Hapus semua notifikasi?")) deleteAllNotifications();
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <Eraser size={14} /> Hapus Semua
              </button>
            )}
          </div>
          
          {/* List Notifikasi */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                Tidak ada notifikasi baru
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 flex justify-between items-center group transition-colors">
                  <div className="flex-1 pr-2">
                    <p className="text-sm font-bold text-slate-800">{notif.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                  </div>
                  
                  {/* Tombol Aksi (Muncul saat Hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleMarkRead(notif.id)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg"
                      title="Tandai dibaca"
                    >
                      <Check size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(notif.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { ChevronLeft, Database, Users, ClipboardList, Wrench, Calendar, Search, Filter, Download, Trash2, Edit2, Bell, MessageSquare, CheckSquare, FileBarChart, Award, Sparkles, Activity } from 'lucide-react';
import { Screen, Role, UserAccount, Task, Inventory, MassSchedule, Notification, ChatMessage, Attendance, Report, Badge } from '../types';
import { db, doc, deleteDoc, collection, addDoc, serverTimestamp } from '../firebase';

export const AdminDataManagement: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  usersDb?: UserAccount[],
  tasksDb?: Task[],
  inventoryDb?: Inventory[],
  massSchedules?: MassSchedule[],
  notificationsDb?: Notification[],
  badgesDb?: Badge[]
}> = ({ 
  onNavigate, 
  usersDb = [], 
  tasksDb = [], 
  inventoryDb = [], 
  massSchedules = [], 
  notificationsDb = [], 
  badgesDb = [] 
}) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'TASKS' | 'INVENTORY' | 'MASS' | 'NOTIFS' | 'BADGES' | 'ATTENDANCE' | 'REPORTS'>('USERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const handleDelete = async (collectionName: string, id: string) => {
    if (!window.confirm('Hapus data ini secara permanen?')) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (e) {
      console.error(`Error deleting from ${collectionName}:`, e);
      alert('Gagal menghapus data. Silakan coba lagi.');
    }
  };

  const handleSeedAll = async () => {
    if (!window.confirm('Ingin menambahkan data contoh untuk semua fitur? Data akan ditambahkan ke koleksi yang sudah ada.')) return;
    setIsSeeding(true);
    try {
      const firstUser = usersDb.find(u => u.role === 'USER')?.uid || 'system';
      const adminUser = usersDb[0]?.uid || 'system';

      // 1. Seed Inventory (Peralatan)
      const sampleItems = [
        { name: 'Kamera Sony A7III', category: 'Kamera', status: 'AVAILABLE' },
        { name: 'Mic Wireless Rode GO II', category: 'Audio', status: 'AVAILABLE' },
        { name: 'LED Lighting Godox', category: 'Lighting', status: 'AVAILABLE' },
        { name: 'Tripod Libec', category: 'Aksesoris', status: 'AVAILABLE' }
      ];
      
      const createdInventoryIds: string[] = [];
      for (const item of sampleItems) {
        const docRef = await addDoc(collection(db, 'inventory'), {
          ...item,
          assignedTo: null,
          lastChecked: serverTimestamp()
        });
        createdInventoryIds.push(docRef.id);
      }

      // 2. Seed Tasks (Tugas)
      const taskTypes = ['Peliputan', 'Dokumentasi', 'Publikasi', 'Desain', 'OBS', 'Editing', 'Tugas Lain'];
      for (const type of taskTypes) {
        await addDoc(collection(db, 'tasks'), {
          title: `Tugas Contoh ${type}`,
          type: type,
          date: '2026-04-05',
          time: '08:00 - 10:00',
          status: 'IN_PROGRESS',
          assignedUsers: [firstUser],
          teamLeaderId: firstUser,
          requiredEquipment: createdInventoryIds.slice(0, 2),
          createdBy: adminUser,
          createdAt: serverTimestamp()
        });
      }

      // 3. Seed Mass Schedules (Jadwal Misa)
      await addDoc(collection(db, 'massSchedules'), {
        title: 'Misa Minggu Pagi',
        date: '2026-03-29',
        time: '08:00',
        location: 'Gereja St. Paulus',
        status: 'OPEN',
        assignedUsers: [],
        createdBy: adminUser,
        createdAt: serverTimestamp()
      });

      // 4. Seed Notifications (Notifikasi)
      if (usersDb.length > 0) {
        await addDoc(collection(db, 'notifications'), {
          userId: usersDb[0].uid,
          title: 'Selamat Datang!',
          message: 'Aplikasi Komsos siap digunakan. Silakan cek tugas Anda.',
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // 5. Seed Badges (Badge)
      if (usersDb.length > 0) {
        await addDoc(collection(db, 'badges'), {
          userId: usersDb[0].uid,
          title: 'Kreator Tercepat',
          description: 'Menyelesaikan tugas sebelum deadline.',
          icon: 'Zap',
          color: 'yellow',
          approvals: 0,
          requiredApprovals: 3,
          status: 'pending',
          approvedBy: []
        });
      }

      alert('Data contoh berhasil ditambahkan! Silakan cek daftar di bawah atau Firebase Console.');
    } catch (e) {
      console.error(e);
      alert('Terjadi kesalahan saat menambahkan data contoh.');
    } finally {
      setIsSeeding(false);
    }
  };

  const renderUsers = () => {
    const filtered = (usersDb || []).filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data anggota.</div>;
    return (
      <div className="space-y-3">
        {filtered.map(user => (
          <div key={user.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden ring-2 ring-gray-700">
                <img src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${user.img || '1'}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{user.name || 'Tanpa Nama'}</h3>
                <p className="text-[10px] text-gray-500 font-medium">{user.email}</p>
                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">{user.role}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleDelete('users', user.id)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTasks = () => {
    const filtered = (tasksDb || []).filter(t => (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data tugas.</div>;
    return (
      <div className="space-y-3">
        {filtered.map(task => (
          <div key={task.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white mb-1">{task.title}</h3>
              <div className="flex items-center gap-3 text-gray-500 text-[10px] font-medium">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {task.date}</span>
                <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {task.type}</span>
              </div>
            </div>
            <button onClick={() => handleDelete('tasks', task.id)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    );
  };

  const renderInventory = () => {
    const filtered = (inventoryDb || []).filter(i => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data inventaris.</div>;
    return (
      <div className="space-y-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white mb-1">{item.name}</h3>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{item.category} • {item.status}</p>
            </div>
            <button onClick={() => handleDelete('inventory', item.id)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    );
  };

  const renderMass = () => {
    const filtered = (massSchedules || []).filter(m => (m.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data jadwal misa.</div>;
    return (
      <div className="space-y-3">
        {filtered.map(mass => (
          <div key={mass.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white mb-1">{mass.title}</h3>
              <p className="text-[10px] text-gray-500 font-medium">{mass.date} • {mass.time}</p>
            </div>
            <button onClick={() => handleDelete('massSchedules', mass.id)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    );
  };

  const renderNotifs = () => {
    const filtered = (notificationsDb || []).filter(n => (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data notifikasi.</div>;
    return (
      <div className="space-y-3">
        {filtered.map(notif => (
          <div key={notif.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white mb-1">{notif.title}</h3>
              <p className="text-[10px] text-gray-500 font-medium">{notif.message}</p>
            </div>
            <button onClick={() => handleDelete('notifications', notif.id!)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    );
  };

  const renderBadges = () => {
    const filtered = (badgesDb || []).filter(b => (b.title || '').toLowerCase().includes(searchTerm.toLowerCase()));
    if (filtered.length === 0) return <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data badge.</div>;
    return (
      <div className="space-y-3">
        {filtered.map(badge => (
          <div key={badge.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-white mb-1">{badge.title}</h3>
              <p className="text-[10px] text-gray-500 font-medium">{badge.description}</p>
            </div>
            <button onClick={() => handleDelete('badges', badge.id!)} className="p-2 text-red-500/70 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    );
  };

  const handleExportAll = () => {
    const data = {
      users: usersDb,
      tasks: tasksDb,
      inventory: inventoryDb,
      massSchedules: massSchedules,
      notifications: notificationsDb,
      badges: badgesDb
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `komsos_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleClearAll = async () => {
    if (!window.confirm('PERINGATAN: Ini akan menghapus SEMUA data di koleksi ini. Lanjutkan?')) return;
    setIsSeeding(true);
    try {
      let collectionName = '';
      let items: any[] = [];
      
      if (activeTab === 'USERS') { collectionName = 'users'; items = usersDb; }
      else if (activeTab === 'TASKS') { collectionName = 'tasks'; items = tasksDb; }
      else if (activeTab === 'INVENTORY') { collectionName = 'inventory'; items = inventoryDb; }
      else if (activeTab === 'MASS') { collectionName = 'massSchedules'; items = massSchedules; }
      else if (activeTab === 'NOTIFS') { collectionName = 'notifications'; items = notificationsDb || []; }
      else if (activeTab === 'BADGES') { collectionName = 'badges'; items = badgesDb || []; }

      for (const item of items) {
        await deleteDoc(doc(db, collectionName, item.id));
      }
      alert(`Berhasil menghapus ${items.length} data dari ${collectionName}.`);
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus data.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold">Manajemen Data</h1>
        <div className="ml-auto flex gap-2">
          <button 
            onClick={handleExportAll}
            className="p-2 bg-[#151b2b] text-gray-400 border border-gray-800 rounded-xl hover:text-white transition-colors"
            title="Export All Data"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSeedAll}
            disabled={isSeeding}
            className="flex items-center gap-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-600/30 transition-all"
          >
            <Sparkles className="w-3 h-3" /> {isSeeding ? '...' : 'Seed'}
          </button>
          <button 
            onClick={handleClearAll}
            disabled={isSeeding}
            className="flex items-center gap-2 bg-red-600/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-600/30 transition-all"
          >
            <Trash2 className="w-3 h-3" /> {isSeeding ? '...' : 'Clear'}
          </button>
        </div>
      </header>

      <div className="p-5">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari data..."
            className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:border-blue-500 outline-none transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-6">
          <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Users className="w-4 h-4" /> Anggota</button>
          <button onClick={() => setActiveTab('TASKS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'TASKS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><ClipboardList className="w-4 h-4" /> Tugas</button>
          <button onClick={() => setActiveTab('INVENTORY')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Wrench className="w-4 h-4" /> Inventaris</button>
          <button onClick={() => setActiveTab('MASS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'MASS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Calendar className="w-4 h-4" /> Jadwal Misa</button>
          <button onClick={() => setActiveTab('ATTENDANCE')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><CheckSquare className="w-4 h-4" /> Presensi</button>
          <button onClick={() => setActiveTab('REPORTS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'REPORTS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><FileBarChart className="w-4 h-4" /> Laporan</button>
          <button onClick={() => setActiveTab('NOTIFS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'NOTIFS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Bell className="w-4 h-4" /> Notif</button>
          <button onClick={() => setActiveTab('BADGES')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'BADGES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Award className="w-4 h-4" /> Badge</button>
          <button onClick={() => onNavigate('TASK_TYPE_MANAGEMENT')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all bg-[#151b2b] text-blue-400 border border-blue-500/30 hover:bg-blue-500/10"><Activity className="w-4 h-4" /> Pengaturan Jenis Tugas</button>
        </div>

        {activeTab === 'USERS' && renderUsers()}
        {activeTab === 'TASKS' && renderTasks()}
        {activeTab === 'INVENTORY' && renderInventory()}
        {activeTab === 'MASS' && renderMass()}
        {activeTab === 'ATTENDANCE' && <div className="text-center py-12 text-gray-500 text-xs italic">Data presensi dikelola otomatis melalui sistem.</div>}
        {activeTab === 'REPORTS' && <div className="text-center py-12 text-gray-500 text-xs italic">Data laporan dikelola otomatis melalui sistem.</div>}
        {activeTab === 'NOTIFS' && renderNotifs()}
        {activeTab === 'BADGES' && renderBadges()}
      </div>
    </div>
  );
};
export default AdminDataManagement;

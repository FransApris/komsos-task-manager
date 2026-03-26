import React, { useState } from 'react';
import { ChevronLeft, Database, Users, ClipboardList, Wrench, Calendar, Search, Filter, Download, Trash2, Edit2, Bell, MessageSquare, CheckSquare, FileBarChart, Award, Sparkles, Activity, Plus, X, Save, Loader2, Trophy, Medal, Crown, Flame, Music, Video, Book, Coffee, PenTool, Code, Heart, Star, Shield, Target, Camera, Zap } from 'lucide-react';
import { Screen, Role, UserAccount, Task, Inventory, MassSchedule, Notification, ChatMessage, Attendance, Report, Badge } from '../types';
import { db, doc, deleteDoc, collection, addDoc, serverTimestamp, updateDoc } from '../firebase';
import { toast } from 'sonner';

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

  // Badge Modal State
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    userId: '',
    title: '',
    description: '',
    icon: 'Award',
    color: '#3b82f6',
    status: 'earned' as 'earned' | 'pending'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void, isDanger = true) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, isDanger });
  };

  const handleDelete = async (collectionName: string, id: string) => {
    openConfirm(
      'Konfirmasi Hapus',
      'Apakah Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan.',
      async () => {
        try {
          await deleteDoc(doc(db, collectionName, id));
          toast.success('Data berhasil dihapus');
        } catch (e) {
          console.error(`Error deleting from ${collectionName}:`, e);
          toast.error('Gagal menghapus data');
        }
      }
    );
  };

  const handleOpenBadgeModal = (badge?: Badge) => {
    if (badge) {
      setEditingBadge(badge);
      setBadgeForm({
        userId: badge.userId || '',
        title: badge.title || '',
        description: badge.description || '',
        icon: badge.icon || 'Award',
        color: badge.color || '#3b82f6',
        status: badge.status || 'earned'
      });
    } else {
      setEditingBadge(null);
      setBadgeForm({
        userId: '',
        title: '',
        description: '',
        icon: 'Award',
        color: '#3b82f6',
        status: 'earned'
      });
    }
    setIsBadgeModalOpen(true);
  };

  const handleSaveBadge = async () => {
    if (!badgeForm.userId || !badgeForm.title) {
      toast.error('User ID dan Judul wajib diisi');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBadge) {
        await updateDoc(doc(db, 'badges', editingBadge.id), {
          ...badgeForm,
          updatedAt: serverTimestamp()
        });
        toast.success('Badge berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'badges'), {
          ...badgeForm,
          approvals: 1,
          requiredApprovals: 1,
          approvedBy: ['System'],
          createdAt: serverTimestamp()
        });
        toast.success('Badge baru berhasil ditambahkan');
      }
      setIsBadgeModalOpen(false);
    } catch (e) {
      console.error('Error saving badge:', e);
      toast.error('Gagal menyimpan badge');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeedAll = async () => {
    openConfirm(
      'Seed Data',
      'Ingin menambahkan data contoh untuk semua fitur? Data akan ditambahkan ke koleksi yang sudah ada.',
      async () => {
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

          // 3. Seed Agenda (Misa)
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

          toast.success('Data contoh berhasil ditambahkan!');
        } catch (e) {
          console.error(e);
          toast.error('Terjadi kesalahan saat menambahkan data contoh.');
        } finally {
          setIsSeeding(false);
        }
      },
      false
    );
  };

  const renderUsers = () => {
    const filtered = (usersDb || []).filter(u => (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()));
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
                <h3 className="font-bold text-sm text-white">{user.displayName || 'Tanpa Nama'}</h3>
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
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Daftar Badge ({filtered.length})</h3>
          <button 
            onClick={() => handleOpenBadgeModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-3 h-3" /> Tambah Badge
          </button>
        </div>
        
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-xs">Tidak ada data badge.</div>
        ) : (
          filtered.map(badge => (
            <div key={badge.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl" style={{ color: badge.color || '#3b82f6' }}>
                  {(() => {
                    const IconComponent = {
                      Award, Trophy, Medal, Crown, Star, Zap, Flame, Target, Shield, Heart, Camera, Music, Video, Book, Coffee, PenTool, Code, Activity, Sparkles, Bell
                    }[badge.icon] || Award;
                    return <IconComponent className="w-5 h-5" />;
                  })()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white mb-1">{badge.title || 'Badge Tanpa Judul'}</h3>
                  <p className="text-[10px] text-gray-500 font-medium">{badge.description || 'Tidak ada deskripsi'}</p>
                  <p className="text-[8px] text-blue-400 uppercase tracking-widest mt-1">User ID: {badge.userId}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenBadgeModal(badge)} 
                  className="p-2 text-blue-500/70 hover:text-blue-500 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete('badges', badge.id!)} 
                  className="p-2 text-red-500/70 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
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
    openConfirm(
      'Hapus Semua Data',
      'PERINGATAN: Ini akan menghapus SEMUA data di koleksi ini secara permanen. Tindakan ini tidak dapat dibatalkan. Lanjutkan?',
      async () => {
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

          if (!collectionName || items.length === 0) {
            toast.error('Tidak ada data untuk dihapus');
            return;
          }

          for (const item of items) {
            await deleteDoc(doc(db, collectionName, item.id || item.uid));
          }
          toast.success(`Berhasil menghapus ${items.length} data dari ${collectionName}`);
        } catch (e) {
          console.error(e);
          toast.error('Gagal menghapus data.');
        } finally {
          setIsSeeding(false);
        }
      }
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 no-scrollbar">
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

        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
          <button onClick={() => setActiveTab('USERS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Users className="w-4 h-4" /> Anggota</button>
          <button onClick={() => setActiveTab('BADGES')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'BADGES' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Award className="w-4 h-4" /> Badge</button>
          <button onClick={() => setActiveTab('TASKS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'TASKS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><ClipboardList className="w-4 h-4" /> Tugas</button>
          <button onClick={() => setActiveTab('INVENTORY')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'INVENTORY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Wrench className="w-4 h-4" /> Inventaris</button>
          <button onClick={() => setActiveTab('MASS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'MASS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Calendar className="w-4 h-4" /> Agenda</button>
          <button onClick={() => setActiveTab('ATTENDANCE')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'ATTENDANCE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><CheckSquare className="w-4 h-4" /> Presensi</button>
          <button onClick={() => setActiveTab('REPORTS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'REPORTS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><FileBarChart className="w-4 h-4" /> Laporan</button>
          <button onClick={() => setActiveTab('NOTIFS')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === 'NOTIFS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#151b2b] text-gray-500 border border-gray-800'}`}><Bell className="w-4 h-4" /> Notif</button>
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

      {/* Badge Modal */}
      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-md rounded-3xl border border-gray-800 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Award className="text-blue-500" /> {editingBadge ? 'Edit Badge' : 'Tambah Badge Baru'}
              </h3>
              <button onClick={() => setIsBadgeModalOpen(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Cepat: Pilih Template</label>
                <select 
                  onChange={(e) => {
                    const templates: Record<string, { title: string, description: string, icon: string, color: string }> = {
                      'foto': { title: 'Fotografer Handal', description: 'Mengabadikan momen berharga dengan estetika tinggi.', icon: 'Camera', color: '#10b981' },
                      'video': { title: 'Videografer Kreatif', description: 'Merekam dan menyunting video berkualitas untuk umat.', icon: 'Video', color: '#ef4444' },
                      'editor': { title: 'Master Editor', description: 'Menyulap potongan klip menjadi karya seni visual yang memukau.', icon: 'PenTool', color: '#8b5cf6' },
                      'writer': { title: 'Penulis Inspiratif', description: 'Menyampaikan pesan iman melalui tulisan yang menyentuh hati.', icon: 'Book', color: '#f59e0b' },
                      'admin': { title: 'Admin Teladan', description: 'Menjaga keteraturan data dan komunikasi digital dengan rapi.', icon: 'Shield', color: '#3b82f6' },
                      'dev': { title: 'Digital Architect', description: 'Membangun sistem digital untuk kemudahan pelayanan gereja.', icon: 'Code', color: '#06b6d4' },
                      'design': { title: 'Visual Artist', description: 'Menciptakan desain kreatif yang memikat dan penuh makna.', icon: 'Sparkles', color: '#ec4899' },
                      'loyal': { title: 'Relawan Setia', description: 'Selalu hadir dan siap membantu di setiap tugas dengan tulus.', icon: 'Heart', color: '#f43f5e' },
                      'leader': { title: 'Leader Bijak', description: 'Mengarahkan tim dengan visi yang jelas dan penuh kasih.', icon: 'Crown', color: '#fbbf24' },
                      'sound': { title: 'Audio Specialist', description: 'Memastikan kualitas suara jernih dan nyaman didengar.', icon: 'Music', color: '#6366f1' }
                    };
                    const template = templates[e.target.value];
                    if (template) {
                      setBadgeForm({ ...badgeForm, ...template });
                    }
                  }}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400 focus:border-blue-500 outline-none"
                >
                  <option value="">-- Pilih Template Badge --</option>
                  <option value="foto">Fotografer</option>
                  <option value="video">Videografer</option>
                  <option value="editor">Editor</option>
                  <option value="writer">Penulis</option>
                  <option value="admin">Admin</option>
                  <option value="dev">Programmer</option>
                  <option value="design">Desainer</option>
                  <option value="loyal">Relawan Setia</option>
                  <option value="leader">Pemimpin Tim</option>
                  <option value="sound">Audio Specialist</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">User ID (UID)</label>
                <select 
                  value={badgeForm.userId || ''}
                  onChange={(e) => setBadgeForm({ ...badgeForm, userId: e.target.value })}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                >
                  <option value="">Pilih Anggota</option>
                  {usersDb.map(u => (
                    <option key={u.uid} value={u.uid}>{u.displayName} ({u.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Judul Badge</label>
                <input 
                  type="text"
                  value={badgeForm.title || ''}
                  onChange={(e) => setBadgeForm({ ...badgeForm, title: e.target.value })}
                  placeholder="Contoh: Fotografer Handal"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Deskripsi</label>
                <textarea 
                  value={badgeForm.description || ''}
                  onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                  placeholder="Berikan keterangan pencapaian..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none h-20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Pilih Ikon</label>
                  <div className="grid grid-cols-4 gap-2 bg-[#0a0f18] p-2 rounded-xl border border-gray-800 max-h-32 overflow-y-auto no-scrollbar">
                    {[
                      { id: 'Award', icon: Award },
                      { id: 'Trophy', icon: Trophy },
                      { id: 'Medal', icon: Medal },
                      { id: 'Crown', icon: Crown },
                      { id: 'Star', icon: Star },
                      { id: 'Zap', icon: Zap },
                      { id: 'Flame', icon: Flame },
                      { id: 'Target', icon: Target },
                      { id: 'Shield', icon: Shield },
                      { id: 'Heart', icon: Heart },
                      { id: 'Camera', icon: Camera },
                      { id: 'Music', icon: Music },
                      { id: 'Video', icon: Video },
                      { id: 'Book', icon: Book },
                      { id: 'Coffee', icon: Coffee },
                      { id: 'PenTool', icon: PenTool },
                      { id: 'Code', icon: Code },
                      { id: 'Activity', icon: Activity },
                      { id: 'Sparkles', icon: Sparkles },
                      { id: 'Bell', icon: Bell }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setBadgeForm({ ...badgeForm, icon: item.id })}
                        className={`p-2 rounded-lg flex items-center justify-center transition-all ${badgeForm.icon === item.id ? 'bg-blue-600/20 border border-blue-500 text-blue-400' : 'bg-[#151b2b] border border-transparent text-gray-500 hover:text-gray-300'}`}
                      >
                        <item.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Warna & Preview</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color"
                      value={badgeForm.color || '#3b82f6'}
                      onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })}
                      className="w-12 h-12 bg-[#0a0f18] border border-gray-800 rounded-xl p-1 cursor-pointer outline-none"
                    />
                    <div 
                      className="flex-1 h-12 rounded-xl flex items-center justify-center border border-gray-800 bg-[#0a0f18]"
                      style={{ color: badgeForm.color }}
                    >
                      {(() => {
                        const IconComponent = {
                          Award, Trophy, Medal, Crown, Star, Zap, Flame, Target, Shield, Heart, Camera, Music, Video, Book, Coffee, PenTool, Code, Activity, Sparkles, Bell
                        }[badgeForm.icon] || Award;
                        return <IconComponent className="w-6 h-6" />;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Status</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setBadgeForm({ ...badgeForm, status: 'earned' })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${badgeForm.status === 'earned' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                  >
                    Earned
                  </button>
                  <button 
                    onClick={() => setBadgeForm({ ...badgeForm, status: 'pending' })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${badgeForm.status === 'pending' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveBadge}
              disabled={isSaving}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Badge'}
            </button>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/90 backdrop-blur-md">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.isDanger ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {confirmModal.isDanger ? <Trash2 className="w-8 h-8" /> : <Database className="w-8 h-8" />}
              </div>
              <h3 className="text-lg font-extrabold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className={`flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-lg ${confirmModal.isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDataManagement;

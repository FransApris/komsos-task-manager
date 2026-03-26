import React, { useState } from 'react';
import { ChevronLeft, Plus, Calendar, Clock, MapPin, CheckCircle2, UserPlus, Trash2, Tag } from 'lucide-react';
import { Screen, Role, UserAccount, MassSchedule } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const MassScheduleScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: Role,
  usersDb?: UserAccount[],
  currentUser: UserAccount | null
}> = ({ onNavigate, role, usersDb = [], currentUser }) => {
  // Catatan: Nama koleksi di Firebase dan tipe datanya tetap massSchedules agar tidak merusak data lama, kita hanya ubah tampilannya (UI).
  const { massSchedules: schedules } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    type: 'Misa', // Tambahan tipe agenda
    date: '',
    time: '',
    location: 'Gereja St. Paulus Juanda',
  });

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  const handleAdd = async () => {
    if (!newSchedule.title || !newSchedule.date || !newSchedule.time) return;
    try {
      await addDoc(collection(db, 'massSchedules'), {
        ...newSchedule,
        status: 'OPEN',
        assignedUsers: [],
        createdBy: currentUser?.uid || 'system',
        createdAt: serverTimestamp()
      });
      toast.success('Agenda berhasil ditambahkan');
      setShowAddModal(false);
      setNewSchedule({ title: '', type: 'Misa', date: '', time: '', location: 'Gereja St. Paulus Juanda' });
    } catch (e) {
      console.error(e);
      toast.error('Gagal menambahkan agenda');
    }
  };

  const handleJoin = async (schedule: MassSchedule) => {
    if (!currentUser) return;
    if (schedule.assignedUsers?.includes(currentUser.uid)) return;
    
    const updatedUsers = [...(schedule.assignedUsers || []), currentUser.uid];
    try {
      await updateDoc(doc(db, 'massSchedules', schedule.id), {
        assignedUsers: updatedUsers
      });
      toast.success('Berhasil bergabung ke agenda');
    } catch (e) {
      console.error(e);
      toast.error('Gagal bergabung ke agenda');
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Hapus Agenda',
      'Apakah Anda yakin ingin menghapus agenda ini secara permanen?',
      async () => {
        try {
          await deleteDoc(doc(db, 'massSchedules', id));
          toast.success('Agenda berhasil dihapus');
        } catch (e) {
          console.error(e);
          toast.error('Gagal menghapus agenda');
        }
      }
    );
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Misa': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Rapat': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Pelatihan': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Liputan': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate(isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-400">Agenda Komsos</h1>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="ml-auto p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </header>

      <div className="p-5 space-y-4">
        {schedules.length > 0 ? schedules.map((s) => (
          <div key={s.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getTypeColor((s as any).type || 'Lainnya')}`}>
                    {(s as any).type || 'Agenda'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <div className="flex items-center gap-4 text-gray-400 text-xs">
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-blue-400" /> {s.date}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-400" /> {s.time}</span>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-gray-400 text-xs mb-6 bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" /> <span className="truncate">{s.location}</span>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-800">
              <div className="flex -space-x-2">
                {(s.assignedUsers || []).length > 0 ? (s.assignedUsers || []).map((uid, i) => {
                  const u = usersDb.find(user => user.uid === uid);
                  return (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-[#151b2b] bg-gray-800 overflow-hidden relative z-10">
                      <img src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${u?.img || '1'}`} className="w-full h-full object-cover" />
                    </div>
                  );
                }) : (
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Belum ada peserta</span>
                )}
              </div>
              
              <div className="flex gap-2 relative z-10">
                {!(s.assignedUsers || []).includes(currentUser?.uid || '') ? (
                  <button 
                    onClick={() => handleJoin(s)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Gabung
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hadir
                  </div>
                )}
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-20 bg-[#151b2b] rounded-3xl border border-gray-800 border-dashed">
            <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-20" />
            <p className="text-gray-500 font-medium">Belum ada agenda yang dibuat.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-[#151b2b] w-full max-w-md rounded-3xl border border-gray-800 p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6">Tambah Agenda Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nama Agenda</label>
                <input 
                  type="text" 
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors"
                  placeholder="Contoh: Rapat Pleno Komsos"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag size={12}/> Jenis Agenda</label>
                <select 
                  value={newSchedule.type}
                  onChange={(e) => setNewSchedule({...newSchedule, type: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors appearance-none"
                >
                  <option value="Misa">Misa / Liturgi</option>
                  <option value="Rapat">Rapat / Evaluasi</option>
                  <option value="Pelatihan">Pelatihan / Workshop</option>
                  <option value="Liputan">Liputan Khusus</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tanggal</label>
                  <input 
                    type="date" 
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Waktu</label>
                  <input 
                    type="time" 
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Lokasi</label>
                <input 
                  type="text" 
                  value={newSchedule.location}
                  onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl text-sm">Batal</button>
              <button onClick={handleAdd} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20">Simpan Agenda</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};

export default MassScheduleScreen;
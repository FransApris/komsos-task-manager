import React, { useState } from 'react';
import { Screen, Role, UserAccount, Task } from '../types';
import { Calendar as CalendarIcon, Clock, MapPin, Video, Users, CheckCircle2, ChevronLeft, ChevronRight, Filter, Plus, Edit2, Trash2, Image as ImageIcon, FileText, X, Save, Loader2 } from 'lucide-react';
import { db, doc, deleteDoc, updateDoc } from '../firebase';
import { getAvatarUrl } from '../lib/avatar';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const ScheduleScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role, 
  usersDb?: UserAccount[],
  tasksDb: Task[]
}> = ({ onNavigate, role, usersDb = [], tasksDb }) => {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [filter, setFilter] = useState('Semua');

  // State untuk Fitur Edit & Hapus
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: '', date: '', time: '', location: '', type: '' });

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

  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  // Menghasilkan tanggal untuk minggu ini
  const dates = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Senin

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    dates.push({
      day: dayNames[d.getDay()],
      date: d.getDate(),
      fullDate: d.toISOString().split('T')[0]
    });
  }

  const selectedFullDate = dates.find(d => d.date === selectedDate)?.fullDate ?? '';
  const filteredTasks = tasksDb.filter(task => {
    const dateMatch = task.date === selectedFullDate;
    const typeMatch = filter === 'Semua' || task.type === filter;
    return dateMatch && typeMatch;
  });

  const getIcon = (type: string) => {
    switch(type.toLowerCase()) {
      case 'peliputan': return <Video className="w-4 h-4" />;
      case 'dokumentasi': return <ImageIcon className="w-4 h-4" />;
      case 'publikasi': return <FileText className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getColor = (type: string) => {
    switch(type.toLowerCase()) {
      case 'peliputan': return 'blue';
      case 'dokumentasi': return 'emerald';
      case 'publikasi': return 'amber';
      default: return 'blue';
    }
  };

  // --- FUNGSI HAPUS TUGAS ---
  const handleDelete = async (id: string) => {
    openConfirm(
      'Hapus Jadwal',
      'Apakah Anda yakin ingin menghapus jadwal tugas ini? Tindakan ini tidak dapat dibatalkan.',
      async () => {
        setIsDeleting(true);
        try {
          await deleteDoc(doc(db, 'tasks', id));
          toast.success("Jadwal tugas berhasil dihapus");
        } catch (error) {
          console.error("Gagal menghapus tugas:", error);
          toast.error("Gagal menghapus tugas. Periksa koneksi Anda atau pastikan Anda adalah Admin.");
        } finally {
          setIsDeleting(false);
        }
      }
    );
  };

  // --- FUNGSI MULAI EDIT TUGAS ---
  const startEdit = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title || '',
      date: task.date || '',
      time: task.time || '',
      location: (task as any).location || 'Gereja Pusat',
      type: task.type || 'Peliputan'
    });
  };

  // --- FUNGSI SIMPAN PERUBAHAN EDIT ---
  const handleSaveEdit = async () => {
    if (!editingTask || !editForm.title.trim()) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'tasks', editingTask.id), {
        title: editForm.title.trim(),
        date: editForm.date,
        time: editForm.time,
        location: editForm.location.trim(),
        type: editForm.type
      });
      toast.success("Jadwal tugas berhasil diperbarui");
      setEditingTask(null); // Tutup modal setelah sukses
    } catch (error) {
      console.error("Gagal memperbarui tugas:", error);
      toast.error("Gagal memperbarui tugas.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-white">Jadwal Pelayanan</h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-widest">
            {today.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminRole && (
            <button 
              onClick={() => onNavigate('CREATE_TASK')}
              className="p-2 bg-blue-600 rounded-full border border-blue-500 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          )}
          <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
            <CalendarIcon className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </header>

      <div className="p-5">
        {/* Penggulir Tanggal */}
        <div className="flex items-center justify-between mb-6">
          <button className="p-1 text-gray-500 hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-2">
            {dates.map((d) => (
              <button 
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`flex flex-col items-center justify-center w-12 h-16 rounded-2xl border transition-all shrink-0 ${
                  selectedDate === d.date 
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-[#151b2b] border-gray-800 text-gray-400 hover:border-gray-700 hover:bg-gray-800/50'
                }`}
              >
                <span className="text-[10px] font-bold uppercase mb-1">{d.day}</span>
                <span className={`text-lg font-extrabold ${selectedDate === d.date ? 'text-white' : 'text-gray-200'}`}>{d.date}</span>
                {tasksDb.some(t => new Date(t.date).getDate() === d.date) && (
                  <span className={`w-1 h-1 rounded-full mt-1 ${selectedDate === d.date ? 'bg-white' : 'bg-blue-500'}`}></span>
                )}
              </button>
            ))}
          </div>
          <button className="p-1 text-gray-500 hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>

        {/* Filter Kategori */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          <div className="p-2 bg-gray-800 rounded-lg shrink-0">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
          {['Semua', 'Peliputan', 'Dokumentasi', 'Publikasi'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-white text-black shadow-md' 
                  : 'bg-[#151b2b] text-gray-400 border border-gray-800 hover:border-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Daftar Jadwal */}
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div key={task.id} className={`bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden relative shadow-sm`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-${getColor(task.type)}-500`}></div>
                <div className="p-5 pl-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider text-${getColor(task.type)}-400 mb-1 block`}>
                        {task.type}
                      </span>
                      <h3 className="font-bold text-base text-white">{task.title}</h3>
                    </div>
                    {task.status === 'COMPLETED' && (
                      <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Clock className="w-3.5 h-3.5" /> {task.time}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <MapPin className="w-3.5 h-3.5" /> {(task as any).location || "Gereja Pusat"}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between p-3 bg-[#0a0f18] rounded-xl border border-gray-800/50 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${getColor(task.type)}-500/10 text-${getColor(task.type)}-400`}>
                          {getIcon(task.type)}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tim Bertugas</p>
                          <p className="text-sm font-bold text-gray-200">{task.assignedUsers?.length || 0} Orang</p>
                        </div>
                      </div>
                    </div>
                    
                    {task.assignedUsers && task.assignedUsers.length > 0 && (
                      <div className="bg-[#0a0f18]/50 rounded-xl p-3 border border-gray-800/30">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Detail Penugasan</p>
                        <div className="space-y-2">
                          {task.assignedUsers.map((uid, idx) => {
                            const user = usersDb.find(u => u.uid === uid || u.id === uid);
                            return (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
                                    {user?.displayName.charAt(0) || 'U'}
                                  </div>
                                  <span className="text-xs font-medium text-gray-300">{user?.displayName || 'Anggota Tim'}</span>
                                </div>
                                <span className="text-[10px] text-gray-500 uppercase">{user?.role || 'USER'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {task.assignedUsers?.slice(0, 3).map((uid, i) => {
                        const user = usersDb.find(u => u.uid === uid || u.id === uid);
                        return (
                          <div key={i} className="w-7 h-7 rounded-full border-2 border-[#151b2b] bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white overflow-hidden shadow-sm">
                            <img 
                              src={getAvatarUrl(user)} 
                              alt="Avatar" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        );
                      })}
                      {task.assignedUsers && task.assignedUsers.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-[#151b2b] bg-gray-800 flex items-center justify-center shadow-sm">
                          <span className="text-[8px] font-bold text-gray-400">+{task.assignedUsers.length - 3}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {isAdminRole ? (
                        <>
                          <button 
                            onClick={() => startEdit(task)}
                            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors border border-gray-700 active:scale-95"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(task.id)}
                            disabled={isDeleting}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20 active:scale-95 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => onNavigate('TASK_DETAIL')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md active:scale-95"
                        >
                          Detail
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-[#151b2b] rounded-2xl border border-dashed border-gray-800">
              <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-500 opacity-50" />
              </div>
              <h3 className="text-gray-300 font-bold mb-1">Tidak ada jadwal</h3>
              <p className="text-xs text-gray-500 max-w-[200px]">
                {isAdminRole ? 'Tidak ada jadwal pelayanan pada tanggal ini.' : 'Anda tidak memiliki jadwal pelayanan pada tanggal ini.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL EDIT JADWAL --- */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-[#151b2b] w-full max-w-md rounded-3xl border border-gray-800 p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Edit Jadwal Tugas</h2>
              <button 
                onClick={() => setEditingTask(null)} 
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Judul Tugas</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Tanggal</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors scheme-dark"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Waktu</label>
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors scheme-dark"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Kategori (Jenis Tugas)</label>
                <select
                  value={editForm.type}
                  onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
                >
                  <option value="Peliputan">Peliputan</option>
                  <option value="Dokumentasi">Dokumentasi</option>
                  <option value="Publikasi">Publikasi</option>
                  <option value="Desain">Desain</option>
                  <option value="OBS">OBS</option>
                  <option value="Editing">Editing</option>
                  <option value="Tugas Lain">Tugas Lain</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Lokasi</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                  placeholder="Gereja Pusat"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditingTask(null)}
                className="flex-1 py-3.5 bg-gray-800 text-gray-300 font-bold rounded-xl text-sm hover:bg-gray-700 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editForm.title.trim()}
                className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
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

export default ScheduleScreen;
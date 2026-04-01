import React, { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Calendar, Clock, MapPin, CheckCircle2, UserPlus, Trash2, Edit2, Tag, FileText, Users, Activity, Video, Image as ImageIcon, X } from 'lucide-react';
import { Screen, Role, UserAccount, MassSchedule, Task, TaskType } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from '../firebase';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const MassScheduleScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: Role,
  usersDb?: UserAccount[],
  tasksDb?: Task[],
  taskTypes?: TaskType[],
  currentUser: UserAccount | null
}> = ({ onNavigate, role, usersDb = [], tasksDb = [], taskTypes = [], currentUser }) => {
  const { massSchedules: schedules } = useData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MassSchedule | null>(null);
  
  // STATE BARU: Menyimpan ID agenda yang sedang diedit
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newSchedule, setNewSchedule] = useState({
    title: '',
    type: 'Misa',
    date: '',
    time: '',
    location: 'Gereja St. Paulus Juanda',
  });

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

  const { upcomingSchedules, pastSchedules } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const upcoming: MassSchedule[] = [];
    const past: MassSchedule[] = [];
    
    schedules.forEach(s => {
      const scheduleDate = new Date(s.date);
      scheduleDate.setHours(0, 0, 0, 0);
      
      if (scheduleDate >= now) {
        upcoming.push(s);
      } else {
        past.push(s);
      }
    });
    
    // Sort upcoming by date ascending
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Sort past by date descending
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return { upcomingSchedules: upcoming, pastSchedules: past };
  }, [schedules]);

  // FUNGSI BARU: Menangani Simpan (Bisa untuk Tambah Baru atau Update Edit)
  const handleSave = async () => {
    if (!newSchedule.title || !newSchedule.date || !newSchedule.time) return;
    try {
      if (editingId) {
        // PROSES UPDATE/EDIT
        await updateDoc(doc(db, 'massSchedules', editingId), {
          title: newSchedule.title,
          type: newSchedule.type,
          date: newSchedule.date,
          time: newSchedule.time,
          location: newSchedule.location,
          updatedAt: serverTimestamp()
        });
        toast.success('Agenda berhasil diperbarui');
      } else {
        // PROSES TAMBAH BARU
        await addDoc(collection(db, 'massSchedules'), {
          ...newSchedule,
          status: 'OPEN',
          assignedUsers: [],
          createdBy: currentUser?.uid || 'system',
          createdAt: serverTimestamp()
        });
        toast.success('Agenda berhasil ditambahkan');
      }
      closeModal();
    } catch (e) {
      console.error(e);
      toast.error(editingId ? 'Gagal memperbarui agenda' : 'Gagal menambahkan agenda');
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
      toast.success('Berhasil bergabung ke panitia agenda');
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

  // FUNGSI BARU: Buka modal dalam mode Edit
  const openEditModal = (schedule: any) => {
    setEditingId(schedule.id);
    setNewSchedule({
      title: schedule.title || '',
      type: schedule.type || 'Misa',
      date: schedule.date || '',
      time: schedule.time || '',
      location: schedule.location || 'Gereja St. Paulus Juanda',
    });
    setShowAddModal(true);
  };

  // FUNGSI BARU: Tutup modal dan reset form
  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setNewSchedule({ title: '', type: 'Misa', date: '', time: '', location: 'Gereja St. Paulus Juanda' });
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

  const getTaskIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'peliputan' || t === 'obs' || t === 'editing') return <Video className="w-4 h-4 text-blue-500"/>;
    if (t === 'dokumentasi' || t === 'desain') return <ImageIcon className="w-4 h-4 text-emerald-500"/>;
    return <FileText className="w-4 h-4 text-amber-500"/>;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate(isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-400">Agenda Komsos</h1>
        {isAdmin && (
          <button onClick={() => { setEditingId(null); setShowAddModal(true); }} className="ml-auto p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </header>

      <div className="p-5 space-y-8">
        {/* AGENDA MENDATANG */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              Agenda Mendatang <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md text-[10px]">{upcomingSchedules.length}</span>
            </h2>
          </div>
          
          {upcomingSchedules.length > 0 ? upcomingSchedules.map((s) => {
            const relatedTasks = tasksDb.filter(t => (t as any).linkedScheduleId === s.id);
            const completedTasks = relatedTasks.filter(t => t.status === 'COMPLETED').length;

            return (
              <div key={s.id} className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 shadow-xl relative overflow-hidden group">
                {relatedTasks.length > 0 && relatedTasks.length === completedTasks && (
                  <div className="absolute -right-10 -top-10 opacity-5">
                    <CheckCircle2 size={120} className="text-emerald-500" />
                  </div>
                )}

                <div className="flex justify-between items-start mb-4 relative z-10">
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
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditModal(s)} className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit Agenda">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Hapus Agenda">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-gray-400 text-xs mb-6 bg-gray-800/50 p-2.5 rounded-lg border border-gray-800 relative z-10">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" /> <span className="truncate">{s.location}</span>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-gray-800 relative z-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {relatedTasks.length} Tugas Terkait
                      </span>
                    </div>
                    {relatedTasks.length > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${completedTasks === relatedTasks.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {completedTasks}/{relatedTasks.length} Selesai
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!(s.assignedUsers || []).includes(currentUser?.uid || '') ? (
                      <button 
                        onClick={() => handleJoin(s)}
                        className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl text-xs font-bold transition-all border border-gray-700 flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Hadir
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> Hadir
                      </div>
                    )}

                    <button 
                      onClick={() => setSelectedReport(s)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                      <FileText className="w-3.5 h-3.5" /> Laporan Event
                    </button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="text-center py-10 bg-[#151b2b] rounded-3xl border border-gray-800 border-dashed">
              <Calendar className="w-10 h-10 text-gray-700 mx-auto mb-3 opacity-20" />
              <p className="text-gray-500 text-sm">Belum ada agenda mendatang.</p>
            </div>
          )}
        </section>

        {/* RIWAYAT AGENDA */}
        {pastSchedules.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 bg-gray-600 rounded-full"></div>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                Riwayat Agenda <span className="bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-md text-[10px]">{pastSchedules.length}</span>
              </h2>
            </div>
            
            <div className="space-y-3 opacity-60">
              {pastSchedules.map((s) => {
                const relatedTasks = tasksDb.filter(t => (t as any).linkedScheduleId === s.id);
                const completedTasks = relatedTasks.filter(t => t.status === 'COMPLETED').length;

                return (
                  <div key={s.id} className="bg-[#151b2b]/50 p-4 rounded-xl border border-gray-800/50 flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 uppercase tracking-wider">
                          {(s as any).type || 'Agenda'}
                        </span>
                        <span className="text-[10px] text-gray-500">{s.date}</span>
                      </div>
                      <h3 className="text-sm font-bold text-gray-400 truncate">{s.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedReport(s)}
                        className="p-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
                        title="Lihat Laporan"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-600 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-[#151b2b] w-full max-w-md rounded-3xl border border-gray-800 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Edit Agenda' : 'Tambah Agenda Baru'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nama Agenda</label>
                <input 
                  type="text" 
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                  placeholder="Contoh: Rapat Pleno Komsos"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Tag size={12}/> Jenis Agenda</label>
                <select 
                  value={newSchedule.type}
                  onChange={(e) => setNewSchedule({...newSchedule, type: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
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
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Waktu</label>
                  <input 
                    type="time" 
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Lokasi</label>
                <input 
                  type="text" 
                  value={newSchedule.location}
                  onChange={(e) => setNewSchedule({...newSchedule, location: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl text-sm hover:bg-gray-700 transition-colors">Batal</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors">
                {editingId ? 'Simpan Perubahan' : 'Simpan Agenda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-[#151b2b] w-full max-w-md max-h-[85vh] rounded-3xl border border-gray-800 shadow-2xl flex flex-col">
            <div className="p-6 border-b border-gray-800 bg-gradient-to-b from-blue-600/10 to-transparent rounded-t-3xl">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getTypeColor((selectedReport as any).type || 'Lainnya')}`}>
                  Laporan {(selectedReport as any).type || 'Agenda'}
                </span>
                <button onClick={() => setSelectedReport(null)} className="p-1 bg-gray-800 rounded-full text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="text-xl font-black text-white mb-2 leading-tight">{selectedReport.title}</h2>
              <p className="text-xs text-gray-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {selectedReport.date} | {selectedReport.time}</p>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Rincian Tugas Tim Komsos
              </h3>
              
              <div className="space-y-3">
                {(() => {
                  const tasksForReport = tasksDb.filter(t => (t as any).linkedScheduleId === selectedReport.id);
                  
                  if (tasksForReport.length === 0) {
                    return (
                      <div className="text-center py-8 border border-gray-800 border-dashed rounded-xl bg-[#0a0f18]">
                        <p className="text-xs text-gray-500">Belum ada tugas yang ditautkan ke agenda ini.</p>
                      </div>
                    );
                  }

                  return tasksForReport.map((task) => (
                    <div key={task.id} className="bg-[#0a0f18] p-3.5 rounded-xl border border-gray-800">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-gray-800 rounded-lg">{getTaskIcon(task.type)}</div>
                          <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">{task.type}</p>
                            <p className="text-sm font-bold text-white leading-tight">{task.title}</p>
                          </div>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ${
                          task.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-500' : 
                          task.status === 'WAITING_VERIFICATION' ? 'bg-amber-500/20 text-amber-500' : 
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-800/50">
                        <Users className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {task.assignedUsers && task.assignedUsers.length > 0 ? (
                            task.assignedUsers.map(uid => {
                              const u = usersDb.find(user => user.uid === uid);
                              return (
                                <span key={uid} className="text-[10px] font-medium bg-gray-800 text-gray-300 px-2 py-0.5 rounded-md">
                                  {u?.displayName.split(' ')[0] || 'Petugas'}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] font-medium text-gray-500 italic">Belum ada petugas</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#0a0f18] rounded-b-3xl">
              <button onClick={() => setSelectedReport(null)} className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl text-sm hover:bg-gray-700 transition-colors">
                Tutup Laporan
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

export default MassScheduleScreen;
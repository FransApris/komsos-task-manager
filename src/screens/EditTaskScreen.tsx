import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Calendar, Clock, MapPin, Users, FileText, CheckCircle2, AlertCircle, X, Camera, Crown, Briefcase, Sparkles, Link, Save, Loader2 } from 'lucide-react';
import { Screen, UserAccount, Inventory, Task, TaskType } from '../types';
import { db, doc, updateDoc, serverTimestamp, arrayUnion } from '../firebase';
import { useData } from '../contexts/DataContext';
import { toast } from 'sonner';
import { getAvatarUrl } from '../lib/avatar';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const EditTaskScreen: React.FC<{ 
  onNavigate: (s: Screen) => void,
  currentUser: UserAccount | null,
  task: Task,
  usersDb?: UserAccount[],
  inventoryDb?: Inventory[]
}> = ({ onNavigate, currentUser, task, usersDb = [], inventoryDb = [] }) => {
  const { taskTypes, massSchedules } = useData();
  
  const [taskType, setTaskType] = useState(task.type || 'Peliputan');
  const [title, setTitle] = useState(task.title || '');
  const [date, setDate] = useState(task.date || '');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [location, setLocation] = useState(task.location || '');
  const [description, setDescription] = useState(task.description || '');
  const [assignedUsers, setAssignedUsers] = useState<string[]>(task.assignedUsers || []);
  const [teamLeaderId, setTeamLeaderId] = useState<string>(task.teamLeaderId || '');
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>(task.requiredEquipment || []);
  const [linkedScheduleId, setLinkedScheduleId] = useState<string>(task.linkedScheduleId || '');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // FILTER AGENDA: Hanya tampilkan agenda hari ini atau mendatang
  const filteredMassSchedules = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (massSchedules || []).filter((s: any) => {
      const scheduleDate = new Date(s.date);
      scheduleDate.setHours(0, 0, 0, 0);
      return scheduleDate >= now || s.id === task.linkedScheduleId;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [massSchedules, task.linkedScheduleId]);

  // Dirty flag — true jika ada field yang berbeda dari nilai awal task
  const isDirty = useMemo(() => {
    const [origStart, origEnd] = task.time
      ? task.time.split('-').map((p: string) => p.trim())
      : ['', ''];
    return (
      taskType !== (task.type || 'Peliputan') ||
      title !== (task.title || '') ||
      date !== (task.date || '') ||
      timeStart !== (origStart || '') ||
      timeEnd !== (origEnd || '') ||
      location !== (task.location || '') ||
      description !== (task.description || '') ||
      teamLeaderId !== (task.teamLeaderId || '') ||
      JSON.stringify([...assignedUsers].sort()) !== JSON.stringify([...(task.assignedUsers || [])].sort()) ||
      JSON.stringify([...requiredEquipment].sort()) !== JSON.stringify([...(task.requiredEquipment || [])].sort())
    );
  }, [taskType, title, date, timeStart, timeEnd, location, description, teamLeaderId, assignedUsers, requiredEquipment, task]);

  const handleGoBack = () => {
    if (isDirty) {
      setShowLeaveConfirm(true);
    } else {
      onNavigate('TASKS');
    }
  };

  // Parse time from task.time (e.g., "08:00 - 10:00")
  useEffect(() => {
    if (task.time) {
      const parts = task.time.split('-');
      if (parts.length >= 1) setTimeStart(parts[0].trim());
      if (parts.length >= 2) setTimeEnd(parts[1].trim());
    }
  }, [task.time]);

  const handleScheduleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setLinkedScheduleId(selectedId);

    if (selectedId) {
      const schedule = massSchedules?.find((s: any) => s.id === selectedId);
      if (schedule) {
        setTitle(schedule.title || '');
        setDate(schedule.date || '');
        setLocation(schedule.location || '');
        if (schedule.time) {
          const timeParts = schedule.time.split('-');
          if (timeParts.length >= 1) setTimeStart(timeParts[0].trim());
          if (timeParts.length >= 2) setTimeEnd(timeParts[1].trim());
        }
      }
    }
  };

  const recommendedUsers = useMemo(() => {
    return usersDb.filter(user => {
      if (user.role === 'SUPERADMIN') return false;
      if (!user.skills || user.skills.length === 0) return false;
      const searchStr = `${taskType} ${title} ${description}`.toLowerCase();
      let isMatch = false;
      const typeLower = taskType.toLowerCase();
      if (typeLower.includes('peliputan') && user.skills.some(s => ['Videografi', 'Audio / Soundman', 'Copywriting / Jurnalistik'].includes(s))) isMatch = true;
      if (typeLower.includes('dokumentasi') && user.skills.some(s => ['Fotografi', 'Videografi'].includes(s))) isMatch = true;
      if (typeLower.includes('publikasi') && user.skills.some(s => ['Copywriting / Jurnalistik', 'Desain Grafis', 'Web / IT Support'].includes(s))) isMatch = true;
      if (typeLower.includes('desain') && user.skills.includes('Desain Grafis')) isMatch = true;
      if (typeLower.includes('obs') && user.skills.some(s => ['OBS / Live Streaming', 'Audio / Soundman'].includes(s))) isMatch = true;
      if (typeLower.includes('editing') && user.skills.includes('Editing Video')) isMatch = true;
      if (!isMatch) isMatch = user.skills.some(skill => searchStr.includes(skill.toLowerCase()));
      return isMatch;
    });
  }, [usersDb, taskType, title, description]);

  const otherUsers = useMemo(() => {
    return usersDb.filter(user => user.role !== 'SUPERADMIN' && !recommendedUsers.find(ru => ru.uid === user.uid));
  }, [usersDb, recommendedUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !task.id) return;
    
    setIsSubmitting(true);
    const linkedScheduleTitle = linkedScheduleId 
      ? (massSchedules?.find((s: any) => s.id === linkedScheduleId)?.title || '') 
      : '';

    try {
      const historyEntry = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'SYSTEM',
        message: `Tugas diperbarui oleh ${currentUser.displayName}.`,
        userId: currentUser.uid,
        userName: currentUser.displayName,
        createdAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'tasks', task.id), {
        title,
        type: taskType,
        date,
        time: `${timeStart} - ${timeEnd}`,
        location,
        description,
        assignedUsers,
        teamLeaderId,
        requiredEquipment,
        linkedScheduleId,
        linkedScheduleTitle,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
        history: arrayUnion(historyEntry)
      });
      
      toast.success('Tugas berhasil diperbarui!');
      onNavigate('TASKS');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Gagal memperbarui tugas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUser = (uid: string) => {
    setAssignedUsers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleEquipment = (id: string) => {
    setRequiredEquipment(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 no-scrollbar">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={handleGoBack} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold">Edit Tugas</h1>
      </header>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* Basic Info */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Informasi Dasar</h2>
          </div>

          <div className="space-y-4 bg-[#151b2b] p-5 rounded-3xl border border-gray-800">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Jenis Tugas</label>
              <div className="grid grid-cols-2 gap-2">
                {taskTypes.map((type: TaskType) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setTaskType(type.name)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all ${taskType === type.name ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-[#0a0f18] border-gray-800 text-gray-500'}`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Hubungkan dengan Agenda (Opsional)</label>
              <div className="relative">
                <Link className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                <select
                  value={linkedScheduleId}
                  onChange={handleScheduleChange}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
                >
                  <option value="">-- Pilih Agenda --</option>
                  {filteredMassSchedules?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.date}) {s.id === task.linkedScheduleId && new Date(s.date).getTime() < new Date().setHours(0,0,0,0) ? '- Agenda Lampau' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Judul Tugas</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Peliputan Misa Minggu"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Waktu Mulai</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="time"
                    required
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Waktu Selesai</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="time"
                  required
                  value={timeEnd}
                  onChange={(e) => setTimeEnd(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Lokasi</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Gereja / Aula / Luar Kota"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Deskripsi Tugas</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail instruksi untuk tim..."
                className="w-full bg-[#0a0f18] border border-gray-800 rounded-2xl p-4 text-sm text-white focus:border-blue-500 outline-none transition-colors h-24 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Team Assignment */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Penugasan Tim</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowUserModal(true)}
              className="text-[10px] font-bold text-blue-400 uppercase tracking-widest"
            >
              Ubah Tim
            </button>
          </div>

          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 space-y-4">
            {assignedUsers.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-xs italic">Belum ada anggota yang dipilih.</div>
            ) : (
              <div className="space-y-3">
                {assignedUsers.map(uid => {
                  const user = usersDb.find(u => u.uid === uid || u.id === uid);
                  if (!user) return null;
                  return (
                    <div key={uid} className="flex items-center justify-between p-3 bg-[#0a0f18] rounded-2xl border border-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 overflow-hidden">
                          <img src={getAvatarUrl(user)} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{user.displayName}</p>
                          <p className="text-[10px] text-gray-500">{user.role}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTeamLeaderId(uid)}
                        className={`p-2 rounded-lg transition-all ${teamLeaderId === uid ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-600 hover:text-gray-400'}`}
                        title="Set as Team Leader"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Equipment */}
        <section className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Peralatan</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowEquipmentModal(true)}
              className="text-[10px] font-bold text-blue-400 uppercase tracking-widest"
            >
              Ubah Alat
            </button>
          </div>

          <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800">
            {requiredEquipment.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-xs italic">Belum ada alat yang dipilih.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {requiredEquipment.map(id => {
                  const item = inventoryDb.find(i => i.id === id);
                  if (!item) return null;
                  return (
                    <div key={id} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {item.name}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <button
          type="submit"
          disabled={isSubmitting || !title || !date || assignedUsers.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSubmitting ? 'Memperbarui...' : 'Simpan Perubahan'}
        </button>
      </form>

      {/* User Selection Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-800 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#151b2b] sticky top-0 z-10">
              <h3 className="text-lg font-extrabold text-white">Pilih Tim</h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
              {/* Recommended */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Rekomendasi Pintar
                </h4>
                {recommendedUsers.length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic">Tidak ada rekomendasi otomatis.</p>
                ) : (
                  <div className="space-y-2">
                    {recommendedUsers.map(user => (
                      <button
                        key={user.uid}
                        onClick={() => toggleUser(user.uid)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${assignedUsers.includes(user.uid) ? 'bg-blue-600/10 border-blue-500' : 'bg-[#0a0f18] border-gray-800'}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                          <img src={getAvatarUrl(user)} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-bold text-white">{user.displayName}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.skills?.slice(0, 2).map(s => (
                              <span key={s} className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">{s}</span>
                            ))}
                          </div>
                        </div>
                        {assignedUsers.includes(user.uid) && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Others */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Anggota Lainnya</h4>
                <div className="space-y-2">
                  {otherUsers.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => toggleUser(user.uid)}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${assignedUsers.includes(user.uid) ? 'bg-blue-600/10 border-blue-500' : 'bg-[#0a0f18] border-gray-800'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden">
                        <img src={getAvatarUrl(user)} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-bold text-white">{user.displayName}</p>
                        <p className="text-[10px] text-gray-500">{user.role}</p>
                      </div>
                      {assignedUsers.includes(user.uid) && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#151b2b] border-t border-gray-800">
              <button
                onClick={() => setShowUserModal(false)}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20"
              >
                Selesai ({assignedUsers.length} Terpilih)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Selection Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-800 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-[#151b2b] sticky top-0 z-10">
              <h3 className="text-lg font-extrabold text-white">Pilih Peralatan</h3>
              <button onClick={() => setShowEquipmentModal(false)} className="p-2 bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {inventoryDb.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs italic">Tidak ada data peralatan.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {inventoryDb.map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleEquipment(item.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${requiredEquipment.includes(item.id) ? 'bg-emerald-500/10 border-emerald-500' : 'bg-[#0a0f18] border-gray-800'}`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{item.category}</p>
                      </div>
                      {requiredEquipment.includes(item.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 bg-[#151b2b] border-t border-gray-800">
              <button
                onClick={() => setShowEquipmentModal(false)}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/20"
              >
                Selesai ({requiredEquipment.length} Terpilih)
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Tinggalkan Form?"
        message="Ada perubahan yang belum disimpan. Jika Anda keluar sekarang, semua perubahan akan hilang."
        confirmText="Ya, Keluar"
        cancelText="Lanjut Edit"
        isDanger={false}
        onConfirm={() => onNavigate('TASKS')}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>

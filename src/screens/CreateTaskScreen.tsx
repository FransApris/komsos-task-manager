import React, { useState, useMemo } from 'react';
import { ChevronLeft, Calendar, Clock, MapPin, Users, FileText, CheckCircle2, AlertCircle, X, Camera, Crown, Briefcase, Sparkles } from 'lucide-react';
import { Screen, UserAccount, Inventory, TaskType } from '../types';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { useData } from '../contexts/DataContext';

export const CreateTaskScreen: React.FC<{ 
  onNavigate: (s: Screen) => void,
  currentUser: UserAccount | null,
  usersDb?: UserAccount[],
  inventoryDb?: Inventory[]
}> = ({ onNavigate, currentUser, usersDb = [], inventoryDb = [] }) => {
  const { taskTypes } = useData();
  const [taskType, setTaskType] = useState(taskTypes[0]?.name || 'Peliputan');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [teamLeaderId, setTeamLeaderId] = useState<string>('');
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  // === LOGIKA SMART ASSIGNMENT (Rekomendasi Pintar) ===
  const recommendedUsers = useMemo(() => {
    return usersDb.filter(user => {
      // Abaikan Superadmin dari rekomendasi tugas teknis
      if (user.role === 'SUPERADMIN') return false;
      if (!user.skills || user.skills.length === 0) return false;
      
      const searchStr = `${taskType} ${title} ${description}`.toLowerCase();
      let isMatch = false;
      
      const typeLower = taskType.toLowerCase();
      // Cocokkan Jenis Tugas dengan Skill Baku
      if (typeLower.includes('peliputan') && user.skills.some(s => ['Videografi', 'Audio / Soundman', 'Copywriting / Jurnalistik'].includes(s))) isMatch = true;
      if (typeLower.includes('dokumentasi') && user.skills.some(s => ['Fotografi', 'Videografi'].includes(s))) isMatch = true;
      if (typeLower.includes('publikasi') && user.skills.some(s => ['Copywriting / Jurnalistik', 'Desain Grafis', 'Web / IT Support'].includes(s))) isMatch = true;
      if (typeLower.includes('desain') && user.skills.includes('Desain Grafis')) isMatch = true;
      if (typeLower.includes('obs') && user.skills.some(s => ['OBS / Live Streaming', 'Audio / Soundman'].includes(s))) isMatch = true;
      if (typeLower.includes('editing') && user.skills.includes('Editing Video')) isMatch = true;
      
      // Jika tidak cocok dari jenis tugas, cocokkan keyword judul/deskripsi dengan skill
      if (!isMatch) {
         isMatch = user.skills.some(skill => searchStr.includes(skill.toLowerCase()));
      }
      
      return isMatch;
    });
  }, [usersDb, taskType, title, description]);

  const otherUsers = useMemo(() => {
    return usersDb.filter(user => user.role !== 'SUPERADMIN' && !recommendedUsers.find(ru => ru.uid === user.uid));
  }, [usersDb, recommendedUsers]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'tasks'), {
        title,
        type: taskType,
        date,
        time: `${timeStart} - ${timeEnd}`,
        location,
        description,
        status: 'IN_PROGRESS',
        assignedUsers,
        teamLeaderId,
        requiredEquipment,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'notifications'), {
        userId: 'ALL', // Secara realitas, ini bisa di-map ke assignedUsers saja
        title: 'Tugas Baru Ditugaskan',
        message: `Tugas baru "${title}" telah dibuat oleh ${currentUser.displayName}.`,
        type: 'TASK',
        read: false,
        createdAt: serverTimestamp()
      });

      setIsSubmitting(false);
      setShowSuccess(true);
      
      setTimeout(() => {
        onNavigate('TASKS');
      }, 2000);
    } catch (error) {
      console.error("Error creating task:", error);
      setIsSubmitting(false);
      alert("Gagal membuat tugas. Silakan coba lagi.");
    }
  };

  const toggleUser = (uid: string) => {
    setAssignedUsers(prev => {
      const newUsers = prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid];
      if (!newUsers.includes(teamLeaderId)) {
        setTeamLeaderId('');
      }
      return newUsers;
    });
  };

  const toggleEquipment = (id: string) => {
    setRequiredEquipment(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] items-center justify-center p-6">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Tugas Berhasil Dibuat!</h2>
        <p className="text-gray-400 text-center mb-8">Tugas baru telah ditambahkan ke jadwal dan notifikasi telah dikirim ke tim.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('TASKS')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Buat Tugas Baru</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Task Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jenis Tugas</label>
            <div className="grid grid-cols-2 gap-2">
              {(taskTypes.length > 0 ? taskTypes.map(t => t.name) : ['Peliputan', 'Dokumentasi', 'Publikasi', 'Desain', 'OBS', 'Editing', 'Tugas Lain']).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTaskType(type)}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    taskType === type 
                      ? 'bg-blue-600 text-white border border-blue-500 shadow-lg shadow-blue-500/20' 
                      : 'bg-[#151b2b] text-gray-400 border border-gray-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="space-y-4 bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Judul Tugas</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Liputan Misa Syukur"
                className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tanggal</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Mulai</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="time" 
                    required
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl pl-9 pr-3 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Selesai</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="time" 
                    required
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl pl-9 pr-3 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Lokasi</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text" 
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Gereja Pusat, Aula, dll"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Team Assignment */}
          <div className="space-y-4 bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Penugasan Tim</label>
              <button 
                type="button" 
                onClick={() => setShowUserModal(true)}
                className="text-blue-400 text-xs font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" /> Pilih Petugas
              </button>
            </div>
            
            {assignedUsers.length > 0 ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {assignedUsers.map(uid => {
                    const user = usersDb.find(u => u.uid === uid);
                    const isLeader = teamLeaderId === uid;
                    return (
                      <div 
                        key={uid} 
                        onClick={() => setTeamLeaderId(uid)}
                        className={`border rounded-lg px-3 py-2 flex items-center gap-2 cursor-pointer transition-all ${
                          isLeader ? 'bg-blue-600/20 border-blue-500' : 'bg-[#0a0f18] border-gray-800'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isLeader ? 'bg-blue-500' : 'bg-gray-700'}`}>
                          {user?.displayName.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-300">{user?.displayName}</span>
                          {isLeader && <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">Ketua Tim</span>}
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUser(uid);
                          }} 
                          className="text-gray-500 hover:text-red-400 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                {assignedUsers.length > 0 && !teamLeaderId && (
                  <p className="text-[10px] text-amber-500 font-medium italic">* Klik salah satu anggota untuk menjadikannya Ketua Tim</p>
                )}
              </div>
            ) : (
              <div className="bg-[#0a0f18] border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                <Users className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-400">Belum ada anggota tim yang ditugaskan.</p>
                <p className="text-xs text-gray-500">Klik tombol pilih petugas untuk melihat rekomendasi.</p>
              </div>
            )}
          </div>

          {/* Equipment Selection */}
          <div className="space-y-4 bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Peralatan yang Dibutuhkan</label>
              <button 
                type="button" 
                onClick={() => setShowEquipmentModal(true)}
                className="text-blue-400 text-xs font-bold bg-blue-500/10 px-3 py-1.5 rounded-lg"
              >
                + Pilih Peralatan
              </button>
            </div>
            
            {requiredEquipment.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {requiredEquipment.map(id => {
                  const item = inventoryDb.find(i => i.id === id);
                  return (
                    <div key={id} className="bg-[#0a0f18] border border-gray-800 rounded-lg px-3 py-2 flex items-center gap-2">
                      <Camera className="w-3 h-3 text-gray-500" />
                      <span className="text-xs text-gray-300">{item?.name}</span>
                      <button type="button" onClick={() => toggleEquipment(id)} className="text-gray-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#0a0f18] border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                <Briefcase className="w-8 h-8 text-gray-600" />
                <p className="text-sm text-gray-400">Belum ada peralatan yang dipilih.</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-4 bg-[#151b2b] p-5 rounded-2xl border border-gray-800">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Deskripsi / Catatan Tambahan</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                <textarea 
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tuliskan detail tugas, peralatan yang dibutuhkan, atau catatan khusus..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all ${
              isSubmitting 
                ? 'bg-blue-800 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Menyimpan...
              </span>
            ) : (
              'Simpan & Publikasikan Tugas'
            )}
          </button>
        </form>
      </div>

      {/* User Selection Modal (Dengan Smart Assignment) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold text-white">Pilih Petugas</h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 bg-[#0a0f18] rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto space-y-4 flex-1 pr-2">
              
              {/* Bagian Rekomendasi Petugas */}
              {recommendedUsers.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> Rekomendasi (Sesuai Skill)
                  </h4>
                  <div className="space-y-2">
                    {recommendedUsers.map(user => (
                      <button
                        key={user.uid}
                        type="button"
                        onClick={() => toggleUser(user.uid)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          assignedUsers.includes(user.uid)
                            ? 'bg-blue-600/10 border-blue-500'
                            : 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                          assignedUsers.includes(user.uid) ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {user.displayName.charAt(0)}
                        </div>
                        <div className="text-left flex-1">
                          <p className={`text-sm font-bold line-clamp-1 ${assignedUsers.includes(user.uid) ? 'text-blue-400' : 'text-gray-200'}`}>
                            {user.displayName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-gray-500 uppercase tracking-wider">{user.role}</span>
                            {user.skills && user.skills.length > 0 && (
                              <span className="text-[8px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                {user.skills[0]}
                              </span>
                            )}
                          </div>
                        </div>
                        {assignedUsers.includes(user.uid) && (
                          <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bagian Anggota Lainnya */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2">
                  {recommendedUsers.length > 0 ? 'Anggota Lainnya' : 'Semua Anggota'}
                </h4>
                <div className="space-y-2">
                  {otherUsers.map(user => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => toggleUser(user.uid)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        assignedUsers.includes(user.uid)
                          ? 'bg-blue-600/10 border-blue-500'
                          : 'bg-[#0a0f18] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                        assignedUsers.includes(user.uid) ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {user.displayName.charAt(0)}
                      </div>
                      <div className="text-left flex-1">
                        <p className={`text-sm font-bold line-clamp-1 ${assignedUsers.includes(user.uid) ? 'text-blue-400' : 'text-gray-200'}`}>
                          {user.displayName}
                        </p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">{user.role}</p>
                      </div>
                      {assignedUsers.includes(user.uid) && (
                        <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <button 
              onClick={() => setShowUserModal(false)}
              className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
            >
              Selesai Memilih
            </button>
          </div>
        </div>
      )}
      
      {/* Equipment Selection Modal */}
      {showEquipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-extrabold text-white">Pilih Peralatan</h3>
              <button onClick={() => setShowEquipmentModal(false)} className="p-2 bg-[#0a0f18] rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto space-y-2 flex-1 pr-2">
              {inventoryDb.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleEquipment(item.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    requiredEquipment.includes(item.id)
                      ? 'bg-blue-600/10 border-blue-500'
                      : 'bg-[#0a0f18] border-gray-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    requiredEquipment.includes(item.id) ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                  }`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className={`text-sm font-bold ${requiredEquipment.includes(item.id) ? 'text-blue-400' : 'text-gray-200'}`}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{item.category}</p>
                  </div>
                  {requiredEquipment.includes(item.id) && (
                    <CheckCircle2 className="w-5 h-5 text-blue-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowEquipmentModal(false)}
              className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-xl"
            >
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateTaskScreen;
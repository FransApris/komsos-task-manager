import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, MoreVertical, Mic, Video, Edit3, CheckCircle2, Calendar, User, Trash2, X, Save, Loader2, PlayCircle } from 'lucide-react';
import { Screen, UserAccount, Role } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from '../firebase';

// Definisi Tipe Data Konten V-Cast
interface VCastContent {
  id: string;
  title: string;
  description: string;
  status: 'IDEA' | 'PRE_PROD' | 'RECORDING' | 'EDITING' | 'PUBLISHED';
  targetDate: string;
  pic: string; // Nama Penanggung Jawab
}

const COLUMNS = [
  { id: 'IDEA', title: '💡 Ide Konten', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 'PRE_PROD', title: '📝 Pra-Produksi', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'RECORDING', title: '🎥 Syuting / Taping', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { id: 'EDITING', title: '✂️ Proses Editing', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 'PUBLISHED', title: '✅ Siap Tayang', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' }
];

export const VCastManagerScreen: React.FC<{ 
  onNavigate: (s: Screen) => void,
  role?: Role,
  usersDb?: UserAccount[]
}> = ({ onNavigate, role, usersDb = [] }) => {
  const [contents, setContents] = useState<VCastContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState<VCastContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '', description: '', status: 'IDEA', targetDate: '', pic: ''
  });

  // Fetch Data Real-time
  useEffect(() => {
    const q = query(collection(db, 'vcast'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VCastContent));
      setContents(data);
      setIsLoading(false);
    }, (error) => {
      console.error("VCast Snapshot Error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setIsSaving(true);
    try {
      if ((formData as any).id) {
        // Mode Edit
        await updateDoc(doc(db, 'vcast', (formData as any).id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Mode Tambah Baru
        await addDoc(collection(db, 'vcast'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setShowAddModal(false);
      setFormData({ title: '', description: '', status: 'IDEA', targetDate: '', pic: '' });
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan konten.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'vcast', id), { status: newStatus, updatedAt: serverTimestamp() });
      setShowActionModal(null);
    } catch (error) {
      console.error(error);
      alert("Gagal memindahkan kartu.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus kartu konten ini secara permanen?")) return;
    try {
      await deleteDoc(doc(db, 'vcast', id));
      setShowActionModal(null);
    } catch (error) {
      console.error(error);
      alert("Gagal menghapus konten.");
    }
  };

  const openEdit = (content: VCastContent) => {
    setFormData(content);
    setShowActionModal(null);
    setShowAddModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-gray-500">
        <Loader2 className="animate-spin mb-2 w-8 h-8 text-blue-500" />
        <p className="text-xs font-bold uppercase tracking-widest">Memuat Papan Kanban...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] text-white h-screen">
      <header className="p-5 flex justify-between items-center bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50 shrink-0">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('ADMIN_DASHBOARD')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-200">V-CAST & KONTEN</h1>
          <p className="text-[9px] text-blue-400 font-bold tracking-wider">PAPAN KANBAN KOMSOS</p>
        </div>
        <button className="p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20" onClick={() => {
          setFormData({ title: '', description: '', status: 'IDEA', targetDate: '', pic: '' });
          setShowAddModal(true);
        }}>
          <Plus className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* KANBAN BOARD (Horizontal Scroll) */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 p-5 snap-x snap-mandatory hide-scrollbar">
        {COLUMNS.map(col => {
          const colItems = contents.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="w-[85vw] max-w-[300px] shrink-0 flex flex-col h-full snap-center">
              <div className={`px-4 py-3 rounded-t-2xl border-t border-x ${col.border} ${col.bg} flex justify-between items-center`}>
                <h2 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.title}</h2>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full bg-[#0a0f18] ${col.color}`}>{colItems.length}</span>
              </div>
              
              <div className={`flex-1 bg-[#151b2b] border-x border-b ${col.border} rounded-b-2xl p-3 overflow-y-auto space-y-3 pb-40`}>
                {colItems.length === 0 ? (
                  <div className="h-24 flex items-center justify-center border border-dashed border-gray-800 rounded-xl">
                    <p className="text-[10px] text-gray-600 font-medium">Kosong</p>
                  </div>
                ) : (
                  colItems.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => setShowActionModal(item)}
                      className="bg-[#0a0f18] p-4 rounded-xl border border-gray-800 shadow-lg cursor-pointer hover:border-blue-500/50 transition-colors group relative"
                    >
                      <button className="absolute top-3 right-3 text-gray-600 group-hover:text-blue-400">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      <h3 className="text-sm font-bold text-white pr-6 leading-tight mb-2">{item.title}</h3>
                      {item.description && <p className="text-[10px] text-gray-500 line-clamp-2 mb-3">{item.description}</p>}
                      
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-800">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                          <User className="w-3 h-3 text-blue-500" />
                          <span className="truncate max-w-[80px]">{item.pic || 'Belum diisi'}</span>
                        </div>
                        {item.targetDate && (
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                            <Calendar className="w-3 h-3" />
                            {item.targetDate}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL ACTION (Pindahkan Kartu) */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center p-0 sm:p-5">
          <div className="bg-[#151b2b] w-full max-w-[390px] rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-800 p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Aksi Kartu</h3>
                <p className="text-lg font-extrabold text-white leading-tight pr-4">{showActionModal.title}</p>
              </div>
              <button onClick={() => setShowActionModal(null)} className="p-2 bg-gray-800 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 mt-6">Pindahkan Ke Kolom:</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {COLUMNS.map(col => (
                <button
                  key={col.id}
                  disabled={showActionModal.status === col.id}
                  onClick={() => handleUpdateStatus(showActionModal.id, col.id)}
                  className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${
                    showActionModal.status === col.id 
                    ? `${col.bg} ${col.border} ${col.color} opacity-50 cursor-not-allowed`
                    : 'bg-[#0a0f18] border-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {showActionModal.status === col.id && <CheckCircle2 className="w-3 h-3" />}
                  {col.title.split(' ')[1]}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-800">
              <button onClick={() => handleDelete(showActionModal.id)} className="flex-1 py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
              <button onClick={() => openEdit(showActionModal)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 flex items-center justify-center gap-2">
                <Edit3 className="w-4 h-4" /> Edit Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT KONTEN */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <PlayCircle className="text-blue-500" /> {(formData as any).id ? 'Edit Konten' : 'Ide Konten Baru'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 bg-gray-800 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Judul Konten / Episode</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Contoh: V-Cast Eps 05 Bersama Romo"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Penanggung Jawab (PIC / Host)</label>
                <input 
                  type="text" 
                  value={formData.pic}
                  onChange={(e) => setFormData({...formData, pic: e.target.value})}
                  placeholder="Nama anggota"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Target Tayang</label>
                <input 
                  type="date" 
                  value={formData.targetDate}
                  onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Catatan / Konsep</label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief singkat tentang isi konten..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none resize-none"
                ></textarea>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving || !formData.title.trim()}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSaving ? 'Menyimpan...' : 'Simpan Konten'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VCastManagerScreen;
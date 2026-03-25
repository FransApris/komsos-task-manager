import React, { useState } from 'react';
import { ChevronLeft, Plus, Trash2, Edit2, Save, X, Type as TypeIcon, Palette } from 'lucide-react';
import { Screen, TaskType } from '../types';
import { db, doc, deleteDoc, collection, addDoc, updateDoc, serverTimestamp } from '../firebase';
import { useData } from '../contexts/DataContext';

export const TaskTypeManagement: React.FC<{ 
  onNavigate: (s: Screen) => void 
}> = ({ onNavigate }) => {
  const { taskTypes } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6'); // Default blue-500

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'taskTypes'), {
        name: name.trim(),
        description: description.trim(),
        color,
        createdAt: serverTimestamp()
      });
      resetForm();
    } catch (e) {
      console.error(e);
      alert('Gagal menambahkan jenis tugas.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'taskTypes', id), {
        name: name.trim(),
        description: description.trim(),
        color
      });
      resetForm();
    } catch (e) {
      console.error(e);
      alert('Gagal memperbarui jenis tugas.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus jenis tugas ini?')) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'taskTypes', id));
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus jenis tugas.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (type: TaskType) => {
    setName(type.name);
    setDescription(type.description || '');
    setColor(type.color || '#3b82f6');
    setEditingId(type.id);
    setIsAdding(false);
  };

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#64748b'
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('ADMIN_DATA_MANAGEMENT')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-400">Pengaturan Jenis Tugas</h1>
        {!isAdding && !editingId && (
          <button 
            onClick={() => setIsAdding(true)}
            className="ml-auto p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </header>

      <div className="p-5 space-y-6">
        {(isAdding || editingId) && (
          <div className="bg-[#151b2b] p-5 rounded-2xl border border-blue-500/30 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">
                {isAdding ? 'Tambah Jenis Tugas' : 'Edit Jenis Tugas'}
              </h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Nama Jenis Tugas</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Peliputan, OBS, Editing..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Deskripsi (Opsional)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Penjelasan singkat tentang jenis tugas ini..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Warna Label</label>
                <div className="flex flex-wrap gap-3 p-1">
                  {colors.map(c => (
                    <button 
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button 
                onClick={() => editingId ? handleUpdate(editingId) : handleAdd()}
                disabled={loading || !name.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Daftar Jenis Tugas ({taskTypes.length})</h2>
          
          {taskTypes.length === 0 ? (
            <div className="text-center py-12 bg-[#151b2b] rounded-2xl border border-dashed border-gray-800">
              <TypeIcon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-xs">Belum ada jenis tugas yang dikonfigurasi.</p>
            </div>
          ) : (
            taskTypes.map((type) => (
              <div key={type.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center group hover:border-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${type.color}20` }}>
                    <TypeIcon className="w-5 h-5" style={{ color: type.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{type.name}</h3>
                    {type.description && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{type.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => startEdit(type)}
                    className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(type.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-blue-600/5 border border-blue-500/20 p-4 rounded-2xl">
          <p className="text-[10px] text-blue-400 leading-relaxed">
            <strong>Info:</strong> Jenis tugas yang Anda buat di sini akan muncul sebagai pilihan saat Admin membuat atau memperbarui tugas multimedia.
          </p>
        </div>
      </div>
    </div>
  );
};
export default TaskTypeManagement;
import { useState } from 'react';
import { updateUserProfile } from '../services/userService';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface EditProps {
  user: any;
  onClose: () => void;
  onRefresh: () => void;
}

export default function EditProfileModal({ user, onClose, onRefresh }: EditProps) {
  const [displayName, setDisplayName] = useState(user.displayName || user.name || '');
  const [imgUrl, setImgUrl] = useState(user.img);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUserProfile(user.uid, { displayName, img: imgUrl });
      toast.success("Profil berhasil diperbarui!");
      onRefresh(); // Memperbarui tampilan di halaman utama
      onClose();
    } catch (err) {
      toast.error("Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">Edit Profil</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL Foto Profil</label>
            <input 
              type="text" 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={imgUrl}
              onChange={(e) => setImgUrl(e.target.value)}
              placeholder="https://link-foto.com/gambar.jpg"
            />
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
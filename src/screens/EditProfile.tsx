import React, { useState, useRef } from 'react';
import { ChevronLeft, Camera, Loader2, Save, User, Phone, FileText } from 'lucide-react';
import { Screen, UserAccount } from '../types';
import { db, doc, updateDoc, serverTimestamp } from '../firebase';
import { toast } from 'sonner';
import { getAvatarUrl } from '../lib/avatar';

interface EditProfileProps {
  onNavigate: (s: Screen) => void;
  user: UserAccount | null;
}

export const EditProfile: React.FC<EditProfileProps> = ({ onNavigate, user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  
  // State baru untuk menampilkan foto secara instan (Preview)
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_SIZE = 400;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Konversi ke Base64
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
          
          // 1. Tampilkan gambar secara instan di layar UI
          setPreviewImage(compressedBase64);
          
          // 2. Simpan ke database
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            photoURL: compressedBase64,
            updatedAt: serverTimestamp()
          });
          
          toast.success('Foto profil berhasil diperbarui!');
          setIsUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengunggah foto profil.');
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast.error('Nama lengkap tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Profil berhasil diperbarui!');
      onNavigate('PROFILE'); 
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Gagal memperbarui profil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('PROFILE')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800 hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Edit Profil</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        
        {/* Bagian Ganti Foto Profil */}
        <div className="flex flex-col items-center justify-center pt-4">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-800 bg-[#151b2b] shadow-xl relative">
              {isUploading ? (
                <div className="w-full h-full flex items-center justify-center bg-black/70">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <img 
                  // Gunakan gambar preview lokal JIKA ada, jika tidak gunakan data user
                  src={previewImage || getAvatarUrl(user)} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:opacity-60 transition-opacity"
                />
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-0 right-0 p-3 bg-blue-600 rounded-full border-4 border-[#0a0f18] text-white hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 active:scale-95"
            >
              <Camera className="w-4 h-4" />
            </button>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
            />
          </div>
          <p className="text-[10px] text-gray-500 font-bold mt-4 uppercase tracking-widest">Ketuk ikon kamera untuk mengubah foto</p>
        </div>

        {/* Bagian Form Data Diri */}
        <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 space-y-5 shadow-sm">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <User className="w-3.5 h-3.5" /> Nama Lengkap
            </label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Masukkan nama lengkap Anda..."
              className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <Phone className="w-3.5 h-3.5" /> Nomor HP / WhatsApp
            </label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contoh: 081234567890"
              className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <FileText className="w-3.5 h-3.5" /> Bio Singkat
            </label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tulis sedikit tentang peran Anda di Komsos..."
              className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition-all text-white placeholder-gray-600"
            ></textarea>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:grayscale active:scale-[0.98]"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
        
      </div>
    </div>
  );
};

export default EditProfile;
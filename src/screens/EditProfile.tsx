import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2, Save, User, Phone, FileText, Check, Plus, X, Trash2, Award, Briefcase, Calendar, Shield } from 'lucide-react';
import { Screen, UserAccount, Role, AvailabilityStatus, PortfolioLink } from '../types';
import { db, auth, doc, updateDoc, serverTimestamp } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { getAvatarUrl } from '../lib/avatar';

interface EditProfileProps {
  onNavigate: (s: Screen) => void;
  user: UserAccount | null;
}

const AVAILABLE_SKILLS = [
  'Fotografi', 
  'Videografi', 
  'Editing Video', 
  'Desain Grafis', 
  'Copywriting / Jurnalistik', 
  'OBS / Live Streaming', 
  'Audio / Soundman', 
  'Master of Ceremony (MC)',
  'Web / IT Support'
];

export const EditProfile: React.FC<EditProfileProps> = ({ onNavigate, user }) => {
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [role, setRole] = useState<Role>(user?.role || 'USER');
  const [availability, setAvailability] = useState<AvailabilityStatus>(user?.availability || 'AVAILABLE');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>(user?.gender || 'OTHER');
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>(user?.portfolioLinks || []);
  
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
      setBio(user.bio || '');
      setRole(user.role || 'USER');
      setAvailability(user.availability || 'AVAILABLE');
      setGender(user.gender || 'OTHER');
      setSkills(user.skills || []);
      setPortfolioLinks(user.portfolioLinks || []);
    }
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          const MAX_SIZE = 300;
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

          // Konversi ke Base64 (JPEG 0.4) - Lebih cepat dan hemat data
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
          
          setPreviewImage(compressedBase64);
          setIsUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Gagal memproses foto.');
      setIsUploading(false);
    }
  };

  const toggleSkill = (skillName: string) => {
    setSkills(prev => 
      prev.includes(skillName) 
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  const addPortfolioLink = () => {
    if (!newLinkPlatform || !newLinkUrl) return;
    // Security: only allow http/https URLs to prevent XSS via javascript: scheme
    if (!newLinkUrl.startsWith('https://') && !newLinkUrl.startsWith('http://')) {
      toast.error('URL harus diawali dengan https:// atau http://');
      return;
    }
    setPortfolioLinks(prev => [...prev, { platform: newLinkPlatform, url: newLinkUrl }]);
    setNewLinkPlatform('');
    setNewLinkUrl('');
  };

  const removePortfolioLink = (index: number) => {
    setPortfolioLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      toast.error('Nama lengkap tidak boleh kosong');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id || (user as any).uid);
      
      const updateData: any = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        role: role,
        availability: availability,
        gender: gender,
        skills: skills,
        portfolioLinks: portfolioLinks,
        updatedAt: serverTimestamp()
      };

      if (previewImage) {
        // Gunakan field 'img' agar sinkron dengan getAvatarUrl dan bagian lain aplikasi
        updateData.img = previewImage;
        
        // Update Auth Profile secara asinkron (tidak memblokir Firestore update)
        if (auth?.currentUser) {
          updateProfile(auth.currentUser, { 
            photoURL: previewImage.length < 2000 ? previewImage : 'data:image/jpeg;base64,PLACEHOLDER' 
          }).catch(e => console.log('Auth profile update warning:', e));
        }
      }

      await updateDoc(userRef, updateData);
      
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
                  src={previewImage || getAvatarUrl(user)} 
                  alt="Profile" 
                  className="w-full h-full object-cover group-hover:opacity-60 transition-opacity"
                  referrerPolicy="no-referrer"
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

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <Shield className="w-3.5 h-3.5" /> Peran Tim
            </label>
            {user?.role === 'SUPERADMIN' ? (
              <select 
                value={role || 'USER'} 
                onChange={(e) => setRole(e.target.value as Role)} 
                className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white appearance-none"
              >
                <option value="SUPERADMIN">Superadmin</option>
                <option value="ADMIN_MULTIMEDIA">Koord. Multimedia</option>
                <option value="ADMIN_PHOTO_VIDEO">Koord. Photo & Video</option>
                <option value="ADMIN_PUBLICATION">Koord. Publikasi</option>
                <option value="USER">Petugas</option>
              </select>
            ) : (
              <div className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-500">
                {user?.role || 'USER'}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <Calendar className="w-3.5 h-3.5" /> Status Ketersediaan
            </label>
            <select 
              value={availability} 
              onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)} 
              className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white appearance-none"
            >
              <option value="AVAILABLE">Tersedia (Available)</option>
              <option value="BUSY">Sibuk (Busy)</option>
              <option value="AWAY">Tidak di Tempat (Away)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <Award className="w-3.5 h-3.5" /> Keahlian & Kemampuan
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_SKILLS.map((skillName) => {
                const isSelected = skills.includes(skillName);
                return (
                  <button
                    key={skillName}
                    type="button"
                    onClick={() => toggleSkill(skillName)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all duration-200 border ${
                      isSelected 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                        : 'bg-[#0a0f18] border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-blue-500" />}
                    {skillName}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5 ml-1">
              <Briefcase className="w-3.5 h-3.5" /> Portofolio & Link Karya
            </label>
            <div className="space-y-3 mt-2">
              {portfolioLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-[#0a0f18] border border-gray-800 rounded-xl">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{link.platform}</p>
                    <p className="text-[10px] text-gray-500 truncate">{link.url}</p>
                  </div>
                  <button onClick={() => removePortfolioLink(idx)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={newLinkPlatform}
                  onChange={(e) => setNewLinkPlatform(e.target.value)}
                  className="bg-[#0a0f18] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="">Pilih Platform</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Google Drive">Google Drive</option>
                  <option value="Website/Blog">Website/Blog</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <input 
                  type="text"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="URL Link"
                  className="bg-[#0a0f18] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <button 
                onClick={addPortfolioLink}
                disabled={!newLinkPlatform || !newLinkUrl}
                className="w-full flex items-center justify-center gap-2 p-2 bg-blue-600/10 text-blue-500 text-[10px] font-bold rounded-xl border border-blue-500/20 hover:bg-blue-600/20 transition-colors disabled:opacity-50"
              >
                <Plus size={14} /> Tambah Link
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:grayscale active:scale-[0.98]"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
        
      </div>
    </div>
  );
};

export default EditProfile;
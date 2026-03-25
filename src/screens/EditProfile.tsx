import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Loader2, Plus, X, Check } from 'lucide-react';
import { Screen, UserAccount, Role, AvailabilityStatus, PortfolioLink } from '../types';
import { db, doc, updateDoc } from '../firebase';

// DAFTAR KEAHLIAN BAKU UNTUK KOMSOS
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

export const EditProfile: React.FC<{ 
  onNavigate: (s: Screen) => void,
  user?: UserAccount | null
}> = ({ onNavigate, user }) => {
  const [profileImage, setProfileImage] = useState(user?.img?.startsWith('http') || user?.img?.startsWith('blob:') || user?.img?.startsWith('data:') ? user.img : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${user?.img || '1'}`);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState<Role>(user?.role || 'USER');
  const [availability, setAvailability] = useState<AvailabilityStatus>(user?.availability || 'AVAILABLE');
  
  // STATE UNTUK SKILL
  const [skills, setSkills] = useState<string[]>(user?.skills || []);
  
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>(user?.portfolioLinks || []);
  const [newLinkPlatform, setNewLinkPlatform] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setAvailability(user.availability || 'AVAILABLE');
      setSkills(user.skills || []);
      setProfileImage(user.img?.startsWith('http') || user?.img?.startsWith('blob:') || user?.img?.startsWith('data:') ? user.img : `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80&v=${user.img || '1'}`);
    }
  }, [user]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleSkill = (skillName: string) => {
    setSkills(prev => 
      prev.includes(skillName) 
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  // --- FUNGSI SIMPAN KE FIREBASE ---
  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userId = user.id || user.uid;
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        name: name.trim(),
        email: email.trim(),
        role: role,
        img: profileImage,
        availability: availability,
        skills: skills,
        portfolioLinks: portfolioLinks
      });

      alert("Profil berhasil diperbarui!");
      
      // Memaksa browser memuat ulang halaman ke Profil 
      // agar data terbaru langsung ditarik dari Firebase dan menyebar ke seluruh aplikasi
      window.location.href = '/profile';
      
    } catch (error: any) {
      console.error("Gagal menyimpan profil:", error);
      if (error.code === 'permission-denied') {
        alert("Gagal menyimpan: Anda tidak memiliki izin (Permission Denied). Silakan cek Rules Firestore Anda atau pastikan Anda sudah Login.");
      } else {
        alert("Terjadi kesalahan saat menyimpan profil. Periksa koneksi internet Anda.");
      }
      setIsLoading(false);
    } 
  };

  const addPortfolioLink = () => {
    if (!newLinkPlatform || !newLinkUrl) return;
    setPortfolioLinks(prev => [...prev, { platform: newLinkPlatform, url: newLinkUrl }]);
    setNewLinkPlatform('');
    setNewLinkUrl('');
  };

  const removePortfolioLink = (index: number) => {
    setPortfolioLinks(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('PROFILE')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Edit Profil</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative cursor-pointer group" onClick={handleImageClick}>
            <div className="w-24 h-24 rounded-full bg-gray-800 overflow-hidden ring-4 ring-blue-500/20 mb-2 transition-all group-hover:ring-blue-500/50">
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
            <button className="absolute bottom-2 right-0 p-2 bg-blue-600 rounded-full border-2 border-[#0a0f18] group-hover:bg-blue-500 transition-colors shadow-lg">
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Ketuk gambar untuk mengubah</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-white" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-white" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Peran Tim {user?.role !== 'SUPERADMIN' && <span className="text-gray-600 text-[10px] ml-1 normal-case font-medium">(Hanya dapat diubah oleh Superadmin)</span>}
            </label>
            {user?.role === 'SUPERADMIN' ? (
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value as Role)} 
                className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-white appearance-none"
              >
                <option value="SUPERADMIN">Superadmin</option>
                <option value="ADMIN_MULTIMEDIA">Koord. Multimedia</option>
                <option value="ADMIN_PHOTO_VIDEO">Koord. Photo & Video</option>
                <option value="ADMIN_PUBLICATION">Koord. Publikasi</option>
                <option value="USER">Petugas</option>
              </select>
            ) : (
              <input type="text" value={user?.role || 'USER'} disabled className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-gray-500 cursor-not-allowed" />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status Ketersediaan</label>
            <select 
              value={availability} 
              onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)} 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-white appearance-none"
            >
              <option value="AVAILABLE">Tersedia (Available)</option>
              <option value="BUSY">Sibuk (Busy)</option>
              <option value="AWAY">Tidak di Tempat (Away)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Keahlian & Kemampuan</label>
              <span className="text-[10px] text-blue-400 font-bold">{skills.length} Dipilih</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-3">Pilih keahlian yang Anda kuasai untuk memudahkan pembagian tugas tim.</p>
            
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SKILLS.map((skillName) => {
                const isSelected = skills.includes(skillName);
                return (
                  <button
                    key={skillName}
                    type="button"
                    onClick={() => toggleSkill(skillName)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                      isSelected 
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]' 
                        : 'bg-[#151b2b] border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
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
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">Portofolio & Link Karya</label>
            <div className="space-y-3">
              {portfolioLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-gray-800/30 border border-gray-800 rounded-xl">
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
                  className="bg-[#151b2b] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
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
                  className="bg-[#151b2b] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <button 
                onClick={addPortfolioLink}
                disabled={!newLinkPlatform || !newLinkUrl}
                className="w-full flex items-center justify-center gap-2 p-2 bg-blue-600/10 text-blue-500 text-xs font-bold rounded-xl border border-blue-500/20 hover:bg-blue-600/20 transition-colors disabled:opacity-50"
              >
                <Plus size={14} /> Tambah Link
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 z-20">
        <button 
          onClick={handleSave}
          disabled={isLoading || !name.trim()}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Menyimpan...</>
          ) : (
            'Simpan Perubahan'
          )}
        </button>
      </div>
    </div>
  );
};

export default EditProfile;
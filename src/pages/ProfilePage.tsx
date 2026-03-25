import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { getUserData } from '../services/userService';
import { User, Mail, Shield, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const data = await getUserData(user.uid);
        setProfile(data);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Memuat profil...</div>;
  if (!profile) return <div className="p-10 text-center text-red-500">Silakan login terlebih dahulu.</div>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
      <div className="flex flex-col items-center">
        {/* Foto Profil dari img URL */}
        <img 
          src={profile.img || "https://via.placeholder.com/150"} 
          alt="Avatar" 
          className="w-24 h-24 rounded-full border-4 border-blue-500 mb-4 object-cover"
        />
        
        <h1 className="text-2xl font-bold text-slate-800">{profile.name}</h1>
        <p className="text-slate-500 flex items-center gap-2 mb-6">
          <Mail size={16} /> {profile.email}
        </p>

        <div className="w-full space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="text-blue-600" size={20} />
              <span className="text-slate-700 font-medium">Role Sistem</span>
            </div>
            {/* Role yang menentukan akses Admin */}
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              profile.role.startsWith('ADMIN') || profile.role === 'SUPERADMIN' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-blue-100 text-blue-700'
            }`}>
              {profile.role}
            </span>
          </div>
        </div>

        <button 
          onClick={() => auth.signOut()}
          className="mt-8 flex items-center gap-2 text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          <LogOut size={20} /> Keluar dari Aplikasi
        </button>
      </div>
    </div>
  );
}
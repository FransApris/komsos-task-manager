import React, { useState } from 'react';
import { Loader2, Chrome, ShieldCheck } from 'lucide-react';
import { auth, googleProvider, signInWithPopup } from '../firebase';
import { UserAccount, Role, Screen } from '../types';

interface LoginScreenProps {
  onLogin?: (name: string) => void;
  onDemoLogin?: (user: UserAccount) => void;
  onNavigate: (screen: Screen) => void;
  usersDb: UserAccount[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onDemoLogin, onNavigate, usersDb }) => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. HANDLE GOOGLE LOGIN (SATU-SATUNYA CARA LOGIN) ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Langsung panggil popup, sinkronisasi & pendaftaran otomatis diurus oleh App.tsx
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Jendela login ditutup. Silakan coba lagi.');
      } else {
        setError('Gagal masuk dengan Google: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. HANDLE DEMO LOGIN (JIKA TIDAK ADA INTERNET) ---
  const handleBypassDemo = () => {
    if (!onDemoLogin) return;
    const demoUser: UserAccount = {
      id: `demo_admin`,
      uid: `demo_admin`,
      displayName: 'Admin (Demo)',
      email: `admin@demo.komsos.com`,
      role: 'SUPERADMIN',
      img: '12',
      createdAt: new Date().toISOString() as any
    };
    onDemoLogin(demoUser);
  };

  const getRoleLabel = (r?: Role) => {
    if (r === 'SUPERADMIN') return 'Superadmin';
    if (r?.startsWith('ADMIN_')) return 'Koordinator';
    return 'Petugas';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] p-6 relative overflow-y-auto">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none"></div>

      {/* Header & Logo */}
      <div className="mt-20 mb-12 text-center relative z-10">
        <div className="inline-flex p-6 bg-blue-600/10 border border-blue-500/20 rounded-[2rem] mb-8 shadow-2xl shadow-blue-500/10">
          <ShieldCheck className="w-16 h-16 text-blue-500" />
        </div>
        <h1 className="text-4xl font-black mb-3 tracking-tight text-white">KOMSOS TASK</h1>
        <p className="text-gray-400 text-sm font-medium px-4 leading-relaxed">
          Sistem Manajemen Tugas KOMSOS <br /> St. Paulus Juanda
        </p>
      </div>
      
      {/* Login Area */}
      <div className="space-y-6 relative z-10 max-w-sm mx-auto w-full">
        {error && (
          <div className="text-red-400 text-xs font-bold bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-center animate-shake">
            {error}
          </div>
        )}
        
        {/* Tombol Login Utama */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={isLoading}
          className="w-full flex justify-center items-center bg-white text-gray-900 font-extrabold rounded-2xl py-5 hover:bg-gray-100 transition-all active:scale-95 gap-3 shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin text-blue-600" /> : (
            <>
              <Chrome className="w-6 h-6 text-blue-600" />
              Masuk dengan Google
            </>
          )}
        </button>

        {/* Pemisah */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-800"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-[#0a0f18] px-4 text-gray-500">Atau</span></div>
        </div>

        {/* Tombol Daftar Anggota Baru */}
        <button 
          onClick={() => onNavigate('REGISTER')}
          className="w-full flex justify-center items-center bg-emerald-600/10 text-emerald-500 font-bold rounded-2xl py-4 hover:bg-emerald-600/20 transition-all border border-emerald-500/20 active:scale-95 gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          DAFTAR ANGGOTA BARU
        </button>

        {error && error.includes('jaringan') && (
          <button 
            onClick={handleBypassDemo}
            className="w-full flex justify-center items-center gap-2 bg-emerald-500/10 text-emerald-500 font-bold rounded-2xl py-4 border border-emerald-500/20 text-xs mt-4"
          >
            Gunakan Mode Demo (Tanpa Internet)
          </button>
        )}

        {/* Footer Info Anggota */}
        <div className="mt-8 p-5 bg-[#151b2b] rounded-3xl border border-gray-800 shadow-xl">
          <p className="font-black text-[10px] text-blue-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            Anggota Terdaftar
          </p>
          <div className="space-y-3">
            {usersDb.length > 0 ? usersDb.slice(0, 3).map((u) => (
              <div key={u.id} className="flex justify-between items-center text-[11px] pb-2 border-b border-gray-800/50 last:border-0 last:pb-0">
                <span className="text-gray-300 font-bold flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gray-800 overflow-hidden">
                    <img src={u.img?.startsWith('http') ? u.img : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80&v=${u.img}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  {u.displayName || 'Tanpa Nama'}
                </span>
                <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest">{getRoleLabel(u.role)}</span>
              </div>
            )) : <p className="text-gray-600 text-[10px] italic">Memuat data tim...</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
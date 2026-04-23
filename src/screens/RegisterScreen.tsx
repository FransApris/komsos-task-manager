import React, { useState } from 'react';
import { 
  Loader2, ArrowLeft, Mail, User as UserIcon, 
  ShieldCheck 
} from 'lucide-react';
import { 
  auth, db, 
  doc, setDoc, serverTimestamp 
} from '../firebase';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Screen } from '../types';

interface RegisterScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigate }) => {
  const [name, setName] = useState(auth.currentUser?.displayName || '');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async () => {
    if (!auth.currentUser) {
      return setError('Sesi login tidak ditemukan. Silakan kembali ke halaman Login.');
    }
    if (!name.trim()) return setError('Nama lengkap wajib diisi');
    if (!email.trim()) return setError('Email wajib diisi');

    setIsLoading(true);
    setError('');

    try {
      const user = auth.currentUser;

      // Simpan Data Profil ke Database
      const newUser = {
        uid: user.uid,
        displayName: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'USER',
        status: 'PENDING',
        img: '1',
        gender: gender,
        points: 0,
        level: 1,
        completedTasksCount: 0,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), newUser);

      setIsSuccess(true);
      toast.success("Pendaftaran berhasil! Menunggu verifikasi admin.");
    } catch (err: any) {
      console.error("Registration error details:", err);
      setError('Gagal mendaftar: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] p-8 text-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
        >
          <ShieldCheck className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-3">PENDAFTARAN BERHASIL!</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Akun Anda telah berhasil dibuat dan sedang menunggu verifikasi dari <strong>Superadmin atau Koordinator Komsos</strong>. 
          Anda akan dapat masuk setelah akun Anda diaktifkan.
        </p>
        <button 
          onClick={() => {
            auth.signOut();
            onNavigate('LOGIN');
          }}
          className="w-full bg-blue-600 text-white font-black rounded-2xl py-4 shadow-lg shadow-blue-500/20 active:scale-95"
        >
          KEMBALI KE LOGIN
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] p-6 relative overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-80 bg-linear-to-b from-blue-600/20 to-transparent pointer-events-none"></div>
      
      <button onClick={() => onNavigate('LOGIN')} className="absolute top-6 left-6 z-20 p-2 bg-gray-800/50 rounded-xl border border-gray-700 text-gray-300">
        <ArrowLeft size={20} />
      </button>

      <div className="mt-12 mb-10 text-center relative z-10">
        <div className="inline-flex p-4 bg-blue-600/10 border border-blue-500/20 rounded-3xl mb-6 shadow-2xl shadow-blue-500/10">
          <ShieldCheck className="w-12 h-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight text-white">DAFTAR AKUN</h1>
        <p className="text-gray-400 text-sm font-medium px-4">
          Silakan lengkapi data diri Anda untuk bergabung dengan KOMSOS Juanda.
        </p>
      </div>
      
      <div className="space-y-4 relative z-10">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Yohanes Bosco" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-4 focus:border-blue-500 transition-all text-sm text-white" 
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-4 focus:border-blue-500 transition-all text-sm text-white" 
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Jenis Kelamin</label>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setGender('MALE')}
              className={`flex-1 py-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${gender === 'MALE' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#151b2b] border-gray-800 text-gray-500'}`}
            >
              Laki-laki
            </button>
            <button 
              type="button"
              onClick={() => setGender('FEMALE')}
              className={`flex-1 py-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-2 ${gender === 'FEMALE' ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-[#151b2b] border-gray-800 text-gray-500'}`}
            >
              Perempuan
            </button>
          </div>
        </div>
        
        {error && <div className="text-red-400 text-[11px] font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}
        
        <div className="pt-4">
          <button 
            onClick={handleRegister} 
            disabled={isLoading}
            className="w-full flex justify-center items-center bg-blue-600 text-white font-black rounded-2xl py-4 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'DAFTAR SEKARANG'}
          </button>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">
          Sudah punya akun? <button onClick={() => onNavigate('LOGIN')} className="text-blue-500 font-bold">Masuk di sini</button>
        </p>
      </div>
    </div>
  );
};
export default RegisterScreen;
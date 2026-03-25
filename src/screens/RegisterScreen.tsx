import React, { useState } from 'react';
import { 
  Loader2, ArrowLeft, Mail, User as UserIcon, 
  Lock, ShieldCheck, Eye, EyeOff 
} from 'lucide-react';
import { 
  auth, db, createUserWithEmailAndPassword, 
  doc, setDoc, serverTimestamp 
} from '../firebase';
import { motion } from 'motion/react';
import { toast } from 'sonner';

import { Screen } from '../types';

interface RegisterScreenProps {
  onNavigate: (screen: Screen) => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async () => {
    if (!name.trim()) return setError('Nama lengkap wajib diisi');
    if (!email.trim()) return setError('Email wajib diisi');
    if (!password) return setError('Kata sandi wajib diisi');
    if (password.length < 6) return setError('Kata sandi minimal 6 karakter');
    if (password !== confirmPassword) return setError('Konfirmasi kata sandi tidak cocok');

    setIsLoading(true);
    setError('');

    try {
      console.log("Attempting to create user with email:", email.trim());
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      console.log("Auth user created:", user.uid);

      // Create pending user document
      console.log("Creating Firestore document for user:", user.uid);
      const newUser = {
        uid: user.uid,
        displayName: name.trim(),
        email: email.trim(),
        role: 'USER',
        status: 'PENDING',
        img: '1',
        points: 0,
        level: 1,
        completedTasksCount: 0,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), newUser);
      console.log("Firestore document created successfully");

      setIsSuccess(true);
      toast.success("Pendaftaran berhasil! Menunggu verifikasi admin.");
    } catch (err: any) {
      console.error("Registration error details:", {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      
      if (err.code === 'auth/network-request-failed') {
        setError('Koneksi gagal. Periksa internet Anda atau pastikan tidak ada firewall/ad-blocker yang memblokir Google Services.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email sudah terdaftar. Silakan gunakan email lain.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else if (err.code === 'permission-denied') {
        setError('Gagal menyimpan data: Izin ditolak oleh server. Pastikan data valid.');
      } else {
        setError('Gagal mendaftar: ' + err.message);
      }
      
      const toastMsg = err.code === 'auth/network-request-failed' 
        ? "Koneksi gagal. Periksa internet Anda."
        : "Pendaftaran gagal: " + err.message;
      toast.error(toastMsg);
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
          Akun Anda telah berhasil dibuat dan sedang menunggu verifikasi dari Superadmin. 
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
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none"></div>
      
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
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kata Sandi</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-12 py-4 focus:border-blue-500 transition-all text-sm text-white" 
            />
            <button 
              type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Konfirmasi Kata Sandi</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-4 focus:border-blue-500 transition-all text-sm text-white" 
            />
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

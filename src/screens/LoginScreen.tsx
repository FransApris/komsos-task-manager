import React, { useState } from 'react';
import { 
  Settings2, Loader2, ArrowLeft, Mail, Chrome, 
  Eye, EyeOff, ShieldCheck, User as UserIcon 
} from 'lucide-react';
import { 
  auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
  doc, setDoc, serverTimestamp, sendPasswordResetEmail, 
  googleProvider, signInWithPopup, collection, query, 
  where, getDocs, deleteDoc 
} from '../firebase';
import { UserAccount, Role } from '../types';

interface LoginScreenProps {
  onLogin?: (name: string) => void;
  onDemoLogin?: (user: UserAccount) => void;
  usersDb: UserAccount[];
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onDemoLogin, usersDb }) => {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. HANDLE DEMO LOGIN (BYPASS) ---
  const handleBypassDemo = () => {
    if (!onDemoLogin) return;
    
    const lowerName = name.trim().toLowerCase() || 'yohanes';
    let role: Role = 'USER';
    let img = '1';
    let displayName = name.trim() || 'Yohanes (Demo)';
    
    if (lowerName === 'yohanes') { role = 'SUPERADMIN'; img = '12'; displayName = 'Yohanes'; }
    else if (lowerName === 'maria') { role = 'ADMIN_MULTIMEDIA'; img = '5'; displayName = 'Maria'; }
    else if (lowerName === 'petrus') { role = 'ADMIN_PHOTO_VIDEO'; img = '8'; displayName = 'Petrus'; }
    else if (lowerName === 'stefanus') { role = 'ADMIN_PUBLICATION'; img = '11'; displayName = 'Stefanus'; }
    else if (lowerName === 'lukas') { role = 'USER'; img = '2'; displayName = 'Lukas'; }

    const demoUser: UserAccount = {
      id: `demo_${lowerName}`,
      uid: `demo_${lowerName}`,
      name: displayName,
      email: `${lowerName}@demo.komsos.com`,
      role: role,
      img: img,
      createdAt: new Date().toISOString() as any
    };

    onDemoLogin(demoUser);
  };

  // --- 2. HANDLE GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Langsung panggil popup, sinkronisasi diurus oleh App.tsx via syncUserAccount
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

  // --- 3. HANDLE EMAIL LOGIN & AUTO-REGISTER ---
  const handleLoginSubmit = async () => {
    if (!name.trim()) return setError('Nama pengguna wajib diisi');
    if (!password) return setError('Kata sandi wajib diisi');

    setIsLoading(true);
    setError('');

    // Format email internal: nama@komsos.com
    const userEmail = `${name.trim().toLowerCase().replace(/\s+/g, '')}@komsos.com`;
    
    try {
      await signInWithEmailAndPassword(auth, userEmail, password);
    } catch (err: any) {
      console.log("Auth Code:", err.code);
      
      // Jika user belum ada, coba daftarkan otomatis (Fitur khusus Komsos Juanda)
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, userEmail, password);
          const newUser = userCredential.user;

          // Cek apakah ada data pre-assigned oleh Admin
          const q = query(collection(db, 'users'), where('email', '==', userEmail));
          const snap = await getDocs(q);
          
          let existingData = snap.docs[0]?.data();
          let existingDocId = snap.docs[0]?.id;

          // Buat dokumen user baru
          await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            name: existingData?.name || name.trim(),
            email: userEmail,
            role: existingData?.role || (userEmail === "fad2beth@gmail.com" ? 'SUPERADMIN' : 'USER'),
            img: existingData?.img || '1',
            createdAt: serverTimestamp()
          });

          // Hapus sampah data lama jika ada
          if (existingDocId && existingDocId !== newUser.uid) {
            await deleteDoc(doc(db, 'users', existingDocId));
          }
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            setError('Kata sandi salah untuk akun ini.');
          } else {
            setError('Gagal login: ' + createErr.message);
          }
        }
      } else {
        setError('Terjadi kesalahan: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. HANDLE FORGOT PASSWORD ---
  const handleForgotPassword = async () => {
    if (!email.trim()) return setError('Email wajib diisi');
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('Link reset kata sandi telah dikirim ke email Anda.');
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError('Gagal mengirim email reset: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (r?: Role) => {
    if (r === 'SUPERADMIN') return 'Superadmin';
    if (r?.startsWith('ADMIN_')) return 'Koordinator';
    return 'Petugas';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] p-6 relative overflow-y-auto">
      <div className="absolute top-0 left-0 w-full h-80 bg-gradient-to-b from-blue-600/20 to-transparent pointer-events-none"></div>
      
      {mode === 'forgot' && (
        <button onClick={() => setMode('login')} className="absolute top-6 left-6 z-20 p-2 bg-gray-800/50 rounded-xl border border-gray-700 text-gray-300">
          <ArrowLeft size={20} />
        </button>
      )}

      <div className="mt-12 mb-10 text-center relative z-10">
        <div className="inline-flex p-4 bg-blue-600/10 border border-blue-500/20 rounded-3xl mb-6 shadow-2xl shadow-blue-500/10">
          <ShieldCheck className="w-12 h-12 text-blue-500" />
        </div>
        <h1 className="text-3xl font-black mb-2 tracking-tight text-white">
          {mode === 'login' ? 'KOMSOS TASK' : 'Reset Sandi'}
        </h1>
        <p className="text-gray-400 text-sm font-medium px-4">
          {mode === 'login' ? 'Sistem Manajemen Tugas KOMSOS St. Paulus Juanda' : 'Instruksi pemulihan akan dikirim ke email Anda.'}
        </p>
      </div>
      
      <div className="space-y-4 relative z-10">
        {mode === 'login' ? (
          <>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Nama Anggota</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: yohanes" 
                  className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-4 focus:border-blue-500 transition-all text-sm text-white" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Kata Sandi</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl px-4 py-4 focus:border-blue-500 transition-all text-sm text-white" 
                />
                <button 
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <input 
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com" 
            className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl px-4 py-4 focus:border-blue-500 transition-all text-sm text-white" 
          />
        )}
        
        {error && <div className="text-red-400 text-[11px] font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20 animate-shake">{error}</div>}
        {success && <div className="text-emerald-400 text-[11px] font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{success}</div>}
        
        {mode === 'login' && (
          <button onClick={() => setMode('forgot')} className="w-full text-center text-gray-500 text-xs font-bold hover:text-blue-500 transition-colors">
            Lupa kata sandi?
          </button>
        )}
        
        <div className="pt-4 space-y-3">
          <button 
            onClick={mode === 'login' ? handleLoginSubmit : handleForgotPassword} 
            disabled={isLoading}
            className="w-full flex justify-center items-center bg-blue-600 text-white font-black rounded-2xl py-4 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (mode === 'login' ? 'MASUK SEKARANG' : 'KIRIM LINK RESET')}
          </button>

          {mode === 'login' && (
            <button 
              onClick={handleGoogleLogin} disabled={isLoading}
              className="w-full flex justify-center items-center bg-white text-gray-900 font-bold rounded-2xl py-4 hover:bg-gray-100 transition-colors active:scale-95 gap-3"
            >
              <Chrome className="w-5 h-5 text-blue-500" />
              Google Account
            </button>
          )}

          {error && error.includes('jaringan') && (
            <button 
              onClick={handleBypassDemo}
              className="w-full flex justify-center items-center gap-2 bg-emerald-500/10 text-emerald-500 font-bold rounded-2xl py-4 border border-emerald-500/20 text-xs"
            >
              Gunakan Mode Demo (Offline)
            </button>
          )}
        </div>

        {/* Footer Info Anggota */}
        {mode === 'login' && (
          <div className="mt-8 p-5 bg-[#151b2b] rounded-3xl border border-gray-800">
            <p className="font-black text-[10px] text-blue-500 uppercase tracking-[0.2em] mb-3">Anggota Terdaftar</p>
            <div className="space-y-2">
              {usersDb.length > 0 ? usersDb.slice(0, 3).map((u) => (
                <div key={u.id} className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-300 font-bold">{u.name}</span>
                  <span className="text-gray-500 uppercase text-[9px] tracking-tighter">{getRoleLabel(u.role)}</span>
                </div>
              )) : <p className="text-gray-600 text-[10px] italic">Memuat data tim...</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
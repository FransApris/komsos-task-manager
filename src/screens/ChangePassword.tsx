import React from 'react';
import { ChevronLeft, KeyRound, ExternalLink, ShieldCheck } from 'lucide-react';
import { Screen, UserAccount } from '../types';

export const ChangePassword: React.FC<{
  onNavigate: (s: Screen) => void;
  currentUser: UserAccount | null;
}> = ({ onNavigate, currentUser }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('APP_SETTINGS')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Keamanan Akun</h1>
        <div className="w-9" />
      </header>

      <div className="p-5 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mt-8 mb-6">
          <KeyRound className="w-10 h-10 text-blue-500" />
        </div>

        <h2 className="text-lg font-black text-white mb-2">Kata Sandi Dikelola oleh Google</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          Akun ini masuk menggunakan <span className="text-white font-bold">Google Sign-In</span>. Kata sandi tidak dikelola di dalam aplikasi ini.
        </p>
        {currentUser?.email && (
          <p className="text-xs text-gray-500 mb-8">
            Akun: <span className="text-gray-300 font-medium">{currentUser.email}</span>
          </p>
        )}

        <div className="w-full space-y-3">
          <div className="bg-[#151b2b] border border-gray-800 rounded-2xl p-4 flex items-start gap-3 text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-white mb-1">Cara mengubah kata sandi Google Anda:</p>
              <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                <li>Buka <span className="text-gray-300">myaccount.google.com</span></li>
                <li>Pilih <span className="text-gray-300">Keamanan</span></li>
                <li>Pilih <span className="text-gray-300">Sandi</span> lalu ikuti langkahnya</li>
              </ol>
            </div>
          </div>

          <a
            href="https://myaccount.google.com/security"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Buka Pengaturan Keamanan Google
          </a>
        </div>
      </div>
    </div>
  );
};
export default ChangePassword;


export const ChangePassword: React.FC<{ 
  onNavigate: (s: Screen) => void,
  currentUser: UserAccount | null,
}> = ({ onNavigate, currentUser }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async () => {
    setError('');
    setSuccess('');

    if (!currentUser?.email || !auth.currentUser) {
      setError('Sesi tidak valid. Silakan login ulang.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Kata sandi baru minimal 6 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      setSuccess('Kata sandi berhasil diperbarui!');
      setTimeout(() => onNavigate('APP_SETTINGS'), 1500);
    } catch (e: any) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Kata sandi saat ini salah');
      } else if (e.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percobaan. Coba lagi nanti.');
      } else {
        setError('Gagal memperbarui kata sandi. Coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('APP_SETTINGS')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Ubah Sandi</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-lg font-bold text-white">Buat Kata Sandi Baru</h2>
          <p className="text-xs text-gray-400 mt-2">Pastikan kata sandi baru Anda unik dan kuat untuk menjaga keamanan akun.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kata Sandi Saat Ini</label>
            <input 
              type="password" 
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 text-sm text-white" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kata Sandi Baru</label>
            <input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 text-sm text-white" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Konfirmasi Sandi Baru</label>
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi kata sandi baru" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 text-sm text-white" 
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-xs font-bold mt-2 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}
          
          {success && (
            <div className="text-emerald-500 text-xs font-bold mt-2 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              {success}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-97.5 p-5 bg-[#0a0f18]/90 backdrop-blur-md border-t border-gray-800/80 z-20">
        <button 
          onClick={handleUpdatePassword}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:grayscale"
        >
          {isLoading ? 'Memperbarui...' : 'Perbarui Kata Sandi'}
        </button>
      </div>
    </div>
  );
};
export default ChangePassword;
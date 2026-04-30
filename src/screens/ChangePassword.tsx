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

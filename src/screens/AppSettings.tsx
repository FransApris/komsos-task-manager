import React, { useState } from 'react';
import { ChevronLeft, Moon, Globe, Trash2, Info, Lock, HelpCircle, Bell, User } from 'lucide-react';
import { Screen, UserAccount } from '../types';
import { toast } from 'sonner';

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN_MULTIMEDIA: 'Koordinator Multimedia',
  ADMIN_PHOTO_VIDEO: 'Koordinator Photo & Video',
  ADMIN_PUBLICATION: 'Koordinator Publikasi',
  USER: 'Anggota',
};

export const AppSettings: React.FC<{ onNavigate: (s: Screen) => void; currentUser?: UserAccount | null }> = ({ onNavigate, currentUser }) => {
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Hapus semua Service Worker cache (PWA)
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }
      // Hapus localStorage kecuali kunci autentikasi Firebase
      const authKeysToKeep: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('firebase:')) authKeysToKeep.push(key);
      }
      const authValues = authKeysToKeep.map(k => [k, localStorage.getItem(k)] as [string, string | null]);
      localStorage.clear();
      authValues.forEach(([k, v]) => { if (v !== null) localStorage.setItem(k, v); });

      // Hapus sessionStorage
      sessionStorage.clear();

      setShowCacheModal(false);
      setShowReloadPrompt(true);
      toast.success('Cache aplikasi berhasil dibersihkan.');
    } catch {
      toast.error('Gagal membersihkan cache. Coba lagi.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 relative text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('PROFILE')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Pengaturan</h1>
        <div className="w-9" />
      </header>

      <div className="p-5 space-y-6">
        {/* TAMPILAN & BAHASA */}
        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Tampilan &amp; Bahasa</h3>
          <div className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
            {/* Dark mode: hanya tersedia mode gelap */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="font-bold text-sm text-white block">Mode Gelap</span>
                  <span className="text-[10px] text-gray-500">Aplikasi hanya tersedia dalam mode gelap</span>
                </div>
              </div>
              <div className="w-12 h-6 rounded-full p-1 bg-blue-600">
                <div className="w-4 h-4 rounded-full bg-white translate-x-6" />
              </div>
            </div>
            {/* Bahasa: read-only */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="font-bold text-sm text-white block">Bahasa</span>
                  <span className="text-[10px] text-gray-500">Multi-bahasa belum tersedia</span>
                </div>
              </div>
              <span className="text-sm text-gray-500 font-medium">Indonesia</span>
            </div>
          </div>
        </div>

        {/* NOTIFIKASI & KEAMANAN */}
        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Notifikasi &amp; Keamanan</h3>
          <div className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50"
              onClick={() => onNavigate('NOTIFICATION_SETTINGS')}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-sm text-white">Pengaturan Notifikasi</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
            </div>
            <div
              className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50"
              onClick={() => onNavigate('CHANGE_PASSWORD')}
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-sm text-white">Ubah Kata Sandi</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
            </div>
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50"
              onClick={() => setShowCacheModal(true)}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-red-400" />
                <span className="font-bold text-sm text-red-400">Hapus Cache Aplikasi</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
            </div>
          </div>
        </div>

        {/* AKUN */}
        {currentUser && (
          <div>
            <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Akun</h3>
            <div className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="font-bold text-sm text-white block">{currentUser.displayName || '—'}</span>
                    <span className="text-[10px] text-gray-500">{ROLE_LABEL[currentUser.role ?? ''] ?? currentUser.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-400 break-all">{currentUser.email}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TENTANG */}
        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Tentang</h3>
          <div className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
            <div
              className="flex items-center justify-between p-4 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50"
              onClick={() => onNavigate('HELP_CENTER')}
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-sm text-white">Pusat Bantuan</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
            </div>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-sm text-white">Versi Aplikasi</span>
              </div>
              <span className="text-sm text-gray-500 font-medium">v1.2.4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Hapus Cache */}
      {showCacheModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm bg-[#151b2b] rounded-3xl p-6 border border-gray-800 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Hapus Cache?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Cache Service Worker, localStorage, dan sessionStorage akan dihapus. Data login Anda tetap aman.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCacheModal(false)}
                disabled={isClearing}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isClearing ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reload setelah cache dihapus */}
      {showReloadPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm bg-[#151b2b] rounded-3xl p-6 border border-emerald-500/30 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Cache Berhasil Dihapus</h3>
            <p className="text-sm text-gray-400 mb-6">
              Muat ulang aplikasi sekarang agar perubahan berlaku sepenuhnya.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReloadPrompt(false)}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors"
              >
                Nanti
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AppSettings;
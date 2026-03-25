import React, { useState } from 'react';
import { ChevronLeft, Moon, Globe, Trash2, Info, Lock, HelpCircle, Check, X } from 'lucide-react';
import { Screen } from '../types';

export const AppSettings: React.FC<{ onNavigate: (s: Screen) => void }> = ({ onNavigate }) => {
  const [darkMode, setDarkMode] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showCacheModal, setShowCacheModal] = useState(false);
  const [language, setLanguage] = useState('Indonesia');
  const [cacheSize, setCacheSize] = useState('24 MB');

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 relative text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('PROFILE')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Pengaturan</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Tampilan & Bahasa</h3>
          <div className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-sm text-white">Mode Gelap</span>
              </div>
              <div 
                onClick={() => setDarkMode(!darkMode)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
            <div 
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50"
              onClick={() => setShowLangModal(true)}
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="font-bold text-sm text-white">Bahasa</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 font-medium">{language}</span>
                <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-3 text-gray-400 uppercase tracking-wider">Privasi & Keamanan</h3>
          <div className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
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
              <span className="text-xs text-gray-500">{cacheSize}</span>
            </div>
          </div>
        </div>

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

      {/* Language Modal */}
      {showLangModal && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
          <div className="w-full bg-[#151b2b] rounded-t-3xl p-6 border-t border-gray-800 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-white">Pilih Bahasa</h3>
              <button onClick={() => setShowLangModal(false)} className="p-2 bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              {['Indonesia', 'English'].map(lang => (
                <button 
                  key={lang}
                  onClick={() => { setLanguage(lang); setShowLangModal(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${language === lang ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 bg-[#0a0f18] hover:bg-gray-800'}`}
                >
                  <span className={`font-medium ${language === lang ? 'text-blue-400' : 'text-gray-300'}`}>{lang}</span>
                  {language === lang && <Check className="w-5 h-5 text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cache Modal */}
      {showCacheModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
          <div className="w-full max-w-sm bg-[#151b2b] rounded-3xl p-6 border border-gray-800 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-white">Hapus Cache?</h3>
            <p className="text-sm text-gray-400 mb-6">Anda akan menghapus {cacheSize} data sementara. Aplikasi mungkin memuat sedikit lebih lama pada awalnya.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCacheModal(false)} className="flex-1 py-3 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors">Batal</button>
              <button 
                onClick={() => { setCacheSize('0 MB'); setShowCacheModal(false); }} 
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors"
                disabled={cacheSize === '0 MB'}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AppSettings;
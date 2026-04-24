import React, { useState } from 'react';
import { ChevronLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Screen } from '../types';
import { db, auth, collection, addDoc, serverTimestamp } from '../firebase';
import { toast } from 'sonner';

export const EmailSupport: React.FC<{ onNavigate: (s: Screen) => void }> = ({ onNavigate }) => {
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [category, setCategory] = useState('Masalah Akun / Login');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setIsLoading(true);
    try {
      // Menyimpan pesan dukungan ke koleksi Firebase
      await addDoc(collection(db, 'supportTickets'), {
        userId: auth.currentUser?.uid || 'guest',
        userEmail: auth.currentUser?.email || 'Tidak diketahui',
        userName: auth.currentUser?.displayName || 'Anggota Tim',
        category,
        subject,
        message,
        status: 'OPEN',
        createdAt: serverTimestamp()
      });

      setSent(true);
      setTimeout(() => {
        onNavigate('HELP_CENTER');
      }, 2500);
    } catch (error) {
      console.error('Error sending ticket:', error);
      toast.error("Gagal mengirim pesan. Silakan periksa koneksi internet Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] items-center justify-center p-5 text-center absolute inset-0 z-50 text-white">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-100">Pesan Terkirim!</h2>
        <p className="text-sm text-gray-400 max-w-62.5 animate-in slide-in-from-bottom-4 duration-500 delay-200">
          Tim Komsos akan meninjau pesan Anda dan merespons secepatnya.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 absolute inset-0 z-50 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('HELP_CENTER')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Hubungi Support</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5">
        <p className="text-sm text-gray-400 mb-6">Silakan tuliskan kendala atau saran Anda secara detail. Tiket ini akan langsung diteruskan ke Admin sistem.</p>
        
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kategori Masalah</label>
            <div className="relative">
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 text-sm text-white appearance-none"
              >
                <option value="Masalah Akun / Login">Masalah Akun / Login</option>
                <option value="Masalah Jadwal / Tugas">Masalah Jadwal / Tugas</option>
                <option value="Saran Fitur Baru">Saran Fitur Baru</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ChevronLeft className="w-4 h-4 text-gray-500 -rotate-90" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Subjek</label>
            <input 
              required 
              type="text" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Tidak bisa ubah status tugas" 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 text-sm text-white" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Detail Pesan</label>
            <textarea 
              required 
              rows={6} 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Jelaskan kendala Anda secara detail..." 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 text-sm text-white resize-none"
            ></textarea>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Mengirim...</> : <><Send className="w-4 h-4" /> Kirim Pesan</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmailSupport;
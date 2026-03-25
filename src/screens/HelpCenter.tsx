import React from 'react';
import { ChevronLeft, MessageCircle, FileText, Mail } from 'lucide-react';
import { Screen } from '../types';

export const HelpCenter: React.FC<{ onNavigate: (s: Screen) => void }> = ({ onNavigate }) => {
  const faqs = [
    { q: "Bagaimana cara melaporkan tugas selesai?", a: "Buka menu Tugas, pilih tugas yang sedang berlangsung, lalu klik 'Kirim Update' dan ubah status menjadi Selesai." },
    { q: "Apakah saya bisa mengubah jadwal pelayanan?", a: "Jadwal yang sudah ditetapkan hanya bisa diubah dengan menghubungi Admin Komsos secara langsung." },
    { q: "Bagaimana jika saya lupa kata sandi?", a: "Gunakan fitur 'Lupa Kata Sandi' di halaman Login, atau hubungi Admin untuk mereset akun Anda." }
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('APP_SETTINGS')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Pusat Bantuan</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button onClick={() => onNavigate('LIVE_CHAT')} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex flex-col items-center text-center gap-2 hover:bg-gray-800 transition-colors cursor-pointer w-full">
            <MessageCircle className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-bold text-white">Live Chat</span>
          </button>
          <button onClick={() => onNavigate('EMAIL_SUPPORT')} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex flex-col items-center text-center gap-2 hover:bg-gray-800 transition-colors cursor-pointer w-full">
            <Mail className="w-6 h-6 text-emerald-500" />
            <span className="text-xs font-bold text-white">Email Support</span>
          </button>
        </div>
        
        <div>
          <h3 className="font-bold text-sm mb-4 text-gray-400 uppercase tracking-wider">Pertanyaan Umum (FAQ)</h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800">
                <h4 className="font-bold text-sm mb-2 flex items-start gap-2 text-white">
                  <FileText className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                  {faq.q}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default HelpCenter;
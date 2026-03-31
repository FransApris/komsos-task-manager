import React, { useState } from 'react';
import { ChevronLeft, ChevronDown, MessageSquare, LifeBuoy, ClipboardList, RefreshCw, Trophy, Settings, Search } from 'lucide-react';
import { Screen } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpCenterProps {
  onNavigate: (s: Screen) => void;
}

const faqData = [
  {
    category: "Penugasan & Laporan",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    items: [
      {
        q: "Bagaimana cara mengambil tugas baru?",
        a: "Buka menu Dashboard, lalu pindah ke tab 'Semua Tugas'. Pilih tugas yang sesuai dengan keahlian Anda dan klik tombol 'Ambil Tugas Ini'."
      },
      {
        q: "Bagaimana cara melaporkan perkembangan (progress) tugas?",
        a: "Buka tugas yang sedang Anda kerjakan, lalu klik tombol 'Update Progress'. Anda bisa menambahkan catatan teks dan melampirkan maksimal 5 foto sebagai bukti kerja."
      },
      {
        q: "Tugas saya sudah selesai, apa yang harus dilakukan selanjutnya?",
        a: "Masuk ke Detail Tugas dan klik 'Selesaikan Tugas'. Berikan catatan akhir Anda. Status tugas akan berubah menjadi 'Menunggu Verifikasi' hingga Admin mengecek dan mengesahkannya."
      }
    ]
  },
  {
    category: "Bursa Pertukaran (Izin & Tukar)",
    icon: <RefreshCw className="w-5 h-5" />,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    items: [
      {
        q: "Saya mendadak berhalangan hadir di hari H. Apa yang harus saya lakukan?",
        a: "Segera masuk ke menu Bursa Pertukaran dan tekan tombol (+). Pilih tugas yang ingin Anda lepas, tuliskan alasannya secara jelas, dan kirim. Tugas tersebut akan ditawarkan ke anggota tim lain."
      },
      {
        q: "Apakah saya langsung terbebas dari tugas setelah memasukkannya ke Bursa?",
        a: "Belum. Anda baru resmi terbebas dari tanggung jawab setelah ada anggota lain yang menekan tombol 'Ambil Alih Tugas' dan pergantian tersebut telah disetujui oleh Koordinator."
      },
      {
        q: "Saya sedang luang, bagaimana cara membantu mengambil tugas teman?",
        a: "Buka menu Bursa Pertukaran dan lihat tab 'Bursa Tukar'. Jika ada tugas yang sanggup Anda kerjakan, klik 'Ambil Alih Tugas'."
      }
    ]
  },
  {
    category: "Sistem Poin & Klasemen",
    icon: <Trophy className="w-5 h-5" />,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    items: [
      {
        q: "Bagaimana cara mengumpulkan Poin Kinerja dan XP?",
        a: "Poin akan otomatis bertambah setelah Admin memverifikasi tugas Anda yang sudah selesai. Anggota biasa mendapatkan 50 Poin, sedangkan Ketua Tim mendapatkan 75 Poin."
      },
      {
        q: "Apakah poin kinerja saya bisa berkurang?",
        a: "Ya. Admin dan Koordinator memiliki otoritas untuk mencopot Anda dari tugas jika Anda mangkir tanpa keterangan. Tindakan ini akan memberikan penalti otomatis berupa pengurangan 20 Poin."
      },
      {
        q: "Kapan poin klasemen di-reset?",
        a: "Poin klasemen (Leaderboard) akan di-reset setiap akhir bulan saat Admin melakukan 'Tutup Buku' dan membagikan lencana (Badge) penghargaan untuk Top 3 anggota terbaik."
      }
    ]
  },
  {
    category: "Teknis Aplikasi",
    icon: <Settings className="w-5 h-5" />,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    items: [
      {
        q: "Bagaimana cara memperbarui level keahlian (Skill) saya di profil?",
        a: "Keahlian seperti Fotografi, Videografi, Penulisan, dan Desain akan naik level secara otomatis setiap kali Anda menyelesaikan tugas yang berkaitan dengan bidang tersebut. Semakin sering Anda bertugas, semakin tinggi level spesialisasi Anda."
      }
    ]
  }
];

export const HelpCenter: React.FC<HelpCenterProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  // Logika pencarian cerdas
  const filteredData = faqData.map(category => {
    const filteredItems = category.items.filter(
      item => 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...category, items: filteredItems };
  }).filter(category => category.items.length > 0);

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white relative">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('APP_SETTINGS')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800 hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight text-white">Pusat Bantuan</h1>
      </header>

      <div className="p-5">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl mb-6 relative overflow-hidden shadow-lg shadow-blue-500/20">
          <div className="absolute -right-4 -bottom-4 opacity-10"><LifeBuoy size={120} /></div>
          <h2 className="text-2xl font-black text-white mb-2 relative z-10">Ada yang bisa kami bantu?</h2>
          <p className="text-xs text-blue-200 font-medium mb-4 relative z-10">Cari jawaban atas pertanyaan umum seputar operasional Komsos di bawah ini.</p>
          
          <div className="relative z-10">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-blue-300" />
            </div>
            <input
              type="text"
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl pl-11 pr-4 py-3 placeholder-blue-200/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all text-sm"
              placeholder="Ketik kata kunci (misal: poin, tukar tugas)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-6">
          {filteredData.length === 0 ? (
            <div className="text-center py-10 bg-[#151b2b] rounded-2xl border border-dashed border-gray-800">
              <Search className="w-8 h-8 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-400">Tidak ada hasil yang cocok</p>
              <p className="text-xs text-gray-500 mt-1">Coba gunakan kata kunci yang berbeda.</p>
            </div>
          ) : (
            filteredData.map((category, catIdx) => (
              <div key={catIdx} className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-xl ${category.bg} ${category.color}`}>
                    {category.icon}
                  </div>
                  <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">{category.category}</h3>
                </div>

                <div className="space-y-3">
                  {category.items.map((item, itemIdx) => {
                    const id = `${catIdx}-${itemIdx}`;
                    const isOpen = openIndex === id;
                    
                    return (
                      <div key={id} className="bg-[#151b2b] rounded-2xl border border-gray-800 overflow-hidden">
                        <button
                          onClick={() => toggleAccordion(id)}
                          className="w-full p-4 flex justify-between items-center text-left focus:outline-none"
                        >
                          <span className={`text-sm font-bold pr-4 transition-colors ${isOpen ? 'text-blue-400' : 'text-gray-200'}`}>
                            {item.q}
                          </span>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="shrink-0 text-gray-500">
                            <ChevronDown className="w-5 h-5" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                              <div className="p-4 pt-0 text-sm text-gray-400 leading-relaxed border-t border-gray-800/50 mt-1">
                                {item.a}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-10 pt-8 border-t border-gray-800/50">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 text-center">Masih Membutuhkan Bantuan?</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onNavigate('LIVE_CHAT')}
              className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 transition-colors group"
            >
              <div className="p-3 bg-blue-500/10 rounded-full group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6 text-blue-500" />
              </div>
              <span className="text-xs font-bold text-white mt-1">Chat Admin</span>
            </button>
            <button 
              onClick={() => onNavigate('HELPDESK')}
              className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex flex-col items-center justify-center gap-2 hover:border-amber-500/50 transition-colors group"
            >
              <div className="p-3 bg-amber-500/10 rounded-full group-hover:scale-110 transition-transform">
                <LifeBuoy className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-xs font-bold text-white mt-1">Buat Tiket</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HelpCenter;
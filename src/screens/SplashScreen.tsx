import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Share2 } from 'lucide-react';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  useEffect(() => {
    // Waktu loading disesuaikan menjadi 2.2 detik agar animasi lebih dinikmati
    const timer = setTimeout(onFinish, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="relative flex h-screen w-full flex-col bg-[#0a0f18] overflow-hidden items-center justify-between py-16 text-white">
      
      {/* Efek Glow Background (Pojok Kanan Atas & Kiri Bawah) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-blue-600 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-600 rounded-full blur-[100px]"></div>
      </div>

      {/* Konten Tengah (Ikon & Judul) */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-8 z-10 mt-10">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
          className="w-48 h-48 mb-8 flex items-center justify-center bg-blue-600/10 rounded-full border border-blue-500/10 shadow-[0_0_40px_rgba(37,99,235,0.1)]"
        >
          <div className="w-full h-full flex items-center justify-center">
            <Share2 className="w-20 h-20 text-blue-500" strokeWidth={2} />
          </div>
        </motion.div>
        
        <div className="text-center flex flex-col gap-2">
          <motion.h2 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="tracking-tight text-3xl font-extrabold leading-tight text-white"
          >
            Sistem Tugas Komsos
          </motion.h2>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-400 text-lg font-medium"
          >
            Kolaborasi Multimedia & Komunikasi
          </motion.p>
        </div>
      </div>

      {/* Bagian Loading (Bawah) */}
      <div className="w-full max-w-xs px-6 flex flex-col gap-4 z-10 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-400 text-sm font-semibold leading-normal"
            >
              Memuat data...
            </motion.p>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-blue-500 text-xs font-bold uppercase tracking-wider"
            >
              Versi 2.0
            </motion.span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
            />
          </div>
        </div>
      </div>

    </div>
  );
};
export default SplashScreen;
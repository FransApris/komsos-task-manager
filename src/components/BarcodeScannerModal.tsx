import React, { useEffect, useRef, useState } from 'react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { X, Camera, Loader2, RefreshCw } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ onScan, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const scannerId = "barcode-reader";

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    scannerRef.current = null;
  };

  const startScanner = async () => {
    setIsLoading(true);
    setError(null);

    // Ensure previous instance is stopped before starting new one
    await stopScanner();

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Per-frame error callback — silently ignore
        }
      );
      setIsLoading(false);
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      const errorMsg = err.message || "";
      const errorName = err.name || "";

      if (errorName === 'NotAllowedError' || errorMsg.toLowerCase().includes('dismissed') || errorMsg.toLowerCase().includes('denied')) {
        setError("Izin kamera ditolak atau dibatalkan. Silakan aktifkan izin kamera di pengaturan browser Anda dan pastikan Anda tidak memblokir akses kamera.");
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        setError("Kamera tidak ditemukan. Pastikan perangkat Anda memiliki kamera yang berfungsi.");
      } else if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        setError("Kamera sedang digunakan oleh aplikasi lain. Silakan tutup aplikasi lain yang menggunakan kamera.");
      } else {
        setError(`Gagal mengakses kamera: ${errorName || 'Error'}. Pastikan perangkat Anda mendukung akses kamera.`);
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const handleRetry = () => {
    startScanner();
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-5 bg-black/95 backdrop-blur-md">
      <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
        
        <div className="flex justify-between items-center w-full mb-6 z-10">
          <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2">
            <Camera className="text-emerald-500" size={18} /> Scan Barcode
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-gray-800 bg-black flex items-center justify-center">
          <div id={scannerId} className="w-full h-full"></div>
          
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f18] z-20">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Menyiapkan Kamera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f18] p-6 text-center z-30">
              <p className="text-xs text-red-400 font-bold mb-4">{error}</p>
              <button 
                onClick={onClose}
                className="px-6 py-2 bg-gray-800 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
              >
                Tutup
              </button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-62.5 h-62.5 border-2 border-emerald-500/50 rounded-3xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_3px_#10b981] animate-scan" />
              </div>
            </div>
          )}
        </div>
        
        <p className="text-[10px] text-gray-400 mt-6 text-center leading-relaxed uppercase tracking-widest font-bold">
          Arahkan kamera ke stiker barcode alat
        </p>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scan {
            0%, 100% { top: 0; }
            50% { top: 100%; }
          }
          .animate-scan {
            animation: scan 2.5s linear infinite;
          }
          #barcode-reader video {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
          }
        `}} />
      </div>
    </div>
  );
};

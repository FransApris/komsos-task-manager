import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SelfieCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export const SelfieCameraModal: React.FC<SelfieCameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const startCamera = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      if (err.name === 'NotAllowedError') {
        setError("Izin kamera ditolak. Silakan aktifkan izin kamera di pengaturan browser Anda.");
      } else {
        setError("Gagal mengakses kamera. Pastikan perangkat Anda memiliki kamera depan.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    return () => stopCamera();
  }, [isOpen]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        // Set canvas dimensions to match video stream
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Mirror the image for selfie
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Resize image to keep it under 1MB for Firestore
        // We'll use a smaller target size for the base64 string
        const targetWidth = 640;
        const targetHeight = (video.videoHeight / video.videoWidth) * targetWidth;
        
        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = targetWidth;
        resizeCanvas.height = targetHeight;
        const resizeContext = resizeCanvas.getContext('2d');
        
        if (resizeContext) {
          resizeContext.drawImage(canvas, 0, 0, targetWidth, targetHeight);
          const dataUrl = resizeCanvas.toDataURL('image/jpeg', 0.7); // Compress to 70% quality
          setCapturedImage(dataUrl);
        }
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-[#151b2b] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl flex flex-col aspect-[3/4]">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest">Ambil Selfie</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-bold uppercase tracking-widest">Menyiapkan Kamera...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <X className="text-red-500 w-8 h-8" />
              </div>
              <p className="text-sm text-gray-300">{error}</p>
              <button 
                onClick={startCamera}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm"
              >
                Coba Lagi
              </button>
            </div>
          )}

          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${capturedImage || isLoading || error ? 'hidden' : 'block'}`}
          />

          {capturedImage && (
            <img 
              src={capturedImage} 
              alt="Captured Selfie" 
              className="w-full h-full object-cover"
            />
          )}

          {/* Hidden Canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Overlay */}
          {!capturedImage && !isLoading && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/30 rounded-full border-dashed animate-[spin_10s_linear_infinite]" />
              <div className="absolute w-72 h-72 border border-blue-500/20 rounded-full" />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-[#151b2b] border-t border-gray-800 flex justify-center items-center gap-6">
          {!capturedImage ? (
            <button 
              onClick={capturePhoto}
              disabled={isLoading || !!error}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50 disabled:scale-100"
            >
              <div className="w-14 h-14 border-2 border-black rounded-full" />
            </button>
          ) : (
            <div className="flex gap-4 w-full">
              <button 
                onClick={handleRetake}
                className="flex-1 py-4 bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={18} /> Ulangi
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
              >
                <Check size={18} /> Gunakan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

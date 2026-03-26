import React, { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Camera, CheckCircle2, AlertCircle, Loader2, Navigation, Info, ShieldCheck, UserCheck, Calendar, Clock, RefreshCw } from 'lucide-react';
import { Screen, Role, UserAccount, Task } from '../types';
import { db, collection, addDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { SelfieCameraModal } from '../components/SelfieCameraModal';

// Koordinat Gereja (Contoh: Gereja St. Paulus Juanda)
const CHURCH_COORDS = {
  lat: -7.3768,
  lng: 112.7684
};

const MAX_RADIUS_METERS = 500; // Radius maksimal 500 meter

export const AttendanceScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: Role,
  currentUser: UserAccount | null,
  tasksDb?: Task[]
}> = ({ onNavigate, role, currentUser, tasksDb = [] }) => {
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLocationValid, setIsLocationValid] = useState(false);
  const [selfieImg, setSelfieImg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string>('');
  const [targetType, setTargetType] = useState<'TASK' | 'MASS'>('TASK');
  const [showCamera, setShowCamera] = useState(false);

  // Filter tugas yang sedang berlangsung untuk user ini
  const myActiveTasks = tasksDb.filter(t => 
    t.status === 'IN_PROGRESS' && 
    t.assignedUsers?.includes(currentUser?.uid || '')
  );

  // Hitung jarak antara dua koordinat (Haversine Formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const getMyLocation = () => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation tidak didukung oleh browser Anda.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });
        
        const dist = calculateDistance(latitude, longitude, CHURCH_COORDS.lat, CHURCH_COORDS.lng);
        setDistance(dist);
        setIsLocationValid(dist <= MAX_RADIUS_METERS);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        if (error.code === 1) {
          setLocationError("Izin lokasi ditolak. Silakan aktifkan GPS Anda.");
        } else {
          setLocationError("Gagal mendapatkan lokasi. Pastikan GPS Anda aktif.");
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getMyLocation();
  }, []);

  const handleCheckIn = async () => {
    if (!currentUser) return;
    if (!isLocationValid) {
      toast.error("Anda berada di luar jangkauan lokasi gereja.");
      return;
    }
    if (!selfieImg) {
      toast.error("Silakan ambil foto selfie terlebih dahulu.");
      return;
    }
    if (!targetId) {
      toast.error("Pilih tugas atau jadwal yang ingin Anda absen.");
      return;
    }

    setIsLoading(true);
    try {
      const attendanceData = {
        targetId,
        targetType,
        userId: currentUser.uid,
        checkInTime: serverTimestamp(),
        status: 'PRESENT',
        distanceMeters: distance,
        selfieUrl: selfieImg,
        location: location ? { lat: location.lat, lng: location.lng } : null
      };

      await addDoc(collection(db, 'attendance'), attendanceData);
      
      toast.success("Check-in berhasil! Selamat bertugas.");
      onNavigate('USER_DASHBOARD');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'attendance');
      toast.error("Gagal melakukan check-in. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate(isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold text-white">Presensi Kehadiran</h1>
      </header>

      <div className="p-5 space-y-6">
        {/* Status Lokasi */}
        <section className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Navigation size={80} className="text-blue-500" />
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-xl ${isLocationValid ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <MapPin className={`w-5 h-5 ${isLocationValid ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verifikasi Lokasi</h3>
              <p className={`text-sm font-bold ${isLocationValid ? 'text-emerald-500' : 'text-red-500'}`}>
                {isLocating ? 'Mencari Lokasi...' : isLocationValid ? 'Lokasi Sesuai' : 'Di Luar Jangkauan'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">Jarak ke Gereja</span>
              <span className={`font-bold ${isLocationValid ? 'text-white' : 'text-red-400'}`}>
                {isLocating ? '...' : distance ? `${Math.round(distance)} meter` : '-'}
              </span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: isLocating ? '30%' : `${Math.min(100, (MAX_RADIUS_METERS / (distance || 1)) * 100)}%` }}
                className={`h-full ${isLocationValid ? 'bg-emerald-500' : 'bg-red-500'}`}
              />
            </div>
            <p className="text-[10px] text-gray-500 italic">
              * Maksimal radius {MAX_RADIUS_METERS}m dari titik pusat gereja.
            </p>
          </div>

          {locationError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-[10px] text-red-400 font-medium">{locationError}</p>
              <button 
                onClick={getMyLocation}
                className="ml-auto p-1.5 bg-red-500/20 rounded-lg text-red-500"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </section>

        {/* Pilih Tugas / Jadwal */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Pilih Penugasan</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setTargetType('TASK')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${targetType === 'TASK' ? 'bg-blue-600/10 border-blue-500 text-blue-500' : 'bg-[#151b2b] border-gray-800 text-gray-500'}`}
            >
              <UserCheck size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Tugas Khusus</span>
            </button>
            <button 
              onClick={() => setTargetType('MASS')}
              className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${targetType === 'MASS' ? 'bg-purple-600/10 border-purple-500 text-purple-500' : 'bg-[#151b2b] border-gray-800 text-gray-500'}`}
            >
              <Calendar size={20} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Jadwal Misa</span>
            </button>
          </div>

          <div className="relative">
            <select 
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white appearance-none focus:border-blue-500 transition-all outline-none"
            >
              <option value="">-- Pilih {targetType === 'TASK' ? 'Tugas' : 'Misa'} --</option>
              {targetType === 'TASK' ? (
                myActiveTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title} ({t.time})</option>
                ))
              ) : (
                <option value="MASS_GENERAL">Misa Umum Hari Ini</option>
              )}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <Clock size={16} />
            </div>
          </div>
        </section>

        {/* Bukti Selfie */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">Bukti Selfie</h3>
          
          <div className={`bg-[#151b2b] p-5 rounded-3xl border border-gray-800 shadow-xl transition-all ${!isLocationValid ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex flex-col items-center text-center">
              {selfieImg ? (
                <div className="relative w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden border-4 border-emerald-500/30 shadow-2xl mb-4 group">
                  <img src={selfieImg} alt="Selfie" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30">
                      <RefreshCw className="text-white w-6 h-6" />
                    </div>
                  </button>
                  <div className="absolute top-2 right-2 bg-emerald-500 p-1 rounded-full shadow-lg">
                    <CheckCircle2 className="text-white w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-square max-w-[240px] bg-[#0a0f18] rounded-2xl border-2 border-dashed border-gray-800 flex flex-col items-center justify-center gap-4 mb-4 text-gray-600">
                  <div className="p-4 bg-gray-800/50 rounded-full">
                    <Camera size={40} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Belum Ada Foto</p>
                </div>
              )}

              <button 
                onClick={() => setShowCamera(true)}
                disabled={!isLocationValid || isLocating}
                className={`w-full max-w-[240px] py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  selfieImg 
                    ? 'bg-gray-800 text-gray-300 border border-gray-700' 
                    : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'
                } disabled:opacity-50 disabled:scale-100 active:scale-95`}
              >
                <Camera size={18} />
                {selfieImg ? 'Ambil Ulang Foto' : 'Ambil Foto Selfie'}
              </button>
              
              {!isLocationValid && !isLocating && (
                <p className="mt-4 text-[10px] text-red-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={12} /> Verifikasi Lokasi Diperlukan
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Tombol Check-In */}
        <div className="pt-4">
          <button 
            onClick={handleCheckIn}
            disabled={!isLocationValid || !selfieImg || !targetId || isLoading || isLocating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/30 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Check-In Sekarang
              </>
            )}
          </button>
          
          <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
            <div className="p-1 bg-blue-500/10 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Data presensi Anda akan dicatat bersama dengan koordinat GPS dan bukti foto selfie untuk keperluan verifikasi kinerja. Pastikan Anda berada di area gereja saat melakukan check-in.
            </p>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      <SelfieCameraModal 
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(img) => setSelfieImg(img)}
      />
    </div>
  );
};

export default AttendanceScreen;

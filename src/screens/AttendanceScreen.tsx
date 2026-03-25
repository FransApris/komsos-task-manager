import React, { useState, useRef } from 'react';
import { ChevronLeft, MapPin, CheckCircle2, Clock, Calendar, AlertCircle, Camera, Loader2, Navigation, RefreshCw } from 'lucide-react';
import { Screen, Role, UserAccount, Task } from '../types';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { useData } from '../contexts/DataContext';

// Koordinat Default Gereja St. Paulus Juanda, Sidoarjo (Sesuaikan dengan koordinat asli di Google Maps)
const CHURCH_COORDS = { lat: -7.3888, lng: 112.7570 }; 
const MAX_RADIUS_METERS = 200; // Radius toleransi absen (meter)

export const AttendanceScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: Role,
  currentUser: UserAccount | null,
  tasksDb?: Task[]
}> = ({ onNavigate, role, currentUser, tasksDb = [] }) => {
  const { massSchedules, attendances } = useData();
  const [loading, setLoading] = useState(false);

  // State untuk Geofencing & Selfie
  const [distance, setDistance] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [selfieImg, setSelfieImg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');

  // --- LOGIKA MENGHITUNG JARAK (RUMUS HAVERSINE) ---
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
    return Math.round(R * c); // Hasil dalam meter
  };

  // --- LOGIKA MENDAPATKAN LOKASI GPS ---
  const handleVerifyLocation = () => {
    setIsLocating(true);
    setLocationError('');
    
    if (!navigator.geolocation) {
      setLocationError('Browser/HP Anda tidak mendukung fitur GPS.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const dist = calculateDistance(
          position.coords.latitude, 
          position.coords.longitude, 
          CHURCH_COORDS.lat, 
          CHURCH_COORDS.lng
        );
        setDistance(dist);
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === 1) setLocationError('Akses GPS ditolak. Izinkan akses lokasi di pengaturan HP Anda.');
        else if (error.code === 2) setLocationError('Sinyal GPS tidak ditemukan.');
        else setLocationError('Gagal mendapatkan lokasi: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // --- LOGIKA KAMERA SELFIE NATIVE ---
  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfieImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- LOGIKA CHECK IN ---
  const handleCheckIn = async (targetId: string, targetType: 'TASK' | 'MASS') => {
    if (!currentUser) return;
    
    // Validasi Geofencing & Selfie
    if (distance === null || distance > MAX_RADIUS_METERS) {
      alert(`Anda harus berada di radius ${MAX_RADIUS_METERS}m dari Gereja untuk Check-In!`);
      return;
    }
    if (!selfieImg) {
      alert("Anda wajib mengambil foto selfie di lokasi terlebih dahulu!");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'attendance'), {
        targetId,
        targetType,
        userId: currentUser.uid,
        checkInTime: serverTimestamp(),
        status: 'PRESENT',
        distanceMeters: distance,
        selfieUrl: selfieImg // Menyimpan bukti selfie
      });
      
      // Reset form setelah berhasil
      setDistance(null);
      setSelfieImg(null);
      alert("Check-In Berhasil! Selamat Bertugas.");
      
    } catch (e) {
      console.error(e);
      alert("Gagal melakukan Check-In. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  const myTasks = (tasksDb || []).filter(t => t.assignedUsers?.includes(currentUser?.uid || ''));
  const myMasses = massSchedules.filter(m => (m.assignedUsers || []).includes(currentUser?.uid || ''));

  const isCheckedIn = (targetId: string) => {
    return attendances.some(a => a.targetId === targetId && a.userId === currentUser?.uid);
  };

  const isLocationValid = distance !== null && distance <= MAX_RADIUS_METERS;

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate(isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')} className="p-2 bg-[#151b2b] rounded-full border border-gray-800">
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-400">Presensi Kehadiran</h1>
      </header>

      <div className="p-5 space-y-6">
        
        {/* --- PANEL VERIFIKASI KEHADIRAN (GPS & SELFIE) --- */}
        <div className="bg-[#151b2b] p-5 rounded-2xl border border-gray-800 shadow-lg">
          <h2 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-500" /> Syarat Check-In
          </h2>
          
          <div className="space-y-4">
            {/* Syarat 1: GPS */}
            <div className="bg-[#0a0f18] p-4 rounded-xl border border-gray-800/50 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Navigation className={`w-4 h-4 ${isLocationValid ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <span className="text-xs font-bold text-white">Lokasi Perangkat</span>
                </div>
                {distance !== null && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isLocationValid ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    Jarak: {distance}m
                  </span>
                )}
              </div>
              
              <p className="text-[10px] text-gray-500 mb-3 line-clamp-2">
                {distance === null ? 'Ketuk tombol di bawah untuk verifikasi jarak Anda dari Gereja.' : 
                 isLocationValid ? 'Lokasi Anda sudah sesuai radius. Lanjut ke foto selfie.' : 
                 `Lokasi Anda terlalu jauh. Anda harus berada di radius ${MAX_RADIUS_METERS}m.`}
              </p>
              
              {locationError && <p className="text-[10px] font-bold text-red-500 bg-red-500/10 p-2 rounded-lg mb-3">{locationError}</p>}
              
              <button 
                onClick={handleVerifyLocation}
                disabled={isLocating}
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-gray-300 disabled:opacity-50"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isLocating ? 'Melacak...' : distance !== null ? 'Perbarui Lokasi' : 'Cek Lokasi Sekarang'}
              </button>
            </div>

            {/* Syarat 2: Selfie (Hanya aktif jika lokasi valid) */}
            <div className={`bg-[#0a0f18] p-4 rounded-xl border transition-all ${isLocationValid ? 'border-gray-800/50' : 'border-gray-900 opacity-50 pointer-events-none'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Camera className={`w-4 h-4 ${selfieImg ? 'text-emerald-500' : 'text-gray-500'}`} />
                  <span className="text-xs font-bold text-white">Bukti Selfie di Lokasi</span>
                </div>
                {selfieImg && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              
              {selfieImg ? (
                <div className="relative w-full h-32 rounded-xl overflow-hidden bg-gray-900 border border-gray-800 mb-3">
                  <img src={selfieImg} alt="Selfie" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelfieImg(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg text-[10px] font-bold"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-gray-500 mb-3">
                  Ambil foto selfie menggunakan seragam Komsos di lokasi bertugas.
                </p>
              )}

              {/* Native Mobile Camera Input: capture="user" memicu kamera depan */}
              <input 
                type="file" 
                accept="image/*" 
                capture="user" 
                ref={fileInputRef} 
                onChange={handleSelfieCapture} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!isLocationValid}
                className={`w-full py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${selfieImg ? 'bg-gray-800 text-gray-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <Camera className="w-4 h-4" /> {selfieImg ? 'Foto Ulang' : 'Ambil Foto Selfie'}
              </button>
            </div>
          </div>
        </div>

        {/* --- DAFTAR TUGAS --- */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tugas Reguler & Peliputan</h2>
          <div className="space-y-3">
            {myTasks.length > 0 ? myTasks.map(task => (
              <div key={task.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="font-bold text-sm text-white mb-1">{task.title}</h3>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Calendar className="w-3 h-3"/> {task.date}</p>
                </div>
                {isCheckedIn(task.id) ? (
                  <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hadir
                  </div>
                ) : (
                  <button 
                    disabled={loading || !isLocationValid || !selfieImg}
                    onClick={() => handleCheckIn(task.id, 'TASK')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-blue-600"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check In'}
                  </button>
                )}
              </div>
            )) : (
              <p className="text-gray-600 text-xs italic bg-[#151b2b] p-4 rounded-2xl border border-gray-800 border-dashed text-center">Tidak ada tugas reguler hari ini.</p>
            )}
          </div>
        </section>

        {/* --- DAFTAR MISA --- */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tugas Penjadwalan Misa</h2>
          <div className="space-y-3">
            {myMasses.length > 0 ? myMasses.map(mass => (
              <div key={mass.id} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 flex justify-between items-center shadow-sm">
                <div>
                  <h3 className="font-bold text-sm text-white mb-1">{mass.title}</h3>
                  <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5"><Clock className="w-3 h-3" /> {mass.date} • {mass.time}</p>
                </div>
                {isCheckedIn(mass.id) ? (
                  <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hadir
                  </div>
                ) : (
                  <button 
                    disabled={loading || !isLocationValid || !selfieImg}
                    onClick={() => handleCheckIn(mass.id, 'MASS')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-blue-600"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check In'}
                  </button>
                )}
              </div>
            )) : (
              <p className="text-gray-600 text-xs italic bg-[#151b2b] p-4 rounded-2xl border border-gray-800 border-dashed text-center">Anda belum mendaftar untuk tugas misa apapun.</p>
            )}
          </div>
        </section>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-500 mb-1">Penting</p>
            <p className="text-[10px] text-amber-500/70 leading-relaxed">
              Pastikan Anda memberikan izin akses <strong>Lokasi (GPS)</strong> dan <strong>Kamera</strong> pada browser perangkat Anda agar fitur Check-In dapat berfungsi dengan baik.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScreen;
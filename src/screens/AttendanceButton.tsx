import { useState } from 'react';
import { MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { checkInAttendance } from '../services/attendanceService';

interface Props {
  targetId: string;
  targetType: "TASK" | "MASS";
}

export default function AttendanceButton({ targetId, targetType }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await checkInAttendance(targetId, targetType);
      setDone(true);
      alert("Check-in berhasil! Selamat bertugas.");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckIn}
      disabled={loading || done}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
        done 
        ? 'bg-green-100 text-green-700 cursor-default' 
        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95'
      }`}
    >
      {loading ? <Loader2 className="animate-spin" size={16} /> : (done ? <CheckCircle size={16} /> : <MapPin size={16} />)}
      {done ? "Sudah Absen" : `Check-in ${targetType === 'MASS' ? 'Misa' : 'Tugas'}`}
    </button>
  );
}
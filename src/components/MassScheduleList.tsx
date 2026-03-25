import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Users, UserPlus, Check } from 'lucide-react';
import { auth } from '../firebase';
import { subscribeToMassSchedules, joinMassAssignment } from '../services/massService';

export default function MassScheduleList() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const unsubscribe = subscribeToMassSchedules(setSchedules);
    return () => unsubscribe();
  }, []);

  const handleJoin = async (id: string) => {
    try {
      await joinMassAssignment(id);
      alert("Berhasil terdaftar sebagai petugas!");
    } catch (err) {
      alert("Gagal mendaftar.");
    }
  };

  return (
    <div className="space-y-4 p-4 text-white">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Calendar className="text-blue-500" /> Jadwal Misa & Penugasan
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {schedules.map((mass) => {
          const isJoined = mass.assignedUsers?.includes(currentUser?.uid);
          return (
            <div key={mass.id} className="bg-[#151b2b] p-5 rounded-2xl shadow-sm border border-gray-800">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-white">{mass.title}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  mass.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {mass.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-400 mb-6">
                <div className="flex items-center gap-2"><Calendar size={14} /> {mass.date}</div>
                <div className="flex items-center gap-2"><Clock size={14} /> {mass.time} WIB</div>
                <div className="flex items-center gap-2"><MapPin size={14} /> {mass.location}</div>
                <div className="flex items-center gap-2 text-blue-400 font-medium">
                  <Users size={14} /> {mass.assignedUsers?.length || 0} Petugas Terdaftar
                </div>
              </div>

              <button
                onClick={() => handleJoin(mass.id)}
                disabled={isJoined || mass.status === 'CLOSED'}
                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  isJoined 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500 cursor-default' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg'
                }`}
              >
                {isJoined ? <Check size={18} /> : <UserPlus size={18} />}
                {isJoined ? "Sudah Terdaftar" : "Daftar Petugas Dokumentasi"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Users, UserPlus, Check, Tag } from 'lucide-react';
import { auth } from '../firebase';
import { subscribeToMassSchedules, joinMassAssignment } from '../services/massService';
import { toast } from 'sonner';

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
      toast.success("Berhasil mengonfirmasi kehadiran!");
    } catch (err) {
      toast.error("Gagal memproses kehadiran.");
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Misa': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Rapat': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Pelatihan': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Liputan': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4 p-4 text-white">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Calendar className="text-blue-500" /> Agenda Komsos
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {schedules.map((mass) => {
          const isJoined = mass.assignedUsers?.includes(currentUser?.uid);
          return (
            <div key={mass.id} className="bg-[#151b2b] p-5 rounded-2xl shadow-sm border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className={`inline-block text-[8px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider mb-1.5 ${getTypeColor(mass.type || 'Lainnya')}`}>
                    {mass.type || 'Agenda'}
                  </span>
                  <h3 className="font-bold text-white text-lg leading-tight">{mass.title}</h3>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${
                  mass.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                }`}>
                  {mass.status === 'OPEN' ? 'TERBUKA' : 'DITUTUP'}
                </span>
              </div>
              
              <div className="space-y-2.5 text-xs text-gray-400 mb-6 bg-gray-800/30 p-3 rounded-xl border border-gray-800/50">
                <div className="flex items-center gap-2.5"><Calendar size={14} className="text-blue-400" /> <span className="font-medium">{mass.date}</span></div>
                <div className="flex items-center gap-2.5"><Clock size={14} className="text-amber-400" /> <span className="font-medium">{mass.time} WIB</span></div>
                <div className="flex items-center gap-2.5"><MapPin size={14} className="text-emerald-400" /> <span className="truncate">{mass.location}</span></div>
                <div className="flex items-center gap-2.5 pt-2 border-t border-gray-700/50">
                  <Users size={14} className="text-purple-400"/> <span className="font-medium">{mass.assignedUsers?.length || 0} Konfirmasi Hadir</span>
                </div>
              </div>

              <button
                onClick={() => handleJoin(mass.id)}
                disabled={isJoined || mass.status === 'CLOSED'}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isJoined 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 cursor-default' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {isJoined ? <Check size={18} /> : <UserPlus size={18} />}
                {isJoined ? "Telah Mengonfirmasi Hadir" : "Gabung ke Agenda"}
              </button>
            </div>
          );
        })}
        {schedules.length === 0 && (
          <div className="col-span-full text-center py-10 bg-[#151b2b] rounded-2xl border border-gray-800 border-dashed">
            <p className="text-gray-500 text-sm">Tidak ada agenda yang dijadwalkan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
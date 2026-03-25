import React, { useState } from 'react';
// PERBAIKAN: Menambahkan Video, Palette, Clock, dan Users ke dalam import
import { X, Award, Camera, ShieldCheck, Star, Zap, CheckCircle2, Video, Palette, Clock, Users } from 'lucide-react';
import { awardBadge } from '../services/badgeService';

interface AwardBadgeModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export const AwardBadgeModal: React.FC<AwardBadgeModalProps> = ({ userId, userName, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);

  // Daftar Lencana yang tersedia (Bisa kamu tambah/ubah sesuai kebutuhan Komsos)
  const availableBadges = [
    { id: 'foto', name: 'Fotografer Andalan', desc: 'Konsisten menghasilkan foto liputan berkualitas tinggi.', icon: Camera, color: 'text-blue-500', bg: 'bg-blue-500/10', borderColor: 'border-blue-500' },
    { id: 'video', name: 'Videografer Kreatif', desc: 'Pengambilan gambar dan editing video yang memukau.', icon: Video, color: 'text-red-500', bg: 'bg-red-500/10', borderColor: 'border-red-500' },
    { id: 'desain', name: 'Desainer Grafis Super', desc: 'Visual desain yang menarik dan komunikatif.', icon: Palette, color: 'text-pink-500', bg: 'bg-pink-500/10', borderColor: 'border-pink-500' },
    { id: 'misa', name: 'Petugas Misa Teladan', desc: 'Selalu hadir tepat waktu saat tugas misa mingguan.', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10', borderColor: 'border-purple-500' },
    { id: 'eksklusif', name: 'Kontributor Eksklusif', desc: 'Menghasilkan karya yang berdampak besar bagi umat.', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10', borderColor: 'border-yellow-500' },
    { id: 'aktif', name: 'Anggota Teraktif', desc: 'Paling sering mengambil tugas sukarela.', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', borderColor: 'border-amber-500' },
    { id: 'disiplin', name: 'Tepat Waktu', desc: 'Selalu menyelesaikan tugas sebelum tenggat waktu.', icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500' },
    { id: 'solid', name: 'Tim Solid', desc: 'Sangat baik dalam kolaborasi dan komunikasi tim.', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10', borderColor: 'border-indigo-500' },
  ];
  
  const handleAward = async () => {
    if (!selectedBadge) return;
    setLoading(true);
    try {
      // Memanggil fungsi dari badgeService.ts milikmu
      await awardBadge(userId, selectedBadge.name, selectedBadge.id);
      alert(`Lencana ${selectedBadge.name} berhasil diberikan kepada ${userName}!`);
      onClose();
    } catch (error) {
      alert('Gagal memberikan lencana. Periksa koneksi atau izin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-5 z-50">
      <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl">
        
        {/* Header Modal */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg font-extrabold text-white">Beri Lencana</h2>
            <p className="text-xs text-gray-400 mt-1">
              Untuk: <strong className="text-gray-200">{userName}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Pilihan Lencana */}
        <div className="space-y-3 mb-6 max-h-[50vh] overflow-y-auto pr-1">
          {availableBadges.map((badge) => {
            const isSelected = selectedBadge?.id === badge.id;
            return (
              <button
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                  isSelected 
                    ? `${badge.bg} ${badge.borderColor} scale-[1.02] shadow-lg` 
                    : 'bg-[#0a0f18] border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className={`p-2 rounded-xl ${isSelected ? badge.bg : 'bg-gray-800'}`}>
                  <badge.icon className={`w-6 h-6 ${isSelected ? badge.color : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {badge.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    {badge.desc}
                  </p>
                </div>
                {isSelected && (
                  <CheckCircle2 className={`w-5 h-5 ${badge.color} shrink-0 mt-2`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Tombol Aksi */}
        <button 
          onClick={handleAward}
          disabled={!selectedBadge || loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <Award className="w-5 h-5" />
          {loading ? 'Memproses...' : 'Berikan Lencana'}
        </button>

      </div>
    </div>
  );
};
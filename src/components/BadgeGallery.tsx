import React, { useEffect, useState } from 'react';
import { Award, Star, Zap, Camera, ShieldCheck, Video, Palette, Clock, Users } from 'lucide-react';
import { subscribeToUserBadges } from '../services/badgeService';

export const BadgeGallery: React.FC<{ userId: string }> = ({ userId }) => {
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToUserBadges(userId, setBadges);
    return () => unsubscribe();
  }, [userId]);

  const getBadgeIcon = (name: string) => {
    if (name.includes("Foto")) return <Camera className="text-blue-500" size={20} />;
    if (name.includes("Video")) return <Video className="text-red-500" size={20} />;
    if (name.includes("Desain")) return <Palette className="text-pink-500" size={20} />;
    if (name.includes("Misa")) return <ShieldCheck className="text-purple-500" size={20} />;
    if (name.includes("Eksklusif")) return <Star className="text-yellow-500" size={20} />;
    if (name.includes("Teraktif")) return <Zap className="text-amber-500" size={20} />;
    if (name.includes("Waktu")) return <Clock className="text-emerald-500" size={20} />;
    if (name.includes("Solid")) return <Users className="text-indigo-500" size={20} />;
    return <Award className="text-gray-400" size={20} />;
  };

  if (badges.length === 0) return null;

  return (
    <div className="mt-4 border-t border-gray-800 pt-3">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Pencapaian ({badges.length})</h3>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => (
          <div 
            key={badge.id} 
            className="group relative flex items-center justify-center w-10 h-10 bg-[#0a0f18] rounded-full shadow-sm border border-gray-700 hover:border-gray-500 hover:scale-110 transition-all cursor-help"
          >
            {getBadgeIcon(badge.name)}
            
            {/* Tooltip melayang saat di-hover */}
            <span className="absolute bottom-full mb-2 scale-0 group-hover:scale-100 transition-all bg-gray-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-xl border border-gray-600">
              {badge.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
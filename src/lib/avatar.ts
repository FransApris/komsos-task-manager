import { UserAccount } from '../types';

/**
 * Mendapatkan URL avatar untuk pengguna.
 * Jika pengguna memiliki foto profil (URL), gunakan itu.
 * Jika tidak, gunakan avatar default berbasis inisial nama.
 */
export const getAvatarUrl = (user: UserAccount | null | undefined | any) => {
  if (!user) return 'https://ui-avatars.com/api/?name=User&background=random&color=fff';
  
  const img = user.img;
  const displayName = user.displayName || 'User';
  
  // Jika img adalah URL (http, blob, data), gunakan langsung
  if (img && (img.startsWith('http') || img.startsWith('blob:') || img.startsWith('data:'))) {
    return img;
  }
  
  // Fallback ke UI Avatars (Inisial Nama) - Sangat netral dan profesional
  // Gunakan warna berdasarkan gender jika tersedia
  let background = '6366f1'; // Default Indigo (Indigo-500)
  if (user.gender === 'MALE') background = '3b82f6'; // Blue-500
  if (user.gender === 'FEMALE') background = 'ec4899'; // Pink-500
  
  // Menggunakan encodeURIComponent untuk menangani karakter khusus dalam nama
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${background}&color=fff&size=150&font-size=0.4&bold=true`;
};

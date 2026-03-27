import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle2, XCircle, User as UserIcon, 
  Mail, Shield, UserCheck, Loader2, Search 
} from 'lucide-react';
import { 
  db, collection, query, where, getDocs, 
  doc, updateDoc, serverTimestamp 
} from '../firebase';
import { UserAccount, Role, Screen } from '../types';
import { getAvatarUrl } from '../lib/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface UserVerificationScreenProps {
  onNavigate: (screen: Screen) => void;
  role?: Role; // TAMBAHAN: Agar halaman tahu ini Superadmin atau Koordinator
}

export const UserVerificationScreen: React.FC<UserVerificationScreenProps> = ({ onNavigate, role }) => {
  const [pendingUsers, setPendingUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Identifikasi akses
  const isSuperAdmin = role === 'SUPERADMIN';

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'PENDING'));
      const snap = await getDocs(q);
      const users = snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          displayName: data.displayName || (data as any).name || 'User Baru'
        } as UserAccount;
      });
      setPendingUsers(users);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      toast.error("Gagal memuat data pengguna tertunda");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleVerify = async (userId: string, newRole: Role) => {
    setIsProcessing(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'ACTIVE',
        role: newRole,
        updatedAt: serverTimestamp()
      });

      // Send verification email
      const userToVerify = pendingUsers.find(u => u.id === userId);
      if (userToVerify) {
        try {
          await fetch('/api/send-verification-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userToVerify.email,
              displayName: userToVerify.displayName,
              role: newRole
            }),
          });
        } catch (emailError) {
          console.error("Failed to send verification email:", emailError);
          // We don't want to fail the whole verification if email fails, but we log it
        }
      }

      toast.success(`Pengguna berhasil diverifikasi sebagai ${newRole === 'USER' ? 'Petugas' : 'Koordinator'}`);
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error: any) {
      console.error("Error verifying user:", error);
      // Pesan error khusus jika Firebase menolak (Permission Denied)
      if (error.code === 'permission-denied') {
        toast.error("Akses Ditolak: Pastikan Aturan Firebase (Rules) mengizinkan Anda mengubah data.");
      } else {
        toast.error("Gagal memverifikasi pengguna");
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReject = async (userId: string) => {
    openConfirm(
      'Tolak Pendaftaran',
      'Apakah Anda yakin ingin menolak pendaftaran ini?',
      async () => {
        setIsProcessing(userId);
        try {
          await updateDoc(doc(db, 'users', userId), {
            status: 'REJECTED',
            updatedAt: serverTimestamp()
          });
          toast.info("Pendaftaran ditolak");
          setPendingUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error) {
          console.error("Error rejecting user:", error);
          toast.error("Gagal menolak pendaftaran");
        } finally {
          setIsProcessing(null);
        }
      }
    );
  };

  const filteredUsers = pendingUsers.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] text-white">
      <header className="p-5 flex items-center gap-4 sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button onClick={() => onNavigate('ADMIN_DASHBOARD')} className="p-2 bg-gray-800/50 rounded-xl border border-gray-700 text-gray-300">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">Verifikasi Pengguna</h1>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Pendaftaran Baru</p>
        </div>
      </header>

      <div className="p-5 flex-1 overflow-y-auto pb-40">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Cari nama atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-3 text-sm focus:border-blue-500 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Memuat data pendaftaran...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 bg-[#151b2b] rounded-3xl border border-gray-800 border-dashed">
            <UserIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Tidak ada pendaftaran baru yang perlu diverifikasi.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((u) => (
                <motion.div 
                  key={u.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 relative overflow-hidden"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gray-800 overflow-hidden ring-2 ring-blue-500/20">
                      <img 
                        src={getAvatarUrl(u)} 
                        alt={u.displayName} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base leading-tight mb-1">{u.displayName}</h3>
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Mail size={12} /> {u.email}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleVerify(u.id, 'USER')}
                      disabled={isProcessing === u.id}
                      className={`${isSuperAdmin ? '' : 'col-span-2'} flex items-center justify-center gap-2 bg-blue-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50`}
                    >
                      {isProcessing === u.id ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                      SETUJU PETUGAS
                    </button>
                    
                    {/* HANYA SUPERADMIN YANG BISA MELIHAT TOMBOL INI */}
                    {isSuperAdmin && (
                      <button 
                        onClick={() => handleVerify(u.id, 'ADMIN_MULTIMEDIA')}
                        disabled={isProcessing === u.id}
                        className="flex items-center justify-center gap-2 bg-purple-600 text-white text-xs font-bold py-3 rounded-xl hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isProcessing === u.id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        SETUJU KOORD.
                      </button>
                    )}

                    <button 
                      onClick={() => handleReject(u.id)}
                      disabled={isProcessing === u.id}
                      className="col-span-2 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 text-xs font-bold py-3 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isProcessing === u.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                      TOLAK PENDAFTARAN
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};
export default UserVerificationScreen;
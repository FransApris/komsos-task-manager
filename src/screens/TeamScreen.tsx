import React, { useState } from 'react';
import { Screen, Role, UserAccount } from '../types';
import { Users, Mail, Phone, ShieldAlert, CheckCircle2, ChevronDown, Plus, Trash2, Edit2, Save, X, Loader2, Award, Tag } from 'lucide-react';
import { db, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { AwardBadgeModal } from '../components/AwardBadgeModal';
import { BadgeGallery } from '../components/BadgeGallery';

interface TeamScreenProps {
  onNavigate: (s: Screen) => void;
  role?: Role;
  usersDb: UserAccount[];
  currentUser: UserAccount | null;
  setUsersDb?: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  setCurrentUser?: React.Dispatch<React.SetStateAction<UserAccount | null>>;
}

// DAFTAR DIVISI KOMSOS
const DIVISIONS_LIST = [
  'Fotografi', 
  'Videografi', 
  'Desain Grafis', 
  'Publikasi / Medsos', 
  'Website / App', 
  'Acara / Event'
];

export const TeamScreen: React.FC<TeamScreenProps> = ({ onNavigate, role, usersDb = [], setUsersDb, currentUser, setCurrentUser }) => {
  const isSuperAdmin = role === 'SUPERADMIN';
  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>('USER');
  const [editEmail, setEditEmail] = useState('');
  const [editDivisions, setEditDivisions] = useState<string[]>([]);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedUserForBadge, setSelectedUserForBadge] = useState<{id: string, name: string} | null>(null);

  const startEditing = (user: UserAccount) => {
    setEditingUserId(user.id);
    setEditName(user.displayName || '');
    setEditRole(user.role);
    setEditEmail(user.email || '');
    setEditDivisions(user.divisions || []); 
    setIsAdding(false);
    setErrorMessage(null);
  };

  const toggleDivision = (div: string) => {
    if (editDivisions.includes(div)) {
      setEditDivisions(editDivisions.filter(d => d !== div));
    } else {
      setEditDivisions([...editDivisions, div]);
    }
  };

  const saveEdit = async () => {
    if (editingUserId) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const userRef = doc(db, 'users', editingUserId);
        await updateDoc(userRef, {
          displayName: editName.trim(),
          role: editRole,
          email: editEmail.trim().toLowerCase(),
          divisions: editDivisions
        });
        setEditingUserId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${editingUserId}`);
        setErrorMessage("Gagal memperbarui anggota tim.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        await deleteDoc(doc(db, 'users', deleteConfirmId));
        setDeleteConfirmId(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${deleteConfirmId}`);
        setErrorMessage("Gagal menghapus anggota tim.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const saveNewUser = async () => {
    if (editName.trim() && editEmail.trim()) {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const tempId = `user_${Date.now()}`;
        await setDoc(doc(db, 'users', tempId), {
          uid: tempId,
          displayName: editName.trim(),
          email: editEmail.trim().toLowerCase(),
          role: editRole,
          status: 'ACTIVE',
          img: Math.floor(Math.random() * 20).toString(),
          createdAt: serverTimestamp()
        });
        setIsAdding(false);
        setEditName('');
        setEditEmail('');
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'users');
        setErrorMessage("Gagal menambah anggota tim.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setErrorMessage("Nama dan Email harus diisi.");
    }
  };

  const getRoleLabel = (r: Role) => {
    switch(r) {
      case 'SUPERADMIN': return 'Superadmin';
      case 'ADMIN_MULTIMEDIA': return 'Koord. Multimedia';
      case 'ADMIN_PHOTO_VIDEO': return 'Koord. Photo & Video';
      case 'ADMIN_PUBLICATION': return 'Koord. Publikasi';
      case 'USER': return 'Petugas (User)';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <h1 className="text-lg font-extrabold tracking-tight text-white">Tim Komsos</h1>
        {isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setIsAdding(true);
                setEditingUserId(null);
                setEditName('');
                setEditRole('USER');
              }}
              className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
            <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-bold text-purple-500">RBAC Mode</span>
            </div>
          </div>
        )}
      </header>
      
      <div className="p-5">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {isSuperAdmin && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
            <h3 className="font-bold text-sm text-blue-400 mb-1">Pengaturan Tim (RBAC)</h3>
            <p className="text-xs text-gray-400">Sebagai Superadmin, Anda dapat menambah, menghapus, dan mengubah role serta divisi anggota tim.</p>
          </div>
        )}

        <div className="space-y-4">
          {isAdding && (
            <div className="flex flex-col p-4 bg-[#151b2b] rounded-2xl border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-white text-sm">Tambah Anggota Baru</h4>
                <button onClick={() => setIsAdding(false)} className="p-1 bg-gray-800 rounded-full"><X className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama anggota..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email anggota..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Role Utama</label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['SUPERADMIN', 'ADMIN_MULTIMEDIA', 'ADMIN_PHOTO_VIDEO', 'ADMIN_PUBLICATION', 'USER'] as Role[]).map(r => (
                      <button key={r} onClick={() => setEditRole(r)} className={`flex items-center justify-between p-2 rounded-xl border text-left transition-colors ${editRole === r ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#0a0f18] border-gray-800 text-gray-400'}`}>
                        <span className="text-xs font-bold">{getRoleLabel(r)}</span>
                        {editRole === r && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={saveNewUser} disabled={isLoading} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Anggota'}
                </button>
              </div>
            </div>
          )}

          {usersDb.map((member) => (
            <div key={member.id} className="flex flex-col p-4 bg-[#151b2b] rounded-2xl border border-gray-800 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-gray-800 overflow-hidden shrink-0 border border-gray-700">
                    <img src={member.img?.startsWith('http') ? member.img : `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80&v=${member.img}`} alt={member.displayName} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingUserId === member.id ? (
                      <div className="space-y-2 mb-2">
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nama..." className="w-full bg-[#0a0f18] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email..." className="w-full bg-[#0a0f18] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
                      </div>
                    ) : (
                      <h4 className="font-bold text-white text-base truncate">{member.displayName || 'Tanpa Nama'}</h4>
                    )}
                    
                    {(!isSuperAdmin || editingUserId !== member.id) && (
                      <div className="flex flex-col items-start gap-1.5 mt-1">
                        <div className="inline-flex items-center gap-1.5 bg-gray-800/50 px-2.5 py-1 rounded-lg border border-gray-700">
                          <span className={`w-2 h-2 rounded-full ${member.role === 'SUPERADMIN' ? 'bg-purple-500' : member.role?.startsWith('ADMIN') ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                          <span className="text-[10px] font-bold text-gray-300">{getRoleLabel(member.role)}</span>
                        </div>

                        {/* Tampilan Label Divisi Saat Tidak Mode Edit */}
                        {member.divisions && member.divisions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.divisions.map(div => (
                              <span key={div} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-bold rounded-md border border-blue-500/20">
                                {div}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {isAdmin && (
                          <button onClick={() => setSelectedUserForBadge({ id: member.id || member.uid || '', name: member.displayName || '' })} className="mt-1 text-[10px] bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-lg border border-yellow-500/20 font-bold flex items-center gap-1.5 hover:bg-yellow-500/20 transition-colors">
                            <Award className="w-3.5 h-3.5" /> Beri Lencana
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 shrink-0 self-start ml-2">
                  {isSuperAdmin && editingUserId !== member.id && (
                    <button onClick={() => startEditing(member)} className="p-2 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/30 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {isSuperAdmin && editingUserId === member.id && (
                    <button onClick={() => setDeleteConfirmId(member.id)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  {!isSuperAdmin && editingUserId !== member.id && (
                    <div className="flex gap-2">
                      <a href={`mailto:${member.email}`} className="p-2 bg-gray-800 rounded-full hover:bg-blue-600 transition-colors shadow-sm"><Mail className="w-4 h-4 text-gray-300 hover:text-white" /></a>
                      <a href={`tel:${(member as any).phone || '+6281234567890'}`} className="p-2 bg-gray-800 rounded-full hover:bg-emerald-600 transition-colors shadow-sm"><Phone className="w-4 h-4 text-gray-300 hover:text-white" /></a>
                    </div>
                  )}
                </div>
              </div>

              <BadgeGallery userId={member.id || member.uid} />

              {deleteConfirmId === member.id && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xs font-bold text-red-500 mb-3">Hapus anggota ini? Tindakan ini tidak dapat dibatalkan.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 bg-gray-800 text-white rounded-lg text-[10px] font-bold">Batal</button>
                    <button onClick={confirmDelete} disabled={isLoading} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50">
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ya, Hapus'}
                    </button>
                  </div>
                </div>
              )}

              {/* EDITOR ROLE DAN DIVISI (Mode Edit Sebaris) */}
              {isSuperAdmin && editingUserId === member.id && (
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                  
                  {/* Pilihan Role Utama */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Pilih Role Utama:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {(['SUPERADMIN', 'ADMIN_MULTIMEDIA', 'ADMIN_PHOTO_VIDEO', 'ADMIN_PUBLICATION', 'USER'] as Role[]).map(r => (
                        <button key={r} onClick={() => setEditRole(r)} className={`flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${editRole === r ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-[#0a0f18] border-gray-800 text-gray-400 hover:border-gray-600'}`}>
                          <span className="text-sm font-bold">{getRoleLabel(r)}</span>
                          {editRole === r && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pilihan Divisi Baru -> SIMBOL '>' SUDAH DIHAPUS DI SINI */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1.5"><Tag size={12}/> Pilih Divisi (Bisa Lebih dari 1):</p>
                    <div className="flex flex-wrap gap-2">
                      {DIVISIONS_LIST.map((div) => {
                        const isSelected = editDivisions.includes(div);
                        return (
                          <button
                            key={div}
                            onClick={() => toggleDivision(div)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${isSelected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-[#0a0f18] text-gray-500 border-gray-800 hover:border-gray-600'}`}
                          >
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />} {div}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tombol Simpan/Batal */}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditingUserId(null)} className="flex-1 py-3 bg-gray-800 text-white rounded-xl text-xs font-bold hover:bg-gray-700 transition-colors">Batal</button>
                    <button onClick={saveEdit} disabled={isLoading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50">
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Simpan</>}
                    </button>
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedUserForBadge && (
        <AwardBadgeModal 
          userId={selectedUserForBadge.id} 
          userName={selectedUserForBadge.name} 
          onClose={() => setSelectedUserForBadge(null)} 
        />
      )}
    </div>
  );
};
export default TeamScreen;
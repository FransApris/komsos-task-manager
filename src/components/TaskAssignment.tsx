import { useState } from 'react';
import { auth } from '../firebase';
import { assignUserToTask } from '../services/taskService';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

interface Props {
  task: any;
  userRole: string;
  allMembers?: any[]; // Daftar semua anggota Komsos (hanya untuk Admin)
}

export default function TaskAssignment({ task, userRole, allMembers }: Props) {
  const [loading, setLoading] = useState(false);
  const currentUser = auth.currentUser;

  // Cek apakah user sudah terdaftar di tugas ini
  const isAssigned = task.assignedUsers?.includes(currentUser?.uid);

  const handleAssignment = async (userId: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // Find member name if admin is assigning, otherwise use currentUser name
      const member = allMembers?.find(m => m.uid === userId);
      const userName = member ? member.name : (currentUser.displayName || 'Anggota Komsos');
      
      await assignUserToTask(task.id, userId, task.title, userName);
    } catch (err) {
      // Error handled by handleFirestoreError in service
    } finally {
      setLoading(false);
    }
  };

  // TAMPILAN 1: Untuk ADMIN (Penunjukan/Pembagian Tugas)
  if (userRole.startsWith('ADMIN_') || userRole === 'SUPERADMIN') {
    return (
      <div className="mt-4 border-t pt-4">
        <p className="text-sm font-medium text-slate-700 mb-2">Tunjuk Petugas (Admin):</p>
        <select 
          className="w-full p-2 border rounded-lg text-sm bg-slate-50"
          onChange={(e) => handleAssignment(e.target.value)}
          defaultValue=""
          disabled={loading}
        >
          <option value="" disabled>Pilih Anggota Komsos...</option>
          {allMembers?.map(member => (
            <option key={member.uid} value={member.uid}>
              {member.name} ({member.role})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // TAMPILAN 2: Untuk USER (Kerelaan/Ambil Tugas)
  return (
    <button
      onClick={() => handleAssignment(currentUser!.uid)}
      disabled={loading || isAssigned}
      className={`mt-4 w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
        isAssigned 
        ? 'bg-green-50 text-green-600 border border-green-200 cursor-default' 
        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
      }`}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : (isAssigned ? <UserCheck size={18} /> : <UserPlus size={18} />)}
      {isAssigned ? "Terdaftar" : "Ambil Tugas Ini"}
    </button>
  );
}
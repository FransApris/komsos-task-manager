import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, Send, Wrench, User, Loader2, X, Trash2 } from 'lucide-react';
import { Screen, Role, UserAccount } from '../types';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, arrayUnion, where, limit, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface HelpdeskScreenProps {
  onNavigate: (s: Screen) => void;
  role: Role;
  currentUser: UserAccount | null;
}

export const HelpdeskScreen: React.FC<HelpdeskScreenProps> = ({ onNavigate, role, currentUser }) => {
  const isAdmin = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State untuk Navigasi & Tampilan
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  // State untuk Form Tiket Baru (Hanya User)
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Pertanyaan / Umum');
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk Chat Balasan
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Admin melihat semua tiket. User hanya melihat tiket miliknya.
    // Tambahkan limit untuk mempercepat loading awal
    const ticketsRef = collection(db, 'helpdesk_tickets');
    const q = isAdmin 
      ? query(ticketsRef, orderBy('updatedAt', 'desc'), limit(50))
      : query(ticketsRef, where('userId', '==', currentUser.uid), orderBy('updatedAt', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(ticketData);
      
      // Update selected ticket jika sedang dibuka
      if (selectedTicket) {
        const updatedSelected = ticketData.find(t => t.id === selectedTicket.id);
        if (updatedSelected) setSelectedTicket(updatedSelected);
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'helpdesk_tickets');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin, selectedTicket?.id]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'helpdesk_tickets'), {
        userId: currentUser.uid,
        userName: currentUser.displayName,
        subject: newSubject,
        category: newCategory,
        status: 'OPEN',
        messages: [{
          senderId: currentUser.uid,
          senderName: currentUser.displayName,
          text: newMessage,
          timestamp: new Date().toISOString()
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success('Pesan berhasil dikirim ke Pengurus!');
      setNewSubject('');
      setNewMessage('');
      setActiveTab('LIST');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'helpdesk_tickets');
      toast.error('Gagal mengirim pesan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket || !currentUser) return;

    setIsReplying(true);
    try {
      const newReply = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: replyText,
        timestamp: new Date().toISOString()
      };

      await updateDoc(doc(db, 'helpdesk_tickets', selectedTicket.id), {
        messages: arrayUnion(newReply),
        status: isAdmin ? 'REPLIED' : 'OPEN',
        updatedAt: serverTimestamp()
      });
      
      setReplyText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `helpdesk_tickets/${selectedTicket.id}`);
      toast.error('Gagal mengirim balasan.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;
    try {
      await updateDoc(doc(db, 'helpdesk_tickets', selectedTicket.id), {
        status: 'RESOLVED',
        updatedAt: serverTimestamp()
      });
      toast.success('Tiket ditandai sebagai Selesai');
      setSelectedTicket(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `helpdesk_tickets/${selectedTicket.id}`);
      toast.error('Gagal menyelesaikan tiket.');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    try {
      await deleteDoc(doc(db, 'helpdesk_tickets', ticketId));
      toast.success('Laporan berhasil dihapus');
      setSelectedTicket(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `helpdesk_tickets/${ticketId}`);
      toast.error('Gagal menghapus laporan.');
    }
  };

  const getCategoryIcon = (cat: string) => {
    if (cat.includes('Alat')) return <Wrench className="w-4 h-4 text-orange-500" />;
    if (cat.includes('Izin')) return <Clock className="w-4 h-4 text-purple-500" />;
    return <MessageSquare className="w-4 h-4 text-blue-500" />;
  };

  if (selectedTicket) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] h-full text-white">
        <header className="p-4 flex items-center gap-3 bg-[#151b2b] border-b border-gray-800 shrink-0">
          <button onClick={() => setSelectedTicket(null)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
            <ChevronLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex-1 overflow-hidden">
            <h1 className="text-sm font-bold truncate">{selectedTicket.subject}</h1>
            <p className="text-[10px] text-gray-400">{selectedTicket.userName} • {selectedTicket.category}</p>
          </div>
          <div className="flex items-center gap-2">
            {role === 'SUPERADMIN' && (
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors" title="Hapus Tiket">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isAdmin && selectedTicket.status !== 'RESOLVED' && (
              <button onClick={handleResolveTicket} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-bold border border-emerald-500/20 whitespace-nowrap">
                Tandai Selesai
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
          {selectedTicket.status === 'RESOLVED' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-emerald-500">Tiket/Laporan ini telah diselesaikan.</span>
            </div>
          )}

          {selectedTicket.messages.map((msg: any, index: number) => {
            const isMe = msg.senderId === currentUser?.uid;
            return (
              <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-800 text-gray-200 rounded-tl-sm'}`}>
                  {msg.text}
                </div>
                <span className="text-[8px] text-gray-600 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            );
          })}
        </div>

        {selectedTicket.status !== 'RESOLVED' && (
          <form onSubmit={handleReply} className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[390px] p-4 bg-[#151b2b] border-t border-gray-800 flex gap-2">
            <input 
              type="text" 
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Ketik balasan..."
              className="flex-1 bg-[#0a0f18] border border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
            <button type="submit" disabled={isReplying || !replyText.trim()} className="p-3 bg-blue-600 rounded-xl text-white disabled:opacity-50">
              {isReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        )}

        {/* Modal Konfirmasi Hapus (Detail View) */}
        <ConfirmationModal 
          isOpen={showDeleteConfirm}
          title="Hapus Laporan?"
          message="Tindakan ini akan menghapus seluruh percakapan dalam laporan ini secara permanen."
          onConfirm={() => handleDeleteTicket(selectedTicket.id)}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate(isAdmin ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-lg font-extrabold tracking-tight">Hubungi Pengurus</h1>
        {!isAdmin && activeTab === 'LIST' ? (
          <button onClick={() => setActiveTab('CREATE')} className="p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5 text-white" />
          </button>
        ) : <div className="w-9" />}
      </header>

      <div className="p-5">
        {activeTab === 'CREATE' && !isAdmin && (
          <form onSubmit={handleCreateTicket} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-300">Buat Pesan / Laporan Baru</h2>
              <button type="button" onClick={() => setActiveTab('LIST')} className="text-[10px] text-gray-500 bg-gray-800 px-2 py-1 rounded-md">Batal</button>
            </div>
            
            <div className="bg-[#151b2b] p-5 rounded-3xl border border-gray-800 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Kategori Laporan</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 appearance-none">
                  <option value="Pertanyaan / Umum">Pertanyaan / Umum</option>
                  <option value="Izin Absen Tugas">Izin Absen Tugas</option>
                  <option value="Laporan Alat Rusak">Laporan Alat Rusak</option>
                  <option value="Usulan / Ide">Usulan / Ide Program</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Judul / Subjek</label>
                <input type="text" required value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Contoh: Kamera Canon 7D Error" className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Detail Pesan</label>
                <textarea required rows={5} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Jelaskan secara detail keluhan atau pesan Anda di sini..." className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none"></textarea>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Kirim Pesan
              </button>
            </div>
          </form>
        )}

        {activeTab === 'LIST' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" /></div>
            ) : tickets.length > 0 ? (
              tickets.map(ticket => (
                <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-[#151b2b] p-4 rounded-2xl border border-gray-800 cursor-pointer hover:border-blue-500/50 transition-all flex items-start gap-4 group">
                  <div className="p-3 bg-gray-800/50 rounded-xl shrink-0 group-hover:bg-[#0a0f18] transition-colors">
                    {getCategoryIcon(ticket.category)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <h3 className="text-sm font-bold text-white truncate">{ticket.subject}</h3>
                        {((isAdmin && ticket.status === 'OPEN') || (!isAdmin && ticket.status === 'REPLIED')) && (
                          <span className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse shrink-0"></span>
                        )}
                      </div>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shrink-0 ${
                        ticket.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                        ticket.status === 'REPLIED' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        {ticket.status === 'RESOLVED' ? 'Selesai' : ticket.status === 'REPLIED' ? 'Dibalas' : 'Menunggu'}
                      </span>
                    </div>
                    {isAdmin && <p className="text-[10px] text-blue-400 font-bold mb-1 flex items-center gap-1"><User size={10}/> {ticket.userName}</p>}
                    <p className="text-xs text-gray-400 line-clamp-1 mb-2">{ticket.messages[ticket.messages.length - 1]?.text}</p>
                    <p className="text-[9px] text-gray-600 font-medium">Diupdate: {new Date(ticket.updatedAt?.toDate() || Date.now()).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-16 bg-[#151b2b] rounded-3xl border border-gray-800 border-dashed">
                <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400 font-medium text-sm">Belum ada pesan/laporan.</p>
                {!isAdmin && <p className="text-xs text-gray-500 mt-1">Klik tombol + di atas untuk menghubungi pengurus.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpdeskScreen;
import React, { useState } from 'react';
import { Screen, Role, UserAccount, Inventory } from '../types';
import { 
  ChevronLeft, Plus, Search, Filter, Camera, Mic, 
  Lightbulb, Wrench, Trash2, Edit2, CheckCircle2, User, Loader2, X, Save,
  QrCode, ScanLine, RefreshCw, Camera as CameraIcon, AlertTriangle
} from 'lucide-react';
import { db, auth, collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc, handleFirestoreError, OperationType } from '../firebase';
import { motion } from 'motion/react';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { toast } from 'sonner';

export const InventoryScreen: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role?: Role,
  usersDb?: UserAccount[], 
  inventoryDb?: Inventory[],
  currentUser?: UserAccount | null
}> = ({ onNavigate, role, usersDb = [], inventoryDb = [], currentUser }) => {
  const isAdminRole = role === 'SUPERADMIN' || role?.startsWith('ADMIN_');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // State untuk Fitur Scanner
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [scanId, setScanId] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Kamera');
  const [status, setStatus] = useState<'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN'>('AVAILABLE');
  const [customId, setCustomId] = useState(''); // State Baru: Untuk ID Barcode kustom

  const categories = ['Semua', 'Kamera', 'Audio', 'Lighting', 'Aksesoris', 'Lainnya'];

  const filteredInventory = (inventoryDb || []).filter(item => {
    const matchesSearch = (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (item.id === searchTerm);
    const matchesCategory = filterCategory === 'Semua' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Fungsi untuk membuat ID acak yang mudah dibaca (misal: KMD-9A2F)
  const generateRandomId = () => {
    const prefix = category === 'Kamera' ? 'CAM' : category === 'Audio' ? 'AUD' : category === 'Lighting' ? 'LGT' : 'ITM';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${random}`;
  };

  const openAddModal = () => {
    setName('');
    setCategory('Kamera');
    setStatus('AVAILABLE');
    setCustomId(generateRandomId()); // Beri saran ID acak
    setEditingItem(null);
    setIsAdding(true);
  };

  const openEditModal = (item: Inventory) => {
    setName(item.name);
    setCategory(item.category);
    setStatus(item.status);
    setCustomId(item.id); // Gunakan ID yang sudah ada
    setEditingItem(item);
    setIsAdding(true);
  };

  // --- LOGIKA CRUD ALAT ---
  const handleSave = async () => {
    if (!name.trim()) return;
    
    // Validasi ID (Hanya boleh huruf, angka, dan strip)
    const finalId = customId.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || generateRandomId();

    // Cek apakah ID sudah dipakai barang lain (khusus saat Tambah Baru atau Ganti ID)
    if (!editingItem || editingItem.id !== finalId) {
      const isIdExist = inventoryDb.some(i => i.id === finalId);
      if (isIdExist) {
        toast.error(`ID Barcode "${finalId}" sudah digunakan oleh barang lain. Gunakan ID yang unik.`);
        return;
      }
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        // Data yang akan disimpan
        const itemData: any = {
          name: name.trim(),
          category,
          status,
          updatedAt: serverTimestamp(),
          lastChecked: serverTimestamp(),
          assignedTo: (status === 'AVAILABLE' || status === 'MAINTENANCE' || status === 'BROKEN') 
            ? null 
            : (editingItem.assignedTo || null)
        };

        // PERHATIAN: Di Firestore, Anda TIDAK BISA mengganti ID dokumen (doc.id) yang sudah ada. 
        // Jika ID Barcode diubah, kita harus menghapus dokumen lama dan membuat yang baru.
        if (editingItem.id !== finalId) {
          // Buat dokumen baru dengan ID baru
          await setDoc(doc(db, 'inventory', finalId), {
            ...itemData,
            createdAt: (editingItem as any).createdAt || serverTimestamp()
          });
          // Hapus dokumen lama
          await deleteDoc(doc(db, 'inventory', editingItem.id));
        } else {
          // Jika ID sama, cukup update isinya
          await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
        }
        toast.success('Barang berhasil diperbarui');
      } else {
        // Tambah Baru menggunakan custom ID (setDoc)
        await setDoc(doc(db, 'inventory', finalId), {
          name: name.trim(),
          category,
          status,
          assignedTo: null,
          createdAt: serverTimestamp(),
          lastChecked: serverTimestamp()
        });
        toast.success('Barang berhasil ditambahkan');
      }
      setIsAdding(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error("Error saving inventory item:", error);
      handleFirestoreError(error, OperationType.WRITE, `inventory/${finalId}`);
      toast.error(`Gagal menyimpan barang: ${error.message || 'Pastikan koneksi internet stabil.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    openConfirm(
      'Hapus Barang',
      'Apakah Anda yakin ingin menghapus barang ini dari inventaris?',
      async () => {
        setDeletingId(id);
        try {
          await deleteDoc(doc(db, 'inventory', id));
          toast.success('Barang berhasil dihapus');
        } catch (error: any) {
          console.error("Error deleting item:", error);
          handleFirestoreError(error, OperationType.DELETE, `inventory/${id}`);
          toast.error(`Gagal menghapus barang: ${error.message || 'Terjadi kesalahan.'}`);
        } finally {
          setDeletingId(null);
        }
      }
    );
  };

  // --- LOGIKA PEMINJAMAN VIA SCANNER ---
  const handleProcessScan = async () => {
    if (!scanId.trim()) return;
    
    const activeUserId = currentUser?.uid || auth.currentUser?.uid;
    if (!activeUserId) {
      toast.error("Anda harus login untuk meminjam alat.");
      return;
    }

    setIsLoading(true);
    try {
      const item = inventoryDb?.find(i => 
        i.id.toUpperCase() === scanId.trim().toUpperCase() || 
        i.name.toLowerCase() === scanId.trim().toLowerCase()
      );

      if (!item) {
        toast.error(`Barang dengan Barcode/Nama "${scanId}" tidak ditemukan!`);
        setIsLoading(false);
        return;
      }

      const itemRef = doc(db, 'inventory', item.id);

      if (item.status === 'AVAILABLE') {
        await updateDoc(itemRef, {
          status: 'IN_USE',
          assignedTo: activeUserId,
          updatedAt: serverTimestamp(),
          lastChecked: serverTimestamp()
        });
        toast.success(`Berhasil MEMINJAM: ${item.name}`);
        
      } else if (item.status === 'IN_USE') {
        if (item.assignedTo === activeUserId || isAdminRole) {
          await updateDoc(itemRef, {
            status: 'AVAILABLE',
            assignedTo: null,
            updatedAt: serverTimestamp(),
            lastChecked: serverTimestamp()
          });
          toast.success(`Berhasil MENGEMBALIKAN: ${item.name}`);
        } else {
          toast.error(`Gagal! Alat ini sedang dipinjam oleh anggota lain.`);
        }
      } else {
        toast.error(`Tidak bisa dipinjam. Status alat sedang: ${item.status}`);
      }

      setScanId('');
      setIsScanning(false);
    } catch (error: any) {
      console.error("Error scanning item:", error);
      handleFirestoreError(error, OperationType.UPDATE, `inventory/${scanId}`);
      toast.error(`Gagal memproses scan: ${error.message || 'Terjadi kesalahan sistem.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch(cat) {
      case 'Kamera': return <Camera size={18}/>;
      case 'Audio': return <Mic size={18}/>;
      case 'Lighting': return <Lightbulb size={18}/>;
      default: return <Wrench size={18}/>;
    }
  };

  const getStatusColor = (stat: string) => {
    switch(stat) {
      case 'AVAILABLE': return 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10';
      case 'IN_USE': return 'text-blue-500 border-blue-500/30 bg-blue-500/10';
      case 'MAINTENANCE': return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      case 'BROKEN': return 'text-red-500 border-red-500/30 bg-red-500/10';
      default: return 'text-gray-500 border-gray-500/30 bg-gray-500/10';
    }
  };

  if (!inventoryDb || !usersDb) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-gray-500">
        <Loader2 className="animate-spin mb-2" />
        <p className="text-xs font-bold uppercase tracking-widest">Memuat Inventaris...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-48 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate(isAdminRole ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Inventaris Komsos</h1>
        <div className="w-9">
          {isAdminRole && (
            <button className="p-2 bg-blue-600 rounded-full shadow-lg shadow-blue-500/20" onClick={openAddModal}>
              <Plus className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </header>

      <div className="p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Barcode ID atau nama barang..."
            className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:border-blue-500 outline-none transition-colors text-white"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <div className="p-2 bg-[#151b2b] border border-gray-800 rounded-xl shrink-0 flex items-center justify-center">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterCategory === cat 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-[#151b2b] text-gray-400 border border-gray-800 hover:border-gray-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {(filteredInventory || []).map(item => (
            <div key={item.id} className="bg-[#151b2b] border border-gray-800 rounded-2xl p-4 flex flex-col gap-3 group">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gray-800 rounded-xl text-gray-400 group-hover:text-blue-400 transition-colors">
                    {getCategoryIcon(item.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{item.name}</h3>
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5 tracking-wider">
                      <QrCode className="w-3 h-3" /> {item.id}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter ${getStatusColor(item.status)}`}>
                  {item.status.replace('_', ' ')}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
                <div className="flex items-center gap-2">
                  {item.assignedTo ? (
                    <>
                      <User className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-gray-400">
                        Dipinjam: {(usersDb || []).find(u => u.uid === item.assignedTo || u.id === item.assignedTo)?.displayName || 'Petugas'}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Tersedia di Lemari
                    </span>
                  )}
                </div>
                
                {isAdminRole && (
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(item)} className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors bg-gray-800 rounded-lg">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors bg-gray-800 rounded-lg disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredInventory.length === 0 && (
            <div className="text-center py-10 bg-[#151b2b] rounded-2xl border border-gray-800 border-dashed">
              <p className="text-gray-500 text-sm flex flex-col items-center justify-center gap-2">
                <ScanLine className="w-8 h-8 opacity-50" />
                Tidak ada barang yang ditemukan.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FLOATING ACTION BUTTON: SCANNER */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 z-20 pb-4">
        <button 
          onClick={() => setIsScanning(true)}
          className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-3 uppercase tracking-wider"
        >
          <ScanLine className="w-5 h-5" /> Peminjaman / Kembali
        </button>
      </div>

      {/* --- MODAL SCANNER --- */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl flex flex-col items-center">
            
            <div className="flex justify-between items-center w-full mb-6">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-2"><QrCode className="text-emerald-500"/> Scanner Barcode</h3>
              <button onClick={() => setIsScanning(false)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-48 h-48 border-2 border-emerald-500/50 rounded-3xl mb-6 overflow-hidden bg-black flex items-center justify-center">
              <motion.div 
                animate={{ y: [0, 192, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_20px_3px_#10b981] z-10"
              />
              <QrCode className="w-20 h-20 text-gray-700 opacity-50" />
            </div>

            <button 
              onClick={() => setIsCameraScanning(true)}
              className="w-full mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              <CameraIcon size={16} /> Gunakan Kamera HP
            </button>
            
            <p className="text-xs text-gray-400 mb-4 text-center leading-relaxed">
              Scan stiker barcode fisik, atau ketik ID Barcode secara manual di bawah ini.
            </p>

            <input 
              type="text" 
              autoFocus
              value={scanId}
              onChange={(e) => setScanId(e.target.value.toUpperCase())} // Paksa huruf besar
              onKeyDown={(e) => e.key === 'Enter' && handleProcessScan()}
              placeholder="Contoh ID: CAM-9A2F"
              className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-4 text-lg tracking-widest text-center text-emerald-400 focus:border-emerald-500 outline-none transition-colors font-black mb-4 uppercase placeholder:text-gray-700 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
            />

            <button 
              onClick={handleProcessScan}
              disabled={isLoading || !scanId.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isLoading ? 'Memproses...' : 'Proses Barang'}
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL ADD / EDIT MANUAL --- */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-6 shadow-2xl animate-in zoom-in-95 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-white">{editingItem ? 'Edit Barang' : 'Tambah Alat Baru'}</h3>
              <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* === KOLOM BARU: BARCODE ID === */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl mb-2">
                <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>ID Barcode (Unik)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setIsCameraScanning(true)} className="flex items-center gap-1 text-[9px] bg-emerald-500/20 px-2 py-1 rounded">
                      <CameraIcon size={10} /> Kamera
                    </button>
                    <button onClick={() => setCustomId(generateRandomId())} className="flex items-center gap-1 text-[9px] bg-emerald-500/20 px-2 py-1 rounded">
                      <RefreshCw size={10} /> Acak
                    </button>
                  </div>
                </label>
                <input 
                  type="text" 
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value.toUpperCase())}
                  placeholder="Scan stiker barcode disini..."
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-emerald-400 font-bold tracking-widest focus:border-emerald-500 outline-none transition-colors uppercase"
                />
                <p className="text-[9px] text-gray-500 mt-2 leading-relaxed">Penting: Arahkan kursor ke kotak ini lalu scan stiker barcode untuk mengisi otomatis, atau biarkan ID acak.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nama Barang</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Merek / Tipe Alat (Contoh: Sony A7III)"
                  className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Kategori</label>
                  <select 
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      if (!editingItem) setCustomId(generateRandomId()); // Ganti awalan ID saat kategori berubah
                    }}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
                  >
                    <option value="Kamera">Kamera</option>
                    <option value="Audio">Audio</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Aksesoris">Aksesoris</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Kondisi</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
                  >
                    <option value="AVAILABLE">Tersedia</option>
                    <option value="IN_USE">Dipinjam</option>
                    <option value="MAINTENANCE">Perbaikan</option>
                    <option value="BROKEN">Rusak</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={isLoading || !name.trim() || !customId.trim()}
              className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isLoading ? 'Menyimpan...' : 'Simpan Barang'}
            </button>
          </div>
        </div>
      )}
      {/* --- MODAL SCANNER KAMERA --- */}
      {isCameraScanning && (
        <BarcodeScannerModal 
          onScan={(decodedText) => {
            if (isAdding) {
              setCustomId(decodedText.toUpperCase());
            } else if (isScanning) {
              setScanId(decodedText.toUpperCase());
            }
            setIsCameraScanning(false);
          }}
          onClose={() => setIsCameraScanning(false)}
        />
      )}

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

export default InventoryScreen;
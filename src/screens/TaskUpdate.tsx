import React, { useState, useRef } from 'react';
import { ChevronLeft, Image as ImageIcon, X } from 'lucide-react';
import { Screen, Task } from '../types';
import { db, auth, doc, updateDoc, arrayUnion, serverTimestamp } from '../firebase';

export const TaskUpdate: React.FC<{ 
  onNavigate: (s: Screen) => void,
  taskId: string | null,
  tasksDb?: Task[]
}> = ({ onNavigate, taskId, tasksDb = [] }) => {
  const task = (tasksDb || []).find(t => t.id === taskId);
  const [progressNotes, setProgressNotes] = useState('');
  const [attachment, setAttachment] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] items-center justify-center p-10 text-center">
        <p className="text-gray-500 mb-4">Tugas tidak ditemukan.</p>
        <button onClick={() => onNavigate('TASKS')} className="text-blue-500 font-bold">Kembali</button>
      </div>
    );
  }

  // --- FUNGSI BARU: Kompresi Gambar ke Base64 (Maks 1MB) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Batas maksimal resolusi gambar (800px)
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        // Hitung rasio untuk mengecilkan gambar tanpa mengubah proporsi
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        // Gambar ulang di canvas dengan ukuran baru
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Kompres menjadi format JPEG dengan kualitas 60% (0.6)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        // Simpan hasil kompresi ke state
        setAttachment(compressedBase64);
      };
      // Trigger load image
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async () => {
    if (!progressNotes.trim() && !attachment) {
      alert("Catatan atau foto progress tidak boleh kosong!");
      return;
    }
    
    setIsLoading(true);
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const user = auth.currentUser;
      
      const newProgress = {
        note: progressNotes,
        img: attachment,
        date: new Date().toISOString(),
        userId: user?.uid,
        userName: user?.displayName || 'Anggota Tim'
      };

      await updateDoc(taskRef, {
        progressHistory: arrayUnion(newProgress),
        updatedAt: serverTimestamp()
      });
      
      alert("Update berhasil dikirim!");
      onNavigate('TASK_DETAIL');
    } catch (err: any) {
      console.error("Error updating task progress:", err);
      // Menampilkan pesan error asli dari Firebase jika masih gagal
      alert("Gagal mengirim update: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('TASK_DETAIL')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-300">Update Progress</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2 text-white">{task.title}</h3>
          <p className="text-xs text-gray-400 font-medium">Laporkan perkembangan tugas Anda.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Catatan Progress</label>
            <textarea 
              rows={4} 
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              placeholder="Tuliskan detail pekerjaan yang sudah dilakukan..." 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-xl px-4 py-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-white resize-none"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lampirkan Bukti</label>
            
            {attachment ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-blue-500">
                <img src={attachment} alt="Preview" className="w-full h-full object-cover" />
                <button onClick={() => setAttachment(null)} className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white shadow-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="bg-[#151b2b] border border-gray-800 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-xs font-bold">Unggah Foto</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 z-20">
        <button 
          onClick={handleUpdate}
          disabled={isLoading || (!progressNotes && !attachment)}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {isLoading ? 'Mengirim...' : 'Kirim Update'}
        </button>
      </div>
    </div>
  );
};
export default TaskUpdate;
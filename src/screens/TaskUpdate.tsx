import React, { useState, useRef } from 'react';
import { ChevronLeft, Image as ImageIcon, X, Camera, Plus, Loader2, AlertCircle } from 'lucide-react';
import { Screen, Task } from '../types';
import { db, auth, doc, updateDoc, arrayUnion, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { CameraModal } from '../components/CameraModal';
import { compressImage } from '../lib/imageUtils';
import { toast } from 'sonner';

export const TaskUpdate: React.FC<{ 
  onNavigate: (s: Screen) => void,
  taskId: string | null,
  tasksDb?: Task[]
}> = ({ onNavigate, taskId, tasksDb = [] }) => {
  const task = (tasksDb || []).find(t => t.id === taskId);
  const [progressNotes, setProgressNotes] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] items-center justify-center p-10 text-center">
        <p className="text-gray-500 mb-4 text-sm">Tugas tidak ditemukan.</p>
        <button onClick={() => onNavigate('TASKS')} className="text-blue-500 font-bold text-sm">Kembali ke Daftar Tugas</button>
      </div>
    );
  }

  const MAX_PHOTOS = 5;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - attachments.length;
    if (remainingSlots <= 0) {
      toast.error(`Maksimal ${MAX_PHOTOS} foto diperbolehkan.`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        // Kompresi gambar menggunakan utility
        const compressedBlob = await compressImage(file, 800, 800, 0.6);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          setAttachments(prev => [...prev, base64].slice(0, MAX_PHOTOS));
        };
        reader.readAsDataURL(compressedBlob);
      } catch (error) {
        console.error("Gagal mengompresi gambar:", error);
        toast.error("Gagal memproses salah satu gambar.");
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdate = async () => {
    if (!progressNotes.trim() && attachments.length === 0) {
      toast.error("Catatan atau foto progress tidak boleh kosong!");
      return;
    }
    
    setIsLoading(true);
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const user = auth.currentUser;
      
      const newProgress = {
        note: progressNotes,
        // For backward compatibility with UI that expects a single 'img', 
        // we'll store the first image in 'img' and the full array in 'images'
        img: attachments.length > 0 ? attachments[0] : null,
        images: attachments,
        date: new Date().toISOString(),
        userId: user?.uid,
        userName: user?.displayName || 'Anggota Tim'
      };

      await updateDoc(taskRef, {
        progressHistory: arrayUnion(newProgress),
        updatedAt: serverTimestamp()
      });
      
      toast.success("Update progress berhasil dikirim!");
      onNavigate('TASK_DETAIL');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
      toast.error("Gagal mengirim update: " + err.message);
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
        <h1 className="text-xs font-extrabold tracking-widest uppercase text-gray-300">Update Progress</h1>
        <div className="w-9"></div>
      </header>

      <div className="p-5 space-y-8">
        <div className="bg-linear-to-br from-blue-600/20 to-transparent p-5 rounded-3xl border border-blue-500/20">
          <h3 className="font-black text-xl mb-1 text-white">{task.title}</h3>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Laporkan perkembangan tugas Anda</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Catatan Progress</label>
            <textarea 
              rows={4} 
              value={progressNotes}
              onChange={(e) => setProgressNotes(e.target.value)}
              placeholder="Tuliskan detail pekerjaan yang sudah dilakukan..." 
              className="w-full bg-[#151b2b] border border-gray-800 rounded-2xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm text-white resize-none shadow-inner"
            ></textarea>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3 px-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lampirkan Bukti ({attachments.length}/{MAX_PHOTOS})</label>
              {attachments.length > 0 && (
                <button 
                  onClick={() => setAttachments([])}
                  className="text-[10px] font-bold text-red-500 uppercase tracking-widest"
                >
                  Hapus Semua
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {attachments.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-800 group shadow-lg">
                  <img src={img} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeAttachment(index)} 
                    className="absolute top-2 right-2 p-1.5 bg-red-600/80 backdrop-blur-md rounded-full text-white shadow-lg active:scale-90 transition-transform"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase">
                    Foto {index + 1}
                  </div>
                </div>
              ))}

              {attachments.length < MAX_PHOTOS && (
                <>
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="aspect-square bg-[#151b2b] border-2 border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-500 hover:border-blue-500/50 transition-all active:scale-95 group shadow-inner"
                  >
                    <div className="p-3 bg-gray-800/50 rounded-full group-hover:bg-blue-500/10 transition-colors">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Kamera</span>
                  </button>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-[#151b2b] border-2 border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-emerald-500 hover:border-emerald-500/50 transition-all active:scale-95 group shadow-inner"
                  >
                    <div className="p-3 bg-gray-800/50 rounded-full group-hover:bg-emerald-500/10 transition-colors">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">Galeri</span>
                  </button>
                </>
              )}
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
          </div>
        </div>

        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex items-start gap-3">
          <div className="p-1 bg-blue-500/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Lampirkan hingga 5 foto sebagai bukti perkembangan tugas Anda. Foto akan dikompresi secara otomatis untuk menghemat penyimpanan.
          </p>
        </div>
      </div>

      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-5 z-20">
        <button 
          onClick={handleUpdate}
          disabled={isLoading || (!progressNotes.trim() && attachments.length === 0)}
          className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Kirim Update
            </>
          )}
        </button>
      </div>

      <CameraModal 
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(img) => setAttachments(prev => [...prev, img].slice(0, MAX_PHOTOS))}
        initialFacingMode="environment"
      />
    </div>
  );
};

export default TaskUpdate;

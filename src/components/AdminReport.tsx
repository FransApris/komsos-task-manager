import { useState } from 'react';
import { FileText, Download, BarChart3, Loader2 } from 'lucide-react';
import { generateUsageReport } from '../services/reportService';
import { toast } from 'sonner';

export default function AdminReport() {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateReport = async () => {
    setIsGenerating(true);
    try {
      await generateUsageReport("Laporan Bulanan Multimedia", "Maret 2026");
      toast.success("Laporan berhasil dibuat dan disimpan di database.");
    } catch (err) {
      toast.error("Hanya Admin yang dapat membuat laporan.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 size={24} /> Panel Laporan Admin
          </h2>
          <p className="text-blue-100 text-sm opacity-80">Pantau statistik tim Komsos Juanda</p>
        </div>
        <button 
          onClick={handleCreateReport}
          disabled={isGenerating}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <FileText size={16} />}
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
          <p className="text-xs uppercase font-bold opacity-60">Total Tugas</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
          <p className="text-xs uppercase font-bold opacity-60">Alat Digunakan</p>
          <p className="text-2xl font-bold">--</p>
        </div>
        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
          <p className="text-xs uppercase font-bold opacity-60">Anggota Aktif</p>
          <p className="text-2xl font-bold">--</p>
        </div>
      </div>
    </div>
  );
}
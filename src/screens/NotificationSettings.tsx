import React, { useState, useEffect } from 'react';
import { ChevronLeft, BellRing, MessageSquare, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { Screen, UserAccount } from '../types';
import { doc, updateDoc, db } from '../firebase'; 

// PERBAIKAN: Menambahkan kata "export" di sini agar bisa dibaca oleh App.tsx
export const NotificationSettings: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  user: UserAccount | null 
}> = ({ onNavigate, user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    taskUpdates: true,
    chatMessages: true,
    massSchedule: true,
    systemAlerts: false
  });

  useEffect(() => {
    if (user?.notificationPrefs) {
      setSettings(user.notificationPrefs);
    }
    setLoading(false);
  }, [user]);

  const handleToggle = async (key: keyof typeof settings) => {
    if (!user?.uid) return;
    
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings); 
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPrefs: newSettings
      });
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan pengaturan.");
      setSettings(settings); 
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#0a0f18] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Memuat Pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('PROFILE')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Pengaturan Notifikasi</h1>
        <div className="w-9">
          {saving && <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto" />}
        </div>
      </header>

      <div className="p-5 space-y-6">
        <div>
          <h3 className="font-bold text-sm mb-2 text-gray-400 uppercase tracking-wider">Kategori Notifikasi</h3>
          <p className="text-xs text-gray-500 mb-4">Pilih jenis pemberitahuan yang ingin Anda terima melalui aplikasi.</p>
          
          <div className="space-y-3">
            <SettingToggle title="Update Tugas" active={settings.taskUpdates} icon={BellRing} onToggle={() => handleToggle('taskUpdates')} />
            <SettingToggle title="Pesan Tim" active={settings.chatMessages} icon={MessageSquare} onToggle={() => handleToggle('chatMessages')} />
            <SettingToggle title="Agenda" active={settings.massSchedule} icon={Calendar} onToggle={() => handleToggle('massSchedule')} />
            <SettingToggle title="Sistem & Keamanan" active={settings.systemAlerts} icon={ShieldCheck} onToggle={() => handleToggle('systemAlerts')} />
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingToggle = ({ title, active, icon: Icon, onToggle }: any) => (
  <div className="flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 transition-all hover:border-gray-700">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-800 text-gray-500'}`}>
        <Icon size={20} />
      </div>
      <span className="text-sm font-bold text-white">{title}</span>
    </div>
    <button 
      onClick={onToggle}
      className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-300 ${active ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default NotificationSettings;
import React, { useState, useEffect } from 'react';
import { ChevronLeft, BellRing, MessageSquare, Calendar, ShieldCheck, Loader2, LucideIcon } from 'lucide-react';
import { Screen, UserAccount } from '../types';
import { doc, updateDoc, db } from '../firebase';
import { toast } from 'sonner';

type NotifSettings = {
  taskUpdates: boolean;
  chatMessages: boolean;
  massSchedule: boolean;
  systemAlerts: boolean;
};

const DEFAULT_SETTINGS: NotifSettings = {
  taskUpdates: true,
  chatMessages: true,
  massSchedule: true,
  systemAlerts: false,
};

export const NotificationSettings: React.FC<{
  onNavigate: (s: Screen) => void;
  user: UserAccount | null;
}> = ({ onNavigate, user }) => {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);

  // Sync dari data user (tidak perlu loading state — tidak ada operasi async)
  useEffect(() => {
    if (user?.notificationPrefs) {
      setSettings({ ...DEFAULT_SETTINGS, ...user.notificationPrefs });
    }
  }, [user]);

  const handleToggle = async (key: keyof NotifSettings) => {
    const docId = user?.id || user?.uid;
    if (!docId) return;

    // Simpan nilai lama sebelum optimistic update
    const prevSettings = { ...settings };
    const newSettings: NotifSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', docId), {
        notificationPrefs: newSettings,
      });
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan.');
      // Rollback ke nilai sebelumnya
      setSettings(prevSettings);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    const docId = user?.id || user?.uid;
    if (!docId) return;
    const prevSettings = { ...settings };
    setSettings(DEFAULT_SETTINGS);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', docId), {
        notificationPrefs: DEFAULT_SETTINGS,
      });
      toast.success('Pengaturan dikembalikan ke default.');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mereset pengaturan.');
      setSettings(prevSettings);
    } finally {
      setSaving(false);
    }
  };

  const TOGGLE_ITEMS: { key: keyof NotifSettings; title: string; desc: string; icon: LucideIcon }[] = [
    {
      key: 'taskUpdates',
      title: 'Update Tugas',
      desc: 'Penugasan baru, perubahan status, & verifikasi tugas.',
      icon: BellRing,
    },
    {
      key: 'chatMessages',
      title: 'Pesan Tim',
      desc: 'Pesan masuk di ruang diskusi tugas.',
      icon: MessageSquare,
    },
    {
      key: 'massSchedule',
      title: 'Agenda Misa',
      desc: 'Pengingat jadwal misa & perubahan agenda.',
      icon: Calendar,
    },
    {
      key: 'systemAlerts',
      title: 'Sistem & Keamanan',
      desc: 'Pembaruan aplikasi & notifikasi akun.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] overflow-y-auto pb-40 text-white">
      <header className="p-5 flex justify-between items-center sticky top-0 bg-[#0a0f18]/90 backdrop-blur-md z-20 border-b border-gray-800/50">
        <button className="p-2 bg-[#151b2b] rounded-full border border-gray-800" onClick={() => onNavigate('PROFILE')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <h1 className="text-sm font-extrabold tracking-widest uppercase text-gray-400">Pengaturan Notifikasi</h1>
        <div className="w-9 flex items-center justify-center">
          {saving && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
        </div>
      </header>

      <div className="p-5 space-y-6">
        <div>
          <h3 className="font-bold text-sm mb-1 text-gray-400 uppercase tracking-wider">Kategori Notifikasi</h3>
          <p className="text-xs text-gray-500 mb-4">Pilih jenis pemberitahuan yang ingin Anda terima melalui aplikasi.</p>

          <div className="space-y-3">
            {TOGGLE_ITEMS.map(({ key, title, desc, icon }) => (
              <SettingToggle
                key={key}
                title={title}
                desc={desc}
                active={settings[key]}
                icon={icon}
                onToggle={() => handleToggle(key)}
                disabled={saving}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleResetDefault}
          disabled={saving}
          className="w-full py-3 rounded-2xl text-xs font-bold text-gray-500 border border-gray-800 bg-[#151b2b] hover:border-gray-700 hover:text-gray-300 transition-all disabled:opacity-40"
        >
          Kembalikan ke Pengaturan Default
        </button>
      </div>
    </div>
  );
};

interface SettingToggleProps {
  title: string;
  desc: string;
  active: boolean;
  icon: LucideIcon;
  onToggle: () => void;
  disabled?: boolean;
}

const SettingToggle: React.FC<SettingToggleProps> = ({ title, desc, active, icon: Icon, onToggle, disabled }) => (
  <div className="flex items-center justify-between p-4 bg-[#151b2b] rounded-2xl border border-gray-800 transition-all hover:border-gray-700">
    <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
      <div className={`p-2 rounded-xl shrink-0 transition-colors ${active ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-800 text-gray-500'}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white leading-tight">{title}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-12 h-6 rounded-full relative shrink-0 transition-colors duration-300 disabled:opacity-50 ${active ? 'bg-blue-600' : 'bg-gray-700'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform duration-300 ${active ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default NotificationSettings;
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Ya, Hapus',
  cancelText = 'Batal',
  isDanger = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center p-5 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#151b2b] w-full max-w-sm rounded-3xl border border-gray-800 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className={`w-16 h-16 ${isDanger ? 'bg-red-500/10' : 'bg-blue-500/10'} rounded-full flex items-center justify-center mx-auto mb-6`}>
          <AlertTriangle className={`w-8 h-8 ${isDanger ? 'text-red-500' : 'text-blue-500'}`} />
        </div>
        <h3 className="text-xl font-extrabold text-white text-center mb-3">{title}</h3>
        <p className="text-sm text-gray-400 text-center mb-8 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`flex-1 py-4 rounded-2xl ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white text-sm font-bold transition-all shadow-lg active:scale-95`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

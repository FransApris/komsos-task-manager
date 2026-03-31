import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Send, Paperclip, Trash2, Eraser } from 'lucide-react';
import { Screen, Role, UserAccount } from '../types';
import { useChat } from '../contexts/ChatContext';
import { motion, AnimatePresence } from 'framer-motion';

export const LiveChat: React.FC<{ 
  onNavigate: (s: Screen) => void, 
  role: Role, 
  taskId?: string | null,
  currentUser: UserAccount | null
}> = ({ onNavigate, role, taskId, currentUser }) => {
  const { messages, sendMessage, setTaskId, markAsRead, setIsChatActive, deleteMessage, clearChat } = useChat();
  const [message, setMessage] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = role === 'SUPERADMIN';

  const currentTaskId = taskId || 'support';

  useEffect(() => {
    setTaskId(currentTaskId);
    if (currentTaskId === 'support') {
      markAsRead();
      setIsChatActive(true);
    }
    return () => setIsChatActive(false);
  }, [currentTaskId, setTaskId, markAsRead, setIsChatActive]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !currentUser) return;
    
    const senderName = currentUser.displayName;
    const senderRole = role || 'USER';
    
    await sendMessage(message, currentUser.uid, senderName, senderRole, currentTaskId);
    setMessage('');
  };

  const isCurrentUser = (senderId: string) => senderId === currentUser?.uid;

  const formatTime = (createdAt: any) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0a0f18] h-full absolute inset-0 z-50">
      <header className="p-5 flex justify-between items-center bg-[#151b2b] border-b border-gray-800/50 shrink-0">
        <button className="p-2 bg-[#0a0f18] rounded-full border border-gray-800" onClick={() => onNavigate(role?.startsWith('ADMIN') || role === 'SUPERADMIN' ? 'ADMIN_DASHBOARD' : 'HELP_CENTER')}>
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <div className="text-center">
          <h1 className="text-sm font-extrabold tracking-widest uppercase text-white">Live Chat</h1>
          <p className="text-[10px] text-emerald-400 font-medium flex items-center justify-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {role?.startsWith('ADMIN') || role === 'SUPERADMIN' ? 'Terhubung dengan Petugas' : 'Admin Online'}
          </p>
        </div>
        <div className="w-9 flex justify-end">
          {isSuperAdmin && (
            <button 
              onClick={() => setShowConfirmClear(true)}
              className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
              title="Bersihkan Chat"
            >
              <Eraser className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showConfirmClear && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#151b2b] border border-gray-800 p-6 rounded-3xl max-w-xs w-full text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-white font-bold mb-2">Bersihkan Chat?</h3>
              <p className="text-gray-400 text-xs mb-6">Tindakan ini akan menghapus semua pesan dalam percakapan ini secara permanen.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-800 text-white text-xs font-bold"
                >
                  Batal
                </button>
                <button 
                  onClick={async () => {
                    await clearChat(currentTaskId);
                    setShowConfirmClear(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white text-xs font-bold"
                >
                  Hapus Semua
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${isCurrentUser(msg.senderId) ? 'items-end' : 'items-start'} group`}>
            <div className="flex items-center gap-2 mb-1 px-1">
              {!isCurrentUser(msg.senderId) && <span className="text-[10px] text-gray-500 font-bold">{msg.senderName}</span>}
              {isSuperAdmin && (
                <button 
                  onClick={() => deleteMessage(msg.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {isCurrentUser(msg.senderId) && <span className="text-[10px] text-gray-500 font-bold">{msg.senderName}</span>}
            </div>
            <div className={`max-w-[80%] p-3 rounded-2xl ${isCurrentUser(msg.senderId) ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-[#151b2b] border border-gray-800 text-gray-200 rounded-tl-sm'}`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${isCurrentUser(msg.senderId) ? 'text-blue-200 text-right' : 'text-gray-500'}`}>{formatTime(msg.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#151b2b] border-t border-gray-800 shrink-0 mb-safe">
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan..." 
            className="flex-1 bg-[#0a0f18] border border-gray-800 rounded-full px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className={`p-2.5 rounded-full transition-colors ${message.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-800 text-gray-500'}`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;
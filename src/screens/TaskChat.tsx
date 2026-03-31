import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Trash2 } from 'lucide-react';
import { UserAccount, Role } from '../types';
import { useChat } from '../contexts/ChatContext';
import { getAvatarUrl } from '../lib/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskChatProps {
  taskId: string;
  currentUser: UserAccount | null;
  role?: Role;
  usersDb?: UserAccount[];
}

export const TaskChat: React.FC<TaskChatProps> = ({ taskId, currentUser, role, usersDb = [] }) => {
  const { messages, sendMessage, setTaskId, deleteMessage } = useChat();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

  const isSuperAdmin = role === 'SUPERADMIN';

  useEffect(() => {
    if (taskId) {
      setTaskId(taskId);
    }
  }, [taskId, setTaskId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !currentUser || isSending) return;
    
    setIsSending(true);
    try {
      const senderName = currentUser.displayName;
      const senderRole = role || 'USER';
      
      await sendMessage(message, currentUser.uid, senderName, senderRole, taskId);
      setMessage('');
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const isCurrentUser = (senderId: string) => senderId === currentUser?.uid;

  const formatTime = (createdAt: any) => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSenderAvatar = (senderId: string) => {
    const user = usersDb.find(u => u.uid === senderId);
    return getAvatarUrl(user || null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f18]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-gray-600 opacity-50" />
            </div>
            <p className="text-gray-500 text-sm">Belum ada diskusi di tugas ini.</p>
            <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest font-bold">Mulai percakapan dengan tim Anda</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${isCurrentUser(msg.senderId) ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 ring-1 ring-gray-800 self-end mb-1">
                <img 
                  src={getSenderAvatar(msg.senderId)} 
                  alt={msg.senderName} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className={`flex flex-col max-w-[85%] w-full ${isCurrentUser(msg.senderId) ? 'items-end' : 'items-start'} group`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  {!isCurrentUser(msg.senderId) && (
                    <span className="text-[10px] text-gray-500 font-bold">{msg.senderName}</span>
                  )}
                  {isSuperAdmin && (
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-500/50 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {isCurrentUser(msg.senderId) && (
                    <span className="text-[10px] text-gray-500 font-bold">{msg.senderName}</span>
                  )}
                </div>
                <div className={`p-3 rounded-2xl shadow-sm min-w-[140px] w-full ${
                  isCurrentUser(msg.senderId) 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-[#151b2b] border border-gray-800 text-gray-200 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
                    <p className="text-[9px] font-medium">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#151b2b] border-t border-gray-800/50">
        <div className="flex items-end gap-2">
          <button className="p-2 mb-1 text-gray-500 hover:text-white transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea 
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ketik pesan untuk tim..." 
            className="flex-1 bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all resize-none max-h-32 overflow-y-auto"
            style={{ height: 'auto', minHeight: '44px' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={`p-3 mb-0.5 rounded-xl transition-all shadow-lg ${
              message.trim() && !isSending 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95' 
                : 'bg-gray-800 text-gray-500'
            }`}
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskChat;

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Trash2, CornerUpLeft, X } from 'lucide-react';
import { UserAccount, Role } from '../types';
import { useChat, ChatMessage } from '../contexts/ChatContext';
import { getAvatarUrl } from '../lib/avatar';
import { motion, AnimatePresence } from 'motion/react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

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
      const senderName = currentUser.displayName || 'Pengguna';
      const senderRole = role || 'USER';
      const replyData = replyingTo
        ? { id: replyingTo.id, text: replyingTo.text, senderName: replyingTo.senderName }
        : undefined;
      
      await sendMessage(message, currentUser.uid, senderName, senderRole, taskId, replyData);
      setMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = (msg: ChatMessage) => {
    setReplyingTo(msg);
    textareaRef.current?.focus();
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
                  <button
                    onClick={() => handleReply(msg)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-blue-400/60 hover:text-blue-400 transition-all"
                    title="Balas"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>
                  {isCurrentUser(msg.senderId) && (
                    <span className="text-[10px] text-gray-500 font-bold">{msg.senderName}</span>
                  )}
                </div>
                <div className={`rounded-2xl shadow-sm min-w-[140px] w-full overflow-hidden ${
                  isCurrentUser(msg.senderId) 
                    ? 'bg-blue-600 rounded-tr-none' 
                    : 'bg-[#151b2b] border border-gray-800 rounded-tl-none'
                }`}>
                  {msg.replyTo && (
                    <div className={`flex gap-0 border-b ${
                      isCurrentUser(msg.senderId) ? 'border-blue-500/30 bg-[#1a2a4a]' : 'border-gray-700/60 bg-[#0d1117]'
                    }`}>
                      {/* Accent bar */}
                      <div className={`w-1 shrink-0 ${
                        isCurrentUser(msg.senderId) ? 'bg-amber-400' : 'bg-emerald-500'
                      }`} />
                      <div className="px-2.5 pt-2 pb-2">
                        <p className={`text-[9px] font-black uppercase tracking-wider mb-0.5 ${
                          isCurrentUser(msg.senderId) ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          ↩ {msg.replyTo.senderName}
                        </p>
                        <p className="text-[11px] line-clamp-2 text-gray-400 italic">
                          {msg.replyTo.text}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      isCurrentUser(msg.senderId) ? 'text-white' : 'text-gray-200'
                    }`}>{msg.text}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
                      <p className="text-[9px] font-medium">{formatTime(msg.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#151b2b] border-t border-gray-800/50">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 bg-[#0a0f18] border border-blue-500/30 rounded-xl px-3 py-2 mb-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-blue-400 mb-0.5">↩ Membalas {replyingTo.senderName}</p>
                <p className="text-[11px] text-gray-400 line-clamp-1">{replyingTo.text}</p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-0.5 text-gray-500 hover:text-white transition-colors shrink-0 mt-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2">
          <button className="p-2 mb-1 text-gray-500 hover:text-white transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea 
            ref={textareaRef}
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={replyingTo ? `Balas ${replyingTo.senderName}...` : 'Ketik pesan untuk tim...'}
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

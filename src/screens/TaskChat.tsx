import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { UserAccount, Role } from '../types';
import { useChat } from '../contexts/ChatContext';

interface TaskChatProps {
  taskId: string;
  currentUser: UserAccount | null;
  role?: Role;
}

export const TaskChat: React.FC<TaskChatProps> = ({ taskId, currentUser, role }) => {
  const { messages, sendMessage, setTaskId } = useChat();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);

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
            <div key={msg.id} className={`flex flex-col ${isCurrentUser(msg.senderId) ? 'items-end' : 'items-start'}`}>
              {!isCurrentUser(msg.senderId) && (
                <span className="text-[10px] text-gray-500 font-bold mb-1 px-1">{msg.senderName}</span>
              )}
              <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
                isCurrentUser(msg.senderId) 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-[#151b2b] border border-gray-800 text-gray-200 rounded-tl-none'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className="flex items-center justify-end gap-1.5 mt-1 opacity-60">
                  <p className="text-[9px] font-medium">{formatTime(msg.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#151b2b] border-t border-gray-800/50">
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:text-white transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan untuk tim..." 
            className="flex-1 bg-[#0a0f18] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
          />
          <button 
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={`p-3 rounded-xl transition-all shadow-lg ${
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

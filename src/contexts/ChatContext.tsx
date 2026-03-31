import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';
import { db, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, handleFirestoreError, OperationType, doc, deleteDoc, getDocs, writeBatch, limit } from '../firebase';
import { useAuth } from './AuthContext';

import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  taskId: string;
  createdAt: any;
}

interface ChatContextType {
  messages: ChatMessage[];
  unreadCount: number;
  sendMessage: (text: string, senderId: string, senderName: string, senderRole: string, taskId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  clearChat: (taskId: string) => Promise<void>;
  setTaskId: (id: string) => void;
  markAsRead: () => void;
  setIsChatActive: (active: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const unreadCountRef = useRef(0);
  const [taskId, setTaskId] = useState<string>('support');
  const [isChatActive, setIsChatActive] = useState<boolean>(false);
  const [lastRead, setLastRead] = useState<number>(() => {
    const saved = localStorage.getItem('lastReadChat');
    return saved ? parseInt(saved) : 0;
  });

  // Update ref when state changes
  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  // Listener for the current task messages
  useEffect(() => {
    if (authLoading || !currentUser) {
      setMessages([]);
      return;
    }

    // Gunakan limit untuk performa lebih baik
    const q = query(
      collection(db, 'chatMessages'),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(msgs);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'chatMessages'));

    return () => unsubscribe();
  }, [taskId, currentUser, authLoading]);

  // Listener for unread count (global support channel)
  useEffect(() => {
    if (authLoading || !currentUser) return;

    // Gunakan limit untuk performa lebih baik
    const q = query(
      collection(db, 'chatMessages'),
      where('taskId', '==', 'support'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let count = 0;
      let hasNewMessage = false;
      let latestMsg: any = null;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || 0);
        if (data.senderId !== currentUser.uid && createdAt > lastRead) {
          count++;
          if (!latestMsg || createdAt > (latestMsg.createdAt?.toMillis ? latestMsg.createdAt.toMillis() : latestMsg.createdAt)) {
            latestMsg = data;
            hasNewMessage = true;
          }
        }
      });

      if (hasNewMessage && latestMsg && count > unreadCountRef.current && !isChatActive) {
        toast.info(`Pesan Baru dari ${latestMsg.senderName}`, {
          description: latestMsg.text.length > 50 ? latestMsg.text.substring(0, 50) + '...' : latestMsg.text,
          duration: 4000,
        });
      }

      setUnreadCount(count);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'chatMessages'));

    return () => unsubscribe();
  }, [currentUser, authLoading, lastRead, isChatActive]);

  const markAsRead = useCallback(() => {
    const now = Date.now();
    setLastRead(now);
    localStorage.setItem('lastReadChat', now.toString());
    setUnreadCount(0);
  }, []);

  const sendMessage = useCallback(async (text: string, senderId: string, senderName: string, senderRole: string, currentTaskId: string) => {
    try {
      await addDoc(collection(db, 'chatMessages'), {
        text,
        senderId,
        senderName,
        senderRole,
        taskId: currentTaskId,
        createdAt: serverTimestamp()
      });
      // If sending a message, we've effectively read the chat
      if (currentTaskId === 'support') {
        markAsRead();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'chatMessages');
      toast.error('Gagal mengirim pesan chat.');
    }
  }, [markAsRead]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteDoc(doc(db, 'chatMessages', messageId));
      toast.success('Pesan dihapus');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chatMessages/${messageId}`);
    }
  }, []);

  const clearChat = useCallback(async (currentTaskId: string) => {
    try {
      const q = query(collection(db, 'chatMessages'), where('taskId', '==', currentTaskId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      toast.success('Percakapan dibersihkan');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'chatMessages (bulk)');
    }
  }, []);

  return (
    <ChatContext.Provider value={{ 
      messages, 
      unreadCount, 
      sendMessage, 
      deleteMessage,
      clearChat,
      setTaskId, 
      markAsRead, 
      setIsChatActive 
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};

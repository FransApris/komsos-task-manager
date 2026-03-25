import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { db, collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from './AuthContext';

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
  sendMessage: (text: string, senderId: string, senderName: string, senderRole: string, taskId: string) => Promise<void>;
  setTaskId: (id: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [taskId, setTaskId] = useState<string>('support');

  useEffect(() => {
    if (authLoading || !currentUser) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chatMessages'),
      where('taskId', '==', taskId),
      orderBy('createdAt', 'asc')
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

  const sendMessage = async (text: string, senderId: string, senderName: string, senderRole: string, currentTaskId: string) => {
    try {
      await addDoc(collection(db, 'chatMessages'), {
        text,
        senderId,
        senderName,
        senderRole,
        taskId: currentTaskId,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, setTaskId }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};

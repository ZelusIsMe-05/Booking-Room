'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { conversationService, ConversationSummary } from '@/services/conversationService';
import { useAuth } from '@/context/AuthContext';

export interface ActiveChat {
  conversationId: string;
  peerUserId: string;
  peerName: string | null;
  peerAvatar: string | null;
  isMinimized: boolean;
}

interface TenantChatContextType {
  openChats: ActiveChat[];
  openChatWith: (peerUserId: string, name: string | null, avatar: string | null) => Promise<void>;
  closeChat: (conversationId: string) => void;
  toggleMinimize: (conversationId: string) => void;
}

const TenantChatContext = createContext<TenantChatContextType | undefined>(undefined);

const STORAGE_KEY = 'tenant_active_chats';

export function TenantChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [openChats, setOpenChats] = useState<ActiveChat[]>([]);

  // Load active chats from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user && user.role === 'TENANT') {
      const stored = sessionStorage.getItem(`${STORAGE_KEY}_${user.userId}`);
      if (stored) {
        try {
          setOpenChats(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored tenant active chats:', e);
        }
      }
    } else {
      setOpenChats([]);
    }
  }, [user]);

  // Sync open chats to sessionStorage
  const saveChats = (chats: ActiveChat[]) => {
    setOpenChats(chats);
    if (typeof window !== 'undefined' && user) {
      sessionStorage.setItem(`${STORAGE_KEY}_${user.userId}`, JSON.stringify(chats));
    }
  };

  const openChatWith = async (peerUserId: string, name: string | null, avatar: string | null) => {
    if (!user) {
      alert('Vui lòng đăng nhập để nhắn tin.');
      return;
    }
    if (user.role !== 'TENANT') {
      alert('Tính năng này chỉ dành cho tài khoản Người thuê.');
      return;
    }

    // 1. Check if chat is already open
    const existing = openChats.find((chat) => chat.peerUserId === peerUserId);
    if (existing) {
      // Bring it to focus and maximize it
      const updated = openChats.map((chat) =>
        chat.peerUserId === peerUserId ? { ...chat, isMinimized: false } : chat
      );
      saveChats(updated);
      return;
    }

    try {
      // 2. Call backend to get or create conversation
      const response = await conversationService.initConversation(peerUserId);
      if (response && response.data) {
        const conv = response.data;
        
        // 3. Construct new chat box
        const newChat: ActiveChat = {
          conversationId: conv.conversation_id,
          peerUserId: peerUserId,
          peerName: name || conv.peer_name || 'Chủ trọ',
          peerAvatar: avatar || conv.peer_avatar,
          isMinimized: false,
        };

        // Limit to max 2 open chat boxes
        let updated = [newChat, ...openChats];
        if (updated.length > 2) {
          updated = updated.slice(0, 2);
        }
        
        saveChats(updated);
      }
    } catch (error: any) {
      console.error('Failed to open/initialize conversation:', error);
      alert(error.message || 'Không thể kết nối hội thoại với chủ trọ.');
    }
  };

  const closeChat = (conversationId: string) => {
    const updated = openChats.filter((chat) => chat.conversationId !== conversationId);
    saveChats(updated);
  };

  const toggleMinimize = (conversationId: string) => {
    const updated = openChats.map((chat) =>
      chat.conversationId === conversationId ? { ...chat, isMinimized: !chat.isMinimized } : chat
    );
    saveChats(updated);
  };

  return (
    <TenantChatContext.Provider value={{ openChats, openChatWith, closeChat, toggleMinimize }}>
      {children}
    </TenantChatContext.Provider>
  );
}

export function useTenantChat() {
  const context = useContext(TenantChatContext);
  if (context === undefined) {
    throw new Error('useTenantChat must be used within a TenantChatProvider');
  }
  return context;
}

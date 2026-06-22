'use client';

import { useTenantChat } from '@/context/TenantChatContext';
import TenantChatBox from './TenantChatBox';

export default function TenantChatContainer() {
  const { openChats, closeChat, toggleMinimize } = useTenantChat();

  if (openChats.length === 0) return null;

  return (
    <div className="fixed bottom-0 right-24 z-40 flex items-end gap-4 pointer-events-none max-w-[calc(100vw-120px)] overflow-x-auto select-none">
      {openChats.map((chat) => (
        <div key={chat.conversationId} className="pointer-events-auto shadow-2xl">
          <TenantChatBox
            conversationId={chat.conversationId}
            peerName={chat.peerName}
            peerAvatar={chat.peerAvatar}
            isMinimized={chat.isMinimized}
            onClose={() => closeChat(chat.conversationId)}
            onToggleMinimize={() => toggleMinimize(chat.conversationId)}
          />
        </div>
      ))}
    </div>
  );
}

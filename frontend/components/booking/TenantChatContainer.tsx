'use client';

import { useTenantChat } from '@/context/TenantChatContext';
import TenantChatBox from './TenantChatBox';

export default function TenantChatContainer() {
  const { openChats, closeChat, removeChat, restoreChat, toggleMinimize } = useTenantChat();

  if (openChats.length === 0) return null;

  const activeChats = openChats.filter((c) => !c.isBubble);
  const bubbleChats = openChats.filter((c) => c.isBubble);

  return (
    <>
      {/* Bottom active chat boxes */}
      {activeChats.length > 0 && (
        <div className="fixed bottom-0 right-24 z-40 flex items-end gap-4 pointer-events-none max-w-[calc(100vw-120px)] overflow-x-auto select-none">
          {activeChats.map((chat) => (
            <div key={chat.conversationId} className="pointer-events-auto shadow-2xl">
              <TenantChatBox
                conversationId={chat.conversationId}
                peerName={chat.peerName}
                peerAvatar={chat.peerAvatar}
                isMinimized={chat.isMinimized}
                isBubble={false}
                onClose={() => closeChat(chat.conversationId)}
                onToggleMinimize={() => toggleMinimize(chat.conversationId)}
                onDestroy={() => removeChat(chat.conversationId)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Floating vertical stack of bubbles on the right */}
      {bubbleChats.length > 0 && (
        <div className="fixed bottom-[180px] right-6 z-50 flex flex-col-reverse gap-3 pointer-events-none">
          {bubbleChats.map((chat) => (
            <div key={chat.conversationId} className="pointer-events-auto">
              <TenantChatBox
                conversationId={chat.conversationId}
                peerName={chat.peerName}
                peerAvatar={chat.peerAvatar}
                isMinimized={false}
                isBubble={true}
                onClose={() => closeChat(chat.conversationId)}
                onToggleMinimize={() => toggleMinimize(chat.conversationId)}
                onRestore={() => restoreChat(chat.conversationId)}
                onDestroy={() => removeChat(chat.conversationId)}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

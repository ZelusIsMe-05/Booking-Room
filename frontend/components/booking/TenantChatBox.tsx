'use client';

import { useState, useEffect, useRef } from 'react';
import { conversationService, ConversationMessage } from '@/services/conversationService';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';

interface TenantChatBoxProps {
  conversationId: string;
  peerName: string | null;
  peerAvatar: string | null;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

export default function TenantChatBox({
  conversationId,
  peerName,
  peerAvatar,
  isMinimized,
  onClose,
  onToggleMinimize,
}: TenantChatBoxProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myUserId = user?.userId;

  // Load message history
  useEffect(() => {
    async function loadMessages() {
      setLoading(true);
      try {
        const res = await conversationService.getMessages(conversationId, { page: 1, limit: 50 });
        if (res && res.data) {
          // Backend returns newest-first; reverse to display oldest-first
          const items = [...(res.data.items || [])].reverse();
          setMessages(items);
          
          // Mark as read in the background
          conversationService.markAsRead(conversationId).catch(() => undefined);
        }
      } catch (err) {
        console.error('Failed to load messages in mini chatbox:', err);
      } finally {
        setLoading(false);
      }
    }

    if (conversationId && !isMinimized) {
      loadMessages();
    }
  }, [conversationId, isMinimized]);

  // Socket room joining and realtime message listening
  useEffect(() => {
    if (!socket || !conversationId || isMinimized) return;

    socket.emit('join_room', conversationId);

    const handleReceiveMessage = (msg: ConversationMessage) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });
        // Auto mark as read when chat is open and active
        conversationService.markAsRead(conversationId).catch(() => undefined);
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.emit('leave_room', conversationId);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, conversationId, isMinimized]);

  // Scroll to bottom when messages or minimize state changes
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  // Send message
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText('');

    try {
      const res = await conversationService.sendMessage(conversationId, text);
      if (res && res.data) {
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === res.data.message_id)) return prev;
          return [...prev, res.data];
        });
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      alert(err.message || 'Gửi tin nhắn thất bại.');
      setInputText(text); // restore input
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className="flex flex-col bg-white rounded-t-2xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-200"
      style={{
        width: '320px',
        height: isMinimized ? '48px' : '400px',
      }}
    >
      {/* Header */}
      <div
        onClick={onToggleMinimize}
        className="h-12 bg-[#004AC6] hover:bg-[#003FA3] text-white px-3 flex items-center justify-between cursor-pointer select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center font-bold shrink-0">
            {peerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={peerAvatar} alt={peerName || 'Chủ trọ'} className="h-full w-full object-cover" />
            ) : (
              <span className="text-white text-xs">
                {(peerName || '?').charAt(0).toUpperCase()}
              </span>
            )}
            {/* Status dot */}
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#004AC6]" />
          </div>
          <span className="font-bold text-sm truncate max-w-[150px]">
            {peerName || 'Chủ trọ'}
          </span>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onToggleMinimize}
            className="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center transition-colors text-white/90"
            title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center transition-colors text-white/90 font-bold"
            title="Đóng chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body & Footer (Hidden when minimized) */}
      {!isMinimized && (
        <>
          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50 space-y-3 flex flex-col">
            {loading ? (
              <div className="text-center text-xs text-slate-400 my-auto">Đang tải tin nhắn...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-slate-400 my-auto">
                Hãy bắt đầu câu hỏi của bạn với chủ trọ.
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === myUserId;
                return (
                  <div
                    key={msg.message_id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="max-w-[85%] flex flex-col">
                      <div
                        className={`text-sm px-3 py-2 rounded-2xl shadow-sm break-words ${
                          isMine
                            ? 'bg-[#004AC6] text-white rounded-tr-sm'
                            : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                      <span
                        className={`text-[9px] text-slate-400 mt-0.5 ${
                          isMine ? 'text-right mr-1' : 'ml-1'
                        }`}
                      >
                        {formatTime(msg.sent_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-white flex items-end gap-1.5 shrink-0">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="flex-1 bg-slate-100 focus:bg-white border border-transparent focus:border-slate-200 text-sm px-3 py-2 rounded-xl focus:outline-none transition resize-none max-h-[80px] overflow-y-auto leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={sending || !inputText.trim()}
              className="w-8 h-8 rounded-full bg-[#004AC6] hover:bg-[#003FA3] text-white flex items-center justify-center shadow-sm disabled:opacity-50 shrink-0 transition"
            >
              <svg className="w-3.5 h-3.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

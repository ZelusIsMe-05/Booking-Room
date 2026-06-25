'use client';

import { useState, useEffect, useRef } from 'react';
import { conversationService, ConversationMessage } from '@/services/conversationService';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { useTranslation } from '@/context/LanguageContext';

interface TenantChatBoxProps {
  conversationId: string;
  peerName: string | null;
  peerAvatar: string | null;
  isMinimized: boolean;
  isBubble?: boolean;
  onRestore?: () => void;
  onDestroy?: () => void;
  onClose: () => void;
  onToggleMinimize: () => void;
}

export default function TenantChatBox({
  conversationId,
  peerName,
  peerAvatar,
  isMinimized,
  isBubble = false,
  onRestore,
  onDestroy,
  onClose,
  onToggleMinimize,
}: TenantChatBoxProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myUserId = user?.userId;

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMinimized) {
      onToggleMinimize();
    }
    setShowConfirmDelete(true);
  };

  const executeClearChat = async () => {
    setClearing(true);
    try {
      await conversationService.deleteConversation(conversationId);
      
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: t('roomDetail.chatDeleteToast'),
            type: 'success',
          },
        })
      );
      
      // Close/remove this chat from the context
      onDestroy ? onDestroy() : onClose();
    } catch (err: any) {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: {
            message: err?.message || t('roomDetail.chatDeleteErrToast'),
            type: 'error',
          },
        })
      );
      setShowConfirmDelete(false);
    } finally {
      setClearing(false);
    }
  };

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

    if (conversationId && !isMinimized && !isBubble) {
      loadMessages();
    }
  }, [conversationId, isMinimized, isBubble]);

  // Socket room joining and realtime message listening
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('join_room', conversationId);

    const handleReceiveMessage = (msg: ConversationMessage) => {
      if (msg.conversation_id === conversationId) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });
        
        if (isBubble) {
          setLocalUnreadCount((c) => c + 1);
        } else {
          // Auto mark as read when chat is open and active
          conversationService.markAsRead(conversationId).catch(() => undefined);
        }
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.emit('leave_room', conversationId);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, conversationId, isBubble]);

  // Reset unread count when chat is restored
  useEffect(() => {
    if (!isBubble && conversationId) {
      setLocalUnreadCount(0);
      conversationService.markAsRead(conversationId).catch(() => undefined);
    }
  }, [isBubble, conversationId]);

  // Scroll to bottom when messages or minimize state changes
  useEffect(() => {
    if (!isMinimized && !isBubble) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized, isBubble]);

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
      alert(err.message || t('roomDetail.chatSendFailed'));
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

  if (isBubble) {
    return (
      <div className="relative group select-none">
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:block bg-slate-900/90 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none">
          {peerName || 'Chủ trọ'}
        </div>
        
        {/* Circular Avatar Bubble */}
        <button
          type="button"
          onClick={onRestore}
          className="w-12 h-12 rounded-full shadow-2xl border-2 border-white bg-[#004AC6] flex items-center justify-center relative overflow-hidden transition hover:scale-105 active:scale-95 animate-[fadeIn_0.2s_ease-out]"
        >
          {peerAvatar ? (
            <img src={peerAvatar} alt={peerName || 'Chủ trọ'} className="h-full w-full object-cover" />
          ) : (
            <span className="text-white font-bold text-sm">
              {(peerName || '?').charAt(0).toUpperCase()}
            </span>
          )}
          {/* Status Dot */}
          <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        {/* Unread Count Badge */}
        {localUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md animate-bounce select-none">
            {localUnreadCount}
          </span>
        )}

        {/* Dismiss Button on Hover */}
        <button
          type="button"
          onClick={onDestroy}
          className="absolute -top-1.5 -left-1.5 hidden group-hover:flex w-5 h-5 rounded-full bg-slate-200 hover:bg-red-500 hover:text-white items-center justify-center text-[10px] font-bold text-slate-600 transition shadow"
          title={t('roomDetail.chatDismiss')}
        >
          ✕
        </button>
      </div>
    );
  }

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
            onClick={handleClearChat}
            className="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center transition-colors text-white/90"
            title={t('roomDetail.chatDeleteTitle')}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={onToggleMinimize}
            className="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center transition-colors text-white/90"
            title={isMinimized ? t('roomDetail.chatExpand') : t('roomDetail.chatMinimize')}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 hover:bg-white/10 rounded flex items-center justify-center transition-colors text-white/90 font-bold"
            title={t('roomDetail.chatClose')}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body & Footer (Hidden when minimized) */}
      {!isMinimized && (
        <>
          {showConfirmDelete ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-center select-none animate-[fadeIn_0.2s_ease-out]">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-slate-800">{t('roomDetail.chatDeleteHistory')}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
                {t('roomDetail.chatDeleteConfirmText')}
              </p>
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={clearing}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition disabled:opacity-50"
                >
                  {t('roomDetail.chatCancel')}
                </button>
                <button
                  type="button"
                  onClick={executeClearChat}
                  disabled={clearing}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {clearing ? t('roomDetail.chatDeleting') : t('roomDetail.chatConfirmDelete')}
                </button>
              </div>
            </div>
          ) : (
            <>
          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 bg-slate-50 space-y-3 flex flex-col">
            {loading ? (
              <div className="text-center text-xs text-slate-400 my-auto">{t('roomDetail.chatLoading')}</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-slate-400 my-auto">
                {t('roomDetail.chatEmpty')}
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
              placeholder={t('roomDetail.chatInputPlaceholder')}
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
    </>
  )}
  </div>
  );
}

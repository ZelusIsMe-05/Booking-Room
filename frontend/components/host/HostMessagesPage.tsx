'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import HostSidebar from '@/components/host/HostSidebar';
import {
  conversationService,
  type ConversationSummary,
  type ConversationMessage,
} from '@/services/conversationService';

// ─── Helpers ───────────────────────────────────────────────────────────────

const AVATAR_PALETTE = ['#2563EB', '#7C3AED', '#D97706', '#059669', '#DB2777', '#0891B2'];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initialOf(name: string | null): string {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toLocaleUpperCase('vi-VN') : '?';
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateDivider(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).toLocaleUpperCase('vi-VN');
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = 'md',
}: {
  name: string | null;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';

  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || ''} className={`${dim} shrink-0 rounded-full object-cover`} />;
  }

  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: avatarColor(name || '?') }}
    >
      {initialOf(name)}
    </span>
  );
}

// ─── Conversation List Item ───────────────────────────────────────────────────

function ConversationItem({
  conv,
  isActive,
  onClick,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-r-lg px-4 py-4 text-left transition ${
        isActive
          ? 'border-l-4 border-[#004AC6] bg-[rgba(37,99,235,0.05)]'
          : 'border-l-4 border-transparent hover:bg-[rgba(0,0,0,0.03)]'
      }`}
    >
      <Avatar name={conv.peer_name} avatarUrl={conv.peer_avatar} size="md" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-base font-bold leading-6 text-[#191B23]">
            {conv.peer_name || 'Người dùng'}
          </span>
          <span className="shrink-0 text-[11px] leading-4 text-[#737686]">{formatTime(conv.last_message_at)}</span>
        </div>
        <p className="mt-0.5 truncate text-sm leading-[21px] text-[#434655]">{conv.last_message || 'Chưa có tin nhắn'}</p>
      </div>

      {conv.unread_count > 0 && (
        <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#004AC6] px-1.5 text-[11px] font-bold text-white">
          {conv.unread_count}
        </span>
      )}
    </button>
  );
}

// ─── Message Read/Sent Status ─────────────────────────────────────────────────

function MessageStatusLabel({ status }: { status: ConversationMessage['status'] }) {
  const isRead = status === 'READ';
  const label = isRead ? 'ĐÃ XEM' : status === 'DELIVERED' ? 'ĐÃ CHUYỂN' : 'ĐÃ GỬI';
  return (
    <span className="flex items-center gap-1">
      <svg className={`h-3 w-3 ${isRead ? 'text-[#004AC6]' : 'text-[#737686]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l4 4L20 5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l4 4L20 5" opacity="0.5" />
      </svg>
      <span className={`text-[10px] font-bold uppercase tracking-[-0.5px] ${isRead ? 'text-[#004AC6]' : 'text-[#737686]'}`}>
        {label}
      </span>
    </span>
  );
}

// ─── Single Message Bubble ────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMine,
  peerName,
  peerAvatar,
}: {
  msg: ConversationMessage;
  isMine: boolean;
  peerName: string | null;
  peerAvatar?: string | null;
}) {
  if (isMine) {
    return (
      <div className="flex flex-col items-end">
        <div className="max-w-[504px] rounded-[20px_20px_4px_20px] bg-[#004AC6] px-4 py-4 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]">
          <p className="whitespace-pre-wrap text-base leading-6 text-white">{msg.content}</p>
        </div>
        <div className="mt-1 flex items-center gap-1 pr-1">
          <span className="text-[11px] leading-4 text-[#737686]">{formatTime(msg.sent_at)}</span>
          <MessageStatusLabel status={msg.status} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-4">
      <Avatar name={peerName} avatarUrl={peerAvatar} size="sm" />
      <div className="flex flex-col">
        <div className="max-w-[451px] rounded-[20px_20px_20px_4px] bg-[#E7E7F3] px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="whitespace-pre-wrap text-base leading-6 text-[#191B23]">{msg.content}</p>
        </div>
        <span className="mt-1 pl-1 text-[11px] leading-4 text-[#737686]">{formatTime(msg.sent_at)}</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HostMessagesPage() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myUserId = user?.userId;

  // Load conversation list on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingConvs(true);
      setError(null);
      try {
        const res = await conversationService.listConversations();
        if (cancelled) return;
        const list = res.data || [];
        setConversations(list);
        if (list.length > 0) setActiveConvId((prev) => prev ?? list[0].conversation_id);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Không tải được danh sách hội thoại.');
      } finally {
        if (!cancelled) setLoadingConvs(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load messages whenever the active conversation changes.
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await conversationService.getMessages(convId, { page: 1, limit: 100 });
      // Backend returns newest-first; display oldest-first.
      const items = [...(res.data?.items || [])].reverse();
      setMessages(items);
      // Mark as read, then zero out the unread badge locally.
      conversationService.markAsRead(convId).catch(() => undefined);
      setConversations((prev) => prev.map((c) => (c.conversation_id === convId ? { ...c, unread_count: 0 } : c)));
    } catch (err: any) {
      setError(err?.message || 'Không tải được tin nhắn.');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    if (activeConvId) loadMessages(activeConvId);
  }, [activeConvId, loadMessages]);

  // Socket room joining and realtime message listening inside active chat
  useEffect(() => {
    if (!socket || !activeConvId) return;

    socket.emit('join_room', activeConvId);

    const handleReceiveMessage = (msg: ConversationMessage) => {
      if (msg.conversation_id === activeConvId) {
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });
        // Mark as read in the background
        conversationService.markAsRead(activeConvId).catch(() => undefined);
        // Update unread and snippet in local state
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === activeConvId
              ? { ...c, last_message: msg.content, last_message_at: msg.sent_at, unread_count: 0 }
              : c
          )
        );
      }
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.emit('leave_room', activeConvId);
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [socket, activeConvId]);

  // Socket notification listening for background conversations
  useEffect(() => {
    if (!socket) return;

    const handleNotification = async (data: { conversationId: string; message: ConversationMessage }) => {
      const { conversationId, message } = data;

      if (conversationId !== activeConvId) {
        // If conversation exists in local state, update it
        const exists = conversations.some((c) => c.conversation_id === conversationId);
        if (exists) {
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.conversation_id === conversationId
                ? {
                    ...c,
                    last_message: message.content,
                    last_message_at: message.sent_at,
                    unread_count: c.unread_count + 1,
                  }
                : c
            );
            // Sort updated list by last message time descending
            return [...updated].sort((a, b) => {
              const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
              const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
              return timeB - timeA;
            });
          });
        } else {
          // If it's a new conversation, reload the list to fetch it from the database
          try {
            const res = await conversationService.listConversations();
            if (res && res.data) {
              setConversations(res.data);
            }
          } catch (err) {
            console.error('Failed to reload conversations list on socket notification:', err);
          }
        }
      }
    };

    socket.on('new_message_notification', handleNotification);

    return () => {
      socket.off('new_message_notification', handleNotification);
    };
  }, [socket, activeConvId, conversations]);

  // Scroll to bottom when messages change.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeConv = conversations.find((c) => c.conversation_id === activeConvId) ?? null;

  const filteredConvs = conversations.filter((c) =>
    (c.peer_name || '').toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')),
  );

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || !activeConvId || sending) return;
    setSending(true);
    setInputText('');
    try {
      const res = await conversationService.sendMessage(activeConvId, content);
      const sent = res.data;
      if (sent) {
        setMessages((prev) => {
          if (prev.some((m) => m.message_id === sent.message_id)) return prev;
          return [...prev, sent];
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.conversation_id === activeConvId
              ? { ...c, last_message: sent.content, last_message_at: sent.sent_at }
              : c,
          ),
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Gửi tin nhắn thất bại.');
      setInputText(content); // restore so the user doesn't lose their text
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

  return (
    <main className="flex min-h-screen bg-[#FAF8FF]">
      <HostSidebar user={user} onLogout={handleLogout} activePage="messages" />

      <div className="flex flex-1 flex-col lg:ml-[272px]">
        {/* ── Top Nav Bar ────────────────────────────────────────────── */}
        <header className="flex h-16 items-center justify-end gap-4 border-b border-[rgba(195,198,215,0.3)] bg-[#FAF8FF] px-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <button type="button" aria-label="Thông báo" className="flex h-8 w-8 items-center justify-center rounded-full text-[#004AC6] hover:bg-[#EEF3FF]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a3 3 0 0 0 6 0" />
            </svg>
          </button>
        </header>

        {/* ── Two-panel chat layout ─────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Conversation List (Left Panel) ────────────────────── */}
          <aside className="flex w-96 shrink-0 flex-col border-r border-[rgba(195,198,215,0.3)] bg-[#FAF8FF]">
            <div className="flex flex-col gap-4 px-6 pb-6 pt-[23px]">
              <h1 className="text-2xl font-semibold leading-8 text-[#191B23]">Tin nhắn</h1>
              <div className="relative">
                <svg className="pointer-events-none absolute left-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#737686]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4z" />
                </svg>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm hội thoại..."
                  className="h-[39px] w-full rounded-lg border border-[#C3C6D7] bg-[#F3F3FE] pl-9 pr-4 text-sm text-[#191B23] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#004AC6]/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {loadingConvs ? (
                <p className="px-4 py-6 text-sm text-[#737686]">Đang tải hội thoại...</p>
              ) : filteredConvs.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[#737686]">
                  {conversations.length === 0 ? 'Bạn chưa có hội thoại nào.' : 'Không tìm thấy hội thoại phù hợp.'}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredConvs.map((conv) => (
                    <ConversationItem
                      key={conv.conversation_id}
                      conv={conv}
                      isActive={conv.conversation_id === activeConvId}
                      onClick={() => setActiveConvId(conv.conversation_id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── Main Chat Window (Right Panel) ────────────────────── */}
          <div className="relative flex flex-1 flex-col bg-white">
            {activeConv ? (
              <>
                {/* Chat header */}
                <div className="absolute inset-x-0 top-0 z-10 flex h-[73px] items-center justify-between border-b border-[rgba(195,198,215,0.3)] bg-[rgba(250,248,255,0.8)] px-6 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <Avatar name={activeConv.peer_name} avatarUrl={activeConv.peer_avatar} size="md" />
                    <div>
                      <p className="text-base font-semibold leading-5 text-[#191B23]">{activeConv.peer_name || 'Người dùng'}</p>
                    </div>
                  </div>
                </div>

                {/* Messages scrollable area */}
                <div className="absolute inset-x-0 bottom-[88px] top-[73px] overflow-y-auto px-6 py-6">
                  {loadingMsgs ? (
                    <p className="text-center text-sm text-[#737686]">Đang tải tin nhắn...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-[#737686]">Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện.</p>
                  ) : (
                    <>
                      <div className="mb-6 flex justify-center">
                        <span className="rounded-full bg-[#EDEDF9] px-4 py-1 text-[11px] font-bold uppercase tracking-[1.1px] text-[#737686]">
                          {formatDateDivider(messages[0].sent_at)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-6">
                        {messages.map((msg) => (
                          <MessageBubble
                            key={msg.message_id}
                            msg={msg}
                            isMine={msg.sender_id === myUserId}
                            peerName={activeConv.peer_name}
                            peerAvatar={activeConv.peer_avatar}
                          />
                        ))}
                      </div>
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat input area */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 border-t border-[rgba(195,198,215,0.3)] bg-[#FAF8FF] px-6 pb-4 pt-4">
                  <div className="flex items-end gap-4">
                    <div className="flex flex-1 items-end rounded-xl border border-[rgba(195,198,215,0.5)] bg-[#F3F3FE] p-2">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tin nhắn..."
                        rows={1}
                        className="flex-1 resize-none bg-transparent px-3 py-2 text-base leading-6 text-[#191B23] placeholder:text-[#6B7280] focus:outline-none"
                        style={{ maxHeight: '128px' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !inputText.trim()}
                      aria-label="Gửi"
                      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#004AC6] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] transition hover:bg-[#003fa3] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <svg className="h-4 w-[19px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" strokeWidth="0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center">
                <p className="text-sm text-[#737686]">
                  {loadingConvs ? 'Đang tải...' : 'Chọn một hội thoại để bắt đầu nhắn tin.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

// =============================================================
// frontend/components/ChatWidget.tsx
// Widget AI Chatbot nổi ở góc dưới phải.
// Client Component vì cần useState để quản lý trạng thái chat.
// =============================================================

import { useState, useRef, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

interface RecommendedRoom {
  roomId: string;
  title: string;
  monthlyRent: number;
  depositAmount: number;
  coverImage: string | null;
  fullAddress: string;
  roomType: string;
  averageRating: number | null;
  reason: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string; // Thời gian gửi hiển thị dạng HH:mm
  recommendedRooms?: RecommendedRoom[];
}

// Hàm lấy giờ hiện tại dạng HH:mm
function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget() {
  // Trạng thái mở/đóng cửa sổ chat
  const [isOpen, setIsOpen] = useState(false);
  // Trạng thái phóng to toàn màn hình
  const [isExpanded, setIsExpanded] = useState(false);
  // Trạng thái hiển thị bong bóng câu chào của AI ở ngoài
  const [showBubble, setShowBubble] = useState(true);
  // Danh sách tin nhắn
  const [messages, setMessages] = useState<Message[]>([]);
  // Trạng thái AI đang trả lời
  const [isTyping, setIsTyping] = useState(false);
  // Nội dung ô nhập liệu
  const [inputText, setInputText] = useState('');
  // Ref để cuộn xuống tin nhắn mới nhất
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự động điều chỉnh chiều cao của textarea khi gõ tin nhắn
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(120, textareaRef.current.scrollHeight)}px`;
    }
  }, [inputText]);

  // Khôi phục từ sessionStorage khi component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('booking_chat_history');
      if (stored) {
        try {
          setMessages(JSON.parse(stored));
          setShowBubble(false); // Ẩn bubble chào nếu đã có lịch sử chat trước đó
        } catch (e) {
          console.error('Error parsing stored chat history:', e);
          initializeDefaultWelcome();
        }
      } else {
        initializeDefaultWelcome();
      }
    }
  }, []);

  const initializeDefaultWelcome = () => {
    setMessages([
      {
        id: 'default-welcome',
        sender: 'ai',
        text: 'Xin chào! Tôi là trợ lý ảo AI của BookingRoom. Tôi có thể giúp gì cho bạn trong việc tìm kiếm phòng trọ?',
        time: getCurrentTime(),
      },
    ]);
  };

  // Đồng bộ tin nhắn với sessionStorage
  const saveMessages = (newMessages: Message[]) => {
    setMessages(newMessages);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('booking_chat_history', JSON.stringify(newMessages));
    }
  };

  // Tự động cuộn xuống cuối khi có tin nhắn mới hoặc đang gõ
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Xử lý gửi tin nhắn
  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isTyping) return; // Không gửi nếu ô rỗng hoặc đang chờ AI trả lời

    // 1. Thêm tin nhắn user vào danh sách
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: getCurrentTime(),
    };
    const updatedMessages = [...messages, userMsg];
    saveMessages(updatedMessages);
    setInputText(''); // Xóa ô nhập sau khi gửi
    setIsTyping(true);

    try {
      // 2. Định dạng lịch sử cuộc hội thoại gửi lên AI (không bao gồm tin chào mặc định)
      const historyContext = updatedMessages
        .filter((msg) => msg.id !== 'default-welcome')
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

      // 3. Gọi API backend tư vấn phòng trọ
      const res = await fetch(`${API_BASE}/ai/room-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          history: historyContext,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Lỗi khi kết nối với AI');

      // 4. Thêm tin nhắn phản hồi của AI
      const aiReply = json.data?.reply || 'Xin lỗi, tôi gặp lỗi khi xử lý câu hỏi này.';
      const recommendedRooms = json.data?.recommendedRooms || [];
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        time: getCurrentTime(),
        recommendedRooms: recommendedRooms,
      };
      saveMessages([...updatedMessages, aiMsg]);
    } catch (err: any) {
      console.warn('AI chat error:', err);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: err.message || 'Xin lỗi, hệ thống AI đang gặp gián đoạn kỹ thuật. Vui lòng thử lại sau giây lát!',
        time: getCurrentTime(),
      };
      saveMessages([...updatedMessages, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Gửi bằng phím Enter (không kèm Shift)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ----------------------------------------------------------------
          CỬA SỔ CHAT - Hiện ra khi isOpen = true
          ---------------------------------------------------------------- */}
      {isOpen && (
        <div 
          className={`fixed z-50 bg-white shadow-2xl border border-gray-150 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded 
              ? 'inset-0 w-full h-full rounded-none md:top-4 md:bottom-4 md:left-4 md:right-28 md:w-auto md:h-auto md:rounded-2xl'
              : 'bottom-6 right-24 w-[400px] rounded-2xl animate-in slide-in-from-bottom-5 duration-200'
          }`}
          style={isExpanded ? undefined : { height: '520px' }}
        >

          {/* Header */}
          <div className="bg-[#0052CC] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">AI Trợ Lý</p>
                <p className="text-blue-200 text-[11px]">Hỗ trợ tìm phòng</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Nút phóng to / thu nhỏ dạng <> nghiêng */}
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-white/70 hover:text-white transition-colors p-2 flex items-center justify-center rounded-lg hover:bg-white/10"
                title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
              >
                <svg 
                  className="w-6 h-6 transition-transform duration-300"
                  style={{ transform: `rotate(${isExpanded ? '135' : '-45'}deg)` }}
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
                </svg>
              </button>
              
              {/* Nút đóng cửa sổ chat */}
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors p-2 flex items-center justify-center rounded-lg hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Vùng hiển thị tin nhắn */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8F9FF]">
            {/* Render các tin nhắn */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`text-sm px-3 py-2 rounded-2xl shadow-sm whitespace-pre-wrap break-words leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#0052CC] text-white rounded-tr-sm'
                      : 'bg-white text-[#172B4D] rounded-tl-sm border border-gray-150'
                  }`}>
                    {renderMessageContent(msg)}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-1 ${msg.sender === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                    {msg.time}
                  </p>
                </div>
                
                {/* Thẻ phòng đề xuất */}
                {msg.sender === 'ai' && msg.recommendedRooms && msg.recommendedRooms.length > 0 && !msg.text.includes('[RoomCard:') && (
                  <div className="mt-2 pl-1 pr-1 flex gap-3 overflow-x-auto py-2 w-full max-w-full shrink-0 scrollbar-thin scrollbar-thumb-gray-200">
                    {msg.recommendedRooms.map((room) => (
                      <a
                        key={room.roomId}
                        href={`/rooms/${room.roomId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 w-[240px] shrink-0 hover:scale-[1.02] active:scale-95"
                      >
                        {/* Image area */}
                        <div className="h-[120px] w-full relative bg-gray-100 shrink-0">
                          {room.coverImage ? (
                            <img 
                              src={room.coverImage} 
                              alt={room.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 text-xs font-semibold">
                              Không có hình ảnh
                            </div>
                          )}
                          {/* Price Tag Overlay */}
                          <div className="absolute bottom-2 right-2 bg-[#0052CC]/90 text-white font-bold text-[11px] px-2 py-0.5 rounded-md shadow-sm">
                            {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(room.monthlyRent)}/tháng
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="p-3 flex flex-col flex-1 gap-1">
                          {/* Type tag */}
                          <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 self-start px-1.5 py-0.5 rounded">
                            {room.roomType === 'Phòng trọ' ? 'Phòng trọ' : room.roomType === 'Căn hộ' ? 'Căn hộ' : 'Ở ghép'}
                          </span>
                          
                          {/* Room title */}
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                            {room.title}
                          </h4>
                          
                          {/* Address info */}
                          <p className="text-[10px] text-slate-500 flex items-center gap-1 line-clamp-1">
                            <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {room.fullAddress}
                          </p>

                          {/* Recommendation reason */}
                          <div className="mt-1 bg-gray-50 p-2 rounded-lg text-[10px] text-slate-600 border border-gray-100 flex-1 flex items-start gap-1">
                            <svg className="w-3.5 h-3.5 text-[#0052CC] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <p className="line-clamp-2 leading-relaxed">
                              {room.reason}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Hoạt ảnh đang gõ tin nhắn */}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="max-w-[75%]">
                  <div className="bg-white text-gray-500 text-sm px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm border border-gray-150 flex items-center gap-1.5 h-[34px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC]/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0052CC]/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">AI đang soạn câu trả lời...</p>
                </div>
              </div>
            )}

            {/* Phần tử ẩn để cuộn xuống cuối */}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-end gap-2 shrink-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isTyping}
              placeholder={isTyping ? 'AI đang soạn câu trả lời...' : 'Nhập tin nhắn...'}
              className="flex-1 bg-[#F4F5F7] text-sm text-[#172B4D] placeholder-gray-400 px-4 py-2.5 rounded-2xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0052CC]/30 transition-all disabled:opacity-60 resize-none max-h-[120px] overflow-y-auto leading-relaxed"
            />
            {/* Nút gửi (mũi tên) */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isTyping}
              className="w-10 h-10 bg-[#0052CC] hover:bg-[#0043A8] disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm mb-0.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          BONG BÓNG CHÀO HỎI - Có thể tắt được
          ---------------------------------------------------------------- */}
      {showBubble && !isOpen && (
        <div className="fixed bottom-24 right-8 z-50 bg-[#F4F5F7] border border-gray-200 rounded-2xl p-4 pr-7 shadow-lg max-w-[240px] transition-all duration-300">
          {/* Nút tắt bong bóng */}
          <button
            onClick={() => setShowBubble(false)}
            className="absolute top-1.5 right-1.5 w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center text-xs font-semibold"
            title="Ẩn tin nhắn"
          >
            ×
          </button>
          <p className="text-sm font-medium text-[#172B4D] leading-normal">
            Tôi có thể giúp bạn tìm phòng không?
          </p>
          {/* Mũi tên chỉ xuống nút tròn */}
          <div className="absolute -bottom-1 right-7 w-2 h-2 bg-[#F4F5F7] border-r border-b border-gray-200 rotate-45"></div>
        </div>
      )}

      {/* ----------------------------------------------------------------
          NÚT CHAT NỔI - Dạng tròn, chứa Robot Icon
          ---------------------------------------------------------------- */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          setShowBubble(false); // Tự động ẩn bong bóng khi mở chat
        }}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-br from-[#0052CC] to-[#0084FF] hover:from-[#0043A8] hover:to-[#0073E6] text-white w-14 h-14 rounded-full items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none ${
          isOpen ? 'hidden md:flex' : 'flex'
        }`}
      >
        {isOpen ? (
          // Icon đóng (X)
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Icon robot đầu tròn giống mockup
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="8" width="14" height="10" rx="2" />
            <path d="M9 4v4M15 4v4M12 2v2M5 13H3M19 13h2" />
            <circle cx="9" cy="13" r="1" fill="currentColor" />
            <circle cx="15" cy="13" r="1" fill="currentColor" />
            <path d="M9 16h6" />
          </svg>
        )}
      </button>
    </>
  );
}

function renderParsedMessage(text: string, isUser: boolean) {
  if (!text) return null;

  let keyCounter = 0;

  // Recursive parser to support nested structures like bold links: **[Text](/url)**
  function parseSegment(subText: string, inBold: boolean = false): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIdx = 0;
    let boldMatch;

    if (!inBold) {
      while ((boldMatch = boldRegex.exec(subText)) !== null) {
        const matchIndex = boldMatch.index;
        const plainText = subText.substring(lastIdx, matchIndex);

        // Parse links in the normal plain text segment
        if (plainText) {
          nodes.push(...parseLinks(plainText, isUser, keyCounter++));
        }

        const boldContent = boldMatch[1];
        // Parse links inside the bold block, wrapping it in <strong>
        nodes.push(
          <strong key={`bold-${keyCounter++}`} className="font-extrabold text-[#172B4D]">
            {parseSegment(boldContent, true)}
          </strong>
        );

        lastIdx = boldRegex.lastIndex;
      }

      const remainingText = subText.substring(lastIdx);
      if (remainingText) {
        nodes.push(...parseLinks(remainingText, isUser, keyCounter++));
      }
    } else {
      // Already inside bold, just parse links directly
      return parseLinks(subText, isUser, keyCounter++);
    }

    return nodes;
  }

  return <>{parseSegment(text)}</>;
}

function parseLinks(text: string, isUser: boolean, segmentIndex: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIdx = 0;
  let linkMatch;
  let linkCounter = 0;

  while ((linkMatch = linkRegex.exec(text)) !== null) {
    const matchIndex = linkMatch.index;
    const plainText = text.substring(lastIdx, matchIndex);
    if (plainText) {
      nodes.push(<span key={`text-${segmentIndex}-plain-${linkCounter}`}>{plainText}</span>);
    }

    const linkText = linkMatch[1];
    const linkUrl = linkMatch[2];

    nodes.push(
      <a
        key={`link-${segmentIndex}-${linkCounter}`}
        href={linkUrl}
        className={`underline font-bold transition-colors ${
          isUser 
            ? 'text-blue-100 hover:text-white' 
            : 'text-[#0052CC] hover:text-[#0043A8]'
        }`}
        target={linkUrl.startsWith('http') ? '_blank' : undefined}
        rel={linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {linkText}
      </a>
    );
    linkCounter++;
    lastIdx = linkRegex.lastIndex;
  }

  const remaining = text.substring(lastIdx);
  if (remaining) {
    nodes.push(<span key={`text-${segmentIndex}-remain`}>{remaining}</span>);
  }

  return nodes;
}

function renderMessageContent(msg: Message) {
  const text = msg.text;
  const isUser = msg.sender === 'user';
  if (!text) return null;

  if (isUser || !msg.recommendedRooms || msg.recommendedRooms.length === 0) {
    return renderParsedMessage(text, isUser);
  }

  const nodes: React.ReactNode[] = [];
  const regex = /\[RoomCard:\s*([a-zA-Z0-9-]+)\]/g;
  let lastIdx = 0;
  let match;
  let index = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    let plainTextSegment = text.substring(lastIdx, matchIndex);

    if (plainTextSegment) {
      // Dọn dẹp khoảng xuống dòng thừa trước/sau thẻ RoomCard
      plainTextSegment = plainTextSegment.replace(/\n+$/, '');
      if (index > 0) {
        plainTextSegment = plainTextSegment.replace(/^\n+/, '\n');
      } else {
        plainTextSegment = plainTextSegment.replace(/^\n+/, '');
      }

      if (plainTextSegment) {
        nodes.push(
          <span key={`text-seg-${index}`}>
            {renderParsedMessage(plainTextSegment, false)}
          </span>
        );
      }
    }

    const roomId = match[1];
    const room = msg.recommendedRooms.find(r => String(r.roomId) === String(roomId));

    if (room) {
      nodes.push(
        <div key={`inline-card-${roomId}-${index}`} className="my-2.5 block w-full max-w-[280px]">
          <a
            href={`/rooms/${room.roomId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col bg-[#F8F9FA] border border-gray-200/80 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:bg-white transition-all duration-300 w-full hover:scale-[1.01] active:scale-95"
          >
            {/* Image area */}
            <div className="h-[120px] w-full relative bg-gray-100 shrink-0">
              {room.coverImage ? (
                <img 
                  src={room.coverImage} 
                  alt={room.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 text-xs font-semibold">
                  Không có hình ảnh
                </div>
              )}
              {/* Price Tag Overlay */}
              <div className="absolute bottom-2 right-2 bg-[#0052CC]/90 text-white font-bold text-[11px] px-2 py-0.5 rounded-md shadow-sm">
                {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(room.monthlyRent)}/tháng
              </div>
            </div>

            {/* Content Area */}
            <div className="p-3 flex flex-col gap-1 text-left">
              {/* Type tag */}
              <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 self-start px-1.5 py-0.5 rounded">
                {room.roomType === 'Phòng trọ' ? 'Phòng trọ' : room.roomType === 'Căn hộ' ? 'Căn hộ' : 'Ở ghép'}
              </span>
              
              {/* Room title */}
              <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                {room.title}
              </h4>
              
              {/* Address info */}
              <p className="text-[10px] text-slate-500 flex items-center gap-1 line-clamp-1">
                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {room.fullAddress}
              </p>

              {/* Recommendation reason */}
              <div className="mt-1 bg-gray-50 p-2 rounded-lg text-[10px] text-slate-600 border border-gray-100 flex items-start gap-1">
                <svg className="w-3.5 h-3.5 text-[#0052CC] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="line-clamp-2 leading-relaxed">
                  {room.reason}
                </p>
              </div>
            </div>
          </a>
        </div>
      );
    }

    lastIdx = regex.lastIndex;
    index++;
  }

  let remainingText = text.substring(lastIdx);
  if (remainingText) {
    // Dọn dẹp khoảng xuống dòng thừa cho câu chào chốt ở cuối
    remainingText = remainingText.replace(/^\n+/, '\n').replace(/\n+$/, '');
    if (remainingText) {
      nodes.push(
        <span key={`text-seg-remain`}>
          {renderParsedMessage(remainingText, false)}
        </span>
      );
    }
  }

  return <>{nodes}</>;
}


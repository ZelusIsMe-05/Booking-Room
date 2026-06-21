'use client';

// =============================================================
// frontend/components/ChatWidget.tsx
// Widget AI Chatbot nổi ở góc dưới phải.
// Client Component vì cần useState để quản lý trạng thái chat.
// =============================================================

import { useState, useRef, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string; // Thời gian gửi hiển thị dạng HH:mm
}

// Hàm lấy giờ hiện tại dạng HH:mm
function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatWidget() {
  // Trạng thái mở/đóng cửa sổ chat
  const [isOpen, setIsOpen] = useState(false);
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
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        time: getCurrentTime(),
      };
      saveMessages([...updatedMessages, aiMsg]);
    } catch (err: any) {
      console.error('AI chat error:', err);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: 'ai',
        text: 'Xin lỗi, hệ thống AI đang gặp gián đoạn kỹ thuật. Vui lòng thử lại sau giây lát!',
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
        <div className="fixed bottom-6 right-24 z-50 w-[400px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
          style={{ height: '520px' }}>

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
            {/* Nút đóng cửa sổ chat */}
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Vùng hiển thị tin nhắn */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F8F9FF]">
            {/* Render các tin nhắn */}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`text-sm px-3 py-2 rounded-2xl shadow-sm whitespace-pre-wrap break-words leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#0052CC] text-white rounded-tr-sm'
                      : 'bg-white text-[#172B4D] rounded-tl-sm border border-gray-150'
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-1 ${msg.sender === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                    {msg.time}
                  </p>
                </div>
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
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-br from-[#0052CC] to-[#0084FF] hover:from-[#0043A8] hover:to-[#0073E6] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none"
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

'use client';

// =============================================================
// frontend/components/ChatWidget.tsx
// Widget AI Chatbot nổi ở góc dưới phải.
// Client Component vì cần useState để quản lý trạng thái chat.
// =============================================================

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
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
  // Danh sách tin nhắn người dùng đã gửi
  const [messages, setMessages] = useState<Message[]>([]);
  // Nội dung ô nhập liệu
  const [inputText, setInputText] = useState('');
  // Ref để cuộn xuống tin nhắn mới nhất
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Xử lý gửi tin nhắn
  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return; // Không gửi nếu ô rỗng

    // Thêm tin nhắn mới vào danh sách
    const newMessage: Message = {
      id: Date.now(),
      text: trimmed,
      time: getCurrentTime(),
    };
    setMessages((prev) => [...prev, newMessage]);
    setInputText(''); // Xóa ô nhập sau khi gửi
  };

  // Gửi bằng phím Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <>
      {/* ----------------------------------------------------------------
          CỬA SỔ CHAT - Hiện ra khi isOpen = true
          ---------------------------------------------------------------- */}
      {isOpen && (
        <div className="fixed bottom-6 right-24 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ height: '420px' }}>

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
            {/* Tin nhắn chào mặc định */}
            <div className="flex justify-start">
              <div className="max-w-[75%]">
                <div className="bg-white text-[#172B4D] text-sm px-3 py-2 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100">
                  Xin chào! Tôi có thể giúp bạn tìm phòng trọ phù hợp. Bạn muốn thuê phòng ở khu vực nào?
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Vừa xong</p>
              </div>
            </div>

            {/* Render các tin nhắn người dùng đã gửi */}
            {messages.map((msg) => (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[75%]">
                  <div className="bg-[#0052CC] text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm shadow-sm">
                    {msg.text}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 text-right mr-1">{msg.time}</p>
                </div>
              </div>
            ))}

            {/* Phần tử ẩn để cuộn xuống cuối */}
            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              className="flex-1 bg-[#F4F5F7] text-sm text-[#172B4D] placeholder-gray-400 px-3 py-2 rounded-full focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#0052CC]/30 transition-all"
            />
            {/* Nút gửi (mũi tên) */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="w-9 h-9 bg-[#0052CC] hover:bg-[#0043A8] disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors shrink-0 shadow-sm"
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

// =============================================================
// frontend/app/page.tsx
// Trang chủ công khai - Route: /
// Ai cũng có thể truy cập, không cần đăng nhập.
// =============================================================

import React from 'react';
import ChatWidget from '@/components/common/ChatWidget';
import SearchFilter from '@/components/guest/SearchFilter';

// Định nghĩa cấu trúc dữ liệu cho Card Phòng để sau này bạn map từ Backend (Express + Knex) đổ ra
interface Room {
  id: number;
  title: string;
  location: string;
  price: string;
  imageUrl: string;
  isVerified: boolean;
  isNew?: boolean;
}

export default function HomePage() {
  // =========================================================================
  // TO-DO: MOCK DATA - Sau này bạn sẽ thay thế mảng này bằng việc fetch API 
  // từ Express server (ví dụ: const res = await fetch('http://localhost:5000/api/rooms'))
  // =========================================================================
  const mockRooms: Room[] = [
    {
      id: 1,
      title: "Phòng trọ 30 m² có gác, ban công",
      location: "Quận 10, TP. Hồ Chí Minh",
      price: "3.800.000đ",
      imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=1000",
      isVerified: true
    },
    {
      id: 2,
      title: "Phòng Trọ - Ký Túc Xá - Giá Rẻ",
      location: "Bình Thạnh, TP. Hồ Chí Minh",
      price: "1.600.000đ",
      imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?q=80&w=1000",
      isVerified: true
    },
    {
      id: 3,
      title: "Căn hộ gần ĐH VL CS3, IUH",
      location: "Gò Vấp, TP. Hồ Chí Minh",
      price: "4.500.000đ",
      imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1000",
      isVerified: false,
      isNew: true
    },
    {
      id: 4,
      title: "Phòng có nội thất gần ĐH SPKT, HUB",
      location: "Thủ Đức, TP. Hồ Chí Minh",
      price: "3.200.000đ",
      imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1000",
      isVerified: true
    }
  ];
  // =========================================================================
  // KẾT THÚC VÙNG MOCK DATA
  // =========================================================================

  return (
    <div className="text-[#172B4D] antialiased min-h-screen flex flex-col justify-between bg-[#fdfdfd]">
      
      {/* 1. TOP NAVBAR */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-4 lg:px-12 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 flex-1 max-w-xl">
          <a href="#" className="text-[#0052CC] font-bold text-2xl tracking-tight whitespace-nowrap">
            Booking-Room
          </a>
          <div className="relative w-full max-w-xs hidden md:block">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Tìm kiếm nhanh..." 
              className="w-full pl-9 pr-4 py-1.5 bg-[#F4F5F7] border border-transparent rounded-full text-sm focus:outline-none focus:bg-white focus:border-gray-200 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6 text-sm font-medium">
          <a href="#" className="text-[#0052CC] border-b-2 border-[#0052CC] pb-1 px-1 hidden sm:block">Cho nhà</a>
          <a href="#" className="text-[#6B778C] hover:text-[#172B4D] transition-colors hidden sm:block">Trợ giúp</a>
          <button className="text-[#6B778C] hover:text-[#172B4D] transition-colors p-1.5 rounded-full hover:bg-gray-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9h18" />
            </svg>
          </button>
          <a href="/auth/login" className="text-[#172B4D] hover:text-[#0052CC] transition-colors font-semibold px-2 py-1.5">Đăng nhập</a>
          <a href="/auth/register" className="bg-[#0052CC] hover:bg-[#0043A8] text-white px-4 py-2 rounded-md font-semibold transition-colors shadow-sm">Đăng ký</a>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-grow">
        
        {/* 2. HERO SECTION & FILTER BAR */}
        <section className="relative bg-gradient-to-b from-[#F4F5F7]/40 to-transparent pt-16 pb-20 px-4 text-center">
          <div className="relative max-w-5xl mx-auto z-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#172B4D] mb-3">
              Tìm Phòng Ưng Ý, Định Cư Lâu Dài
            </h1>
            <p className="text-[#6B778C] text-sm md:text-base max-w-2xl mx-auto mb-10">
              Hàng ngàn phòng trọ, căn hộ dịch vụ và chỗ ở ghép xác thực, đầy đủ tiện nghi.
            </p>

            {/* Filter Bar - tách thành Client Component riêng để xử lý dropdown */}
            <SearchFilter />
          </div>
        </section>

        {/* 3. SECTION: PHÒNG NỔI BẬT */}
        <section className="max-w-7xl mx-auto px-4 lg:px-12 pb-24">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#172B4D]">Phòng Nổi Bật</h2>
              <p className="text-[#6B778C] text-xs md:text-sm mt-0.5">Những không gian được yêu thích và đánh giá cao nhất.</p>
            </div>
            <a href="#" className="text-[#0052CC] hover:underline text-sm font-semibold transition-all">Xem tất cả</a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockRooms.map((room) => (
              <div key={room.id} className="group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all cursor-pointer bg-white flex flex-col h-[280px]">
                <div className="relative w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={room.imageUrl} 
                    alt={room.title} 
                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  
                  {room.isVerified && (
                    <div className="absolute top-3 left-3 flex gap-1.5 items-center bg-[#E3FCEF]/90 text-[#006644] text-[11px] font-bold px-2 py-0.5 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <span>Đã xác thực</span>
                    </div>
                  )}

                  {room.isNew && (
                    <div className="absolute top-3 left-3 bg-white/95 text-[#172B4D] text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                      <span>Mới</span>
                    </div>
                  )}
                  
                  <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/40 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  </button>

                  <div className="absolute bottom-0 inset-x-0 p-4 flex justify-between items-end gap-4 text-white">
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-base md:text-lg truncate drop-shadow-sm">{room.title}</h3>
                      <p className="text-xs text-gray-200/90 mt-1 flex items-center gap-1.5 truncate">
                        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span>{room.location}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 whitespace-nowrap drop-shadow-sm">
                      <span className="text-lg md:text-xl font-bold">{room.price}</span>
                      <span className="text-[11px] text-gray-300">/tháng</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 4. FOOTER */}
      <footer className="bg-[#ECEFF1] text-sm text-[#6B778C] border-t border-gray-200 pt-12 pb-6 px-4 lg:px-12 relative">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-[#0052CC] font-bold text-lg mb-3">Booking-Room</h4>
            <p className="text-xs leading-relaxed text-[#6B778C]">
              Tìm phòng ưng ý, định cư lâu dài.<br/>Nền tảng uy tín, chất lượng hàng đầu HCMUS.
            </p>
          </div>
          <div>
            <h5 className="font-bold text-[#172B4D] mb-3">Công ty</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Về chúng tôi</a></li>
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Cơ hội nghề nghiệp</a></li>
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Báo chí</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#172B4D] mb-3">Hỗ trợ</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Trung tâm hỗ trợ</a></li>
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">An toàn &amp; Tin cậy</a></li>
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Chính sách hủy phòng</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-[#172B4D] mb-3">Pháp lý</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Chính sách bảo mật</a></li>
              <li><a href="#" className="hover:text-[#0052CC] transition-colors">Điều khoản sử dụng</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-4 border-t border-gray-300/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>&copy; 2026 Booking-Room. Tìm phòng ưng ý, định cư lâu dài.</p>
        </div>

        {/* 5. AI CHATBOT WIDGET - Tách thành Client Component riêng */}
        <ChatWidget />
      </footer>

    </div>
  );
}

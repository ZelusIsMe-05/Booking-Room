'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import { 
  CheckIcon, 
  MapPinIcon, 
  StarIcon, 
  ShieldCheckIcon, 
  AirConditionerIcon, 
  WifiIcon, 
  ClockIcon, 
  WashingMachineIcon, 
  RefrigeratorIcon, 
  MotorbikeIcon, 
  LockIcon, 
  GridIcon, 
  MapIcon,
} from '@/components/booking/Icons';
import BookingCheckoutSection from '@/components/booking/BookingCheckoutSection';

interface RoomDetailContentProps {
  room: any;
}

const getAvatarPlaceholder = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return 'A';
  const parts = trimmed.split(/\s+/);
  const lastWord = parts[parts.length - 1];
  return lastWord.charAt(0).toUpperCase();
};

const getAvatarBgColor = (name: string) => {
  const colors = [
    'bg-blue-500 text-white',
    'bg-purple-500 text-white',
    'bg-emerald-500 text-white',
    'bg-indigo-500 text-white',
    'bg-rose-500 text-white',
    'bg-amber-500 text-white',
    'bg-teal-500 text-white',
    'bg-orange-500 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function RoomDetailContent({ room }: RoomDetailContentProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);

  const resetZoom = () => {
    setZoomScale(1);
    setDragPosition({ x: 0, y: 0 });
    setHasMoved(false);
  };

  // Prepend a realistic ward to the location if not already specified
  const displayLocation = (room.location || '').includes('Phường') 
    ? room.location 
    : 'Phường 12, ' + (room.location || '');
  const hasCoordinates = room.latitude != null && room.longitude != null;
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${room.latitude},${room.longitude}`)}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(room.location || '')}`;

  // Consolidate unique S3 & mockup images, ensuring no empty paths
  const allImages = (room.images && room.images.length > 0
    ? [
        room.image,
        ...room.images.filter((img: string) => img !== room.image)
      ]
    : [room.image]).filter(Boolean);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    resetZoom();
    setIsLightboxOpen(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    resetZoom();
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    resetZoom();
  };

  const zoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 3));
  };

  const zoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) {
        setDragPosition({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleImageClick = () => {
    if (hasMoved) {
      setHasMoved(false);
      return;
    }
    if (zoomScale > 1) {
      resetZoom();
    } else {
      setZoomScale(2);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomScale === 1) return;
    e.preventDefault();
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomScale === 1) return;
    e.preventDefault();
    setHasMoved(true);
    setDragPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomScale === 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: touch.clientX - dragPosition.x, y: touch.clientY - dragPosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || zoomScale === 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setHasMoved(true);
    setDragPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        resetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen, allImages.length]);

  // Format landlord joined date dynamically from database
  let hostJoinedDate = 'Đã tham gia từ tháng 5, 2021';
  if (room.host?.createdAt) {
    try {
      const d = new Date(room.host.createdAt);
      hostJoinedDate = `Đã tham gia từ tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    } catch (e) {}
  }

  // Map dynamic amenities from database to custom icons
  const amenityIconMap: Record<string, any> = {
    'máy lạnh': AirConditionerIcon,
    'điều hòa': AirConditionerIcon,
    'wifi': WifiIcon,
    'wifi tốc độ cao': WifiIcon,
    'giờ giấc tự do': ClockIcon,
    'máy giặt': WashingMachineIcon,
    'máy giặt chung': WashingMachineIcon,
    'tủ lạnh': RefrigeratorIcon,
    'bãi đậu xe máy': MotorbikeIcon,
    'chỗ để xe': MotorbikeIcon,
  };

  const displayAmenities = room.amenities && room.amenities.length > 0 
    ? room.amenities.map((name: string) => {
        const key = name.toLowerCase();
        const icon = amenityIconMap[key] || CheckIcon;
        return { name, icon };
      })
    : [];

  return (
    <div className="min-h-screen bg-booking-surface text-booking-text font-sans">
      <BookingHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Back Link */}
        <div className="mb-4">
          <Link href="/rooms" className="text-sm font-bold text-booking-primary transition hover:text-booking-primaryDark">
            ← Quay lại danh sách
          </Link>
        </div>

        {/* Top Gallery Grid (Dynamic columns based on image count, max 3 in grid preview) */}
        <section className="relative h-[240px] sm:h-[300px] md:h-[380px] w-full rounded-2xl overflow-hidden shadow-sm bg-slate-100 cursor-pointer">
          {allImages.length === 1 && (
            <div className="relative h-full w-full overflow-hidden" onClick={() => openLightbox(0)}>
              <Image 
                src={allImages[0]} 
                alt={`${room.title} - Ảnh 1`} 
                fill 
                priority
                sizes="100vw"
                className="object-cover transition duration-300 hover:scale-[1.02]" 
              />
            </div>
          )}
          
          {allImages.length === 2 && (
            <div className="grid grid-cols-2 gap-2 h-full w-full">
              {allImages.map((imgUrl, index) => (
                <div key={index} className="relative h-full w-full overflow-hidden" onClick={() => openLightbox(index)}>
                  <Image 
                    src={imgUrl} 
                    alt={`${room.title} - Ảnh ${index + 1}`} 
                    fill 
                    priority={index === 0}
                    sizes="50vw"
                    className="object-cover transition duration-300 hover:scale-[1.02]" 
                  />
                </div>
              ))}
            </div>
          )}

          {allImages.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 h-full w-full">
              {/* Large main cover image */}
              <div className="relative md:col-span-2 h-full w-full overflow-hidden" onClick={() => openLightbox(0)}>
                <Image 
                  src={allImages[0]} 
                  alt={`${room.title} - Ảnh 1`} 
                  fill 
                  priority
                  sizes="(min-width: 768px) 66vw, 100vw"
                  className="object-cover transition duration-300 hover:scale-[1.02]" 
                />
                
                {/* Mobile badge indicator */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-[2px] text-white text-[11px] font-bold py-1 px-2.5 rounded-full md:hidden select-none">
                  1 / {allImages.length}
                </div>
              </div>

              {/* Smaller stacked images */}
              <div className="hidden md:grid grid-rows-2 gap-2 h-full w-full">
                <div className="relative h-full w-full overflow-hidden" onClick={() => openLightbox(1)}>
                  <Image 
                    src={allImages[1]} 
                    alt={`${room.title} - Ảnh 2`} 
                    fill 
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition duration-300 hover:scale-[1.02]" 
                  />
                </div>
                <div className="relative h-full w-full overflow-hidden" onClick={() => openLightbox(2)}>
                  <Image 
                    src={allImages[2]} 
                    alt={`${room.title} - Ảnh 3`} 
                    fill 
                    sizes="(min-width: 768px) 33vw, 50vw"
                    className="object-cover transition duration-300 hover:scale-[1.02]" 
                  />
                  {allImages.length > 3 && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition duration-300 hover:bg-black/50 select-none">
                      <span className="text-2xl font-extrabold">+{allImages.length - 2}</span>
                      <span className="text-xs font-semibold mt-1">hình ảnh</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Floating 'Hiển thị tất cả' Button */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openLightbox(0);
            }}
            className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-booking-text font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition shadow-md border border-slate-200 active:scale-95 z-10"
          >
            <GridIcon className="h-4 w-4 text-booking-text" />
            Hiển thị tất cả ({allImages.length})
          </button>
        </section>

        {/* Main Content Sections (2 columns) */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.38fr_0.62fr] items-start">
          {/* Left Column (Room Details in grouped White Cards) */}
          <div className="space-y-5">
            {/* Card 1: Badges, Title, Rating, Location & Landlord */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-6">
              {/* Badges & Title */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {room.verified && (
                    <span className="inline-flex items-center gap-1 rounded bg-[#E6F4EA] text-[#137333] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.02em]">
                      <ShieldCheckIcon className="h-3 w-3" />
                      Đối tác uy tín
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded bg-[#F3E8FF] text-[#6B21A8] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.02em]">
                    Phòng trọ cao cấp
                  </span>
                </div>

                <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-booking-text tracking-tight leading-tight">
                  {room.title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm">
                  <span className="flex items-center gap-1 font-bold text-booking-text">
                    <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                    {room.rating || 4.8} 
                  </span>
                  <span className="text-slate-300">•</span>
                  <Link href="#position" className="flex items-center gap-1 text-booking-muted hover:text-booking-primary hover:underline transition">
                    <MapPinIcon className="h-4 w-4 text-booking-muted" />
                    <span className="font-medium">{displayLocation}</span>
                  </Link>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Landlord Card Info */}
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-full bg-slate-200 border border-slate-100 shadow-sm flex items-center justify-center">
                  {room.host?.avatarUrl ? (
                    <Image 
                      src={room.host.avatarUrl} 
                      alt={`Avatar chủ nhà ${room.host?.fullName || 'Nguyễn Văn A'}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center font-extrabold text-base ${getAvatarBgColor(room.host?.fullName || 'Nguyễn Văn A')}`}>
                      {getAvatarPlaceholder(room.host?.fullName || 'Nguyễn Văn A')}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-booking-muted uppercase tracking-[0.02em]">Chủ nhà</p>
                  <h3 className="font-bold text-booking-text text-sm md:text-base mt-0.5">
                    {room.host?.fullName || 'Nguyễn Văn A'}
                  </h3>
                  <p className="text-xs text-booking-muted mt-0.5">{hostJoinedDate}</p>
                </div>
              </div>
            </div>

            {/* Card 2: About Room Description */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-booking-text">Về căn phòng này</h2>
              <p className={`mt-3 text-sm leading-relaxed ${room.description ? 'text-booking-muted' : 'text-slate-400 italic'}`}>
                {room.description || "Không có mô tả cho phòng này."}
              </p>
            </div>

            {/* Card 2.5: Living Costs */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-booking-text mb-4">Các khoản chi phí sinh hoạt</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/50">
                  <span className="text-xs font-semibold text-booking-muted">Tiền điện</span>
                  <span className="text-sm font-bold text-booking-text">
                    {room.electricityCost > 0 ? `${room.electricityCost.toLocaleString('vi-VN')} đ/kWh` : 'Theo giá nhà nước'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/50">
                  <span className="text-xs font-semibold text-booking-muted">Tiền nước</span>
                  <span className="text-sm font-bold text-booking-text">
                    {room.waterCost > 0 ? `${room.waterCost.toLocaleString('vi-VN')} đ/khối` : 'Miễn phí'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/50">
                  <span className="text-xs font-semibold text-booking-muted">Internet / Wifi</span>
                  <span className="text-sm font-bold text-booking-text">
                    {room.internetCost > 0 ? `${room.internetCost.toLocaleString('vi-VN')} đ/tháng` : 'Miễn phí'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/50">
                  <span className="text-xs font-semibold text-booking-muted">Phí dịch vụ khác</span>
                  <span className="text-sm font-bold text-booking-text">
                    {room.serviceFee > 0 ? `${room.serviceFee.toLocaleString('vi-VN')} đ/tháng` : 'Không có'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Highlights / Amenities */}
            {displayAmenities.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-booking-text mb-4">Tiện ích nổi bật</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  {displayAmenities.map((item: any) => {
                    const IconComponent = item.icon;
                    return (
                      <div key={item.name} className="flex items-center gap-3 text-booking-text">
                        <IconComponent className="h-5 w-5 text-[#004ac6]" />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Card 4: Location Map */}
            <div id="position" className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-booking-text mb-1">Vị trí</h2>
              <p className="text-sm text-booking-muted mb-4">{displayLocation}</p>
              <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="relative block h-[250px] w-full rounded-2xl border border-slate-200 bg-[#e2e8f0] overflow-hidden shadow-inner group cursor-pointer">
                {/* Mock map background element */}
                <div className="absolute inset-0 bg-[#e8ecef]" />
                <div className="absolute top-1/4 left-0 w-full h-4 bg-white/80 rotate-6 transform origin-center" />
                <div className="absolute top-2/3 left-0 w-full h-6 bg-white/80 -rotate-3 transform origin-center" />
                <div className="absolute top-0 left-1/3 w-6 h-full bg-white/80 -rotate-12 transform origin-center" />
                <div className="absolute top-0 left-2/3 w-5 h-full bg-white/80 rotate-6 transform origin-center" />
                
                {/* Center marker */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-10 w-10 rounded-full bg-booking-primary/10 flex items-center justify-center p-1.5 shadow-md">
                    <div className="h-full w-full rounded-full bg-booking-primary flex items-center justify-center">
                      <MapIcon className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-booking-primary rounded-full mt-1 border border-white shadow-sm" />
                </div>

                {/* Open Map Center Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/95 border border-slate-200 p-4 rounded-xl shadow-lg flex flex-col items-center gap-1 group-hover:scale-105 transition-transform duration-300">
                    <MapIcon className="h-6 w-6 text-booking-primary" />
                    <span className="text-xs font-bold text-booking-text mt-1">Xem vị trí trên bản đồ</span>
                  </div>
                </div>
              </a>
            </div>
          </div>

          {/* Right Column (Sticky Checkout Sidebar - Client Side Interactive component) */}
          <BookingCheckoutSection 
            roomId={room.id}
            price={room.price}
            deposit={room.deposit}
            roomTitle={room.title}
            roomStatus={room.status}
            rentedBy={room.rentedBy}
            host={room.host}
          />
        </section>
      </main>

      <BookingFooter />
      <BookingChatFab />

      {/* Premium Image Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          onClick={() => {
            setIsLightboxOpen(false);
            resetZoom();
          }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/55 backdrop-blur-xl transition-opacity duration-300"
        >
          {/* Top Bar (Floating, Transparent) */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex items-center justify-between p-4 md:px-8 text-white select-none bg-transparent"
          >
            <div className="max-w-[50%]">
              <h4 className="font-bold text-sm md:text-base truncate">{room.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Ảnh {currentImageIndex + 1} / {allImages.length}
              </p>
            </div>
            
            {/* Zoom Controls & Close Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 mr-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <button 
                  onClick={zoomOut}
                  disabled={zoomScale === 1}
                  className="rounded-full p-1 text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Thu nhỏ"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                  </svg>
                </button>
                <span className="text-xs font-bold text-white min-w-[36px] text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button 
                  onClick={zoomIn}
                  disabled={zoomScale === 3}
                  className="rounded-full p-1 text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Phóng to"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                  </svg>
                </button>
                <button 
                  onClick={resetZoom}
                  disabled={zoomScale === 1 && dragPosition.x === 0 && dragPosition.y === 0}
                  className="ml-1 rounded-full p-1 text-white hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition border-l border-white/10 pl-2"
                  title="Đặt lại"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>

              <button 
                onClick={() => {
                  setIsLightboxOpen(false);
                  resetZoom();
                }}
                className="rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 active:scale-95 transition"
                aria-label="Đóng thư viện ảnh"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Main Content Area (Image + Floating Navigation) */}
          <div className="relative flex flex-1 items-center justify-center p-4 bg-transparent overflow-hidden">
            {/* Left Button */}
            {allImages.length > 1 && zoomScale === 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 active:scale-95 transition backdrop-blur-sm shadow-md"
                aria-label="Ảnh trước"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            {/* Main Image Container */}
            <div className="relative w-full h-full max-h-[65vh] md:max-h-[72vh] flex items-center justify-center overflow-hidden">
              <img 
                src={allImages[currentImageIndex]} 
                alt={`${room.title} - Xem chi tiết ảnh ${currentImageIndex + 1}`} 
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick();
                }}
                style={{
                  transform: `translate(${dragPosition.x}px, ${dragPosition.y}px) scale(${zoomScale})`,
                  cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
                }}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl select-none transition-transform duration-75 ease-out"
              />
            </div>

            {/* Right Button */}
            {allImages.length > 1 && zoomScale === 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 active:scale-95 transition backdrop-blur-sm shadow-md"
                aria-label="Ảnh tiếp theo"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Navigation (Floating) */}
          {allImages.length > 1 && (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-transparent py-4 px-4 select-none"
            >
              <div className="mx-auto flex max-w-2xl justify-center items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentImageIndex(idx);
                      resetZoom();
                    }}
                    className={`relative h-12 w-16 md:h-14 md:w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                      idx === currentImageIndex 
                        ? 'border-white scale-105 shadow-md shadow-white/30' 
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={imgUrl} 
                      alt={`Thu nhỏ ${idx + 1}`} 
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

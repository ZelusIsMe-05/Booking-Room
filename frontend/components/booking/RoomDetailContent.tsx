'use client';

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
  // Prepend a realistic ward to the location if not already specified
  const displayLocation = (room.location || '').includes('Phường') 
    ? room.location 
    : 'Phường 12, ' + (room.location || '');

  // Modern horizontal image gallery grid (Dynamic count of S3 images)
  // Use S3 images if available, without padding with hardcoded mockup assets
  const galleryImages = room.images && room.images.length > 0
    ? [
        room.image,
        ...room.images.filter((img: string) => img !== room.image)
      ].slice(0, 4)
    : [room.image];

  // Helper to dynamically adjust grid column span based on the actual number of S3 images
  const getGridColsClass = (count: number) => {
    switch (count) {
      case 1: return 'grid-cols-1 md:grid-cols-1';
      case 2: return 'grid-cols-2 md:grid-cols-2';
      case 3: return 'grid-cols-2 md:grid-cols-3';
      case 4:
      default:
        return 'grid-cols-2 md:grid-cols-4';
    }
  };

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

        {/* Top Gallery Grid (Dynamic columns based on image count) */}
        <section className="relative h-[240px] sm:h-[300px] md:h-[380px] w-full rounded-2xl overflow-hidden shadow-sm bg-slate-100">
          <div className={`grid ${getGridColsClass(galleryImages.length)} gap-2 h-full w-full`}>
            {galleryImages.map((imgUrl, index) => (
              <div key={index} className="relative h-full w-full overflow-hidden">
                <Image 
                  src={imgUrl} 
                  alt={`${room.title} - Ảnh ${index + 1}`} 
                  fill 
                  priority={index === 0}
                  sizes={galleryImages.length === 1 ? "100vw" : "(min-width: 768px) 25vw, 50vw"}
                  className="object-cover transition duration-300 hover:scale-[1.03]" 
                />
              </div>
            ))}
          </div>
          {/* Floating 'Hiển thị tất cả' Button */}
          <button className="absolute bottom-4 right-4 bg-white/95 hover:bg-white text-booking-text font-bold text-xs py-2 px-3 rounded-lg flex items-center gap-1.5 transition shadow-md border border-slate-200 active:scale-95">
            <GridIcon className="h-4 w-4 text-booking-text" />
            Hiển thị tất cả
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
              <div className="relative h-[250px] w-full rounded-2xl border border-slate-200 bg-[#e2e8f0] overflow-hidden flex items-center justify-center shadow-inner group cursor-pointer">
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
              </div>
            </div>
          </div>

          {/* Right Column (Sticky Checkout Sidebar - Client Side Interactive component) */}
          <BookingCheckoutSection 
            roomId={room.id}
            price={room.price}
            deposit={room.deposit}
            roomTitle={room.title}
          />
        </section>
      </main>

      <BookingFooter />
      <BookingChatFab />
    </div>
  );
}

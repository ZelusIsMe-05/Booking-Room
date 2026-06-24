'use client';

import BookingChatFab from '@/components/booking/BookingChatFab';
import BookingFooter from '@/components/booking/BookingFooter';
import BookingHeader from '@/components/booking/BookingHeader';
import BookingCheckoutSection from '@/components/booking/BookingCheckoutSection';
import RoomDetailView from '@/components/booking/RoomDetailView';
import RoomReviewsSection from '@/components/booking/RoomReviewsSection';

interface RoomDetailContentProps {
  room: any;
}

export default function RoomDetailContent({ room }: RoomDetailContentProps) {
  return (
    <div className="min-h-screen bg-booking-surface text-booking-text font-sans">
      <BookingHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <RoomDetailView
          room={room}
          backLink={{ href: '/rooms', label: 'Quay lại danh sách' }}
          sidebar={
            <BookingCheckoutSection
              roomId={room.id}
              price={room.price}
              deposit={room.deposit}
              roomTitle={room.title}
              roomStatus={room.status}
              rentedBy={room.rentedBy}
              host={room.host}
            />
          }
          bottomSlot={
            <RoomReviewsSection roomId={room.id} />
          }
        />
      </main>

      <BookingFooter />
      <BookingChatFab />
    </div>
  );
}

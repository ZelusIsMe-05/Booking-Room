import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-booking-surface text-booking-text flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-lg space-y-5">
        <h2 className="text-4xl font-extrabold text-booking-primary">404</h2>
        <h3 className="text-xl font-bold">Không tìm thấy phòng trọ</h3>
        <p className="text-sm text-booking-muted leading-relaxed">
          Không tìm thấy thông tin phòng trọ này trong hệ thống, hoặc phòng đã bị ẩn bởi chủ nhà.
        </p>
        <div className="pt-2">
          <Link 
            href="/rooms" 
            className="inline-block bg-booking-primary hover:bg-booking-primaryDark text-white font-bold py-2.5 px-5 rounded-xl transition shadow-md shadow-booking-primary/10 active:scale-95 text-sm"
          >
            Quay lại danh sách phòng
          </Link>
        </div>
      </div>
    </div>
  );
}

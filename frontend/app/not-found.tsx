import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900 font-sans">
      <section
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10"
        aria-labelledby="access-denied-title"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3Z" />
          </svg>
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-red-600">Lỗi 403</p>
        <h1 id="access-denied-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Truy cập bị từ chối
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base font-medium">
          Bạn không có quyền truy cập thông tin này, hoặc phòng trọ hiện không khả dụng/đã bị ẩn bởi chủ nhà.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/rooms"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-booking-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-booking-primaryDark focus:outline-none focus:ring-2 focus:ring-booking-primary focus:ring-offset-2"
          >
            Quay lại danh sách phòng
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}

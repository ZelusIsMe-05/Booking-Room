import Image from 'next/image';
import Link from 'next/link';

type AuthShellProps = {
  children: React.ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-booking-surface p-4 text-booking-text sm:p-6" suppressHydrationWarning>
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-7xl gap-8 lg:grid-cols-2 lg:items-center" suppressHydrationWarning>
        <section className="relative hidden h-[calc(100vh-48px)] min-h-[720px] overflow-hidden rounded-xl shadow-2xl lg:block">
          <Image
            src="/images/booking/auth-brand.png"
            alt="Phòng khách căn hộ hiện đại"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-12 text-white">
            <Link href="/" className="text-3xl font-bold">
              Booking-Room
            </Link>
            <p className="mt-3 max-w-lg text-lg leading-8 text-white/90">
              An tâm trên mọi hành trình. Khám phá không gian hoàn hảo theo phong cách riêng của bạn.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center py-8">
          <div className="w-full max-w-[480px] rounded-xl border border-booking-border/60 bg-white/85 p-6 shadow-sm backdrop-blur-md sm:p-10">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

// Layout cho route group (guest) - trang công khai, ai cũng vào được
// File này hiện tại chỉ pass-through children vì chưa cần wrapper đặc biệt
export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

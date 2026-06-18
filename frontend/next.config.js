/** @type {import('next').NextConfig} */
const nextConfig = {
        images: {
          remotePatterns: [
            {
              protocol: 'https',
              hostname: 'images.unsplash.com',
              port: '',
              pathname: '/**', // Cho phép hiển thị mọi ảnh từ Unsplash
            },
            {
              protocol: 'https',
              hostname: 'booking-room-bucket.s3.ap-southeast-1.amazonaws.com', 
              port: '',
              pathname: '/**', // Cho phép hiển thị mọi ảnh từ S3
            },
            {
              protocol: 'https',
              hostname: 'cdn.booking.local',
              port: '',
              pathname: '/**', // Cho phép hiển thị mọi ảnh từ cdn.booking.local
            },
          ],
        },
  // Cho phép Hot Module Replacement (HMR) kết nối qua IP mạng nội bộ
  allowedDevOrigins: ['192.168.56.1'],
  devIndicators: false,
};

module.exports = nextConfig;

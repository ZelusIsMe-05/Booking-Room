/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Cho phép Hot Module Replacement (HMR) kết nối qua IP mạng nội bộ
  allowedDevOrigins: ['192.168.56.1'],
};

module.exports = nextConfig;

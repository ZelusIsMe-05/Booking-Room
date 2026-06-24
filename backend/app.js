const express = require('express');
const cors = require('cors');

const db = require('./config/db');

// Auth
const authRoutes = require('./routes/auth/auth.route');
const profileRoutes = require('./routes/host/profileRoutes');

// Admin routes (thanh)
const dashboardRoutes = require('./routes/admin/dashboardRoutes');
const systemLogRoutes = require('./routes/admin/systemLogRoutes');
const userRoutes = require('./routes/admin/userRoutes');
const landlordRoutes = require('./routes/admin/landlordRoutes');
const adminViolationReportRoutes = require('./routes/admin/violationReportRoutes');
const adminSupportTicketRoutes = require('./routes/admin/supportTicketRoutes');

// Host routes
const hostRoomRoutes = require('./routes/host/roomRoutes');
const hostBookingRoutes = require('./routes/host/bookingRoutes');
const hostTransactionRoutes = require('./routes/host/transactionRoutes');
const hostRevenueRoutes = require('./routes/host/revenueRoutes');

// Booking / Payment routes (thinh)
const depositRoutes = require('./routes/booking/depositRoutes');
const paymentRoutes = require('./routes/payment/transactionRoutes');
const adminBookingRoutes = require('./routes/admin/bookingRoutes');

// Guest routes (vinh)
const reviewRoutes = require('./routes/guest/reviewRoutes');
const favoriteRoutes = require('./routes/guest/favoriteRoutes');
const conversationRoutes = require('./routes/guest/conversationRoutes');
const notificationRoutes = require('./routes/guest/notificationRoutes');
const supportTicketRoutes = require('./routes/guest/supportTicketRoutes');
const violationReportRoutes = require('./routes/guest/violationReportRoutes');
const aiRoutes = require('./routes/guest/aiRoutes');
const guestRoomRoutes = require('./routes/guest/roomRoutes');

const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const { sendSuccess, sendError } = require('./utils/responseHelper');

const adminRoomRoutes = require('./routes/admin/roomRoutes');
const app = express();

// Trust the first proxy so req.ip / X-Forwarded-For resolve correctly in prod.
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps, postman or server-to-server requests
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, ''); // strip trailing slash just in case
    const isAllowed = allowedOrigins.includes(cleanOrigin) || 
                      cleanOrigin.endsWith('.vercel.app') ||
                      /^http:\/\/localhost:\d+$/.test(cleanOrigin) ||
                      /^http:\/\/127\.0\.0\.1:\d+$/.test(cleanOrigin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

app.use(requestLogger);

const path = require('path');

// Chặn truy cập tĩnh ảnh CCCD (nhạy cảm) — chỉ Admin xem qua
// GET /api/admin/landlords/:id/id-card/:side. Các asset khác (ảnh phòng…) vẫn public.
app.use('/uploads/landlords', (req, res) => {
  return sendError(res, { status: 403, message: 'Không có quyền truy cập tài nguyên này.' });
});

// Serve uploaded assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Liveness & Readiness health check probe.
app.get(['/health', '/api/health'], async (req, res) => {
  let dbStatus = 'OK';
  try {
    await db.raw('select 1');
  } catch (err) {
    dbStatus = 'DOWN';
  }

  return sendSuccess(res, {
    status: 200,
    message: 'Health check status retrieved',
    data: {
      status: 'healthy',
      version: '1.2.0',
      updatedAt: '2026-06-20T15:50:00+07:00', // Time of this deployment
      timestamp: new Date().toISOString(),
      database: dbStatus,
      env: process.env.NODE_ENV || 'development'
    }
  });
});

// Database readiness probe.
app.get('/health/db', async (req, res, next) => {
  try {
    await db.raw('select 1');
    return sendSuccess(res, { status: 200, message: 'Database connection OK' });
  } catch (err) {
    return next(err);
  }
});

// Feature routes.
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Admin routes
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/system-logs', systemLogRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/landlords', landlordRoutes);
app.use('/api/admin/violation-reports', adminViolationReportRoutes);
app.use('/api/admin/support-tickets', adminSupportTicketRoutes);
app.use('/api/admin', adminBookingRoutes);           // /api/admin/transactions, /api/admin/bookings/expire-deposits

// Host routes
app.use('/api/host/rooms', hostRoomRoutes);
app.use('/api/host/bookings/deposits', hostBookingRoutes);
app.use('/api/host/transactions', hostTransactionRoutes);
app.use('/api/host/revenue', hostRevenueRoutes);

// Booking / Payment routes (thinh)
app.use('/api/bookings/deposits', depositRoutes);
app.use('/api/payments', paymentRoutes);

// Guest routes
app.use('/api/rooms/:roomId/reviews', reviewRoutes); // GET reviews for a room (public)
app.use('/api/reviews', reviewRoutes);               // POST create
app.use('/api/favorites', favoriteRoutes);           // GET list, POST toggle
app.use('/api/conversations', conversationRoutes);   // Chat Module
app.use('/api/notifications', notificationRoutes);   // Notifications Module
app.use('/api/support-tickets', supportTicketRoutes); // Support Tickets Module
app.use('/api/violation-reports', violationReportRoutes); // Violation Reports Module
app.use('/api/ai', aiRoutes);                        // AI Recommendations Module
// Host routes mounted first so specific host paths (eg. /my) take precedence
app.use('/api/rooms', hostRoomRoutes);
// Public room routes (list, detail)
app.use('/api/rooms', guestRoomRoutes);
app.use('/api/admin/rooms', adminRoomRoutes);

// 404 + centralised error handling (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

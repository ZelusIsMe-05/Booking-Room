const express = require('express');
const cors = require('cors');

const db = require('./config/db');

// Auth
const authRoutes = require('./routes/auth/authRoutes');

// Admin routes (thanh)
const dashboardRoutes = require('./routes/admin/dashboardRoutes');
const systemLogRoutes = require('./routes/admin/systemLogRoutes');
const userRoutes = require('./routes/admin/userRoutes');

// Host routes
const hostRoomRoutes = require('./routes/host/roomRoutes');
const hostBookingRoutes = require('./routes/host/bookingRoutes');

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
const { sendSuccess } = require('./utils/responseHelper');

const app = express();

// Trust the first proxy so req.ip / X-Forwarded-For resolve correctly in prod.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Liveness probe.
app.get('/health', (req, res) => {
  return sendSuccess(res, { status: 200, message: 'OK' });
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

// Admin routes
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/system-logs', systemLogRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/rooms', require('./routes/admin/roomRoutes'));
app.use('/api/admin', adminBookingRoutes);           // /api/admin/transactions, /api/admin/bookings/expire-deposits

// Host routes
app.use('/api/host/rooms', hostRoomRoutes);
app.use('/api/host/bookings/deposits', hostBookingRoutes);

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
app.use('/api/rooms', guestRoomRoutes);

// 404 + centralised error handling (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
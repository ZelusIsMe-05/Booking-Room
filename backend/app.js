const express = require('express');
const cors = require('cors');

const db = require('./config/db');
const authRoutes = require('./routes/auth/authRoutes');
const dashboardRoutes = require('./routes/admin/dashboardRoutes');
const systemLogRoutes = require('./routes/admin/systemLogRoutes');
const userRoutes = require('./routes/admin/userRoutes');
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
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/system-logs', systemLogRoutes);
app.use('/api/admin/users', userRoutes);

// 404 + centralised error handling (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

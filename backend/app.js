const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth/authRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Trust the first proxy so req.ip / X-Forwarded-For resolve correctly in prod.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Liveness probe.
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'OK' });
});

// Feature routes.
app.use('/api/auth', authRoutes);

// 404 + centralised error handling (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

const app = require('./app');
const env = require('./config/env');

const server = app.listen(env.port, () => {
  console.log(`BookingRoom backend listening on port ${env.port} [${env.nodeEnv}]`);
});

// Graceful shutdown.
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

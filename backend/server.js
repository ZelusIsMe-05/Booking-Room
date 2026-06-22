const app = require('./app');
const env = require('./config/env');
const { initSocket } = require('./config/socket');

const server = app.listen(env.port, () => {
  console.log(`BookingRoom backend listening on port ${env.port} [${env.nodeEnv}]`);
});

const io = initSocket(server);
app.set('io', io);

// Graceful shutdown.
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

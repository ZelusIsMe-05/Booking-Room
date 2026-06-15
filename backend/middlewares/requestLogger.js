function requestLogger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const userId = req.user ? req.user.userId : 'anonymous';
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms user=${userId}`);
  });

  next();
}

module.exports = requestLogger;

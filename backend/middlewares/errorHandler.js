const AppError = require('../utils/AppError');
const { sendError } = require('../utils/responseHelper');

/**
 * 404 handler for unmatched routes.
 */
function notFoundHandler(req, res) {
  return sendError(res, { status: 404, message: 'Không tìm thấy tài nguyên.' });
}

/**
 * Centralised error handler. Translates AppError into its declared status/code
 * and hides internals for any unexpected error. Never exposes stack traces.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return sendError(res, { status: err.status, message: err.message, code: err.code, data: err.data });
  }

  // Unexpected error: log server-side, return a generic message to the client.
  console.error('[UNHANDLED ERROR]', err);
  return sendError(res, { status: 500, message: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

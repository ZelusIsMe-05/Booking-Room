/**
 * Domain error carrying a stable `code`, a client-safe `message`, an HTTP
 * `status`, and optional `data` to attach to the response body.
 *
 * @example
 *   throw new AppError('INVALID_CREDENTIALS', 'Tài khoản hoặc mật khẩu không chính xác.', 401);
 */
class AppError extends Error {
  constructor(code, message, status = 400, data) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    if (data !== undefined) {
      this.data = data;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

/**
 * Authentication domain constants. Centralised so business rules are not
 * scattered as magic numbers / status strings across the codebase.
 */
module.exports = {
  USER_STATUS: {
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
    BANNED: 'BANNED',
  },
  // Account lockout policy (FR-1.2 / UC02).
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_DURATION_MINUTES: 10,
  // Stable audit failure reasons (internal, not shown to the client).
  FAILURE_REASON: {
    USER_NOT_FOUND: 'USER_NOT_FOUND',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    NOT_ACTIVE: 'NOT_ACTIVE',
    BANNED: 'BANNED',
    WRONG_PASSWORD: 'WRONG_PASSWORD',
  },
  // Generic, anti-enumeration message reused for "no such user" and "bad password".
  GENERIC_AUTH_ERROR_MESSAGE: 'Tài khoản hoặc mật khẩu không chính xác.',
};

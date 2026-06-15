/**
 * Standard success response envelope.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.status=200] HTTP status code
 * @param {string} options.message human-readable message
 * @param {object} [options.data] payload
 */
function sendSuccess(res, { status = 200, message, data }) {
  const body = { success: true, message };
  if (data !== undefined) {
    body.data = data;
  }
  return res.status(status).json(body);
}

/**
 * Standard error response envelope. Never leaks stack traces to clients.
 *
 * @param {import('express').Response} res
 * @param {object} options
 * @param {number} [options.status=500] HTTP status code
 * @param {string} options.message human-readable message
 * @param {object} [options.data] optional extra payload (e.g. lockedUntil)
 */
function sendError(res, { status = 500, message, data }) {
  const body = { success: false, message };
  if (data !== undefined) {
    body.data = data;
  }
  return res.status(status).json(body);
}

module.exports = {
  sendSuccess,
  sendError,
};

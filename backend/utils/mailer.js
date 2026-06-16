const env = require('../config/env');

/**
 * Gửi email. Nếu SMTP chưa cấu hình (thiếu host/user/pass) → chế độ dev: log ra
 * console thay vì gửi thật, để test luồng OTP không cần SMTP.
 */

let transporter; // undefined = chưa khởi tạo; null = chế độ dev

function getTransporter() {
  if (transporter !== undefined) {
    return transporter;
  }
  const { host, user, pass, port } = env.smtp;
  if (!host || !user || !pass) {
    transporter = null; // dev mode
    return transporter;
  }
  // Lazy require để không bắt buộc có nodemailer khi chạy chế độ dev.
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

/**
 * Gửi email chứa mã OTP.
 *
 * @param {{ to: string, code: string, purpose: string }} params
 * @returns {Promise<void>}
 */
async function sendOtpEmail({ to, code, purpose }) {
  const minutes = Math.floor(env.otp.ttlSeconds / 60);
  const subject = 'Mã OTP xác thực tài khoản BookingRoom';
  const text = `Mã OTP của bạn là ${code}. Mã có hiệu lực trong ${minutes} phút. Vui lòng không chia sẻ mã này.`;

  const tx = getTransporter();
  if (!tx) {
    // Dev: in ra console để lấy OTP khi test.
    console.log(`[MAILER:DEV] to=${to} purpose=${purpose} otp=${code}`);
    return;
  }

  await tx.sendMail({ from: env.smtp.from, to, subject, text });
}

module.exports = { sendOtpEmail };

const multer = require('multer');
const upload = require('../config/multer');
const AppError = require('../utils/AppError');

// Middleware for host room images: accept up to 10 images in field `images`
const uploadRoomImages = upload.array('images', 10);

// Ảnh CCCD khi đăng ký landlord: tối đa 1 ảnh mặt trước + 1 ảnh mặt sau.
// multer.fields tự bỏ qua nếu request KHÔNG phải multipart (tenant gửi JSON vẫn đi tiếp).
const idCardFields = upload.fields([
  { name: 'id_card_front', maxCount: 1 },
  { name: 'id_card_back', maxCount: 1 },
]);

/**
 * Bọc idCardFields để map MulterError (quá 5MB, sai field…) và lỗi fileFilter
 * (chỉ nhận ảnh) thành AppError 400 thay vì 500.
 *
 * @type {import('express').RequestHandler}
 */
function uploadIdCards(req, res, next) {
  return idCardFields(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Ảnh CCCD tối đa 5MB mỗi tệp.'
          : 'Tệp tải lên không hợp lệ.';
      return next(new AppError('INVALID_UPLOAD', message, 400));
    }
    // Lỗi từ fileFilter (vd không phải ảnh).
    return next(new AppError('INVALID_UPLOAD', err.message || 'Chỉ chấp nhận tệp hình ảnh.', 400));
  });
}

module.exports = {
  uploadRoomImages,
  uploadIdCards,
};

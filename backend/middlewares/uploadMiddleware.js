const upload = require('../config/multer');

// Middleware for host room images: accept up to 10 images in field `images`
const uploadRoomImages = upload.array('images', 10);

// Middleware for user profile avatar: accept a single image in field `avatar`
const uploadAvatar = upload.single('avatar');

module.exports = {
  uploadRoomImages,
  uploadAvatar,
};

const {
  RESOURCE_TYPES,
  generateS3Key,
  uploadToS3,
  deleteFromS3,
} = require('../../utils/s3Helper');

/**
 * Lưu trữ ảnh CCCD của landlord.
 *
 * Driver hiện tại: AWS S3. File mới không còn ghi vào `backend/uploads`.
 * DB lưu full S3 URL giống room_images.image_url và users.avatar_url.
 */

const FRONT_FILE = '1.jpg';
const BACK_FILE = '2.jpg';

/**
 * Upload 2 ảnh CCCD lên S3. Key cố định theo landlord để nộp lại sẽ ghi đè object cũ.
 *
 * @param {{ landlordId: string, frontFile: { buffer: Buffer }, backFile: { buffer: Buffer } }} params
 * @returns {Promise<{ frontKey: string, backKey: string }>} full S3 URL để lưu DB
 */
async function save({ landlordId, frontFile, backFile }) {
  const frontKey = generateS3Key(RESOURCE_TYPES.ID_CARD, landlordId, frontFile.originalname, 1);
  const backKey = generateS3Key(RESOURCE_TYPES.ID_CARD, landlordId, backFile.originalname, 2);

  const [frontUrl, backUrl] = await Promise.all([
    uploadToS3(frontFile.buffer, frontKey, frontFile.mimetype),
    uploadToS3(backFile.buffer, backKey, backFile.mimetype),
  ]);

  return {
    frontKey: frontUrl,
    backKey: backUrl,
  };
}

/**
 * Xóa toàn bộ ảnh CCCD của landlord khỏi S3.
 *
 * @param {string} landlordId
 * @returns {Promise<void>}
 */
async function remove(landlordId) {
  await Promise.allSettled([
    deleteFromS3(generateS3Key(RESOURCE_TYPES.ID_CARD, landlordId, FRONT_FILE, 1)),
    deleteFromS3(generateS3Key(RESOURCE_TYPES.ID_CARD, landlordId, BACK_FILE, 2)),
  ]);
}

module.exports = {
  save,
  remove,
  FRONT_FILE,
  BACK_FILE,
};

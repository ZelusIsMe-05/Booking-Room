const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Helper to clean quotes from environment variables
const cleanEnvVar = (val) => {
  if (!val) return val;
  return val.replace(/^['"]|['"]$/g, '').trim();
};

const region = cleanEnvVar(process.env.AWS_REGION) || 'ap-southeast-1';
const accessKeyId = cleanEnvVar(process.env.AWS_ACCESS_KEY_ID);
const secretAccessKey = cleanEnvVar(process.env.AWS_SECRET_ACCESS_KEY);
const bucketName = cleanEnvVar(process.env.AWS_S3_BUCKET_NAME) || 'booking-room-bucket';

// Initialize S3 Client
const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const RESOURCE_TYPES = {
  AVATAR: 'avatars',
  ROOM: 'rooms',
  REPORT: 'reports',
  SYSTEM: 'system'
};

/**
 * Generates an S3 Key based on the resource type and folder structure rules
 * @param {string} type One of RESOURCE_TYPES
 * @param {string} entityId The ID of the user, room, or report
 * @param {string} originalName The original filename to extract the extension
 * @param {number|string} index Optional index for multiple files
 * @returns {string} The S3 Key
 */
function generateS3Key(type, entityId, originalName, index = '') {
  const ext = path.extname(originalName) || '.jpg';
  const timestamp = Date.now();
  const suffix = index !== '' ? `_${index}` : '';

  switch (type) {
    case RESOURCE_TYPES.AVATAR:
      return `avatars/${entityId}/${timestamp}${ext}`;
    case RESOURCE_TYPES.ROOM:
      return `rooms/${entityId}/${timestamp}${suffix}${ext}`;
    case RESOURCE_TYPES.REPORT:
      return `reports/${entityId}/${timestamp}${suffix}${ext}`;
    case RESOURCE_TYPES.SYSTEM:
      return `system/${entityId}${ext}`;
    default:
      return `temp/${timestamp}${ext}`;
  }
}

/**
 * Uploads a file buffer to AWS S3
 * @param {Buffer} fileBuffer Dữ liệu của file (từ multer memory storage)
 * @param {string} fileName Tên file (S3 Key)
 * @param {string} mimeType Định dạng file (ví dụ: image/jpeg)
 * @returns {Promise<string>} URL công khai của file sau khi upload thành công
 */
async function uploadToS3(fileBuffer, fileName, mimeType) {
  const uploadParams = {
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
}

/**
 * Deletes a file on AWS S3
 * @param {string} fileKey S3 Key của file cần xóa
 */
async function deleteFromS3(fileKey) {
  const deleteParams = {
    Bucket: bucketName,
    Key: fileKey,
  };

  await s3Client.send(new DeleteObjectCommand(deleteParams));
}

/**
 * Extracts S3 Key from S3 URL
 * @param {string} url S3 URL
 * @returns {string|null} S3 Key
 */
function extractS3KeyFromUrl(url) {
  if (!url) return null;
  // Construct regex dynamically based on current bucket and region
  const pattern = new RegExp(`https://${bucketName}\\.s3\\.${region}\\.amazonaws\\.com/(.+)`);
  const match = url.match(pattern);
  return match ? match[1] : null;
}

module.exports = {
  RESOURCE_TYPES,
  generateS3Key,
  uploadToS3,
  deleteFromS3,
  extractS3KeyFromUrl,
};

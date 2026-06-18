const fs = require('fs');
const path = require('path');

/**
 * Lưu trữ ảnh CCCD của landlord.
 *
 * Hiện dùng driver `local`: ghi xuống `backend/uploads/landlords/{landlordId}/`
 * với tên cố định `1.jpg` (mặt trước) và `2.jpg` (mặt sau). DB lưu **key tương đối**
 * (`landlords/{landlordId}/1.jpg`) — không lưu full URL — để khi chuyển sang AWS S3
 * sau này chỉ cần đổi driver + base URL, không phải migrate dữ liệu cũ.
 *
 * Interface ổn định (save / remove / getStream) để thay driver `s3` mà không
 * đụng tới service/controller. Khi tích hợp S3: thêm implementation dùng
 * @aws-sdk/client-s3 và chọn qua biến môi trường STORAGE_DRIVER=local|s3.
 */

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const ID_CARD_DIR = 'landlords';
const FRONT_FILE = '1.jpg';
const BACK_FILE = '2.jpg';

function landlordDir(landlordId) {
  return path.join(UPLOAD_ROOT, ID_CARD_DIR, landlordId);
}

/** Key tương đối lưu vào DB (dùng dấu `/` bất kể OS). */
function buildKey(landlordId, fileName) {
  return `${ID_CARD_DIR}/${landlordId}/${fileName}`;
}

/**
 * Ghi 2 ảnh CCCD ra đĩa. Ghi đè nếu đã tồn tại (tên cố định 1.jpg/2.jpg).
 *
 * @param {{ landlordId: string, frontFile: { buffer: Buffer }, backFile: { buffer: Buffer } }} params
 * @returns {Promise<{ frontKey: string, backKey: string }>} key tương đối để lưu DB
 */
async function save({ landlordId, frontFile, backFile }) {
  const dir = landlordDir(landlordId);
  await fs.promises.mkdir(dir, { recursive: true });

  await fs.promises.writeFile(path.join(dir, FRONT_FILE), frontFile.buffer);
  await fs.promises.writeFile(path.join(dir, BACK_FILE), backFile.buffer);

  return {
    frontKey: buildKey(landlordId, FRONT_FILE),
    backKey: buildKey(landlordId, BACK_FILE),
  };
}

/**
 * Xóa toàn bộ ảnh CCCD của landlord (dùng khi rollback đăng ký hoặc xóa landlord).
 * Idempotent: không lỗi nếu thư mục không tồn tại.
 *
 * @param {string} landlordId
 * @returns {Promise<void>}
 */
async function remove(landlordId) {
  await fs.promises.rm(landlordDir(landlordId), { recursive: true, force: true });
}

/**
 * Mở stream đọc một ảnh CCCD theo key (phục vụ Admin xem). Chặn path traversal:
 * chỉ cho phép key nằm trong thư mục uploads.
 *
 * @param {string} key key tương đối đã lưu DB (vd `landlords/{id}/1.jpg`)
 * @returns {import('fs').ReadStream}
 */
function getStream(key) {
  const absolute = path.resolve(UPLOAD_ROOT, key);
  if (!absolute.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
    throw new Error('Invalid storage key');
  }
  return fs.createReadStream(absolute);
}

module.exports = {
  save,
  remove,
  getStream,
  FRONT_FILE,
  BACK_FILE,
};

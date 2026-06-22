const favoriteRepository = require('../../repositories/guest/favoriteRepository');
const AppError = require('../../utils/AppError');
const db = require('../../config/db');

/**
 * Business logic layer for Favorites.
 */

/**
 * Retrieve the tenant's favorite rooms.
 */
async function listFavorites(tenantId, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const { items, total } = await favoriteRepository.findFavoritesByTenant(tenantId, { page: p, limit: l });

  const mappedItems = items.map((row) => ({
    roomId: row.room_id,
    title: row.title,
    roomType: row.room_type,
    coverImageUrl: row.cover_image || row.cover_image_url || null,
    monthlyRent: Number(row.monthly_rent),
    depositAmount: Number(row.deposit_amount),
    addressSummary: row.detailed_address,
    provinceName: row.province_name || null,
    districtName: row.district_name || null,
    wardName: row.ward_name || null,
    formattedAddress: row.formatted_address || null,
    placeId: row.place_id || null,
    status: row.status,
    averageRating: row.average_rating !== null ? Number(row.average_rating) : null,
    longitude: row.longitude,
    latitude: row.latitude,
  }));

  return { items: mappedItems, total, page: p, limit: l };
}

/**
 * Add or remove a room from favorites (Toggle logic).
 * Business rule: Only existing and APPROVED rooms can be favorited.
 *
 * @param {string} tenantId
 * @param {string} roomId
 * @returns {Promise<object>}
 */
async function toggleFavorite(tenantId, roomId) {
  // 1. Check if the room exists and is valid (APPROVED)
  const room = await db('rooms')
    .join('room_approvals', 'rooms.room_id', 'room_approvals.room_id')
    .where('rooms.room_id', roomId)
    .select('rooms.room_id', 'room_approvals.approval_status')
    .first();

  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', 'Phòng không tồn tại.', 404);
  }

  if (room.approval_status !== 'APPROVED') {
    throw new AppError('ROOM_NOT_ELIGIBLE', 'Không thể yêu thích phòng chưa được duyệt.', 400);
  }

  // 2. Handle Toggle logic
  const existing = await favoriteRepository.findOne(tenantId, roomId);

  if (existing) {
    // If the record exists, toggle its status
    const newStatus = !existing.status;
    const updated = await favoriteRepository.updateStatus(tenantId, roomId, newStatus);
    return {
      action: newStatus ? 'ADDED' : 'REMOVED',
      favorite: updated,
    };
  }

  // If it does not exist, create a new record
  const created = await favoriteRepository.insert(tenantId, roomId);
  return {
    action: 'ADDED',
    favorite: created,
  };
}

module.exports = {
  listFavorites,
  toggleFavorite,
};

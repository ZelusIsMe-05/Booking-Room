const db = require('../../config/db');

/**
 * Data-access layer for Favorites.
 */

/**
 * Retrieve the list of favorite rooms for a tenant (only where status = true).
 * Includes room details and the cover image.
 *
 * @param {string} tenantId
 * @param {object} opts
 * @param {number} opts.page
 * @param {number} opts.limit
 */
async function findFavoritesByTenant(tenantId, { page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;

  const [{ count }] = await db('favorites')
    .where({ tenant_id: tenantId, status: true })
    .count('room_id as count');

  const items = await db('favorites')
    .join('rooms', 'favorites.room_id', 'rooms.room_id')
    // Left join to retrieve the cover image (is_cover = true)
    .leftJoin('room_images', function () {
      this.on('rooms.room_id', '=', 'room_images.room_id').andOnVal('room_images.is_cover', '=', true);
    })
    .where('favorites.tenant_id', tenantId)
    .andWhere('favorites.status', true)
    .orderBy('favorites.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'rooms.room_id',
      'rooms.title',
      'rooms.room_type',
      'rooms.monthly_rent',
      'rooms.deposit_amount',
      'rooms.detailed_address',
      'rooms.province_name',
      'rooms.district_name',
      'rooms.ward_name',
      'rooms.formatted_address',
      'rooms.place_id',
      'rooms.status',
      'rooms.average_rating',
      'rooms.longitude',
      'rooms.latitude',
      'room_images.image_url as cover_image',
      'favorites.created_at as favorited_at',
    );

  return { items, total: Number(count) };
}

/**
 * Check if a favorite record already exists between the tenant and the room.
 */
function findOne(tenantId, roomId) {
  return db('favorites').where({ tenant_id: tenantId, room_id: roomId }).first();
}

/**
 * Insert a new favorite record.
 */
async function insert(tenantId, roomId) {
  const [fav] = await db('favorites')
    .insert({ tenant_id: tenantId, room_id: roomId, status: true })
    .returning('*');
  return fav;
}

/**
 * Update the favorite status (true/false) of an existing record.
 */
async function updateStatus(tenantId, roomId, status) {
  const [fav] = await db('favorites')
    .where({ tenant_id: tenantId, room_id: roomId })
    .update({ status })
    .returning('*');
  return fav;
}

module.exports = {
  findFavoritesByTenant,
  findOne,
  insert,
  updateStatus,
};

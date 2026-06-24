const db = require('../../config/db');

/**
 * Data-access layer for reviews.
 * Only this layer knows about table/column names; never deals with HTTP.
 */

/**
 * Find a deposit that belongs to a tenant and is CONFIRMED.
 * Used to validate that a review is allowed before creating it.
 *
 * @param {string} depositId
 * @param {string} tenantId
 * @returns {Promise<object|undefined>}
 */
function findConfirmedDeposit(depositId, tenantId) {
  return db('deposits')
    .join('rooms', 'deposits.room_id', 'rooms.room_id')
    .join('landlords', 'rooms.landlord_id', 'landlords.landlord_id')
    .where({ 
      'deposits.deposit_id': depositId, 
      'deposits.tenant_id': tenantId, 
      'deposits.status': 'ACCEPTED' 
    })
    .select(
      'deposits.*', 
      'landlords.landlord_id as landlord_user_id',
      'rooms.title as room_title'
    )
    .first();
}

/**
 * Find an existing review by deposit_id.
 * Enforces the one-review-per-deposit business rule.
 *
 * @param {string} depositId
 * @returns {Promise<object|undefined>}
 */
function findByDepositId(depositId) {
  return db('reviews').where({ deposit_id: depositId }).first();
}

/**
 * Find a review by its primary key.
 *
 * @param {string} reviewId
 * @returns {Promise<object|undefined>}
 */
function findById(reviewId) {
  return db('reviews').where({ review_id: reviewId }).first();
}

/**
 * List reviews for a room, newest first, with pagination.
 *
 * @param {string} roomId
 * @param {object} opts
 * @param {number} opts.page  1-indexed
 * @param {number} opts.limit
 * @returns {Promise<{ items: object[], total: number }>}
 */
async function findByRoomId(roomId, { page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;

  const [{ count }] = await db('reviews')
    .where({ room_id: roomId })
    .count('review_id as count');

  const items = await db('reviews')
    .join('tenants', 'reviews.tenant_id', 'tenants.tenant_id')
    .join('users', 'tenants.tenant_id', 'users.user_id')
    .where('reviews.room_id', roomId)
    .orderBy('reviews.created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .select(
      'reviews.review_id',
      'reviews.rating',
      'reviews.comment',
      'reviews.created_at',
      'reviews.updated_at',
      'reviews.tenant_id as reviewer_id',
      'users.full_name as reviewer_name',
      'users.avatar_url as reviewer_avatar',
    );

  return { items, total: Number(count) };
}

/**
 * Insert a new review row and return the created record.
 *
 * @param {object} data
 * @param {string} data.deposit_id
 * @param {string} data.room_id
 * @param {string} data.tenant_id
 * @param {number} data.rating
 * @param {string|null} data.comment
 * @returns {Promise<object>}
 */
async function create({ deposit_id, room_id, tenant_id, rating, comment }) {
  const [review] = await db('reviews')
    .insert({ deposit_id, room_id, tenant_id, rating, comment: comment || null })
    .returning('*');
  return review;
}

/**
 * Update an existing review row and return the updated record.
 *
 * @param {string} reviewId
 * @param {object} data
 * @param {number} data.rating
 * @param {string|null} data.comment
 * @returns {Promise<object>}
 */
async function update(reviewId, { rating, comment }) {
  const [review] = await db('reviews')
    .where({ review_id: reviewId })
    .update({ 
      rating, 
      comment,
      updated_at: db.fn.now()
    })
    .returning('*');
  return review;
}

/**
 * Recalculate and persist the average_rating of a room based on all its reviews.
 *
 * @param {string} roomId
 * @returns {Promise<void>}
 */
async function recalcAverageRating(roomId) {
  const [{ avg }] = await db('reviews')
    .where({ room_id: roomId })
    .avg('rating as avg');

  await db('rooms')
    .where({ room_id: roomId })
    .update({ average_rating: avg ? Number(Number(avg).toFixed(1)) : null });
}

module.exports = {
  findConfirmedDeposit,
  findByDepositId,
  findById,
  findByRoomId,
  create,
  update,
  recalcAverageRating,
};

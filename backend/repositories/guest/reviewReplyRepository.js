const db = require('../../config/db');

/**
 * Data-access layer for review replies.
 * Only this layer knows about table / column names.
 */

/**
 * Insert a new reply and return the created record.
 *
 * @param {object} data
 * @param {string} data.review_id
 * @param {string} data.author_id
 * @param {string} data.content
 * @param {string|null} [data.parent_reply_id]
 * @returns {Promise<object>}
 */
async function create({ review_id, author_id, content, parent_reply_id = null }) {
  const [reply] = await db('review_replies')
    .insert({ review_id, author_id, content, parent_reply_id })
    .returning('*');
  return reply;
}

/**
 * List all replies for a given review, oldest first.
 * Joins users to expose author name, avatar, and role.
 *
 * @param {string} reviewId
 * @returns {Promise<object[]>}
 */
function findByReviewId(reviewId) {
  return db('review_replies')
    .join('users', 'review_replies.author_id', 'users.user_id')
    .join('roles', 'users.role_id', 'roles.role_id')
    .leftJoin('landlords', 'users.user_id', 'landlords.landlord_id')
    .where('review_replies.review_id', reviewId)
    .orderBy('review_replies.created_at', 'asc')
    .select(
      'review_replies.reply_id as id',
      'review_replies.review_id',
      'review_replies.parent_reply_id as parentReplyId',
      'review_replies.author_id as authorId',
      'review_replies.content',
      'review_replies.created_at as createdAt',
      'users.full_name as authorName',
      'users.avatar_url as avatarUrl',
      'roles.role_name as role',
      // isHost = true when the author is a LANDLORD
      db.raw(`CASE WHEN roles.role_name = 'LANDLORD' THEN true ELSE false END AS "isHost"`)
    );
}

/**
 * Fetch replies for multiple reviews at once (one query, no N+1).
 *
 * @param {string[]} reviewIds
 * @returns {Promise<object[]>}
 */
function findByReviewIds(reviewIds) {
  if (!reviewIds || reviewIds.length === 0) return Promise.resolve([]);
  return db('review_replies')
    .join('users', 'review_replies.author_id', 'users.user_id')
    .join('roles', 'users.role_id', 'roles.role_id')
    .whereIn('review_replies.review_id', reviewIds)
    .orderBy('review_replies.created_at', 'asc')
    .select(
      'review_replies.reply_id as id',
      'review_replies.review_id',
      'review_replies.parent_reply_id as parentReplyId',
      'review_replies.author_id as authorId',
      'review_replies.content',
      'review_replies.created_at as createdAt',
      'users.full_name as authorName',
      'users.avatar_url as avatarUrl',
      'roles.role_name as role',
      db.raw(`CASE WHEN roles.role_name = 'LANDLORD' THEN true ELSE false END AS "isHost"`)
    );
}

/**
 * Find a single reply by its id.
 *
 * @param {string} replyId
 * @returns {Promise<object|undefined>}
 */
function findById(replyId) {
  return db('review_replies').where({ reply_id: replyId }).first();
}

/**
 * Update a reply's content.
 *
 * @param {string} replyId
 * @param {object} data
 * @param {string} data.content
 * @returns {Promise<object>}
 */
async function update(replyId, { content }) {
  const [reply] = await db('review_replies')
    .where({ reply_id: replyId })
    .update({ 
      content,
      updated_at: db.fn.now()
    })
    .returning('*');
  return reply;
}

module.exports = {
  create,
  findByReviewId,
  findByReviewIds,
  findById,
  update,
};

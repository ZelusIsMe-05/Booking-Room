const reviewRepository = require('../../repositories/guest/reviewRepository');
const reviewReplyRepository = require('../../repositories/guest/reviewReplyRepository');
const AppError = require('../../utils/AppError');

/**
 * Business logic layer for reviews.
 * Enforces: only confirmed-deposit tenants can review; one review per deposit.
 */

/**
 * List public reviews for a room, paginated.
 * Each review item includes its replies (no N+1 — fetched in one query).
 *
 * @param {string} roomId
 * @param {object} opts
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=10]
 * @returns {Promise<{ items, total, page, limit }>}
 */
async function listRoomReviews(roomId, { page = 1, limit = 10 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const { items, total } = await reviewRepository.findByRoomId(roomId, { page: p, limit: l });

  // Bulk-fetch all replies for these reviews in one query
  if (items.length > 0) {
    const reviewIds = items.map((r) => r.review_id);
    const allReplies = await reviewReplyRepository.findByReviewIds(reviewIds);

    // Group replies by review_id
    const repliesByReview = {};
    allReplies.forEach((rep) => {
      if (!repliesByReview[rep.review_id]) repliesByReview[rep.review_id] = [];
      repliesByReview[rep.review_id].push(rep);
    });

    // Attach replies array to each review
    items.forEach((rev) => {
      rev.replies = repliesByReview[rev.review_id] || [];
    });
  }

  return { items, total, page: p, limit: l };
}

/**
 * Create a review for a room.
 *
 * Business rules enforced:
 *  - The calling tenant must own a CONFIRMED deposit for this depositId.
 *  - Each deposit may only receive one review (unique constraint in DB).
 *
 * @param {object} params
 * @param {string} params.tenantId  UUID of the tenant from req.user
 * @param {string} params.depositId UUID of the confirmed deposit
 * @param {number} params.rating    1–5
 * @param {string} [params.comment]
 * @returns {Promise<object>} created review
 */
async function createReview({ tenantId, depositId, rating, comment }) {
  // Validate rating range
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('INVALID_RATING', 'Rating phải là số nguyên từ 1 đến 5.', 400);
  }

  // Check deposit exists, belongs to tenant, and is ACCEPTED
  const deposit = await reviewRepository.findConfirmedDeposit(depositId, tenantId);
  if (!deposit) {
    throw new AppError(
      'DEPOSIT_NOT_ELIGIBLE',
      'Bạn chỉ có thể đánh giá phòng khi có đơn đặt cọc đã được chấp nhận.',
      403,
    );
  }

  // Check duplicate review for this deposit
  const existing = await reviewRepository.findByDepositId(depositId);
  if (existing) {
    throw new AppError('REVIEW_EXISTS', 'Bạn đã review phòng này rồi.', 409);
  }

  const review = await reviewRepository.create({
    deposit_id: depositId,
    room_id: deposit.room_id,
    tenant_id: tenantId,
    rating,
    comment,
  });

  // Recalculate average rating for the room
  await reviewRepository.recalcAverageRating(deposit.room_id);

  // Gửi thông báo cho Chủ Nhà
  const notificationService = require('./notificationService');
  await notificationService.createNotification(
    deposit.landlord_user_id,
    'Phòng của bạn vừa có đánh giá mới',
    `Một khách thuê vừa để lại đánh giá ${rating} sao cho phòng "${deposit.room_title || 'của bạn'}".`,
    'REVIEW'
  );

  return review;
}

/**
 * Update an existing review.
 * Only the tenant who created the review can update it.
 *
 * @param {object} params
 * @param {string} params.reviewId
 * @param {string} params.tenantId
 * @param {number} params.rating
 * @param {string} [params.comment]
 * @returns {Promise<object>}
 */
async function updateReview({ reviewId, tenantId, rating, comment }) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('INVALID_RATING', 'Rating phải là số nguyên từ 1 đến 5.', 400);
  }

  const review = await reviewRepository.findById(reviewId);
  if (!review) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy đánh giá này.', 404);
  }

  if (review.tenant_id !== tenantId) {
    throw new AppError('FORBIDDEN', 'Bạn không có quyền sửa đánh giá này.', 403);
  }

  const updatedReview = await reviewRepository.update(reviewId, {
    rating,
    comment: comment || null,
  });

  // Recalculate average rating for the room
  await reviewRepository.recalcAverageRating(review.room_id);

  return updatedReview;
}

/**
 * Create a reply to a review.
 * Any authenticated user (TENANT or LANDLORD) can reply.
 * Can reply to a review directly, or nested under another reply.
 *
 * @param {object} params
 * @param {string} params.reviewId
 * @param {string} params.authorId  userId from JWT
 * @param {string} params.content
 * @param {string|null} [params.parentReplyId]
 * @returns {Promise<object>} created reply with author info
 */
async function createReply({ reviewId, authorId, content, parentReplyId = null }) {
  if (!content || !content.trim()) {
    throw new AppError('MISSING_FIELD', 'Nội dung phản hồi không được để trống.', 400);
  }

  // Verify the review exists
  const review = await reviewRepository.findById(reviewId);
  if (!review) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy đánh giá này.', 404);
  }

  if (parentReplyId) {
    const parentReply = await reviewReplyRepository.findById(parentReplyId);
    if (!parentReply) {
      throw new AppError('NOT_FOUND', 'Không tìm thấy phản hồi cha.', 404);
    }
    if (parentReply.review_id !== reviewId) {
      throw new AppError('BAD_REQUEST', 'Phản hồi cha không thuộc đánh giá này.', 400);
    }
  }

  const reply = await reviewReplyRepository.create({
    review_id: reviewId,
    author_id: authorId,
    content: content.trim(),
    parent_reply_id: parentReplyId,
  });

  // Find the one we just created with author info joined
  const allReplies = await reviewReplyRepository.findByReviewId(reviewId);
  return allReplies.find((r) => r.id === reply.reply_id) || reply;
}

/**
 * Update an existing review reply.
 * Only the author who wrote the reply can edit it.
 *
 * @param {object} params
 * @param {string} params.replyId
 * @param {string} params.authorId
 * @param {string} params.content
 * @returns {Promise<object>} updated reply with user info
 */
async function updateReply({ replyId, authorId, content }) {
  if (!content || !content.trim()) {
    throw new AppError('MISSING_FIELD', 'Nội dung phản hồi không được để trống.', 400);
  }

  const reply = await reviewReplyRepository.findById(replyId);
  if (!reply) {
    throw new AppError('NOT_FOUND', 'Không tìm thấy phản hồi này.', 404);
  }

  if (reply.author_id !== authorId) {
    throw new AppError('FORBIDDEN', 'Bạn không có quyền sửa phản hồi này.', 403);
  }

  const updated = await reviewReplyRepository.update(replyId, {
    content: content.trim(),
  });

  // Fetch updated reply with author details joined
  const allReplies = await reviewReplyRepository.findByReviewId(reply.review_id);
  return allReplies.find((r) => r.id === replyId) || updated;
}

module.exports = {
  listRoomReviews,
  createReview,
  updateReview,
  createReply,
  updateReply,
};

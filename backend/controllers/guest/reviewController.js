const reviewService = require('../../services/guest/reviewService');
const AppError = require('../../utils/AppError');
const { sendSuccess } = require('../../utils/responseHelper');
const db = require('../../config/db');

/**
 * Controller for review endpoints.
 * Parses HTTP inputs, delegates to reviewService, formats responses.
 */

/**
 * Resolve tenants.tenant_id from users.user_id stored in JWT.
 * Throws 403 if the caller is not a registered tenant.
 *
 * @param {string} userId from req.user.userId
 * @returns {Promise<string>} tenant_id UUID
 */
async function resolveTenantId(userId) {
  // Bảng tenants dùng tenant_id làm khóa chính kiêm FK trỏ tới users.user_id
  const tenant = await db('tenants').where({ tenant_id: userId }).first();
  if (!tenant) {
    throw new AppError('FORBIDDEN', 'Chỉ Tenant mới được thực hiện thao tác này.', 403);
  }
  return tenant.tenant_id;
}

/**
 * GET /api/rooms/:roomId/reviews
 * Public — list reviews for a room (includes replies).
 */
exports.listRoomReviews = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { page, limit } = req.query;

    const result = await reviewService.listRoomReviews(roomId, { page, limit });

    return sendSuccess(res, {
      message: 'Lấy danh sách đánh giá thành công.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews
 * Create a review. Requires TENANT login.
 * Body: { deposit_id, rating, comment? }
 */
exports.createReview = async (req, res, next) => {
  try {
    const { deposit_id, rating, comment } = req.body;

    if (!deposit_id) {
      throw new AppError('MISSING_FIELD', 'deposit_id là bắt buộc.', 400);
    }

    const tenantId = await resolveTenantId(req.user.userId);

    const review = await reviewService.createReview({
      tenantId,
      depositId: deposit_id,
      rating,
      comment,
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Đánh giá phòng thành công.',
      data: { review },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reviews/:reviewId/replies
 * Create a reply to a review.
 * Requires ANY authenticated user (TENANT or LANDLORD).
 * Body: { content }
 */
exports.createReply = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { content, parentReplyId } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('MISSING_FIELD', 'Nội dung phản hồi không được để trống.', 400);
    }

    const reply = await reviewService.createReply({
      reviewId,
      authorId: req.user.userId,
      content,
      parentReplyId: parentReplyId || null,
    });

    return sendSuccess(res, {
      status: 201,
      message: 'Đã gửi phản hồi thành công.',
      data: { reply },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/reviews/replies/:replyId
 * Update an existing review reply. Requires author check.
 */
exports.updateReply = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new AppError('MISSING_FIELD', 'Nội dung phản hồi không được để trống.', 400);
    }

    const reply = await reviewService.updateReply({
      replyId,
      authorId: req.user.userId,
      content,
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Cập nhật phản hồi thành công.',
      data: { reply },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reviews/:reviewId/replies
 * List all replies for a review. Public.
 */
exports.listReplies = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const reviewReplyRepository = require('../../repositories/guest/reviewReplyRepository');
    const replies = await reviewReplyRepository.findByReviewId(reviewId);

    return sendSuccess(res, {
      message: 'Lấy danh sách phản hồi thành công.',
      data: { replies },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/reviews/:reviewId
 * Update an existing review. TENANT only.
 */
exports.updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const tenantId = await resolveTenantId(req.user.userId);

    const review = await reviewService.updateReview({
      reviewId,
      tenantId,
      rating,
      comment,
    });

    return sendSuccess(res, {
      status: 200,
      message: 'Cập nhật đánh giá thành công.',
      data: { review },
    });
  } catch (err) {
    next(err);
  }
};

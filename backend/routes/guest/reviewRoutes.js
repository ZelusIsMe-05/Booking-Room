const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams để nhận :roomId từ parent route
const reviewController = require('../../controllers/guest/reviewController');
const { requireAuth } = require('../../middlewares/authMiddleware');

/**
 * Review routes.
 *
 * Mounted in app.js:
 *   app.use('/api/rooms/:roomId/reviews', reviewRoutes)  → listRoomReviews
 *   app.use('/api/reviews', reviewRoutes)                → create, replies
 */

// GET /api/rooms/:roomId/reviews — public (replies embedded in each review)
router.get('/', reviewController.listRoomReviews);

// POST /api/reviews — TENANT only
router.post('/', requireAuth, reviewController.createReview);

// GET  /api/reviews/:reviewId/replies — public
router.get('/:reviewId/replies', reviewController.listReplies);

// POST /api/reviews/:reviewId/replies — any authenticated user (TENANT or LANDLORD)
router.post('/:reviewId/replies', requireAuth, reviewController.createReply);

// PUT /api/reviews/:reviewId — edit a review (TENANT only)
router.put('/:reviewId', requireAuth, reviewController.updateReview);

module.exports = router;

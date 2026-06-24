const express = require('express');
const router = express.Router();
const conversationController = require('../../controllers/guest/conversationController');
const { requireAuth } = require('../../middlewares/authMiddleware');

/**
 * Conversation & Message routes.
 * Mounted at: /api/conversations
 */

// POST /api/conversations — Create or get conversation
router.post('/', requireAuth, conversationController.initConversation);

// GET /api/conversations — List all conversations
router.get('/', requireAuth, conversationController.listConversations);

// GET /api/conversations/:id/messages — Get messages in a conversation
router.get('/:id/messages', requireAuth, conversationController.getMessages);

// POST /api/conversations/:id/messages — Send a message
router.post('/:id/messages', requireAuth, conversationController.sendMessage);

// PATCH /api/conversations/:id/read — Mark messages as read
router.patch('/:id/read', requireAuth, conversationController.markAsRead);

// DELETE /api/conversations/:id — Clear conversation for caller
router.delete('/:id', requireAuth, conversationController.clearConversation);

module.exports = router;

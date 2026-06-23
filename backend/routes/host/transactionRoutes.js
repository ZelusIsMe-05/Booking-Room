const express = require('express');
const router = express.Router();
const { requireAuth, authorize } = require('../../middlewares/authMiddleware');
const transactionController = require('../../controllers/host/transactionController');

/**
 * Host transaction routes. Mounted at /api/host/transactions.
 * A "transaction" is a deposit on one of the host's rooms (+ its payment).
 */

// Summary cards (must be before /:id so it is not captured as an id).
router.get('/summary', requireAuth, authorize('LANDLORD'), transactionController.getSummary);

// Export the filtered list as CSV (must be before /:id).
router.get('/export', requireAuth, authorize('LANDLORD'), transactionController.exportTransactions);

// Paginated, filterable list.
router.get('/', requireAuth, authorize('LANDLORD'), transactionController.listTransactions);

// Single transaction detail.
router.get('/:id', requireAuth, authorize('LANDLORD'), transactionController.getTransactionDetail);

module.exports = router;

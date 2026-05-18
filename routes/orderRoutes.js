// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createOrder,
  fundOrder,
  startOrder,
  deliverOrder,
  acceptDelivery,
  requestRevision,
  openDispute,
  resolveDispute,
  cancelOrder,
  getMyBuyerOrders,
  getMySellerOrders,
  getOrderById,
  getWorkspaceOrders,
  addOrderNote,
  getOrderInvoice
} = require('../controllers/orderController');

// My orders — MUST be before /:id routes
router.get('/my-buyer', protect, getMyBuyerOrders);
router.get('/my-seller', protect, getMySellerOrders);
router.get('/workspace/:workspaceId', protect, getWorkspaceOrders);

// Order actions
router.post('/', protect, createOrder);
router.post('/:id/fund', protect, fundOrder);
router.patch('/:id/start', protect, startOrder);
router.patch('/:id/deliver', protect, deliverOrder);
router.patch('/:id/accept', protect, acceptDelivery);
router.patch('/:id/revision', protect, requestRevision);
router.post('/:id/dispute', protect, openDispute);
router.patch('/:id/resolve-dispute', protect, resolveDispute);
router.patch('/:id/cancel', protect, cancelOrder);
router.post('/:id/notes', protect, addOrderNote);
router.get('/:id/invoice', protect, getOrderInvoice);

// Order detail — MUST be after named routes
router.get('/:id', protect, getOrderById);

module.exports = router;
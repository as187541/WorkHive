// routes/connectionRoutes.js
const express = require('express');
const router = express.Router();

const {
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  removeConnection,
  getPendingRequests,
  getSentRequests,
  getConnections,
  getConnectionStatus,
  searchConnections
} = require('../controllers/connectionController');

const { protect } = require('../middleware/authMiddleware');

// Search connections (must be before /:connectionId routes)
router.get('/search', protect, searchConnections);

// Get pending requests (received)
router.get('/requests', protect, getPendingRequests);

// Get sent requests
router.get('/sent', protect, getSentRequests);

// Get connection status with a specific user
router.get('/status/:userId', protect, getConnectionStatus);

// Get all accepted connections
router.get('/', protect, getConnections);

// Send a connection request
router.post('/request', protect, sendConnectionRequest);

// Accept a connection request
router.put('/:connectionId/accept', protect, acceptConnectionRequest);

// Decline a connection request
router.put('/:connectionId/decline', protect, declineConnectionRequest);

// Remove a connection
router.delete('/:connectionId', protect, removeConnection);

module.exports = router;
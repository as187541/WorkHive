// controllers/connectionController.js
const Connection = require('../models/connectionModel');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const { emitNotification } = require('../utils/socket');

/**
 * @desc    Send a connection request
 * @route   POST /api/v1/connections/request
 * @access  Private
 */
const sendConnectionRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ msg: 'Please provide recipientId.' });
    }

    if (String(recipientId) === String(req.user._id)) {
      return res.status(400).json({ msg: 'You cannot connect with yourself.' });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Check if a connection already exists (in either direction)
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id }
      ]
    });

    if (existingConnection) {
      if (existingConnection.status === 'pending') {
        return res.status(400).json({ msg: 'A connection request is already pending.' });
      }
      if (existingConnection.status === 'accepted') {
        return res.status(400).json({ msg: 'You are already connected.' });
      }
      if (existingConnection.status === 'declined') {
        // Allow re-request after decline — delete old and create new
        await existingConnection.deleteOne();
      }
    }

    const connection = await Connection.create({
      requester: req.user._id,
      recipient: recipientId
    });

    await connection.populate('requester recipient', 'name avatar bio skills');

    emitNotification(recipientId, {
      type: 'connection_request',
      title: 'New Connection Request',
      message: `${req.user.name} sent you a connection request.`,
      data: { connectionId: connection._id, requesterId: req.user._id }
    });

    Activity.create({
      user: req.user._id,
      action: 'connection_request',
      target: `Sent a connection request to ${recipient.name}`
    }).catch(err => console.error('Connection activity error:', err));

    res.status(201).json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('sendConnectionRequest error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Accept a connection request
 * @route   PUT /api/v1/connections/:connectionId/accept
 * @access  Private
 */
const acceptConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ msg: 'Connection request not found.' });
    }

    if (String(connection.recipient) !== String(req.user._id)) {
      return res.status(403).json({ msg: 'You are not authorized to accept this request.' });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({ msg: `Connection request is already ${connection.status}.` });
    }

    connection.status = 'accepted';
    await connection.save();

    await connection.populate('requester recipient', 'name avatar bio skills');

    emitNotification(connection.requester, {
      type: 'connection_accepted',
      title: 'Connection Accepted',
      message: `${connection.recipient.name || 'Someone'} accepted your connection request.`,
      data: { connectionId: connection._id }
    });

    Activity.create({
      user: connection.recipient,
      action: 'connection_accepted',
      target: `Accepted a connection request from ${connection.requester.name || 'a user'}`
    }).catch(err => console.error('Connection activity error:', err));

    res.status(200).json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('acceptConnectionRequest error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Decline a connection request
 * @route   PUT /api/v1/connections/:connectionId/decline
 * @access  Private
 */
const declineConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ msg: 'Connection request not found.' });
    }

    if (String(connection.recipient) !== String(req.user._id)) {
      return res.status(403).json({ msg: 'You are not authorized to decline this request.' });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({ msg: `Connection request is already ${connection.status}.` });
    }

    connection.status = 'declined';
    await connection.save();

    res.status(200).json({
      success: true,
      data: connection
    });
  } catch (error) {
    console.error('declineConnectionRequest error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Remove a connection
 * @route   DELETE /api/v1/connections/:connectionId
 * @access  Private
 */
const removeConnection = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ msg: 'Connection not found.' });
    }

    // Only requester or recipient can remove
    if (
      String(connection.requester) !== String(req.user._id) &&
      String(connection.recipient) !== String(req.user._id)
    ) {
      return res.status(403).json({ msg: 'You are not authorized to remove this connection.' });
    }

    await connection.deleteOne();

    res.status(200).json({
      success: true,
      msg: 'Connection removed.'
    });
  } catch (error) {
    console.error('removeConnection error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get pending connection requests (received)
 * @route   GET /api/v1/connections/requests
 * @access  Private
 */
const getPendingRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      recipient: req.user._id,
      status: 'pending'
    })
      .populate('requester', 'name avatar bio skills availabilityStatus')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('getPendingRequests error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get sent connection requests
 * @route   GET /api/v1/connections/sent
 * @access  Private
 */
const getSentRequests = async (req, res) => {
  try {
    const requests = await Connection.find({
      requester: req.user._id,
      status: 'pending'
    })
      .populate('recipient', 'name avatar bio skills availabilityStatus')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('getSentRequests error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all accepted connections (friends list)
 * @route   GET /api/v1/connections
 * @access  Private
 */
const getConnections = async (req, res) => {
  try {
    const { search } = req.query;

    let connections = await Connection.find({
      $or: [
        { requester: req.user._id, status: 'accepted' },
        { recipient: req.user._id, status: 'accepted' }
      ]
    })
      .populate('requester recipient', 'name avatar bio skills availabilityStatus hourlyRate ratingAverage totalCompletedProjects')
      .sort({ updatedAt: -1 });

    // Transform: return the "other user" in each connection
    let results = connections.map(conn => {
      const isRequester = String(conn.requester._id) === String(req.user._id);
      const friend = isRequester ? conn.recipient : conn.requester;
      return {
        connectionId: conn._id,
        friend,
        connectedAt: conn.updatedAt
      };
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(r =>
        r.friend.name.toLowerCase().includes(searchLower) ||
        r.friend.skills?.some(s => s.toLowerCase().includes(searchLower))
      );
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('getConnections error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get connection status with a specific user
 * @route   GET /api/v1/connections/status/:userId
 * @access  Private
 */
const getConnectionStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const connection = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient: userId },
        { requester: userId, recipient: req.user._id }
      ]
    });

    if (!connection) {
      return res.status(200).json({
        success: true,
        data: { status: 'none', connectionId: null }
      });
    }

    const isRequester = String(connection.requester) === String(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        status: connection.status,
        connectionId: connection._id,
        isRequester // true if current user sent the request
      }
    });
  } catch (error) {
    console.error('getConnectionStatus error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Search connections for messaging
 * @route   GET /api/v1/connections/search
 * @access  Private
 */
const searchConnections = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Get all accepted connections
    const connections = await Connection.find({
      $or: [
        { requester: req.user._id, status: 'accepted' },
        { recipient: req.user._id, status: 'accepted' }
      ]
    })
      .populate('requester recipient', 'name avatar bio skills availabilityStatus')
      .lean();

    // Extract the "other user" from each connection
    const friends = connections.map(conn => {
      const isRequester = String(conn.requester._id) === String(req.user._id);
      return isRequester ? conn.recipient : conn.requester;
    });

    // Filter by search query
    const searchLower = q.toLowerCase();
    const filtered = friends.filter(f =>
      f.name.toLowerCase().includes(searchLower) ||
      f.skills?.some(s => s.toLowerCase().includes(searchLower))
    );

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('searchConnections error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  removeConnection,
  getPendingRequests,
  getSentRequests,
  getConnections,
  getConnectionStatus,
  searchConnections
};
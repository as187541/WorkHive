// controllers/orderController.js
const Order = require('../models/orderModel');
const ServicePackage = require('../models/servicePackageModel');
const Proposal = require('../models/proposalModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const sendEmail = require('../utils/sendEmail');
const { emitNotification } = require('../utils/socket');
const { calculatePlatformFee, calculateSellerPayout, generateInvoiceNumber, canTransitionTo } = require('../utils/escrow');
const { generateInvoiceData } = require('../utils/invoiceGenerator');
const { processTrigger } = require('../utils/automationEngine');

/**
 * @desc    Create a new order (from service package, proposal, or custom)
 * @route   POST /api/v1/orders
 * @access  Private
 */
const createOrder = async (req, res) => {
  try {
    const {
      servicePackageId,
      proposalId,
      workspaceId,
      projectId,
      title,
      description,
      price,
      currency,
      deliveryDays,
      revisions,
      features,
      milestones,
      sellerId
    } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ msg: 'Please provide a workspaceId.' });
    }

    // Verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }
    const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));
    if (!memberRecord) {
      return res.status(403).json({ msg: 'You are not a member of this workspace.' });
    }

    let resolvedSellerId;
    let orderTitle = title;
    let orderPrice = price;
    let orderCurrency = currency || 'HT';
    let orderDeliveryDays = deliveryDays;
    let orderRevisions = revisions || 0;
    let orderFeatures = features || [];
    let orderDescription = description || '';
    let orderMilestones = milestones || [];

    // --- Order from Service Package ---
    if (servicePackageId) {
      const service = await ServicePackage.findById(servicePackageId);
      if (!service || service.status !== 'Active') {
        return res.status(404).json({ msg: 'Service package not found or inactive.' });
      }
      resolvedSellerId = service.freelancer;
      orderTitle = orderTitle || service.title;
      orderPrice = service.price;
      orderCurrency = service.currency;
      orderDeliveryDays = service.deliveryDays;
      orderRevisions = service.revisions;
      orderFeatures = service.features;
      orderDescription = orderDescription || service.description;

      // Prevent self-ordering
      if (service.freelancer.equals(req.user._id)) {
        return res.status(400).json({ msg: 'You cannot order your own service package.' });
      }
    }
    // --- Order from accepted Proposal ---
    else if (proposalId) {
      const proposal = await Proposal.findById(proposalId);
      if (!proposal) {
        return res.status(404).json({ msg: 'Proposal not found.' });
      }
      if (proposal.status !== 'Accepted') {
        return res.status(400).json({ msg: 'Only accepted proposals can be converted to orders.' });
      }
      resolvedSellerId = proposal.freelancer;
      orderTitle = orderTitle || `Order from proposal: ${proposal._id}`;
      orderPrice = proposal.proposedPrice;
      orderCurrency = proposal.currency;
      orderDeliveryDays = proposal.deliveryDays;
      orderDescription = orderDescription || proposal.coverLetter;

      // Use proposal milestones if available
      if (proposal.milestones && proposal.milestones.length > 0) {
        orderMilestones = proposal.milestones.map(m => ({
          title: m.title,
          description: m.description || '',
          amount: m.amount,
          dueDate: m.dueDate,
          status: 'Pending'
        }));
      }
    }
    // --- Custom order (manual) ---
    else {
      if (!sellerId) {
        return res.status(400).json({ msg: 'Please provide a sellerId, servicePackageId, or proposalId.' });
      }
      resolvedSellerId = sellerId;
      if (!orderTitle || orderPrice === undefined || !orderDeliveryDays) {
        return res.status(400).json({ msg: 'Custom orders require title, price, and deliveryDays.' });
      }
    }

    // Verify seller exists
    const seller = await User.findById(resolvedSellerId);
    if (!seller) {
      return res.status(404).json({ msg: 'Seller not found.' });
    }

    // Verify project if provided
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project || !project.workspace.equals(workspaceId)) {
        return res.status(404).json({ msg: 'Project not found or does not belong to this workspace.' });
      }
    }

    // Calculate financials
    const platformFee = calculatePlatformFee(orderPrice);
    const sellerPayout = calculateSellerPayout(orderPrice, platformFee);

    const order = await Order.create({
      buyer: req.user._id,
      seller: resolvedSellerId,
      servicePackage: servicePackageId || undefined,
      jobPosting: req.body.jobPostingId || undefined,
      proposal: proposalId || undefined,
      workspace: workspaceId,
      project: projectId || undefined,
      title: orderTitle,
      description: orderDescription,
      price: orderPrice,
      currency: orderCurrency,
      deliveryDays: orderDeliveryDays,
      revisions: orderRevisions,
      revisionsRemaining: orderRevisions,
      features: orderFeatures,
      milestones: orderMilestones,
      platformFee,
      sellerPayout
    });

    // Populate for response
    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name')
      .populate('servicePackage', 'title price currency');

    // Notify seller
    emitNotification(resolvedSellerId.toString(), {
      type: 'order_created',
      title: 'New Order Received',
      message: `${req.user.name} has placed an order: ${orderTitle}`,
      data: { orderId: order._id }
    });

    // Email notification to seller
    try {
      const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}`;
      await sendEmail({
        email: seller.email,
        subject: `New Order: ${orderTitle}`,
        html: `
          <h2>You have a new order!</h2>
          <p><strong>${req.user.name}</strong> has placed an order for <strong>${orderTitle}</strong>.</p>
          <p><strong>Price:</strong> ${orderPrice} ${orderCurrency}</p>
          <p><strong>Delivery:</strong> ${orderDeliveryDays} days</p>
          <p><a href="${orderUrl}" style="padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">View Order</a></p>
        `
      });
    } catch (emailErr) {
      console.error('Order email error:', emailErr.message);
    }

    // Log activity
    Activity.create({
      user: req.user._id,
      action: 'order_created',
      target: orderTitle,
      workspace: workspaceId,
      project: projectId || undefined,
      metadata: { orderId: order._id, sellerId: resolvedSellerId, price: orderPrice, currency: orderCurrency }
    }).catch(err => console.error('Activity log error:', err.message));

    res.status(201).json({
      success: true,
      msg: 'Order created successfully.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('createOrder error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Fund an order (escrow simulation)
 * @route   POST /api/v1/orders/:id/fund
 * @access  Private (buyer only)
 */
const fundOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.buyer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the buyer can fund this order.' });
    }

    if (!canTransitionTo(order.status, 'Funded')) {
      return res.status(400).json({ msg: `Order cannot be funded from status: ${order.status}.` });
    }

    // For HT (Hive Tokens), check buyer wallet balance
    if (order.currency === 'HT') {
      const buyer = await User.findById(req.user._id);
      if (!buyer.wallet || buyer.wallet.balance < order.price) {
        return res.status(400).json({
          msg: `Insufficient HiveTokens. You have ${buyer.wallet?.balance || 0} HT, but need ${order.price} HT.`
        });
      }

      // Deduct from buyer wallet
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { 'wallet.balance': -order.price },
        $push: {
          'wallet.history': {
            amount: -order.price,
            reason: `Escrow funding for order: ${order.title}`,
            taskId: null,
            workspace: order.workspace,
            date: new Date()
          }
        }
      });
    }

    // Update order status and escrow
    order.status = 'Funded';
    order.fundedAt = new Date();
    order.deadline = new Date(order.fundedAt.getTime() + order.deliveryDays * 24 * 60 * 60 * 1000);
    order.escrow = {
      funded: true,
      fundedAt: new Date(),
      amount: order.price,
      releasedAt: null,
      releasedTo: null
    };

    await order.save();

    // Notify seller
    emitNotification(order.seller.toString(), {
      type: 'order_funded',
      title: 'Order Funded',
      message: `The order "${order.title}" has been funded. You can start working.`,
      data: { orderId: order._id }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: 'Order funded successfully. Seller has been notified.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('fundOrder error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Start working on an order (seller marks as In Progress)
 * @route   PATCH /api/v1/orders/:id/start
 * @access  Private (seller only)
 */
const startOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.seller.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the seller can start this order.' });
    }

    if (!canTransitionTo(order.status, 'In Progress')) {
      return res.status(400).json({ msg: `Order cannot be started from status: ${order.status}.` });
    }

    order.status = 'In Progress';
    await order.save();

    // Notify buyer
    emitNotification(order.buyer.toString(), {
      type: 'order_started',
      title: 'Order In Progress',
      message: `The seller has started working on "${order.title}".`,
      data: { orderId: order._id }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: 'Order marked as In Progress.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('startOrder error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Deliver an order (seller submits deliverables)
 * @route   PATCH /api/v1/orders/:id/deliver
 * @access  Private (seller only)
 */
const deliverOrder = async (req, res) => {
  try {
    const { message } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.seller.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the seller can deliver this order.' });
    }

    // Allow delivery from In Progress or Revision status
    if (order.status !== 'In Progress' && order.status !== 'Revision') {
      return res.status(400).json({ msg: `Order cannot be delivered from status: ${order.status}.` });
    }

    order.status = 'Delivered';
    order.delivery = {
      message: message || 'Deliverables submitted.',
      attachments: req.body.attachments || [],
      deliveredAt: new Date()
    };

    await order.save();

    // Notify buyer
    emitNotification(order.buyer.toString(), {
      type: 'order_delivered',
      title: 'Order Delivered',
      message: `The seller has delivered "${order.title}". Please review and accept.`,
      data: { orderId: order._id }
    });

    // Email notification
    try {
      const buyer = await User.findById(order.buyer);
      if (buyer) {
        const orderUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders/${order._id}`;
        await sendEmail({
          email: buyer.email,
          subject: `Order Delivered: ${order.title}`,
          html: `
            <h2>Your order has been delivered!</h2>
            <p>The seller has submitted deliverables for <strong>${order.title}</strong>.</p>
            <p>Please review and accept or request a revision.</p>
            <p><a href="${orderUrl}" style="padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Review Order</a></p>
          `
        });
      }
    } catch (emailErr) {
      console.error('Delivery email error:', emailErr.message);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    // Automation trigger: order delivered
    processTrigger('order_delivered', {
      workspaceId: order.workspace?.toString(),
      projectId: order.project?.toString(),
      orderId: order._id.toString(),
      sellerId: order.seller.toString(),
      userId: req.user._id.toString()
    });

    res.status(200).json({
      success: true,
      msg: 'Order delivered successfully. Buyer has been notified.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('deliverOrder error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Accept delivery (buyer accepts, releases escrow)
 * @route   PATCH /api/v1/orders/:id/accept
 * @access  Private (buyer only)
 */
const acceptDelivery = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.buyer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the buyer can accept delivery.' });
    }

    if (!canTransitionTo(order.status, 'Accepted')) {
      return res.status(400).json({ msg: `Order cannot be accepted from status: ${order.status}.` });
    }

    // Generate invoice
    const invoiceNumber = generateInvoiceNumber();

    // Release escrow to seller
    order.status = 'Accepted';
    order.acceptedAt = new Date();
    order.completedAt = new Date();
    order.invoice = {
      number: invoiceNumber,
      generatedAt: new Date()
    };
    order.escrow.releasedAt = new Date();
    order.escrow.releasedTo = order.seller;

    // Credit seller wallet
    if (order.currency === 'HT') {
      const sellerUpdateOps = {
        $inc: { 'wallet.balance': order.sellerPayout },
        $push: {
          'wallet.history': {
            amount: order.sellerPayout,
            reason: `Payment received for order: ${order.title}`,
            taskId: null,
            workspace: order.workspace,
            date: new Date()
          }
        }
      };

      // Credit workspace-specific balance
      const incResult = await User.updateOne(
        { _id: order.seller, 'wallet.workspaces.workspace': order.workspace },
        { $inc: { 'wallet.workspaces.$.balance': order.sellerPayout } }
      );

      if (incResult.modifiedCount === 0) {
        await User.updateOne(
          { _id: order.seller },
          { $push: { 'wallet.workspaces': { workspace: order.workspace, balance: order.sellerPayout } } }
        );
      }

      await User.findByIdAndUpdate(order.seller, sellerUpdateOps);
    }

    await order.save();

    // Notify seller
    emitNotification(order.seller.toString(), {
      type: 'order_accepted',
      title: 'Order Accepted',
      message: `Your order "${order.title}" has been accepted! Payment of ${order.sellerPayout} ${order.currency} has been released.`,
      data: { orderId: order._id }
    });

    // Email notification to seller
    try {
      const seller = await User.findById(order.seller);
      if (seller) {
        await sendEmail({
          email: seller.email,
          subject: `Order Accepted: ${order.title}`,
          html: `
            <h2>Great news! Your order has been accepted!</h2>
            <p><strong>${req.user.name}</strong> has accepted the delivery for <strong>${order.title}</strong>.</p>
            <p><strong>Payment Released:</strong> ${order.sellerPayout} ${order.currency}</p>
            <p><strong>Platform Fee:</strong> ${order.platformFee} ${order.currency}</p>
            <p><strong>Invoice:</strong> ${invoiceNumber}</p>
          `
        });
      }
    } catch (emailErr) {
      console.error('Accept email error:', emailErr.message);
    }

    // Log activity
    Activity.create({
      user: req.user._id,
      action: 'order_accepted',
      target: order.title,
      workspace: order.workspace,
      project: order.project,
      metadata: { orderId: order._id, sellerPayout: order.sellerPayout }
    }).catch(err => console.error('Activity log error:', err.message));

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: 'Delivery accepted. Payment has been released to the seller.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('acceptDelivery error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Request a revision (buyer asks for changes)
 * @route   PATCH /api/v1/orders/:id/revision
 * @access  Private (buyer only)
 */
const requestRevision = async (req, res) => {
  try {
    const { message } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.buyer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the buyer can request a revision.' });
    }

    if (!canTransitionTo(order.status, 'Revision')) {
      return res.status(400).json({ msg: `Revision cannot be requested from status: ${order.status}.` });
    }

    if (order.revisionsRemaining <= 0) {
      return res.status(400).json({ msg: 'No revisions remaining for this order.' });
    }

    order.status = 'Revision';
    order.revisionsRemaining -= 1;

    // Add note about revision
    order.notes.push({
      author: req.user._id,
      message: message || 'Revision requested.'
    });

    await order.save();

    // Notify seller
    emitNotification(order.seller.toString(), {
      type: 'order_revision',
      title: 'Revision Requested',
      message: `The buyer has requested a revision for "${order.title}". ${order.revisionsRemaining} revision(s) remaining.`,
      data: { orderId: order._id }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: `Revision requested. ${order.revisionsRemaining} revision(s) remaining.`,
      data: populatedOrder
    });
  } catch (error) {
    console.error('requestRevision error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Open a dispute
 * @route   POST /api/v1/orders/:id/dispute
 * @access  Private (buyer or seller)
 */
const openDispute = async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ msg: 'Please provide a reason for the dispute.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.buyer.equals(req.user._id) && !order.seller.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the buyer or seller can open a dispute.' });
    }

    if (!canTransitionTo(order.status, 'Disputed')) {
      return res.status(400).json({ msg: `Dispute cannot be opened from status: ${order.status}.` });
    }

    order.status = 'Disputed';
    order.dispute = {
      initiatedBy: req.user._id,
      reason,
      status: 'Open',
      resolution: '',
      resolvedBy: null,
      resolvedAt: null,
      outcome: 'None'
    };

    await order.save();

    // Notify the other party
    const otherUserId = order.buyer.equals(req.user._id) ? order.seller : order.buyer;
    emitNotification(otherUserId.toString(), {
      type: 'order_disputed',
      title: 'Dispute Opened',
      message: `A dispute has been opened for order "${order.title}".`,
      data: { orderId: order._id }
    });

    // Notify workspace admins
    try {
      const ws = await Workspace.findById(order.workspace).populate('members.user', '_id');
      if (ws) {
        ws.members
          .filter(m => m.role === 'Admin')
          .forEach(m => {
            emitNotification(m.user._id.toString(), {
              type: 'order_disputed',
              title: 'Order Dispute Requires Review',
              message: `A dispute has been opened for order "${order.title}" in your workspace.`,
              data: { orderId: order._id }
            });
          });
      }
    } catch (notifyErr) {
      console.error('Dispute notification error:', notifyErr.message);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: 'Dispute opened. Workspace admins have been notified.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('openDispute error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Resolve a dispute (workspace admin or SuperAdmin)
 * @route   PATCH /api/v1/orders/:id/resolve-dispute
 * @access  Private (workspace admin or SuperAdmin)
 */
const resolveDispute = async (req, res) => {
  try {
    const { outcome, resolution } = req.body;

    if (!outcome || !['Refund Buyer', 'Release to Seller', 'Split'].includes(outcome)) {
      return res.status(400).json({ msg: 'Please provide a valid outcome: "Refund Buyer", "Release to Seller", or "Split".' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (order.status !== 'Disputed') {
      return res.status(400).json({ msg: 'This order is not in dispute status.' });
    }

    // Verify resolver is workspace admin or SuperAdmin
    if (req.user.role !== 'SuperAdmin') {
      const workspace = await Workspace.findById(order.workspace);
      const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));
      if (!memberRecord || memberRecord.role !== 'Admin') {
        return res.status(403).json({ msg: 'Only workspace admins or SuperAdmins can resolve disputes.' });
      }
    }

    // Handle financial resolution
    if (order.currency === 'HT') {
      if (outcome === 'Refund Buyer') {
        await User.findByIdAndUpdate(order.buyer, {
          $inc: { 'wallet.balance': order.price },
          $push: {
            'wallet.history': {
              amount: order.price,
              reason: `Dispute refund for order: ${order.title}`,
              taskId: null,
              workspace: order.workspace,
              date: new Date()
            }
          }
        });
        order.status = 'Cancelled';
        order.cancelledAt = new Date();
      } else if (outcome === 'Release to Seller') {
        await User.findByIdAndUpdate(order.seller, {
          $inc: { 'wallet.balance': order.sellerPayout },
          $push: {
            'wallet.history': {
              amount: order.sellerPayout,
              reason: `Dispute resolved - payment released for: ${order.title}`,
              taskId: null,
              workspace: order.workspace,
              date: new Date()
            }
          }
        });
        order.status = 'Accepted';
        order.acceptedAt = new Date();
        order.completedAt = new Date();
      } else if (outcome === 'Split') {
        const halfPrice = Math.round(order.price / 2 * 100) / 100;
        const halfPayout = Math.round(order.sellerPayout / 2 * 100) / 100;

        await User.findByIdAndUpdate(order.buyer, {
          $inc: { 'wallet.balance': halfPrice },
          $push: {
            'wallet.history': {
              amount: halfPrice,
              reason: `Dispute split refund for order: ${order.title}`,
              taskId: null,
              workspace: order.workspace,
              date: new Date()
            }
          }
        });

        await User.findByIdAndUpdate(order.seller, {
          $inc: { 'wallet.balance': halfPayout },
          $push: {
            'wallet.history': {
              amount: halfPayout,
              reason: `Dispute split payment for order: ${order.title}`,
              taskId: null,
              workspace: order.workspace,
              date: new Date()
            }
          }
        });

        order.status = 'Accepted';
        order.acceptedAt = new Date();
        order.completedAt = new Date();
      }
    }

    order.dispute.status = 'Resolved';
    order.dispute.resolution = resolution || '';
    order.dispute.resolvedBy = req.user._id;
    order.dispute.resolvedAt = new Date();
    order.dispute.outcome = outcome;
    order.escrow.releasedAt = new Date();

    await order.save();

    // Notify both parties
    const notificationMsg = `Dispute for "${order.title}" has been resolved. Outcome: ${outcome}.`;
    emitNotification(order.buyer.toString(), {
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: notificationMsg,
      data: { orderId: order._id }
    });
    emitNotification(order.seller.toString(), {
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      message: notificationMsg,
      data: { orderId: order._id }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: `Dispute resolved. Outcome: ${outcome}.`,
      data: populatedOrder
    });
  } catch (error) {
    console.error('resolveDispute error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Cancel an order
 * @route   PATCH /api/v1/orders/:id/cancel
 * @access  Private (buyer or seller)
 */
const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.buyer.equals(req.user._id) && !order.seller.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the buyer or seller can cancel this order.' });
    }

    if (!canTransitionTo(order.status, 'Cancelled')) {
      return res.status(400).json({ msg: `Order cannot be cancelled from status: ${order.status}.` });
    }

    // If escrow was funded, refund buyer
    if (order.escrow.funded && order.currency === 'HT') {
      await User.findByIdAndUpdate(order.buyer, {
        $inc: { 'wallet.balance': order.price },
        $push: {
          'wallet.history': {
            amount: order.price,
            reason: `Order cancelled refund: ${order.title}`,
            taskId: null,
            workspace: order.workspace,
            date: new Date()
          }
        }
      });
    }

    order.status = 'Cancelled';
    order.cancelledAt = new Date();

    if (reason) {
      order.notes.push({
        author: req.user._id,
        message: `Order cancelled: ${reason}`
      });
    }

    await order.save();

    // Notify the other party
    const otherUserId = order.buyer.equals(req.user._id) ? order.seller : order.buyer;
    emitNotification(otherUserId.toString(), {
      type: 'order_cancelled',
      title: 'Order Cancelled',
      message: `Order "${order.title}" has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
      data: { orderId: order._id }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      msg: 'Order cancelled successfully. Escrow has been refunded to the buyer.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('cancelOrder error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get orders where current user is buyer
 * @route   GET /api/v1/orders/my-buyer
 * @access  Private
 */
const getMyBuyerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { buyer: req.user._id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('seller', 'name avatar email ratingAverage')
        .populate('workspace', 'name')
        .populate('project', 'name')
        .populate('servicePackage', 'title price currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: orders
    });
  } catch (error) {
    console.error('getMyBuyerOrders error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get orders where current user is seller
 * @route   GET /api/v1/orders/my-seller
 * @access  Private
 */
const getMySellerOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = { seller: req.user._id };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'name avatar email')
        .populate('workspace', 'name')
        .populate('project', 'name')
        .populate('servicePackage', 'title price currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: orders
    });
  } catch (error) {
    console.error('getMySellerOrders error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get a single order by ID
 * @route   GET /api/v1/orders/:id
 * @access  Private (buyer, seller, or admin)
 */
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email ratingAverage skills')
      .populate('workspace', 'name description')
      .populate('project', 'name')
      .populate('servicePackage', 'title price currency deliveryDays')
      .populate('notes.author', 'name avatar');

    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    // Access control: buyer, seller, workspace admin, or SuperAdmin
    const isBuyer = order.buyer._id.equals(req.user._id);
    const isSeller = order.seller._id.equals(req.user._id);
    const isSuperAdmin = req.user.role === 'SuperAdmin';

    let isWorkspaceAdmin = false;
    if (!isBuyer && !isSeller && !isSuperAdmin) {
      const workspace = await Workspace.findById(order.workspace);
      if (workspace) {
        const member = workspace.members.find(m => m.user.equals(req.user._id));
        isWorkspaceAdmin = member && member.role === 'Admin';
      }
    }

    if (!isBuyer && !isSeller && !isSuperAdmin && !isWorkspaceAdmin) {
      return res.status(403).json({ msg: 'You are not authorized to view this order.' });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('getOrderById error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get orders for a workspace (admin view)
 * @route   GET /api/v1/orders/workspace/:workspaceId
 * @access  Private (workspace admin or SuperAdmin)
 */
const getWorkspaceOrders = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    if (req.user.role !== 'SuperAdmin') {
      const member = workspace.members.find(m => m.user.equals(req.user._id));
      if (!member || member.role !== 'Admin') {
        return res.status(403).json({ msg: 'Only workspace admins can view workspace orders.' });
      }
    }

    const query = { workspace: workspaceId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('buyer', 'name avatar email')
        .populate('seller', 'name avatar email ratingAverage')
        .populate('project', 'name')
        .populate('servicePackage', 'title price currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: orders
    });
  } catch (error) {
    console.error('getWorkspaceOrders error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Add a note to an order
 * @route   POST /api/v1/orders/:id/notes
 * @access  Private (buyer or seller)
 */
const addOrderNote = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ msg: 'Please provide a message.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (!order.buyer.equals(req.user._id) && !order.seller.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the buyer or seller can add notes.' });
    }

    order.notes.push({
      author: req.user._id,
      message
    });

    await order.save();

    // Notify the other party
    const otherUserId = order.buyer.equals(req.user._id) ? order.seller : order.buyer;
    emitNotification(otherUserId.toString(), {
      type: 'order_note',
      title: 'New Note on Order',
      message: `${req.user.name} added a note to "${order.title}".`,
      data: { orderId: order._id }
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('buyer', 'name avatar email')
      .populate('seller', 'name avatar email')
      .populate('notes.author', 'name avatar');

    res.status(200).json({
      success: true,
      msg: 'Note added successfully.',
      data: populatedOrder
    });
  } catch (error) {
    console.error('addOrderNote error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get invoice data for an order
 * @route   GET /api/v1/orders/:id/invoice
 * @access  Private (buyer, seller, or admin)
 */
const getOrderInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email')
      .populate('seller', 'name email')
      .populate('workspace', 'name');

    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    // Access control
    const isBuyer = order.buyer._id.equals(req.user._id);
    const isSeller = order.seller._id.equals(req.user._id);
    const isSuperAdmin = req.user.role === 'SuperAdmin';

    if (!isBuyer && !isSeller && !isSuperAdmin) {
      return res.status(403).json({ msg: 'You are not authorized to view this invoice.' });
    }

    if (order.status !== 'Accepted') {
      return res.status(400).json({ msg: 'Invoice is only available for completed orders.' });
    }

    const invoiceData = generateInvoiceData(order, order.buyer, order.seller, order.workspace);

    res.status(200).json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    console.error('getOrderInvoice error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
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
};
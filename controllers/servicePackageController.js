const ServicePackage = require('../models/servicePackageModel');
const User = require('../models/userModel');
const HireInvitation = require('../models/hireInvitationModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Create a new service package
 * @route   POST /api/v1/services
 * @access  Private (any authenticated user)
 */
const createServicePackage = async (req, res) => {
  try {
    const { title, description, category, skills, price, currency, deliveryDays, revisions, features } = req.body;

    if (!title || !description || !category || !price || !deliveryDays) {
      return res.status(400).json({ msg: 'Please provide title, description, category, price, and deliveryDays.' });
    }

    const servicePackage = await ServicePackage.create({
      freelancer: req.user._id,
      title,
      description,
      category,
      skills: skills || [],
      price: Number(price),
      currency: currency || 'HT',
      deliveryDays: Number(deliveryDays),
      revisions: Number(revisions) || 0,
      features: features || [],
      images: req.body.images || []
    });

    res.status(201).json({
      success: true,
      data: servicePackage
    });
  } catch (error) {
    console.error('createServicePackage error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all service packages for the logged-in freelancer
 * @route   GET /api/v1/services/my
 * @access  Private
 */
const getMyServicePackages = async (req, res) => {
  try {
    const services = await ServicePackage.find({ freelancer: req.user._id, status: { $ne: 'Deleted' } })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('getMyServicePackages error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get a single service package by ID
 * @route   GET /api/v1/services/:id
 * @access  Private
 */
const getServicePackageById = async (req, res) => {
  try {
    const service = await ServicePackage.findById(req.params.id)
      .populate('freelancer', 'name avatar bio ratingAverage totalCompletedProjects availabilityStatus');

    if (!service) {
      return res.status(404).json({ msg: 'Service package not found.' });
    }

    res.status(200).json({
      success: true,
      data: service
    });
  } catch (error) {
    console.error('getServicePackageById error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Update a service package
 * @route   PATCH /api/v1/services/:id
 * @access  Private (owner only)
 */
const updateServicePackage = async (req, res) => {
  try {
    const service = await ServicePackage.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ msg: 'Service package not found.' });
    }

    if (!service.freelancer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You can only update your own service packages.' });
    }

    const allowedUpdates = ['title', 'description', 'category', 'skills', 'price', 'currency', 'deliveryDays', 'revisions', 'features', 'images', 'status'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedService = await ServicePackage.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedService
    });
  } catch (error) {
    console.error('updateServicePackage error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete (soft-delete) a service package
 * @route   DELETE /api/v1/services/:id
 * @access  Private (owner only)
 */
const deleteServicePackage = async (req, res) => {
  try {
    const service = await ServicePackage.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ msg: 'Service package not found.' });
    }

    if (!service.freelancer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You can only delete your own service packages.' });
    }

    service.status = 'Deleted';
    await service.save();

    res.status(200).json({
      success: true,
      msg: 'Service package deleted successfully.'
    });
  } catch (error) {
    console.error('deleteServicePackage error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Browse service packages with filters, sorting, and pagination
 * @route   GET /api/v1/services
 * @access  Private
 */
const browseServicePackages = async (req, res) => {
  try {
    const { category, skills, minPrice, maxPrice, minRating, search, sort, page = 1, limit = 12 } = req.query;
    const query = { status: 'Active' };

    // Filter by category
    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    // Filter by skills
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillArray.length > 0) {
        query.skills = { $in: skillArray.map(s => new RegExp(`^${s}$`, 'i')) };
      }
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filter by minimum rating
    if (minRating) {
      query.ratingAverage = { $gte: Number(minRating) };
    }

    // Text search on title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    let sortOption = {};
    if (sort === 'price_asc') {
      sortOption = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1 };
    } else if (sort === 'rating') {
      sortOption = { ratingAverage: -1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'popular') {
      sortOption = { totalOrders: -1 };
    } else {
      sortOption = { ratingAverage: -1, totalOrders: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [services, totalCount] = await Promise.all([
      ServicePackage.find(query)
        .populate('freelancer', 'name avatar ratingAverage totalCompletedProjects availabilityStatus')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ServicePackage.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: services.length,
      total: totalCount,
      page: Number(page),
      pages: Math.ceil(totalCount / Number(limit)),
      data: services
    });
  } catch (error) {
    console.error('browseServicePackages error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get service packages by a specific freelancer
 * @route   GET /api/v1/services/freelancer/:userId
 * @access  Private
 */
const getFreelancerServices = async (req, res) => {
  try {
    const services = await ServicePackage.find({
      freelancer: req.params.userId,
      status: 'Active'
    })
      .sort({ ratingAverage: -1, totalOrders: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('getFreelancerServices error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Order a service package (creates a hire invitation)
 * @route   POST /api/v1/services/:id/order
 * @access  Private
 */
const orderServicePackage = async (req, res) => {
  try {
    const { workspaceId, projectId, message } = req.body;
    const serviceId = req.params.id;

    if (!workspaceId || !projectId) {
      return res.status(400).json({ msg: 'Please provide workspaceId and projectId.' });
    }

    const service = await ServicePackage.findById(serviceId).populate('freelancer');
    if (!service || service.status !== 'Active') {
      return res.status(404).json({ msg: 'Service package not found or inactive.' });
    }

    // Verify sender is Admin of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const senderMember = workspace.members.find(m => m.user.equals(req.user._id));
    if (!senderMember || senderMember.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only workspace Admins can order services.' });
    }

    // Verify project exists and belongs to workspace
    const project = await Project.findById(projectId);
    if (!project || !project.workspace.equals(workspaceId)) {
      return res.status(404).json({ msg: 'Project not found or does not belong to this workspace.' });
    }

    // Check if freelancer is already a member
    const alreadyMember = workspace.members.some(m => m.user.equals(service.freelancer._id));
    if (alreadyMember) {
      return res.status(400).json({ msg: 'Freelancer is already a member of this workspace.' });
    }

    // Check for existing pending invite
    const existingInvite = await HireInvitation.findOne({
      workspace: workspaceId,
      project: projectId,
      invitedUser: service.freelancer._id,
      status: 'Pending'
    });

    if (existingInvite) {
      return res.status(400).json({ msg: 'A pending invitation already exists for this freelancer and project.' });
    }

    // Create hire invitation
    const hireInvitation = await HireInvitation.create({
      workspace: workspaceId,
      project: projectId,
      invitedUser: service.freelancer._id,
      sender: req.user._id,
      role: 'Contractor',
      message: message || `Order for: ${service.title} (${service.price} ${service.currency})`
    });

    // Increment total orders
    service.totalOrders += 1;
    await service.save();

    // Send email notification
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/hire-invitations`;
    await sendEmail({
      email: service.freelancer.email,
      subject: `New Order: ${service.title}`,
      html: `
        <h2>You've Received a New Order!</h2>
        <p><strong>${req.user.name}</strong> has ordered your service <strong>${service.title}</strong> for <strong>${service.price} ${service.currency}</strong>.</p>
        <p><strong>Workspace:</strong> ${workspace.name}</p>
        <p><strong>Project:</strong> ${project.name}</p>
        <p><strong>Delivery:</strong> ${service.deliveryDays} days</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        <p><a href="${acceptUrl}" style="padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">View Invitation</a></p>
      `
    });

    res.status(201).json({
      success: true,
      msg: 'Order placed successfully! The freelancer has been notified.',
      data: hireInvitation
    });
  } catch (error) {
    console.error('orderServicePackage error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createServicePackage,
  getMyServicePackages,
  getServicePackageById,
  updateServicePackage,
  deleteServicePackage,
  browseServicePackages,
  getFreelancerServices,
  orderServicePackage
};

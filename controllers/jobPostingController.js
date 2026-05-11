const JobPosting = require('../models/jobPostingModel');
const Proposal = require('../models/proposalModel');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const HireInvitation = require('../models/hireInvitationModel');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Create a new job posting
 * @route   POST /api/v1/jobs
 * @access  Private
 */
const createJobPosting = async (req, res) => {
  try {
    const { title, description, category, skills, budget, deadline, visibility, workspaceId, projectId } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ msg: 'Please provide title, description, and category.' });
    }

    // If workspace visibility, verify user is admin
    if (visibility === 'Workspace' && workspaceId) {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ msg: 'Workspace not found.' });
      }
      const isAdmin = workspace.members.some(
        m => m.user.equals(req.user._id) && m.role === 'Admin'
      );
      if (!isAdmin) {
        return res.status(403).json({ msg: 'Only workspace admins can post workspace jobs.' });
      }
    }

    const jobPosting = await JobPosting.create({
      postedBy: req.user._id,
      title,
      description,
      category,
      skills: skills || [],
      budget: budget || {},
      deadline: deadline || undefined,
      visibility: visibility || 'Public',
      workspace: workspaceId || undefined,
      project: projectId || undefined
    });

    res.status(201).json({
      success: true,
      data: jobPosting
    });
  } catch (error) {
    console.error('createJobPosting error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all job postings with filters
 * @route   GET /api/v1/jobs
 * @access  Private
 */
const browseJobPostings = async (req, res) => {
  try {
    const { category, skills, minBudget, maxBudget, search, status, visibility, sort, page = 1, limit = 12 } = req.query;
    const query = { status: { $in: ['Open', 'In Progress'] } };

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillArray.length > 0) {
        query.skills = { $in: skillArray.map(s => new RegExp(`^${s}$`, 'i')) };
      }
    }

    if (minBudget || maxBudget) {
      query['budget.max'] = {};
      if (minBudget) query['budget.max'].$gte = Number(minBudget);
      if (maxBudget) query['budget.max'].$lte = Number(maxBudget);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      query.status = status;
    }

    if (visibility) {
      query.visibility = visibility;
    }

    // For public jobs, show all. For workspace jobs, only show if user is member
    if (!visibility || visibility === 'Public') {
      query.$or = [
        { visibility: 'Public' },
        { visibility: 'Workspace', workspace: { $exists: true } }
      ];
    }

    let sortOption = {};
    if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'budget_high') {
      sortOption = { 'budget.max': -1 };
    } else if (sort === 'budget_low') {
      sortOption = { 'budget.max': 1 };
    } else if (sort === 'deadline') {
      sortOption = { deadline: 1 };
    } else {
      sortOption = { createdAt: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [jobs, totalCount] = await Promise.all([
      JobPosting.find(query)
        .populate('postedBy', 'name avatar')
        .populate('workspace', 'name')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      JobPosting.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total: totalCount,
      page: Number(page),
      pages: Math.ceil(totalCount / Number(limit)),
      data: jobs
    });
  } catch (error) {
    console.error('browseJobPostings error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get a single job posting by ID
 * @route   GET /api/v1/jobs/:id
 * @access  Private
 */
const getJobPostingById = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id)
      .populate('postedBy', 'name avatar')
      .populate('workspace', 'name')
      .populate('project', 'name')
      .populate('hiredFreelancer', 'name avatar');

    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('getJobPostingById error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get job postings posted by current user
 * @route   GET /api/v1/jobs/my/jobs
 * @access  Private
 */
const getMyJobPostings = async (req, res) => {
  try {
    const jobs = await JobPosting.find({ postedBy: req.user._id })
      .populate('proposalsCount')
      .sort({ createdAt: -1 })
      .lean();

    // Get actual proposal counts
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const count = await Proposal.countDocuments({ jobPosting: job._id, status: 'Pending' });
        return { ...job, proposalsCount: count };
      })
    );

    res.status(200).json({
      success: true,
      count: jobsWithCounts.length,
      data: jobsWithCounts
    });
  } catch (error) {
    console.error('getMyJobPostings error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Update a job posting
 * @route   PATCH /api/v1/jobs/:id
 * @access  Private (owner only)
 */
const updateJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (!job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You can only update your own job postings.' });
    }

    const allowedUpdates = ['title', 'description', 'category', 'skills', 'budget', 'deadline', 'status', 'visibility'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const updatedJob = await JobPosting.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedJob
    });
  } catch (error) {
    console.error('updateJobPosting error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete a job posting
 * @route   DELETE /api/v1/jobs/:id
 * @access  Private (owner only)
 */
const deleteJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (!job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You can only delete your own job postings.' });
    }

    // Delete all associated proposals
    await Proposal.deleteMany({ jobPosting: req.params.id });

    await JobPosting.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      msg: 'Job posting deleted successfully.'
    });
  } catch (error) {
    console.error('deleteJobPosting error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Close a job posting
 * @route   PATCH /api/v1/jobs/:id/close
 * @access  Private (owner only)
 */
const closeJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (!job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You can only close your own job postings.' });
    }

    job.status = 'Closed';
    await job.save();

    res.status(200).json({
      success: true,
      msg: 'Job posting closed successfully.',
      data: job
    });
  } catch (error) {
    console.error('closeJobPosting error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createJobPosting,
  browseJobPostings,
  getJobPostingById,
  getMyJobPostings,
  updateJobPosting,
  deleteJobPosting,
  closeJobPosting
};

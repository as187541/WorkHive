const JobPosting = require('../models/jobPostingModel');
const Proposal = require('../models/proposalModel');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const HireInvitation = require('../models/hireInvitationModel');
const Activity = require('../models/activityModel');
const sendEmail = require('../utils/sendEmail');
const { emitNotification } = require('../utils/socket');

/**
 * @desc    Create a new job posting
 * @route   POST /api/v1/jobs
 * @access  Private
 */
const createJobPosting = async (req, res) => {
  try {
    const { title, description, category, subCategory, tags, experienceLevel, projectType, skills, budget, deadline, visibility, workspaceId, projectId } = req.body;

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
      subCategory: subCategory || undefined,
      tags: tags || [],
      experienceLevel: experienceLevel || 'Mid',
      projectType: projectType || 'One-time',
      skills: skills || [],
      budget: budget || {},
      deadline: deadline || undefined,
      visibility: visibility || 'Public',
      workspace: workspaceId || undefined,
      project: projectId || undefined,
      approvalStatus: visibility === 'Workspace' ? 'Pending' : 'Approved'
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
    const { category, subCategory, experienceLevel, projectType, skills, minBudget, maxBudget, search, status, visibility, sort, page = 1, limit = 12 } = req.query;
    const query = { status: { $in: ['Open', 'In Progress'] }, approvalStatus: 'Approved' };

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (subCategory) {
      query.subCategory = { $regex: subCategory, $options: 'i' };
    }

    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }

    if (projectType) {
      query.projectType = projectType;
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

/**
 * @desc    Get pending job postings (admin only)
 * @route   GET /api/v1/admin/jobs/pending
 * @access  Private (admin only)
 */
const getPendingJobs = async (req, res) => {
  try {
    const pendingJobs = await JobPosting.find({ approvalStatus: 'Pending' })
      .populate('postedBy', 'name avatar email')
      .populate('workspace', 'name')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: pendingJobs.length,
      data: pendingJobs
    });
  } catch (error) {
    console.error('getPendingJobs error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Approve a job posting (admin only)
 * @route   PATCH /api/v1/admin/jobs/:id/approve
 * @access  Private (admin only)
 */
const approveJobPosting = async (req, res) => {
  try {
    const job = await JobPosting.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (job.approvalStatus === 'Approved') {
      return res.status(400).json({ msg: 'Job posting is already approved.' });
    }

    job.approvalStatus = 'Approved';
    job.approvedBy = req.user._id;
    job.rejectionReason = undefined;
    await job.save();

    // Notify the job poster
    try {
      emitNotification(job.postedBy.toString(), {
        type: 'job_approved',
        message: `Your job posting "${job.title}" has been approved!`,
        jobPostingId: job._id
      });

      const poster = await User.findById(job.postedBy);
      if (poster?.email) {
        sendEmail(
          poster.email,
          'Job Posting Approved - WorkHive',
          `<p>Hi ${poster.username},</p>
           <p>Your job posting "<strong>${job.title}</strong>" has been approved and is now visible to freelancers.</p>
           <p>— The WorkHive Team</p>`
        ).catch(err => console.error('Approval email error:', err));
      }
    } catch (notifErr) {
      console.error('Approval notification error:', notifErr);
    }

    res.status(200).json({
      success: true,
      msg: 'Job posting approved successfully.',
      data: job
    });
  } catch (error) {
    console.error('approveJobPosting error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Reject a job posting (admin only)
 * @route   PATCH /api/v1/admin/jobs/:id/reject
 * @access  Private (admin only)
 */
const rejectJobPosting = async (req, res) => {
  try {
    const { reason } = req.body;
    const job = await JobPosting.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (job.approvalStatus === 'Rejected') {
      return res.status(400).json({ msg: 'Job posting is already rejected.' });
    }

    job.approvalStatus = 'Rejected';
    job.approvedBy = req.user._id;
    job.rejectionReason = reason || 'Not specified';
    await job.save();

    // Notify the job poster
    try {
      emitNotification(job.postedBy.toString(), {
        type: 'job_rejected',
        message: `Your job posting "${job.title}" was not approved. Reason: ${job.rejectionReason}`,
        jobPostingId: job._id
      });

      const poster = await User.findById(job.postedBy);
      if (poster?.email) {
        sendEmail(
          poster.email,
          'Job Posting Update - WorkHive',
          `<p>Hi ${poster.username},</p>
           <p>Your job posting "<strong>${job.title}</strong>" was not approved.</p>
           <p><strong>Reason:</strong> ${job.rejectionReason}</p>
           <p>You can edit and resubmit your posting for review.</p>
           <p>— The WorkHive Team</p>`
        ).catch(err => console.error('Rejection email error:', err));
      }
    } catch (notifErr) {
      console.error('Rejection notification error:', notifErr);
    }

    res.status(200).json({
      success: true,
      msg: 'Job posting rejected.',
      data: job
    });
  } catch (error) {
    console.error('rejectJobPosting error:', error);
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
  closeJobPosting,
  getPendingJobs,
  approveJobPosting,
  rejectJobPosting
};

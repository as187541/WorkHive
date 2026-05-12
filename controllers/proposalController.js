const Proposal = require('../models/proposalModel');
const JobPosting = require('../models/jobPostingModel');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const HireInvitation = require('../models/hireInvitationModel');
const sendEmail = require('../utils/sendEmail');
const { emitNewProposal, emitProposalStatus, emitNotification } = require('../utils/socket');

/**
 * @desc    Submit a proposal for a job posting
 * @route   POST /api/v1/jobs/:jobId/proposals
 * @access  Private
 */
const submitProposal = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { coverLetter, proposedPrice, currency, deliveryDays, milestones } = req.body;

    if (!coverLetter || !proposedPrice || !deliveryDays) {
      return res.status(400).json({ msg: 'Please provide cover letter, proposed price, and delivery days.' });
    }

    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (job.status !== 'Open') {
      return res.status(400).json({ msg: 'This job is no longer accepting proposals.' });
    }

    // Prevent self-proposal
    if (String(job.postedBy) === String(req.user._id)) {
      return res.status(400).json({ msg: 'You cannot submit a proposal for your own job posting.' });
    }

    // Check if user already submitted a proposal
    const existingProposal = await Proposal.findOne({
      jobPosting: jobId,
      freelancer: req.user._id
    });

    if (existingProposal) {
      return res.status(400).json({ msg: 'You have already submitted a proposal for this job.' });
    }

    const proposal = await Proposal.create({
      jobPosting: jobId,
      freelancer: req.user._id,
      coverLetter,
      proposedPrice: Number(proposedPrice),
      currency: currency || 'HT',
      deliveryDays: Number(deliveryDays),
      milestones: milestones || []
    });

    // Increment proposal count
    job.proposalsCount += 1;
    await job.save();

    // Emit real-time notification to job poster
    emitNewProposal(job.postedBy, proposal, jobId);
    emitNotification(job.postedBy, {
      type: 'proposal',
      title: 'New Proposal Received',
      message: `${req.user.name} submitted a proposal for "${job.title}"`,
      data: { proposalId: proposal._id, jobId }
    });

    // Notify job poster via email
    const poster = await User.findById(job.postedBy);
    if (poster) {
      await sendEmail({
        email: poster.email,
        subject: `New Proposal: ${job.title}`,
        html: `
          <h2>New Proposal Received!</h2>
          <p>You have received a new proposal for <strong>${job.title}</strong>.</p>
          <p><strong>Freelancer:</strong> ${req.user.name}</p>
          <p><strong>Proposed Price:</strong> ${proposedPrice} ${currency || 'HT'}</p>
          <p><strong>Delivery:</strong> ${deliveryDays} days</p>
          <p><a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/jobs/${jobId}">View Proposal</a></p>
        `
      });
    }

    res.status(201).json({
      success: true,
      msg: 'Proposal submitted successfully!',
      data: proposal
    });
  } catch (error) {
    console.error('submitProposal error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all proposals for a job posting
 * @route   GET /api/v1/jobs/:jobId/proposals
 * @access  Private (job owner only)
 */
const getProposalsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await JobPosting.findById(jobId);
    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (!job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the job poster can view proposals.' });
    }

    const proposals = await Proposal.find({ jobPosting: jobId })
      .populate('freelancer', 'name avatar bio ratingAverage totalCompletedProjects skills')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error('getProposalsForJob error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get proposals submitted by current user
 * @route   GET /api/v1/proposals/my
 * @access  Private
 */
const getMyProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({ freelancer: req.user._id })
      .populate('jobPosting', 'title description status postedBy budget deadline')
      .populate('jobPosting.postedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error('getMyProposals error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Accept a proposal
 * @route   PATCH /api/v1/proposals/:id/accept
 * @access  Private (job owner only)
 */
const acceptProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { workspaceId, projectId } = req.body;

    const proposal = await Proposal.findById(id).populate('jobPosting');
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    if (!proposal.jobPosting.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the job poster can accept proposals.' });
    }

    if (proposal.status !== 'Pending') {
      return res.status(400).json({ msg: 'This proposal has already been processed.' });
    }

    // Update proposal status
    proposal.status = 'Accepted';
    await proposal.save();

    // Update job posting
    const job = await JobPosting.findById(proposal.jobPosting._id);
    job.status = 'Filled';
    job.hiredFreelancer = proposal.freelancer;
    await job.save();

    // Reject all other pending proposals
    await Proposal.updateMany(
      { jobPosting: proposal.jobPosting._id, status: 'Pending', _id: { $ne: id } },
      { status: 'Rejected' }
    );

    // Create hire invitation if workspace and project provided
    let hireInvitation = null;
    if (workspaceId && projectId) {
      const workspace = await Workspace.findById(workspaceId);
      const project = await Project.findById(projectId);

      if (workspace && project) {
        hireInvitation = await HireInvitation.create({
          workspace: workspaceId,
          project: projectId,
          invitedUser: proposal.freelancer,
          sender: req.user._id,
          role: 'Contractor',
          message: `Hired via job posting: ${job.title}. Proposed price: ${proposal.proposedPrice} ${proposal.currency}`
        });
      }
    }

    // Notify freelancer via socket
    emitProposalStatus(proposal.freelancer, proposal, proposal.jobPosting._id);
    emitNotification(proposal.freelancer, {
      type: 'proposal_accepted',
      title: 'Proposal Accepted! 🎉',
      message: `Your proposal for "${job.title}" has been accepted!`,
      data: { proposalId: proposal._id, jobId: job._id }
    });

    // Notify other rejected freelancers
    const rejectedProposals = await Proposal.find({
      jobPosting: proposal.jobPosting._id,
      status: 'Rejected',
      _id: { $ne: id }
    });
    rejectedProposals.forEach(rp => {
      emitProposalStatus(rp.freelancer, rp, proposal.jobPosting._id);
      emitNotification(rp.freelancer, {
        type: 'proposal_rejected',
        title: 'Proposal Not Selected',
        message: `Your proposal for "${job.title}" was not selected.`,
        data: { proposalId: rp._id, jobId: job._id }
      });
    });

    // Notify freelancer via email
    const freelancer = await User.findById(proposal.freelancer);
    if (freelancer) {
      await sendEmail({
        email: freelancer.email,
        subject: `Proposal Accepted: ${job.title}`,
        html: `
          <h2>Congratulations! Your proposal was accepted! 🎉</h2>
          <p>Your proposal for <strong>${job.title}</strong> has been accepted.</p>
          <p><strong>Proposed Price:</strong> ${proposal.proposedPrice} ${proposal.currency}</p>
          <p><strong>Delivery:</strong> ${proposal.deliveryDays} days</p>
          ${hireInvitation ? `<p><strong>Next Step:</strong> You have been invited to join the workspace. <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/hire-invitations">View Invitation</a></p>` : ''}
        `
      });
    }

    res.status(200).json({
      success: true,
      msg: 'Proposal accepted successfully!',
      data: { proposal, hireInvitation }
    });
  } catch (error) {
    console.error('acceptProposal error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Reject a proposal
 * @route   PATCH /api/v1/proposals/:id/reject
 * @access  Private (job owner only)
 */
const rejectProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findById(id).populate('jobPosting');
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    if (!proposal.jobPosting.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the job poster can reject proposals.' });
    }

    if (proposal.status !== 'Pending') {
      return res.status(400).json({ msg: 'This proposal has already been processed.' });
    }

    proposal.status = 'Rejected';
    await proposal.save();

    res.status(200).json({
      success: true,
      msg: 'Proposal rejected.',
      data: proposal
    });
  } catch (error) {
    console.error('rejectProposal error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Withdraw a proposal
 * @route   PATCH /api/v1/proposals/:id/withdraw
 * @access  Private (freelancer only)
 */
const withdrawProposal = async (req, res) => {
  try {
    const { id } = req.params;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    if (!proposal.freelancer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You can only withdraw your own proposals.' });
    }

    if (proposal.status !== 'Pending') {
      return res.status(400).json({ msg: 'This proposal has already been processed.' });
    }

    proposal.status = 'Withdrawn';
    await proposal.save();

    // Decrement proposal count
    await JobPosting.findByIdAndUpdate(proposal.jobPosting, {
      $inc: { proposalsCount: -1 }
    });

    res.status(200).json({
      success: true,
      msg: 'Proposal withdrawn successfully.',
      data: proposal
    });
  } catch (error) {
    console.error('withdrawProposal error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  submitProposal,
  getProposalsForJob,
  getMyProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal
};

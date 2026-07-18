const Proposal = require('../models/proposalModel');
const JobPosting = require('../models/jobPostingModel');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const HireInvitation = require('../models/hireInvitationModel');
const Activity = require('../models/activityModel');
const sendEmail = require('../utils/sendEmail');
const { emitNewProposal, emitProposalStatus, emitNotification, emitHireInvitation } = require('../utils/socket');
const { processTrigger } = require('../utils/automationEngine');

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

    // Log activity for the job poster without blocking the response
    Activity.create({
      user: job.postedBy,
      action: 'proposal_submitted',
      target: `${req.user.name} submitted a proposal for "${job.title}"`,
      workspace: job.workspace || null,
      project: job.project || null
    }).catch(actErr => console.error('Activity log error:', actErr));

    // Notify job poster via email without blocking the response
    const poster = await User.findById(job.postedBy);
    if (poster) {
      sendEmail({
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
      }).catch(err => console.error('Proposal email error:', err));
    }

    // Automation trigger: proposal submitted
    processTrigger('proposal_submitted', {
      workspaceId: job.workspace?.toString(),
      projectId: job.project?.toString(),
      jobId: job._id.toString(),
      proposalId: proposal._id.toString(),
      userId: req.user._id.toString(),
      proposedPrice: Number(proposedPrice)
    });

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
          jobPosting: job._id,
          message: `Hired via job posting: ${job.title}. Proposed price: ${proposal.proposedPrice} ${proposal.currency}`
        });

        // Add freelancer to project members if not already a member
        if (!project.members.includes(proposal.freelancer)) {
          project.members.push(proposal.freelancer);
          await project.save();

          Activity.create({
            user: proposal.freelancer,
            action: 'workspace_joined',
            target: `Joined workspace ${workspace.name} via accepted proposal for "${job.title}"`,
            workspace: workspaceId,
            project: projectId
          }).catch(actErr => console.error('Activity log error:', actErr));
        }

        // Emit hire invitation notification
        emitHireInvitation(proposal.freelancer, hireInvitation);
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

    // Log activity for the freelancer without blocking the response
    Activity.create({
      user: proposal.freelancer,
      action: 'proposal_accepted',
      target: `Proposal for "${job.title}" was accepted`,
      workspace: job.workspace || null,
      project: job.project || null
    }).catch(actErr => console.error('Activity log error:', actErr));

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

    // Notify freelancer via email without blocking the response
    const freelancer = await User.findById(proposal.freelancer);
    if (freelancer) {
      sendEmail({
        email: freelancer.email,
        subject: `Proposal Accepted: ${job.title}`,
        html: `
          <h2>Congratulations! Your proposal was accepted! 🎉</h2>
          <p>Your proposal for <strong>${job.title}</strong> has been accepted.</p>
          <p><strong>Proposed Price:</strong> ${proposal.proposedPrice} ${proposal.currency}</p>
          <p><strong>Delivery:</strong> ${proposal.deliveryDays} days</p>
          ${hireInvitation ? `<p><strong>Next Step:</strong> You have been invited to join the workspace. <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/hire-invitations">View Invitation</a></p>` : ''}
        `
      }).catch(err => console.error('Proposal acceptance email error:', err));
    }

    // Automation trigger: proposal accepted
    processTrigger('proposal_accepted', {
      workspaceId: job.workspace?.toString() || workspaceId,
      projectId: job.project?.toString() || projectId,
      jobId: job._id.toString(),
      proposalId: proposal._id.toString(),
      userId: req.user._id.toString(),
      freelancerId: proposal.freelancer.toString()
    });

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

    // Notify the freelancer that their proposal was rejected
    try {
      emitNotification(proposal.freelancer.toString(), {
        type: 'proposal_rejected',
        message: `Your proposal for "${proposal.jobPosting.title}" was not selected.`,
        proposalId: proposal._id,
        jobPostingId: proposal.jobPosting._id
      });

      await Activity.create({
        user: proposal.freelancer,
        action: 'proposal_rejected',
        target: `Proposal for "${proposal.jobPosting.title}" was rejected`,
        workspace: proposal.jobPosting.workspace || null,
        project: proposal.jobPosting.project || null
      });

      const freelancer = await User.findById(proposal.freelancer);
      if (freelancer?.email) {
        sendEmail(
          freelancer.email,
          'Proposal Update - WorkHive',
          `<p>Hi ${freelancer.username},</p>
           <p>Your proposal for "<strong>${proposal.jobPosting.title}</strong>" was not selected at this time.</p>
           <p>Keep applying — the right opportunity is out there!</p>
           <p>— The WorkHive Team</p>`
        ).catch(err => console.error('Rejection email error:', err));
      }
    } catch (notifErr) {
      console.error('Rejection notification error:', notifErr);
    }

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

// ============================================================
// MILESTONE HANDLERS
// ============================================================

/**
 * @desc    Get milestones for a proposal
 * @route   GET /api/v1/proposals/:id/milestones
 * @access  Private (proposal parties only)
 */
const getMilestones = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await Proposal.findById(id)
      .populate('freelancer', 'name avatar')
      .populate('jobPosting', 'title status postedBy');

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    const isFreelancer = proposal.freelancer._id.equals(req.user._id);
    const isJobOwner = proposal.jobPosting.postedBy.equals(req.user._id);
    if (!isFreelancer && !isJobOwner) {
      return res.status(403).json({ msg: 'Not authorized to view this proposal.' });
    }

    res.status(200).json({
      success: true,
      data: proposal.milestones || []
    });
  } catch (error) {
    console.error('getMilestones error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Freelancer submits a milestone for review
 * @route   PATCH /api/v1/proposals/:id/milestones/:index/submit
 * @access  Private (freelancer only)
 */
const submitMilestone = async (req, res) => {
  try {
    const { id, index } = req.params;
    const proposal = await Proposal.findById(id);

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    if (!proposal.freelancer.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the freelancer can submit milestones.' });
    }

    if (proposal.status !== 'Accepted') {
      return res.status(400).json({ msg: 'Milestones can only be submitted for accepted proposals.' });
    }

    const milestoneIndex = parseInt(index, 10);
    if (!proposal.milestones[milestoneIndex]) {
      return res.status(404).json({ msg: 'Milestone not found.' });
    }

    const milestone = proposal.milestones[milestoneIndex];
    if (milestone.status !== 'Pending' && milestone.status !== 'Rejected') {
      return res.status(400).json({ msg: `Milestone is already ${milestone.status.toLowerCase()}.` });
    }

    // Check that all previous milestones are approved
    for (let i = 0; i < milestoneIndex; i++) {
      if (proposal.milestones[i].status !== 'Approved') {
        return res.status(400).json({ msg: 'All previous milestones must be approved before submitting this one.' });
      }
    }

    milestone.status = 'Submitted';
    milestone.submittedAt = new Date();
    await proposal.save();

    // Notify job owner
    const job = await JobPosting.findById(proposal.jobPosting);
    if (job) {
      emitNotification(job.postedBy, {
        type: 'milestone_submitted',
        title: 'Milestone Submitted for Review',
        message: `A milestone has been submitted for "${job.title}"`,
        data: { proposalId: proposal._id, milestoneIndex, jobId: job._id }
      });

      Activity.create({
        user: req.user._id,
        action: 'task_completed',
        target: `Submitted milestone "${milestone.title}" for "${job.title}"`,
        workspace: job.workspace || null,
        project: job.project || null
      }).catch(err => console.error('Milestone activity error:', err));
    }

    res.status(200).json({
      success: true,
      msg: 'Milestone submitted for review.',
      data: proposal.milestones
    });
  } catch (error) {
    console.error('submitMilestone error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Job owner approves a milestone and releases payment
 * @route   PATCH /api/v1/proposals/:id/milestones/:index/approve
 * @access  Private (job owner only)
 */
const approveMilestone = async (req, res) => {
  try {
    const { id, index } = req.params;
    const proposal = await Proposal.findById(id);

    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    const job = await JobPosting.findById(proposal.jobPosting);
    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (!job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the job owner can approve milestones.' });
    }

    const milestoneIndex = parseInt(index, 10);
    if (!proposal.milestones[milestoneIndex]) {
      return res.status(404).json({ msg: 'Milestone not found.' });
    }

    const milestone = proposal.milestones[milestoneIndex];
    if (milestone.status !== 'Submitted') {
      return res.status(400).json({ msg: 'Only submitted milestones can be approved.' });
    }

    // Transfer HT tokens from job owner's workspace wallet to freelancer
    const amount = milestone.amount;
    if (proposal.currency === 'HT') {
      const jobOwner = await User.findById(req.user._id);
      const workspaceEntry = jobOwner.wallet.workspaces.find(
        w => w.workspace && w.workspace.equals(job.workspace)
      );

      if (!workspaceEntry || workspaceEntry.balance < amount) {
        return res.status(400).json({ msg: 'Insufficient HT balance in workspace wallet to approve this milestone.' });
      }

      // Deduct from job owner's workspace wallet
      workspaceEntry.balance -= amount;
      jobOwner.wallet.balance -= amount;

      // Credit to freelancer's wallet
      const freelancer = await User.findById(proposal.freelancer);
      if (freelancer) {
        freelancer.wallet.balance += amount;
        const freelancerWsEntry = freelancer.wallet.workspaces.find(
          w => w.workspace && w.workspace.equals(job.workspace)
        );
        if (freelancerWsEntry) {
          freelancerWsEntry.balance += amount;
        }

        // Wallet history entries with cap
        jobOwner.wallet.history.push({
          amount: -amount,
          reason: `Milestone payment: ${milestone.title}`,
          workspace: job.workspace,
          date: new Date()
        });
        if (jobOwner.wallet.history.length > 500) {
          jobOwner.wallet.history = jobOwner.wallet.history.slice(-500);
        }
        freelancer.wallet.history.push({
          amount: amount,
          reason: `Milestone payment received: ${milestone.title}`,
          workspace: job.workspace,
          date: new Date()
        });
        if (freelancer.wallet.history.length > 500) {
          freelancer.wallet.history = freelancer.wallet.history.slice(-500);
        }

        await freelancer.save();
      }

      await jobOwner.save();
    }

    // Update milestone status
    milestone.status = 'Approved';
    milestone.approvedAt = new Date();
    await proposal.save();

    // Notify freelancer
    emitNotification(proposal.freelancer, {
      type: 'milestone_approved',
      title: 'Milestone Approved! 💰',
      message: `Your milestone "${milestone.title}" has been approved.${proposal.currency === 'HT' ? ` ${amount} HT has been transferred to your wallet.` : ''}`,
      data: { proposalId: proposal._id, milestoneIndex, jobId: job._id }
    });

    Activity.create({
      user: req.user._id,
      action: 'task_completed',
      target: `Approved milestone "${milestone.title}" for "${job.title}"`,
      workspace: job.workspace || null,
      project: job.project || null
    }).catch(err => console.error('Milestone approval activity error:', err));

    // Check if all milestones are approved
    const allApproved = proposal.milestones.every(m => m.status === 'Approved');
    if (allApproved && proposal.negotiationStatus !== 'Agreed') {
      proposal.negotiationStatus = 'Agreed';
      await proposal.save();
    }

    res.status(200).json({
      success: true,
      msg: proposal.currency === 'HT'
        ? `Milestone approved! ${amount} HT transferred to freelancer.`
        : 'Milestone approved!',
      data: proposal.milestones
    });
  } catch (error) {
    console.error('approveMilestone error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Job owner rejects a submitted milestone
 * @route   PATCH /api/v1/proposals/:id/milestones/:index/reject
 * @access  Private (job owner only)
 */
const rejectMilestone = async (req, res) => {
  try {
    const { id, index } = req.params;
    const { reason } = req.body;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    const job = await JobPosting.findById(proposal.jobPosting);
    if (!job) {
      return res.status(404).json({ msg: 'Job posting not found.' });
    }

    if (!job.postedBy.equals(req.user._id)) {
      return res.status(403).json({ msg: 'Only the job owner can reject milestones.' });
    }

    const milestoneIndex = parseInt(index, 10);
    if (!proposal.milestones[milestoneIndex]) {
      return res.status(404).json({ msg: 'Milestone not found.' });
    }

    const milestone = proposal.milestones[milestoneIndex];
    if (milestone.status !== 'Submitted') {
      return res.status(400).json({ msg: 'Only submitted milestones can be rejected.' });
    }

    milestone.status = 'Rejected';
    milestone.rejectionReason = reason || '';
    await proposal.save();

    // Notify freelancer
    emitNotification(proposal.freelancer, {
      type: 'milestone_rejected',
      title: 'Milestone Rejected',
      message: `Your milestone "${milestone.title}" was rejected.${reason ? ` Reason: ${reason}` : ''}`,
      data: { proposalId: proposal._id, milestoneIndex, jobId: job._id }
    });

    res.status(200).json({
      success: true,
      msg: 'Milestone rejected.',
      data: proposal.milestones
    });
  } catch (error) {
    console.error('rejectMilestone error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// ============================================================
// COUNTER-OFFER HANDLERS
// ============================================================

/**
 * @desc    Submit a counter-offer on a proposal
 * @route   POST /api/v1/proposals/:id/counter-offer
 * @access  Private (either party)
 */
const submitCounterOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { proposedPrice, deliveryDays, message } = req.body;

    if (!proposedPrice || !deliveryDays) {
      return res.status(400).json({ msg: 'Please provide proposed price and delivery days.' });
    }

    const proposal = await Proposal.findById(id).populate('jobPosting', 'postedBy');
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    const isFreelancer = proposal.freelancer.equals(req.user._id);
    const isJobOwner = proposal.jobPosting.postedBy.equals(req.user._id);
    if (!isFreelancer && !isJobOwner) {
      return res.status(403).json({ msg: 'Not authorized to counter-offer on this proposal.' });
    }

    if (proposal.status !== 'Pending') {
      return res.status(400).json({ msg: 'Counter-offers can only be made on pending proposals.' });
    }

    proposal.counterOffers.push({
      sender: req.user._id,
      proposedPrice: Number(proposedPrice),
      deliveryDays: Number(deliveryDays),
      message: message || '',
      status: 'Pending'
    });

    proposal.negotiationStatus = 'Negotiating';
    await proposal.save();

    // Notify the other party
    const notifyUserId = isFreelancer ? proposal.jobPosting.postedBy : proposal.freelancer;
    emitNotification(notifyUserId, {
      type: 'counter_offer',
      title: 'New Counter-Offer',
      message: `${req.user.name} sent a counter-offer: ${proposedPrice} ${proposal.currency}, ${deliveryDays} days`,
      data: { proposalId: proposal._id, jobId: proposal.jobPosting._id }
    });

    const updatedProposal = await Proposal.findById(id)
      .populate('freelancer', 'name avatar')
      .populate('counterOffers.sender', 'name avatar');

    res.status(200).json({
      success: true,
      msg: 'Counter-offer submitted.',
      data: updatedProposal
    });
  } catch (error) {
    console.error('submitCounterOffer error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Accept a counter-offer — updates proposal price/delivery
 * @route   PATCH /api/v1/proposals/:id/counter-offers/:index/accept
 * @access  Private (the other party)
 */
const acceptCounterOffer = async (req, res) => {
  try {
    const { id, index } = req.params;
    const proposal = await Proposal.findById(id).populate('jobPosting', 'postedBy title');
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    const counterIndex = parseInt(index, 10);
    const counterOffer = proposal.counterOffers[counterIndex];
    if (!counterOffer) {
      return res.status(404).json({ msg: 'Counter-offer not found.' });
    }

    // Only the other party can accept
    const isSender = counterOffer.sender.equals(req.user._id);
    if (isSender) {
      return res.status(400).json({ msg: 'You cannot accept your own counter-offer.' });
    }

    const isFreelancer = proposal.freelancer.equals(req.user._id);
    const isJobOwner = proposal.jobPosting.postedBy.equals(req.user._id);
    if (!isFreelancer && !isJobOwner) {
      return res.status(403).json({ msg: 'Not authorized.' });
    }

    if (counterOffer.status !== 'Pending') {
      return res.status(400).json({ msg: 'This counter-offer has already been processed.' });
    }

    // Accept this counter-offer and reject all others
    proposal.counterOffers.forEach((co, i) => {
      co.status = i === counterIndex ? 'Accepted' : 'Rejected';
    });

    // Update proposal with counter-offer terms
    proposal.proposedPrice = counterOffer.proposedPrice;
    proposal.deliveryDays = counterOffer.deliveryDays;
    proposal.negotiationStatus = 'Agreed';
    await proposal.save();

    // Notify the counter-offer sender
    emitNotification(counterOffer.sender, {
      type: 'counter_offer_accepted',
      title: 'Counter-Offer Accepted!',
      message: `Your counter-offer for "${proposal.jobPosting.title}" has been accepted.`,
      data: { proposalId: proposal._id, jobId: proposal.jobPosting._id }
    });

    res.status(200).json({
      success: true,
      msg: 'Counter-offer accepted. Proposal terms updated.',
      data: proposal
    });
  } catch (error) {
    console.error('acceptCounterOffer error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Reject a counter-offer
 * @route   PATCH /api/v1/proposals/:id/counter-offers/:index/reject
 * @access  Private (the other party)
 */
const rejectCounterOffer = async (req, res) => {
  try {
    const { id, index } = req.params;
    const proposal = await Proposal.findById(id).populate('jobPosting', 'postedBy title');
    if (!proposal) {
      return res.status(404).json({ msg: 'Proposal not found.' });
    }

    const counterIndex = parseInt(index, 10);
    const counterOffer = proposal.counterOffers[counterIndex];
    if (!counterOffer) {
      return res.status(404).json({ msg: 'Counter-offer not found.' });
    }

    if (counterOffer.status !== 'Pending') {
      return res.status(400).json({ msg: 'This counter-offer has already been processed.' });
    }

    counterOffer.status = 'Rejected';
    await proposal.save();

    // Notify the counter-offer sender
    emitNotification(counterOffer.sender, {
      type: 'counter_offer_rejected',
      title: 'Counter-Offer Declined',
      message: `Your counter-offer for "${proposal.jobPosting.title}" was declined.`,
      data: { proposalId: proposal._id, jobId: proposal.jobPosting._id }
    });

    res.status(200).json({
      success: true,
      msg: 'Counter-offer rejected.',
      data: proposal
    });
  } catch (error) {
    console.error('rejectCounterOffer error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  submitProposal,
  getProposalsForJob,
  getMyProposals,
  acceptProposal,
  rejectProposal,
  withdrawProposal,
  // Milestone handlers
  getMilestones,
  submitMilestone,
  approveMilestone,
  rejectMilestone,
  // Counter-offer handlers
  submitCounterOffer,
  acceptCounterOffer,
  rejectCounterOffer
};

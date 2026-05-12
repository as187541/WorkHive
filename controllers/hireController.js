const HireInvitation = require('../models/hireInvitationModel');
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const Project = require('../models/projectModel');
const sendEmail = require('../utils/sendEmail');
const { emitHireInvitation, emitNotification } = require('../utils/socket');
const { logActivity } = require('./activityController');

/**
 * @desc    Send a hire invitation to a user for a specific project
 * @route   POST /api/v1/hires
 * @access  Private (Workspace Admin only)
 */
const sendHireInvitation = async (req, res) => {
  try {
    const { userId, workspaceId, projectId, role = 'Contractor', message = '' } = req.body;

    if (!userId || !workspaceId || !projectId) {
      return res.status(400).json({ msg: 'Please provide userId, workspaceId, and projectId.' });
    }

    // Verify sender is Admin of the workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const senderMember = workspace.members.find(m => m.user.equals(req.user._id));
    if (!senderMember || senderMember.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only workspace Admins can send hire invitations.' });
    }

    // Verify project exists and belongs to workspace
    const project = await Project.findById(projectId);
    if (!project || !project.workspace.equals(workspaceId)) {
      return res.status(404).json({ msg: 'Project not found or does not belong to this workspace.' });
    }

    // Verify invited user exists
    const invitedUser = await User.findById(userId);
    if (!invitedUser) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Check if user is already a member of the workspace
    const alreadyMember = workspace.members.some(m => m.user.equals(userId));
    if (alreadyMember) {
      return res.status(400).json({ msg: 'User is already a member of this workspace.' });
    }

    // Check for existing pending hire invitation for this user+project combo
    const existingInvite = await HireInvitation.findOne({
      workspace: workspaceId,
      project: projectId,
      invitedUser: userId,
      status: 'Pending'
    });

    if (existingInvite) {
      return res.status(400).json({ msg: 'A pending hire invitation already exists for this user and project.' });
    }

    // Create the hire invitation
    const hireInvitation = await HireInvitation.create({
      workspace: workspaceId,
      project: projectId,
      invitedUser: userId,
      sender: req.user._id,
      role,
      message
    });

    // Emit real-time notification to invited user
    emitHireInvitation(userId, hireInvitation);
    emitNotification(userId, {
      type: 'hire_invitation',
      title: 'New Hire Invitation',
      message: `${req.user.name} invited you to join ${workspace.name}`,
      data: { invitationId: hireInvitation._id, workspaceId, projectId }
    });

    // Send email notification to invited user
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/hire-invitations`;
    await sendEmail({
      email: invitedUser.email,
      subject: `You've been invited to join ${workspace.name}`,
      html: `
        <h2>You've Received a Hire Invitation!</h2>
        <p><strong>${req.user.name}</strong> has invited you to join the workspace <strong>${workspace.name}</strong> for the project <strong>${project.name}</strong>.</p>
        <p><strong>Role:</strong> ${role}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
        <p><a href="${acceptUrl}" style="padding: 10px 20px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">View Invitation</a></p>
        <p>This invitation expires in 7 days.</p>
      `
    });

    // Log activity (non-blocking)
    logActivity(req.user._id, 'hire_sent', `${invitedUser.name} to ${workspace.name}`, {
      workspace: workspaceId,
      project: projectId,
      metadata: { invitedUser: userId, role }
    }).catch(err => console.error('Activity log error:', err.message));

    res.status(201).json({
      success: true,
      msg: `Hire invitation sent to ${invitedUser.name}.`,
      data: hireInvitation
    });
  } catch (error) {
    console.error('sendHireInvitation error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all hire invitations sent by the current user
 * @route   GET /api/v1/hires/sent
 * @access  Private
 */
const getSentHireInvitations = async (req, res) => {
  try {
    const invitations = await HireInvitation.find({ sender: req.user._id })
      .populate('invitedUser', 'name avatar email')
      .populate('workspace', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: invitations.length,
      data: invitations
    });
  } catch (error) {
    console.error('getSentHireInvitations error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all pending hire invitations for the current user (talent view)
 * @route   GET /api/v1/hires/received
 * @access  Private
 */
const getReceivedHireInvitations = async (req, res) => {
  try {
    const invitations = await HireInvitation.find({
      invitedUser: req.user._id,
      status: 'Pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('sender', 'name avatar')
      .populate('workspace', 'name description')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: invitations.length,
      data: invitations
    });
  } catch (error) {
    console.error('getReceivedHireInvitations error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Accept a hire invitation
 * @route   PATCH /api/v1/hires/:hireId/accept
 * @access  Private (invited user only)
 */
const acceptHireInvitation = async (req, res) => {
  try {
    const { hireId } = req.params;

    const hireInvitation = await HireInvitation.findById(hireId);
    if (!hireInvitation) {
      return res.status(404).json({ msg: 'Hire invitation not found.' });
    }

    // Verify the current user is the invited user
    if (!hireInvitation.invitedUser.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You are not authorized to accept this invitation.' });
    }

    // Verify status is Pending
    if (hireInvitation.status !== 'Pending') {
      return res.status(400).json({ msg: `This invitation has already been ${hireInvitation.status.toLowerCase()}.` });
    }

    // Verify not expired
    if (hireInvitation.expiresAt && hireInvitation.expiresAt < new Date()) {
      return res.status(400).json({ msg: 'This invitation has expired.' });
    }

    // Add user to workspace.members with the specified role
    const workspace = await Workspace.findById(hireInvitation.workspace);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace no longer exists.' });
    }

    // Check if user is already a member (prevent duplicate)
    const isAlreadyMember = workspace.members.some(m => m.user.equals(req.user._id));
    if (!isAlreadyMember) {
      // Map hire role to valid workspace role (workspace only allows Admin/Collaborator)
      const workspaceRole = hireInvitation.role === 'Admin' ? 'Admin' : 'Collaborator';
      workspace.members.push({
        user: req.user._id,
        role: workspaceRole
      });
      await workspace.save();
    }

    // Add user to project.contractors
    const project = await Project.findById(hireInvitation.project);
    if (project) {
      const isAlreadyContractor = project.contractors?.some(c => c.user.equals(req.user._id));
      if (!isAlreadyContractor) {
        project.contractors.push({
          user: req.user._id,
          role: hireInvitation.role,
          joinedAt: new Date()
        });
        await project.save();
      }
    }

    // Update invitation status
    hireInvitation.status = 'Accepted';
    await hireInvitation.save();

    // Log activity (non-blocking)
    logActivity(req.user._id, 'hire_accepted', `${workspace.name} as ${hireInvitation.role}`, {
      workspace: hireInvitation.workspace,
      project: hireInvitation.project,
      metadata: { invitationId: hireInvitation._id }
    }).catch(err => console.error('Activity log error:', err.message));

    // Update user availability to Busy
    await User.findByIdAndUpdate(req.user._id, { availabilityStatus: 'Busy' });

    // Send confirmation email to sender
    const sender = await User.findById(hireInvitation.sender);
    if (sender) {
      await sendEmail({
        email: sender.email,
        subject: `${req.user.name} accepted your hire invitation`,
        html: `
          <h2>Hire Invitation Accepted</h2>
          <p><strong>${req.user.name}</strong> has accepted your invitation to join <strong>${workspace.name}</strong> for the project <strong>${project?.name || 'N/A'}</strong>.</p>
          <p>They have been added as a <strong>${hireInvitation.role}</strong>.</p>
        `
      });
    }

    res.status(200).json({
      success: true,
      msg: 'You have successfully joined the workspace!',
      data: {
        workspace: workspace.name,
        project: project?.name,
        role: hireInvitation.role
      }
    });
  } catch (error) {
    console.error('acceptHireInvitation error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Reject a hire invitation
 * @route   PATCH /api/v1/hires/:hireId/reject
 * @access  Private (invited user only)
 */
const rejectHireInvitation = async (req, res) => {
  try {
    const { hireId } = req.params;

    const hireInvitation = await HireInvitation.findById(hireId);
    if (!hireInvitation) {
      return res.status(404).json({ msg: 'Hire invitation not found.' });
    }

    if (!hireInvitation.invitedUser.equals(req.user._id)) {
      return res.status(403).json({ msg: 'You are not authorized to reject this invitation.' });
    }

    if (hireInvitation.status !== 'Pending') {
      return res.status(400).json({ msg: `This invitation has already been ${hireInvitation.status.toLowerCase()}.` });
    }

    hireInvitation.status = 'Rejected';
    await hireInvitation.save();

    // Log activity (non-blocking)
    logActivity(req.user._id, 'hire_rejected', `invitation from ${workspace?.name || 'a workspace'}`, {
      workspace: hireInvitation.workspace,
      project: hireInvitation.project,
      metadata: { invitationId: hireInvitation._id }
    }).catch(err => console.error('Activity log error:', err.message));

    // Notify sender
    const sender = await User.findById(hireInvitation.sender);
    const workspace = await Workspace.findById(hireInvitation.workspace);
    if (sender && workspace) {
      await sendEmail({
        email: sender.email,
        subject: `${req.user.name} declined your hire invitation`,
        html: `
          <h2>Hire Invitation Declined</h2>
          <p><strong>${req.user.name}</strong> has declined your invitation to join <strong>${workspace.name}</strong>.</p>
        `
      });
    }

    res.status(200).json({
      success: true,
      msg: 'Invitation rejected.'
    });
  } catch (error) {
    console.error('rejectHireInvitation error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Mark a hire/project as completed
 * @route   PATCH /api/v1/hires/:hireId/complete
 * @access  Private (Workspace Admin only)
 */
const completeHire = async (req, res) => {
  try {
    const { hireId } = req.params;

    const hireInvitation = await HireInvitation.findById(hireId);
    if (!hireInvitation) {
      return res.status(404).json({ msg: 'Hire invitation not found.' });
    }

    // Verify sender is Admin of the workspace
    const workspace = await Workspace.findById(hireInvitation.workspace);
    const senderMember = workspace?.members.find(m => m.user.equals(req.user._id));
    if (!senderMember || senderMember.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only workspace Admins can complete a hire.' });
    }

    if (hireInvitation.status !== 'Accepted') {
      return res.status(400).json({ msg: 'Only accepted hires can be marked as completed.' });
    }

    // Update invitation status
    hireInvitation.status = 'Completed';
    await hireInvitation.save();

    // Update project status if needed
    const project = await Project.findById(hireInvitation.project);
    if (project && project.status === 'Active') {
      project.status = 'Completed';
      await project.save();
    }

    // Increment contractor's completed projects count
    await User.findByIdAndUpdate(hireInvitation.invitedUser, {
      $inc: { totalCompletedProjects: 1 },
      availabilityStatus: 'Open to work'
    });

    res.status(200).json({
      success: true,
      msg: 'Hire marked as completed. You can now leave a rating.',
      data: hireInvitation
    });
  } catch (error) {
    console.error('completeHire error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Cancel a pending hire invitation
 * @route   DELETE /api/v1/hires/:hireId
 * @access  Private (Workspace Admin only)
 */
const cancelHireInvitation = async (req, res) => {
  try {
    const { hireId } = req.params;

    const hireInvitation = await HireInvitation.findById(hireId);
    if (!hireInvitation) {
      return res.status(404).json({ msg: 'Hire invitation not found.' });
    }

    // Verify sender is Admin of the workspace
    const workspace = await Workspace.findById(hireInvitation.workspace);
    const senderMember = workspace?.members.find(m => m.user.equals(req.user._id));
    if (!senderMember || senderMember.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only workspace Admins can cancel hire invitations.' });
    }

    if (hireInvitation.status !== 'Pending') {
      return res.status(400).json({ msg: 'Only pending invitations can be cancelled.' });
    }

    await HireInvitation.findByIdAndDelete(hireId);

    res.status(200).json({
      success: true,
      msg: 'Hire invitation cancelled.'
    });
  } catch (error) {
    console.error('cancelHireInvitation error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  sendHireInvitation,
  getSentHireInvitations,
  getReceivedHireInvitations,
  acceptHireInvitation,
  rejectHireInvitation,
  completeHire,
  cancelHireInvitation
};

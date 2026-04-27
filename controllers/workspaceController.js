// controllers/workspaceController.js

const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');
const Invitation = require('../models/invitationModel');

/**
 * @desc    Create a new workspace
 */
const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ msg: 'Please provide a workspace name.' });

    const newWorkspace = await Workspace.create({
      name,
      description,
      members: [{ user: req.user._id, role: 'Admin' }], 
    });

    res.status(201).json(newWorkspace);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all workspaces for the logged-in user
 */
const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user._id });
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get a single workspace by ID
 */
const getWorkspaceById = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });

    if (!workspace.members.some(m => m.user.equals(req.user._id))) {
      return res.status(403).json({ msg: 'You are not authorized to view this workspace.' });
    }

    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Invite a user (Creates a PENDING invitation)
 */
const inviteMember = async (req, res) => {
  try {
    const { email } = req.body;
    const { workspaceId } = req.params;

    const userToInvite = await User.findOne({ email });
    if (!userToInvite) return res.status(404).json({ msg: 'User not found.' });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });

    const inviter = workspace.members.find(m => m.user.equals(req.user._id));
    if (!inviter || inviter.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only Admins can invite members.' });
    }

    if (workspace.members.some(m => m.user.equals(userToInvite._id))) {
      return res.status(400).json({ msg: 'User is already a member.' });
    }

    const existingInvite = await Invitation.findOne({ 
      workspace: workspaceId, 
      invitedUser: userToInvite._id, 
      status: 'Pending' 
    });

    if (existingInvite) return res.status(400).json({ msg: 'Invitation already sent.' });

    await Invitation.create({
      workspace: workspaceId,
      invitedUser: userToInvite._id,
      sender: req.user._id
    });

    res.status(200).json({ msg: `Invitation sent to ${userToInvite.name}.` });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get pending invitations for the logged-in user
 */
const getMyInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ 
      invitedUser: req.user._id, 
      status: 'Pending' 
    })
    .populate('workspace', 'name')
    .populate('sender', 'name');

    res.status(200).json(invitations);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Accept a workspace invitation
 */
const acceptInvitation = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const invite = await Invitation.findById(inviteId);

    if (!invite || !invite.invitedUser.equals(req.user._id)) {
      return res.status(404).json({ msg: 'Invitation not found.' });
    }

    const workspace = await Workspace.findById(invite.workspace);
    if (!workspace) return res.status(404).json({ msg: 'Workspace no longer exists.' });

    workspace.members.push({ user: req.user._id, role: 'Collaborator' });
    await workspace.save();

    invite.status = 'Accepted';
    await invite.save();

    res.status(200).json({ msg: 'Joined workspace!' });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Remove a collaborator (Admin Only)
 */
const removeMember = async (req, res) => {
  try {
    const { workspaceId, userId } = req.params;
    const workspace = await Workspace.findById(workspaceId);

    const requester = workspace.members.find(m => m.user.equals(req.user._id));
    if (!requester || requester.role !== 'Admin') {
      return res.status(403).json({ msg: 'Only Admins can remove members.' });
    }

    workspace.members = workspace.members.filter(m => m.user.toString() !== userId);
    await workspace.save();

    res.status(200).json({ msg: 'Member removed successfully.' });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all members of a workspace
 */
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId).populate('members.user', 'name email avatar');
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });
    res.status(200).json(workspace.members.filter(m => m.user !== null));
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete or Leave a workspace
 */
const deleteOrLeaveWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

    const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));
    if (!memberRecord) return res.status(403).json({ msg: 'Not a member' });

    if (memberRecord.role === 'Admin') {
      await workspace.deleteOne();
      return res.status(200).json({ msg: 'Workspace deleted.' });
    } else {
      workspace.members = workspace.members.filter(m => !m.user.equals(req.user._id));
      await workspace.save();
      return res.status(200).json({ msg: 'Left workspace.' });
    }
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

// --- CORRECT EXPORT BLOCK ---
module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  inviteMember,
  getMyInvitations,
  acceptInvitation,
  removeMember,
  getWorkspaceMembers,
  deleteOrLeaveWorkspace
};
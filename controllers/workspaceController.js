// controllers/workspaceController.js

const Workspace = require('../models/workspaceModel');
const User = require('../models/userModel');

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
 * @desc    Invite a user to a workspace
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

    workspace.members.push({ user: userToInvite._id, role: 'Collaborator' });
    await workspace.save();

    res.status(200).json({ msg: `Successfully invited ${userToInvite.name}.` });
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all members of a workspace
 */
const getWorkspaceMembers = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId).populate('members.user', 'name email');
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found.' });
    const activeMembers = workspace.members.filter(m => m.user !== null);
    res.status(200).json(activeMembers);
  } catch (error) {
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete or Leave a workspace
 * @route   DELETE /api/v1/workspaces/:workspaceId
 */
const deleteOrLeaveWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ msg: 'Workspace not found' });

    // Find the person making the request in the members list
    const memberRecord = workspace.members.find(m => m.user.equals(req.user._id));
    
    if (!memberRecord) {
      return res.status(403).json({ msg: 'You are not a member of this workspace' });
    }

    // --- STRICK LOGIC ---
    if (memberRecord.role === 'Admin') {
      // ONLY the Admin (Creator) can trigger a full database deletion
      await workspace.deleteOne();
      return res.status(200).json({ msg: 'Workspace and all its data have been permanently deleted.' });
    } else {
      // Collaborators can ONLY "Leave" (removes them from the array)
      workspace.members = workspace.members.filter(m => !m.user.equals(req.user._id));
      await workspace.save();
      return res.status(200).json({ msg: 'You have successfully left the workspace.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// --- ONE SINGLE EXPORT BLOCK ---
module.exports = {
  createWorkspace,
  getWorkspaces,
  getWorkspaceById,
  inviteMember,
  getWorkspaceMembers,
  deleteOrLeaveWorkspace // <--- Now this will be defined!
};
const User = require('../models/userModel');
const Workspace = require('../models/workspaceModel');
const { emitNotification } = require('../utils/socket');

/**
 * @desc    Transfer tokens between users within a workspace
 * @route   POST /api/v1/transfers
 * @access  Private
 */
const transferTokens = async (req, res) => {
  try {
    const { recipientId, workspaceId, amount, reason } = req.body;

    if (!recipientId || !workspaceId || !amount) {
      return res.status(400).json({ msg: 'Please provide recipient, workspace, and amount.' });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({ msg: 'Amount must be a positive number.' });
    }

    // Prevent self-transfer
    if (String(recipientId) === String(req.user._id)) {
      return res.status(400).json({ msg: 'You cannot transfer tokens to yourself.' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    // Verify both users are workspace members
    const senderMember = workspace.members.find(
      m => m.user && String(m.user) === String(req.user._id)
    );
    const recipientMember = workspace.members.find(
      m => m.user && String(m.user) === String(recipientId)
    );

    if (!senderMember) {
      return res.status(403).json({ msg: 'You are not a member of this workspace.' });
    }
    if (!recipientMember) {
      return res.status(404).json({ msg: 'Recipient is not a member of this workspace.' });
    }

    const sender = await User.findById(req.user._id);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Check sender's workspace balance
    const senderWsEntry = sender.wallet.workspaces.find(
      w => w.workspace && String(w.workspace) === String(workspaceId)
    );
    const senderBalance = senderWsEntry ? senderWsEntry.balance : 0;

    if (senderBalance < transferAmount) {
      return res.status(400).json({ msg: `Insufficient balance. You have ${senderBalance} HT in this workspace.` });
    }

    // Admin oversight for large transfers (e.g., > 1000 HT)
    const LARGE_TRANSFER_THRESHOLD = 1000;
    if (transferAmount >= LARGE_TRANSFER_THRESHOLD && senderMember.role !== 'Admin') {
      return res.status(403).json({ msg: 'Transfers of 1000+ HT require admin approval.' });
    }

    // Deduct from sender
    if (senderWsEntry) {
      senderWsEntry.balance -= transferAmount;
    }
    sender.wallet.balance -= transferAmount;
    sender.wallet.history.push({
      amount: -transferAmount,
      reason: `Transfer to ${recipient.name}: ${reason || 'No reason'}`,
      workspace: workspaceId,
      date: new Date()
    });
    if (sender.wallet.history.length > 500) {
      sender.wallet.history = sender.wallet.history.slice(-500);
    }

    // Credit recipient
    const recipientWsEntry = recipient.wallet.workspaces.find(
      w => w.workspace && String(w.workspace) === String(workspaceId)
    );
    if (recipientWsEntry) {
      recipientWsEntry.balance += transferAmount;
    } else {
      recipient.wallet.workspaces.push({
        workspace: workspaceId,
        balance: transferAmount
      });
    }
    recipient.wallet.balance += transferAmount;
    recipient.wallet.history.push({
      amount: transferAmount,
      reason: `Transfer from ${sender.name}: ${reason || 'No reason'}`,
      workspace: workspaceId,
      date: new Date()
    });
    if (recipient.wallet.history.length > 500) {
      recipient.wallet.history = recipient.wallet.history.slice(-500);
    }

    await Promise.all([sender.save(), recipient.save()]);

    // Notify recipient
    emitNotification(recipientId, {
      type: 'token_transfer',
      title: 'Tokens Received',
      message: `${sender.name} sent you ${transferAmount} HT${reason ? `: ${reason}` : ''}`,
      data: { amount: transferAmount, workspaceId, senderId: sender._id }
    });

    res.status(200).json({
      success: true,
      msg: `Successfully transferred ${transferAmount} HT to ${recipient.name}.`,
      data: {
        amount: transferAmount,
        recipient: { _id: recipient._id, name: recipient.name },
        workspace: { _id: workspace._id, name: workspace.name },
        reason: reason || ''
      }
    });
  } catch (error) {
    console.error('transferTokens error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get transfer history for current user
 * @route   GET /api/v1/transfers/history
 * @access  Private
 */
const getTransferHistory = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    let history = user.wallet.history || [];

    if (workspaceId) {
      history = history.filter(h => h.workspace && String(h.workspace) === String(workspaceId));
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('getTransferHistory error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  transferTokens,
  getTransferHistory
};

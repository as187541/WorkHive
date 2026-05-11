const mongoose = require('mongoose');
const Rating = require('../models/ratingModel');
const User = require('../models/userModel');
const Project = require('../models/projectModel');
const Workspace = require('../models/workspaceModel');
const sendEmail = require('../utils/sendEmail');

/**
 * @desc    Create a new rating for a contractor
 * @route   POST /api/v1/ratings
 * @access  Private (Workspace Admin/Lead only)
 */
const createRating = async (req, res) => {
  try {
    const { rateeId, projectId, workspaceId, score, review = '' } = req.body;

    if (!rateeId || !projectId || !workspaceId || !score) {
      return res.status(400).json({ msg: 'Please provide rateeId, projectId, workspaceId, and score.' });
    }

    // Validate score range
    const numericScore = Number(score);
    if (numericScore < 1 || numericScore > 5) {
      return res.status(400).json({ msg: 'Score must be between 1 and 5.' });
    }

    // Prevent self-rating
    if (rateeId === req.user._id.toString()) {
      return res.status(400).json({ msg: 'You cannot rate yourself.' });
    }

    // Verify workspace exists and rater is Admin or Lead
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ msg: 'Workspace not found.' });
    }

    const raterMember = workspace.members.find(m => m.user.equals(req.user._id));
    if (!raterMember || !['Admin', 'Lead'].includes(raterMember.role)) {
      return res.status(403).json({ msg: 'Only workspace Admins or Leads can leave ratings.' });
    }

    // Verify project exists, belongs to workspace, and is completed
    const project = await Project.findById(projectId);
    if (!project || !project.workspace.equals(workspaceId)) {
      return res.status(404).json({ msg: 'Project not found or does not belong to this workspace.' });
    }

    if (project.status !== 'Completed' && !project.completedAt) {
      return res.status(400).json({ msg: 'You can only rate after the project is marked as completed.' });
    }

    // Verify ratee was a contractor in this project
    const wasContractor = project.contractors.some(c => c.user.equals(rateeId));
    if (!wasContractor) {
      return res.status(400).json({ msg: 'This user was not a contractor on this project.' });
    }

    // Check for duplicate rating
    const existingRating = await Rating.findOne({
      rater: req.user._id,
      ratee: rateeId,
      project: projectId
    });

    if (existingRating) {
      return res.status(400).json({ msg: 'You have already rated this user for this project.' });
    }

    // Create the rating
    const rating = await Rating.create({
      rater: req.user._id,
      ratee: rateeId,
      project: projectId,
      workspace: workspaceId,
      score: numericScore,
      review
    });

    // Recalculate ratee's average rating
    const stats = await Rating.aggregate([
      { $match: { ratee: new mongoose.Types.ObjectId(rateeId) } },
      {
        $group: {
          _id: '$ratee',
          averageScore: { $avg: '$score' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    if (stats.length > 0) {
      await User.findByIdAndUpdate(rateeId, {
        ratingAverage: Number(stats[0].averageScore.toFixed(2)),
        totalCompletedProjects: stats[0].totalRatings
      });
    }

    // Send email notification to ratee
    const ratee = await User.findById(rateeId);
    if (ratee) {
      await sendEmail({
        email: ratee.email,
        subject: 'You received a new rating!',
        html: `
          <h2>New Rating Received</h2>
          <p>You received a <strong>${numericScore}-star</strong> rating from <strong>${req.user.name}</strong> for the project <strong>${project.name}</strong>.</p>
          ${review ? `<p><strong>Review:</strong> "${review}"</p>` : ''}
          <p>Your new average rating is <strong>${stats[0]?.averageScore?.toFixed(2) || numericScore}</strong>.</p>
        `
      });
    }

    res.status(201).json({
      success: true,
      msg: 'Rating submitted successfully.',
      data: rating
    });
  } catch (error) {
    console.error('createRating error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get aggregated rating stats for a user
 * @route   GET /api/v1/ratings/user/:userId
 * @access  Private
 */
const getUserRatingStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await Rating.aggregate([
      { $match: { ratee: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$ratee',
          averageScore: { $avg: '$score' },
          totalRatings: { $sum: 1 },
          scores: { $push: '$score' }
        }
      }
    ]);

    let distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0 && stats[0].scores) {
      stats[0].scores.forEach(s => { distribution[s] = (distribution[s] || 0) + 1; });
    }

    res.status(200).json({
      success: true,
      stats: stats.length > 0 ? {
        averageScore: Number(stats[0].averageScore.toFixed(2)),
        totalRatings: stats[0].totalRatings,
        distribution
      } : { averageScore: 0, totalRatings: 0, distribution }
    });
  } catch (error) {
    console.error('getUserRatingStats error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all ratings for a specific project
 * @route   GET /api/v1/ratings/project/:projectId
 * @access  Private
 */
const getProjectRatings = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [ratings, total] = await Promise.all([
      Rating.find({ project: projectId })
        .populate('rater', 'name avatar')
        .populate('ratee', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Rating.countDocuments({ project: projectId })
    ]);

    res.status(200).json({
      success: true,
      count: ratings.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: ratings
    });
  } catch (error) {
    console.error('getProjectRatings error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createRating,
  getUserRatingStats,
  getProjectRatings
};

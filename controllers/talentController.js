const mongoose = require('mongoose');
const User = require('../models/userModel');
const Rating = require('../models/ratingModel');

/**
 * @desc    Browse talent profiles with filters, sorting, and pagination
 * @route   GET /api/v1/talent
 * @access  Private (any authenticated user)
 */
const browseTalent = async (req, res) => {
  try {
    const { skills, minRating, availability, search, sort, page = 1, limit = 12 } = req.query;
    const query = {};

    // Filter by skills (comma-separated)
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillArray.length > 0) {
        query.skills = { $in: skillArray.map(s => new RegExp(`^${s}$`, 'i')) };
      }
    }

    // Filter by minimum rating
    if (minRating) {
      query.ratingAverage = { $gte: Number(minRating) };
    }

    // Filter by availability status
    if (availability) {
      query.availabilityStatus = availability;
    }

    // Text search on name and bio
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    let sortOption = {};
    if (sort === 'rating') {
      sortOption = { ratingAverage: -1 };
    } else if (sort === 'projects') {
      sortOption = { totalCompletedProjects: -1 };
    } else if (sort === 'name') {
      sortOption = { name: 1 };
    } else {
      sortOption = { ratingAverage: -1, totalCompletedProjects: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [talent, totalCount] = await Promise.all([
      User.find(query)
        .select('name avatar bio skills ratingAverage totalCompletedProjects availabilityStatus portfolio hourlyRate')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      count: talent.length,
      total: totalCount,
      page: Number(page),
      pages: Math.ceil(totalCount / Number(limit)),
      data: talent
    });
  } catch (error) {
    console.error('browseTalent error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get detailed public profile of a specific talent
 * @route   GET /api/v1/talent/:userId
 * @access  Private
 */
const getTalentProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('name avatar bio skills ratingAverage totalCompletedProjects availabilityStatus portfolio hourlyRate createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Fetch recent ratings (last 10)
    const recentRatings = await Rating.find({ ratee: userId })
      .populate('rater', 'name avatar')
      .populate('project', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        ...user,
        recentRatings
      }
    });
  } catch (error) {
    console.error('getTalentProfile error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all ratings for a specific user
 * @route   GET /api/v1/talent/:userId/ratings
 * @access  Private
 */
const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [ratings, total] = await Promise.all([
      Rating.find({ ratee: userId })
        .populate('rater', 'name avatar')
        .populate('project', 'name')
        .populate('workspace', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Rating.countDocuments({ ratee: userId })
    ]);

    // Calculate aggregate stats
    const stats = await Rating.aggregate([
      { $match: { ratee: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$score' },
          totalRatings: { $sum: 1 },
          distribution: {
            $push: '$score'
          }
        }
      }
    ]);

    let distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0 && stats[0].distribution) {
      stats[0].distribution.forEach(score => {
        distribution[score] = (distribution[score] || 0) + 1;
      });
    }

    res.status(200).json({
      success: true,
      count: ratings.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      stats: stats.length > 0 ? {
        averageScore: Number(stats[0].averageScore.toFixed(2)),
        totalRatings: stats[0].totalRatings,
        distribution
      } : { averageScore: 0, totalRatings: 0, distribution },
      data: ratings
    });
  } catch (error) {
    console.error('getUserRatings error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  browseTalent,
  getTalentProfile,
  getUserRatings
};

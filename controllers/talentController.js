const mongoose = require('mongoose');
const User = require('../models/userModel');
const Rating = require('../models/ratingModel');
const Activity = require('../models/activityModel');
const { getCombinedRecommendations } = require('../utils/recommendations');

/**
 * @desc    Browse talent profiles with filters, sorting, and pagination
 * @route   GET /api/v1/talent
 * @access  Private (any authenticated user)
 *
 * Query params:
 *   skills      — comma-separated skills (AND match: ALL skills must be present)
 *   minRating   — minimum ratingAverage filter
 *   availability — availabilityStatus filter
 *   search      — text search on name and bio
 *   sort        — rating | projects | name | relevance | newest | hourlyRate
 *   lastActive  — filter by last activity: 24h | 7d | 30d
 *   page, limit — pagination
 */
const browseTalent = async (req, res) => {
  try {
    const { skills, minRating, availability, search, sort, lastActive, page = 1, limit = 12 } = req.query;
    const query = {};

    // Filter by skills — AND matching: ALL selected skills must be present
    if (skills) {
      const skillArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillArray.length > 0) {
        query.skills = { $all: skillArray.map(s => new RegExp(`^${s}$`, 'i')) };
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

    // Filter by last active (using Activity model)
    let lastActiveDate = null;
    if (lastActive) {
      const now = new Date();
      if (lastActive === '24h') lastActiveDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (lastActive === '7d') lastActiveDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (lastActive === '30d') lastActiveDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Sorting
    let sortOption = {};
    if (sort === 'rating') {
      sortOption = { ratingAverage: -1 };
    } else if (sort === 'projects') {
      sortOption = { totalCompletedProjects: -1 };
    } else if (sort === 'name') {
      sortOption = { name: 1 };
    } else if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'hourlyRate') {
      sortOption = { hourlyRate: 1 };
    } else {
      sortOption = { ratingAverage: -1, totalCompletedProjects: -1 };
    }

    const skip = (Number(page) - 1) * Number(limit);

    // If lastActive filter is set, find user IDs with recent activity first
    let activeUserIds = null;
    if (lastActiveDate) {
      const activeUsers = await Activity.aggregate([
        { $match: { createdAt: { $gte: lastActiveDate } } },
        { $group: { _id: '$user' } }
      ]);
      activeUserIds = activeUsers.map(u => u._id);
      if (activeUserIds.length === 0) {
        // No users match the lastActive filter — return empty
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          page: Number(page),
          pages: 0,
          data: []
        });
      }
      query._id = { $in: activeUserIds };
    }

    const [talent, totalCount] = await Promise.all([
      User.find(query)
        .select('name avatar bio skills ratingAverage totalCompletedProjects availabilityStatus portfolio hourlyRate createdAt')
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query)
    ]);

    // Compute matchScore for each talent result when skills filter is active
    const searchedSkills = skills
      ? skills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    // Fetch lastActive for each talent
    const talentIds = talent.map(t => t._id);
    const lastActivityMap = {};
    if (talentIds.length > 0) {
      const activities = await Activity.aggregate([
        { $match: { user: { $in: talentIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$user', lastActive: { $first: '$createdAt' } } }
      ]);
      activities.forEach(a => {
        lastActivityMap[a._id.toString()] = a.lastActive;
      });
    }

    // Enrich talent data with matchScore and lastActive
    const enrichedTalent = talent.map(t => {
      const result = { ...t };

      // Compute match score
      if (searchedSkills.length > 0) {
        const userSkills = (t.skills || []).map(s => s.toLowerCase());
        const matchCount = searchedSkills.filter(s =>
          userSkills.some(us => us === s)
        ).length;
        result.matchScore = Math.round((matchCount / searchedSkills.length) * 100);
      } else {
        result.matchScore = null;
      }

      // Add lastActive timestamp
      result.lastActive = lastActivityMap[t._id.toString()] || null;

      return result;
    });

    // If sorting by relevance, sort by matchScore desc, then ratingAverage desc, then lastActive desc
    if (sort === 'relevance') {
      enrichedTalent.sort((a, b) => {
        const scoreA = a.matchScore ?? 0;
        const scoreB = b.matchScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
        const activeA = a.lastActive ? new Date(a.lastActive).getTime() : 0;
        const activeB = b.lastActive ? new Date(b.lastActive).getTime() : 0;
        return activeB - activeA;
      });
    }

    res.status(200).json({
      success: true,
      count: enrichedTalent.length,
      total: totalCount,
      page: Number(page),
      pages: Math.ceil(totalCount / Number(limit)),
      data: enrichedTalent
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

/**
 * @desc    Get personalized talent recommendations for the authenticated user
 * @route   GET /api/v1/talent/recommendations
 * @access  Private
 *
 * Query params:
 *   limit — number of recommendations to return (default 10, max 50)
 *   type  — skill | connection | hire | combined (default combined)
 */
const getRecommendations = async (req, res) => {
  try {
    const { limit = 10, type = 'combined' } = req.query;
    const parsedLimit = Math.min(Math.max(Number(limit), 1), 50);
    const userId = req.user._id;

    let recommendations;

    switch (type) {
      case 'skill':
        recommendations = await getCombinedRecommendations(userId, parsedLimit, { skill: 1, connection: 0, hire: 0 });
        break;
      case 'connection':
        recommendations = await getCombinedRecommendations(userId, parsedLimit, { skill: 0, connection: 1, hire: 0 });
        break;
      case 'hire':
        recommendations = await getCombinedRecommendations(userId, parsedLimit, { skill: 0, connection: 0, hire: 1 });
        break;
      default: // combined
        recommendations = await getCombinedRecommendations(userId, parsedLimit, { skill: 0.5, connection: 0.3, hire: 0.2 });
        break;
    }

    res.status(200).json({
      success: true,
      count: recommendations.length,
      data: recommendations
    });
  } catch (error) {
    console.error('getRecommendations error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  browseTalent,
  getTalentProfile,
  getUserRatings,
  getRecommendations
};

// utils/recommendations.js
// Talent recommendation engine combining skill-based, connection-based, and hire-based signals

const mongoose = require('mongoose');
const User = require('../models/userModel');
const Connection = require('../models/connectionModel');
const HireInvitation = require('../models/hireInvitationModel');
const Activity = require('../models/activityModel');

/**
 * Skill-based recommendations: Find users whose skills overlap with the current user's skills.
 * Score = (number of matching skills / total skills of recommended user) * weight
 * This prioritizes specialists who share skills with the current user.
 */
const skillBasedRecommendations = async (userId, limit = 10) => {
  const user = await User.findById(userId).select('skills').lean();
  if (!user || !user.skills || user.skills.length === 0) return [];

  const userSkills = user.skills.map(s => s.toLowerCase());

  // Find users who share at least one skill, excluding the current user
  const candidates = await User.find({
    _id: { $ne: userId },
    skills: { $in: userSkills.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) }
  })
    .select('name avatar bio skills ratingAverage totalCompletedProjects availabilityStatus portfolio hourlyRate')
    .lean();

  // Score each candidate by skill overlap
  const scored = candidates.map(candidate => {
    const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
    const matchingSkills = candidateSkills.filter(cs => userSkills.includes(cs));
    const overlapRatio = matchingSkills.length / Math.max(candidateSkills.length, 1);
    const matchScore = Math.round(overlapRatio * 100);

    return {
      ...candidate,
      matchScore,
      recommendationType: 'skill',
      recommendationReason: `Shares ${matchingSkills.length} skill${matchingSkills.length !== 1 ? 's' : ''} with you`
    };
  });

  // Sort by matchScore desc, then ratingAverage desc
  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.ratingAverage || 0) - (a.ratingAverage || 0);
  });

  return scored.slice(0, limit);
};

/**
 * Connection-based recommendations: Find 2nd-degree connections (friends of friends).
 * Score = number of mutual connections.
 */
const connectionBasedRecommendations = async (userId, limit = 10) => {
  // Get the current user's accepted connections
  const myConnections = await Connection.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { recipient: userId, status: 'accepted' }
    ]
  }).lean();

  const myConnectionIds = myConnections.map(c =>
    String(c.requester) === String(userId) ? c.recipient : c.requester
  );

  if (myConnectionIds.length === 0) return [];

  // Find connections of my connections (2nd degree)
  const secondDegreeConnections = await Connection.find({
    $or: [
      { requester: { $in: myConnectionIds }, status: 'accepted' },
      { recipient: { $in: myConnectionIds }, status: 'accepted' }
    ]
  }).lean();

  // Count mutual connections for each 2nd-degree user
  const mutualCount = {};
  for (const conn of secondDegreeConnections) {
    const otherUserId = String(conn.requester) === String(userId) || myConnectionIds.includes(String(conn.requester))
      ? (String(conn.recipient) === String(userId) || myConnectionIds.includes(String(conn.recipient))
        ? null // Skip if both are the user or direct connections
        : String(conn.recipient))
      : String(conn.requester);

    if (!otherUserId) continue;
    if (String(otherUserId) === String(userId)) continue;
    if (myConnectionIds.includes(String(otherUserId))) continue; // Skip direct connections

    mutualCount[otherUserId] = (mutualCount[otherUserId] || 0) + 1;
  }

  const secondDegreeIds = Object.keys(mutualCount);
  if (secondDegreeIds.length === 0) return [];

  // Fetch user details for 2nd-degree connections
  const users = await User.find({
    _id: { $in: secondDegreeIds }
  })
    .select('name avatar bio skills ratingAverage totalCompletedProjects availabilityStatus portfolio hourlyRate')
    .lean();

  const scored = users.map(user => ({
    ...user,
    matchScore: Math.min(Math.round((mutualCount[String(user._id)] / myConnectionIds.length) * 100), 100),
    recommendationType: 'connection',
    recommendationReason: `${mutualCount[String(user._id)]} mutual connection${mutualCount[String(user._id)] !== 1 ? 's' : ''}`
  }));

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.ratingAverage || 0) - (a.ratingAverage || 0);
  });

  return scored.slice(0, limit);
};

/**
 * Hire-based recommendations: Find talent who were hired by people who also hired similar talent.
 * Score based on hire frequency and rating.
 */
const hireBasedRecommendations = async (userId, limit = 10) => {
  // Find hires where the current user was the sender (they hired people)
  const myHires = await HireInvitation.find({
    sender: userId,
    status: { $in: ['Accepted', 'Completed'] }
  }).lean();

  const myHiredIds = myHires.map(h => h.invitedUser);

  if (myHiredIds.length === 0) return [];

  // Find other hires by the same senders who also hired similar people
  // Find other people who were hired by the same senders
  const similarHires = await HireInvitation.find({
    sender: userId,
    status: { $in: ['Accepted', 'Completed'] }
  }).lean();

  // Find hires by other users who hired the same people I hired
  const otherHires = await HireInvitation.find({
    invitedUser: { $in: myHiredIds },
    status: { $in: ['Accepted', 'Completed'] }
  }).lean();

  // Count how many times each talent was hired
  const hireCount = {};
  for (const hire of otherHires) {
    const hiredUserId = String(hire.invitedUser);
    if (hiredUserId === String(userId)) continue;
    hireCount[hiredUserId] = (hireCount[hiredUserId] || 0) + 1;
  }

  const candidateIds = Object.keys(hireCount);
  if (candidateIds.length === 0) return [];

  // Fetch user details
  const users = await User.find({
    _id: { $in: candidateIds }
  })
    .select('name avatar bio skills ratingAverage totalCompletedProjects availabilityStatus portfolio hourlyRate')
    .lean();

  const maxHires = Math.max(...Object.values(hireCount), 1);

  const scored = users.map(user => ({
    ...user,
    matchScore: Math.round((hireCount[String(user._id)] / maxHires) * 100),
    recommendationType: 'hire',
    recommendationReason: `Hired by ${hireCount[String(user._id)]} similar hirer${hireCount[String(user._id)] !== 1 ? 's' : ''}`
  }));

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.ratingAverage || 0) - (a.ratingAverage || 0);
  });

  return scored.slice(0, limit);
};

/**
 * Combined recommendations: Weighted blend of skill-based, connection-based, and hire-based signals.
 * Default weights: skill 0.5, connection 0.3, hire 0.2
 * Deduplicates by user ID and sorts by combined score.
 */
const getCombinedRecommendations = async (userId, limit = 10, weights = { skill: 0.5, connection: 0.3, hire: 0.2 }) => {
  const [skillRecs, connectionRecs, hireRecs] = await Promise.all([
    weights.skill > 0 ? skillBasedRecommendations(userId, limit * 3) : Promise.resolve([]),
    weights.connection > 0 ? connectionBasedRecommendations(userId, limit * 3) : Promise.resolve([]),
    weights.hire > 0 ? hireBasedRecommendations(userId, limit * 3) : Promise.resolve([])
  ]);

  // Merge and deduplicate by user ID, computing weighted combined score
  const userMap = new Map();

  const addRecs = (recs, weight) => {
    for (const rec of recs) {
      const id = String(rec._id);
      if (userMap.has(id)) {
        const existing = userMap.get(id);
        existing.combinedScore += (rec.matchScore || 0) * weight;
        // Keep the highest matchScore for display
        if ((rec.matchScore || 0) > (existing.matchScore || 0)) {
          existing.matchScore = rec.matchScore;
          existing.recommendationType = rec.recommendationType;
          existing.recommendationReason = rec.recommendationReason;
        }
      } else {
        userMap.set(id, {
          ...rec,
          combinedScore: (rec.matchScore || 0) * weight,
          matchScore: rec.matchScore || 0,
          recommendationType: rec.recommendationType,
          recommendationReason: rec.recommendationReason
        });
      }
    }
  };

  addRecs(skillRecs, weights.skill);
  addRecs(connectionRecs, weights.connection);
  addRecs(hireRecs, weights.hire);

  // Convert to array and sort by combined score
  const results = Array.from(userMap.values());
  results.sort((a, b) => {
    if (b.combinedScore !== a.combinedScore) return b.combinedScore - a.combinedScore;
    return (b.ratingAverage || 0) - (a.ratingAverage || 0);
  });

  // Normalize matchScore to 0-100 based on combined score
  const maxCombined = results.length > 0 ? results[0].combinedScore : 1;
  for (const r of results) {
    r.matchScore = maxCombined > 0 ? Math.round((r.combinedScore / maxCombined) * 100) : 0;
    delete r.combinedScore;
  }

  return results.slice(0, limit);
};

module.exports = {
  skillBasedRecommendations,
  connectionBasedRecommendations,
  hireBasedRecommendations,
  getCombinedRecommendations
};
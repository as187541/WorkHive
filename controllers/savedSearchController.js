// controllers/savedSearchController.js
const SavedSearch = require('../models/savedSearchModel');

/**
 * @desc    Create a new saved search
 * @route   POST /api/v1/talent/saved-searches
 * @access  Private
 */
const createSavedSearch = async (req, res) => {
  try {
    const { name, filters } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ msg: 'Please provide a name for this search.' });
    }

    // Limit saved searches per user to 20
    const existingCount = await SavedSearch.countDocuments({ user: req.user._id });
    if (existingCount >= 20) {
      return res.status(400).json({ msg: 'You can only save up to 20 searches. Please delete some before adding new ones.' });
    }

    const savedSearch = await SavedSearch.create({
      user: req.user._id,
      name: name.trim(),
      filters: filters || {}
    });

    res.status(201).json({
      success: true,
      data: savedSearch
    });
  } catch (error) {
    console.error('createSavedSearch error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Get all saved searches for the authenticated user
 * @route   GET /api/v1/talent/saved-searches
 * @access  Private
 */
const getSavedSearches = async (req, res) => {
  try {
    const searches = await SavedSearch.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: searches.length,
      data: searches
    });
  } catch (error) {
    console.error('getSavedSearches error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

/**
 * @desc    Delete a saved search
 * @route   DELETE /api/v1/talent/saved-searches/:id
 * @access  Private
 */
const deleteSavedSearch = async (req, res) => {
  try {
    const { id } = req.params;

    const savedSearch = await SavedSearch.findOne({
      _id: id,
      user: req.user._id
    });

    if (!savedSearch) {
      return res.status(404).json({ msg: 'Saved search not found.' });
    }

    await savedSearch.deleteOne();

    res.status(200).json({
      success: true,
      msg: 'Saved search deleted successfully.'
    });
  } catch (error) {
    console.error('deleteSavedSearch error:', error);
    res.status(500).json({ msg: 'Server Error' });
  }
};

module.exports = {
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch
};
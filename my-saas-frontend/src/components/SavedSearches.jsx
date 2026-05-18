import React, { useState, useEffect, useRef } from 'react';
import { FiBookmark, FiTrash2, FiChevronDown, FiX, FiSave } from 'react-icons/fi';
import api from '../services/api';

const SavedSearches = ({ currentFilters, onApplySearch }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchSavedSearches();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowSaveForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSavedSearches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/talent/saved-searches');
      setSavedSearches(res.data.data || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!searchName.trim()) return;
    try {
      await api.post('/talent/saved-searches', {
        name: searchName.trim(),
        filters: currentFilters
      });
      setSearchName('');
      setShowSaveForm(false);
      fetchSavedSearches();
    } catch (err) {
      console.error('Failed to save search:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/talent/saved-searches/${id}`);
      setSavedSearches(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('Failed to delete search:', err);
    }
  };

  const handleApply = (search) => {
    onApplySearch(search.filters);
    setIsOpen(false);
  };

  const getFilterSummary = (filters) => {
    const parts = [];
    if (filters.search) parts.push(`"${filters.search}"`);
    if (filters.skills) parts.push(filters.skills.split(',').join(', '));
    if (filters.availability) parts.push(filters.availability);
    if (filters.minRating) parts.push(`${filters.minRating}+ ★`);
    return parts.length > 0 ? parts.join(' · ') : 'No filters';
  };

  return (
    <div className="saved-searches-wrapper" ref={dropdownRef}>
      <button
        className="saved-searches-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiBookmark size={16} />
        <span>Saved Searches</span>
        <FiChevronDown size={14} className={isOpen ? 'rotate-up' : ''} />
      </button>

      {isOpen && (
        <div className="saved-searches-dropdown">
          <div className="saved-searches-header">
            <h3>Saved Searches</h3>
            <button
              className="btn-save-search"
              onClick={() => setShowSaveForm(!showSaveForm)}
            >
              <FiSave size={14} /> Save Current
            </button>
          </div>

          {showSaveForm && (
            <div className="save-search-form">
              <input
                type="text"
                placeholder="Name this search..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="save-search-input"
                autoFocus
              />
              <div className="save-search-preview">
                {getFilterSummary(currentFilters)}
              </div>
              <div className="save-search-actions">
                <button className="btn-save-confirm" onClick={handleSave}>
                  Save
                </button>
                <button
                  className="btn-save-cancel"
                  onClick={() => { setShowSaveForm(false); setSearchName(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="saved-searches-list">
            {loading ? (
              <div className="saved-searches-loading">Loading...</div>
            ) : savedSearches.length === 0 ? (
              <div className="saved-searches-empty">
                <p>No saved searches yet.</p>
                <p className="hint">Save your current filters for quick access later.</p>
              </div>
            ) : (
              savedSearches.map(search => (
                <div key={search._id} className="saved-search-item">
                  <div
                    className="saved-search-info"
                    onClick={() => handleApply(search)}
                  >
                    <span className="saved-search-name">{search.name}</span>
                    <span className="saved-search-filters">
                      {getFilterSummary(search.filters)}
                    </span>
                  </div>
                  <button
                    className="btn-delete-search"
                    onClick={(e) => { e.stopPropagation(); handleDelete(search._id); }}
                    title="Delete saved search"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedSearches;
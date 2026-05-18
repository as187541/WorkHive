import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import TalentCard from '../components/TalentCard';
import SavedSearches from '../components/SavedSearches';
import { FiTrendingUp } from 'react-icons/fi';
import './TalentMarketplace.css';

const TalentMarketplace = () => {
  const [talent, setTalent] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    skills: '',
    minRating: '',
    availability: '',
    search: '',
    sort: 'rating',
    lastActive: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const fetchTalent = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.availability) params.append('availability', filters.availability);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.lastActive) params.append('lastActive', filters.lastActive);
      params.append('page', page);
      params.append('limit', 12);

      const res = await api.get(`/talent?${params.toString()}`);
      setTalent(res.data.data || []);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load talent profiles');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchRecommendations = useCallback(async () => {
    try {
      setRecLoading(true);
      const res = await api.get('/talent/recommendations?limit=8');
      setRecommendations(res.data.data || []);
    } catch {
      setRecommendations([]);
    } finally {
      setRecLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTalent(1);
  }, [fetchTalent]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleApplySavedSearch = (savedFilters) => {
    setFilters(savedFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchTalent(newPage);
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Determine if we should show match scores (when skills filter is active)
  const hasSkillsFilter = filters.skills && filters.skills.length > 0;

  return (
    <div className="talent-marketplace-container page-enter">
      <header className="marketplace-header">
        <div>
          <h1>Talent Marketplace</h1>
          <p>Discover skilled professionals for your projects</p>
        </div>
      </header>

      {/* Recommended for You Section */}
      {recommendations.length > 0 && (
        <section className="recommendations-section">
          <div className="recommendations-header">
            <h2><FiTrendingUp size={20} /> Recommended for You</h2>
            <p>Based on your skills and connections</p>
          </div>
          <div className="recommendations-scroll-wrapper">
            <div className="recommendations-scroll">
              {recommendations.map(person => (
                <div key={person._id} className="recommendation-card">
                  <TalentCard
                    talent={person}
                    matchScore={person.matchScore}
                    lastActive={person.lastActive}
                    recommendationReason={person.recommendationReason}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="marketplace-toolbar">
        <div className="search-bar-wrapper" style={{ maxWidth: '500px', flex: 1 }}>
          <input
            type="text"
            placeholder="Search by skills, role, or name..."
            value={filters.search}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            className="search-bar"
          />
        </div>

        <div className="filter-dropdowns">
          <select
            value={filters.availability}
            onChange={(e) => handleFilterChange({ availability: e.target.value })}
            className="filter-select"
          >
            <option value="">Availability</option>
            <option value="Open to work">Open to Work</option>
            <option value="Busy">Busy</option>
            <option value="Not available">Not Available</option>
          </select>

          <select
            value={filters.lastActive}
            onChange={(e) => handleFilterChange({ lastActive: e.target.value })}
            className="filter-select"
          >
            <option value="">Last Active</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange({ sort: e.target.value })}
            className="filter-select"
          >
            <option value="rating">Sort By</option>
            <option value="relevance">Most Relevant</option>
            <option value="rating">Top Rated</option>
            <option value="hourlyRate">Hourly Rate</option>
            <option value="newest">Newest</option>
            <option value="projects">Most Projects</option>
          </select>
        </div>

        <SavedSearches
          currentFilters={filters}
          onApplySearch={handleApplySavedSearch}
        />
      </div>

      <div className="talent-grid-section">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading talent profiles...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <div className="empty-state-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button onClick={() => fetchTalent(pagination.page)} className="btn-retry">Retry</button>
          </div>
        )}

        {!loading && !error && talent.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <h3>No talent found</h3>
              <p>Try adjusting your filters to see more results.</p>
            </div>
          )}

          <div className="talent-grid">
            {talent.map(person => (
              <TalentCard
                key={person._id}
                talent={person}
                matchScore={hasSkillsFilter ? person.matchScore : null}
                lastActive={person.lastActive}
              />
            ))}
          </div>

          {!loading && !error && pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="btn-page"
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="btn-page"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
  );
};

export default TalentMarketplace;

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TalentCard from '../components/TalentCard';
import TalentFilters from '../components/TalentFilters';
import './TalentMarketplace.css';
const TalentMarketplace = () => {
  const [talent, setTalent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    skills: '',
    minRating: '',
    availability: '',
    search: '',
    sort: 'rating'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });

  const fetchTalent = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.availability) params.append('availability', filters.availability);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
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
  };

  useEffect(() => {
    fetchTalent(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      const updated = { ...prev, ...newFilters };
      return updated;
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchTalent(newPage);
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  return (
    <div className="talent-marketplace-container page-enter">
      <header className="marketplace-header">
        <div>
          <h1>Talent Marketplace</h1>
          <p>Discover skilled professionals for your projects</p>
        </div>
      </header>

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
            <option value="open-to-work">Open to Work</option>
            <option value="busy">Busy</option>
            <option value="not-available">Not Available</option>
          </select>

          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange({ sort: e.target.value })}
            className="filter-select"
          >
            <option value="rating">Sort By</option>
            <option value="rating">Top Rated</option>
            <option value="hourlyRate">Hourly Rate</option>
            <option value="newest">Newest</option>
          </select>
        </div>
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
              <TalentCard key={person._id} talent={person} />
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

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
        <h1>Talent Marketplace</h1>
        <p>Discover skilled professionals and invite them to your projects.</p>
      </header>

      <div className="marketplace-layout">
        <aside className="filters-sidebar">
          <TalentFilters filters={filters} onChange={handleFilterChange} />
        </aside>

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
    </div>
  );
};

export default TalentMarketplace;

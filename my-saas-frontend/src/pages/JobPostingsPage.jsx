import React, { useState, useEffect } from 'react';
import api from '../services/api';
import JobPostingCard from '../components/JobPostingCard';
import CreateJobPostingModal from '../components/CreateJobPostingModal';
import { SKILL_OPTIONS } from '../constants/skills';

const JobPostingsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    skills: '',
    minBudget: '',
    maxBudget: '',
    search: '',
    sort: 'newest'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchJobs = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.skills) params.append('skills', filters.skills);
      if (filters.minBudget) params.append('minBudget', filters.minBudget);
      if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);
      params.append('page', page);
      params.append('limit', 12);

      const res = await api.get(`/jobs?${params.toString()}`);
      setJobs(res.data.data || []);
      setPagination({
        page: res.data.page,
        pages: res.data.pages,
        total: res.data.total
      });
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load job postings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchJobs(newPage);
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleCreateSuccess = (newJob) => {
    setJobs(prev => [newJob, ...prev]);
  };

  const categories = [
    'Design', 'Development', 'Writing', 'Marketing',
    'Video & Animation', 'Music & Audio', 'Business', 'Data'
  ];

  return (
    <div className="job-postings-page page-enter">
      <header className="marketplace-header">
        <div>
          <h1>Jobs Marketplace</h1>
          <p>Find your next opportunity</p>
        </div>
      </header>

      <div className="marketplace-toolbar">
        <div className="search-bar-wrapper" style={{ maxWidth: '600px', flex: 1 }}>
          <input
            type="text"
            placeholder="Search for jobs by title, skills, or category..."
            value={filters.search}
            onChange={e => handleFilterChange({ search: e.target.value })}
            className="search-bar"
          />
        </div>
      </div>

      <div className="marketplace-toolbar-secondary">
        <div className="filter-dropdowns">
          <select
            value={filters.category}
            onChange={e => handleFilterChange({ category: e.target.value })}
            className="filter-select"
          >
            <option value="">Category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select className="filter-select">
            <option>Experience Level</option>
            <option>Entry</option>
            <option>Intermediate</option>
            <option>Expert</option>
          </select>

          <select className="filter-select">
            <option>Budget</option>
            <option>Under 1,000 HT</option>
            <option>1,000 - 5,000 HT</option>
            <option>5,000+ HT</option>
          </select>

          <select
            value={filters.sort}
            onChange={e => handleFilterChange({ sort: e.target.value })}
            className="filter-select"
          >
            <option value="newest">Sort By</option>
            <option value="newest">Newest</option>
            <option value="budget_high">Budget: High to Low</option>
          </select>
        </div>
      </div>

      <div className="marketplace-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading jobs...</p>
          </div>
        ) : error ? (
          <div className="alert alert-error">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No job postings found</h3>
            <p>Try adjusting your filters or be the first to post a job!</p>
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              Post a Job
            </button>
          </div>
        ) : (
            <>
              <div className="results-info">
                <span>{pagination.total} jobs found</span>
              </div>
              <div className="jobs-grid">
                {jobs.map(job => (
                  <JobPostingCard key={job._id} job={job} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    ← Prev
                  </button>
                  <span>Page {pagination.page} of {pagination.pages}</span>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      {isCreateModalOpen && (
        <CreateJobPostingModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default JobPostingsPage;

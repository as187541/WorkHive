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
      <header className="page-header">
        <div>
          <h1>Job Board</h1>
          <p>Find opportunities or post a job to hire talented freelancers.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Post a Job
        </button>
      </header>

      <div className="marketplace-layout">
        <aside className="filters-sidebar">
          <div className="filter-section">
            <h4>Search</h4>
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search}
              onChange={e => handleFilterChange({ search: e.target.value })}
            />
          </div>

          <div className="filter-section">
            <h4>Category</h4>
            <select
              value={filters.category}
              onChange={e => handleFilterChange({ category: e.target.value })}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h4>Skills</h4>
            <select
              value={filters.skills}
              onChange={e => handleFilterChange({ skills: e.target.value })}
            >
              <option value="">All Skills</option>
              {SKILL_OPTIONS.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h4>Budget Range (HT)</h4>
            <div className="price-range-inputs">
              <input
                type="number"
                placeholder="Min"
                value={filters.minBudget}
                onChange={e => handleFilterChange({ minBudget: e.target.value })}
                min={0}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxBudget}
                onChange={e => handleFilterChange({ maxBudget: e.target.value })}
                min={0}
              />
            </div>
          </div>

          <div className="filter-section">
            <h4>Sort By</h4>
            <select
              value={filters.sort}
              onChange={e => handleFilterChange({ sort: e.target.value })}
            >
              <option value="newest">Newest First</option>
              <option value="budget_high">Budget: High to Low</option>
              <option value="budget_low">Budget: Low to High</option>
              <option value="deadline">Deadline: Soonest</option>
            </select>
          </div>
        </aside>

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

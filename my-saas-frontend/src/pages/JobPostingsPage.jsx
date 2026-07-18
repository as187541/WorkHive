import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import JobPostingCard from '../components/JobPostingCard';
import CreateJobPostingModal from '../components/CreateJobPostingModal';
import MilestoneTracker from '../components/MilestoneTracker';
import { SKILL_OPTIONS } from '../constants/skills';

const TABS = [
  { key: 'browse', label: 'Browse Jobs' },
  { key: 'my-jobs', label: 'My Job Postings' },
  { key: 'my-proposals', label: 'My Proposals' },
];

const JobPostingsPage = () => {
  const [activeTab, setActiveTab] = useState('browse');
  const navigate = useNavigate();

  return (
    <div className="job-postings-page page-enter">
      <header className="marketplace-header">
        <div>
          <h1>Jobs</h1>
          <p>Find opportunities, manage your postings, and track proposals</p>
        </div>
      </header>

      <div className="status-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`status-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'browse' && <BrowseJobsTab />}
      {activeTab === 'my-jobs' && <MyJobPostingsTab />}
      {activeTab === 'my-proposals' && <MyProposalsTab navigate={navigate} />}
    </div>
  );
};

/* ────────────────────────────────────────────
   Browse Jobs Tab
   ──────────────────────────────────────────── */
const BrowseJobsTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    subCategory: '',
    experienceLevel: '',
    projectType: '',
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
      if (filters.subCategory) params.append('subCategory', filters.subCategory);
      if (filters.experienceLevel) params.append('experienceLevel', filters.experienceLevel);
      if (filters.projectType) params.append('projectType', filters.projectType);
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
    <>
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

          <select
            value={filters.experienceLevel}
            onChange={e => handleFilterChange({ experienceLevel: e.target.value })}
            className="filter-select"
          >
            <option value="">Experience Level</option>
            <option value="Junior">Junior</option>
            <option value="Mid">Mid-Level</option>
            <option value="Senior">Senior</option>
            <option value="Expert">Expert</option>
          </select>

          <select
            value={filters.projectType}
            onChange={e => handleFilterChange({ projectType: e.target.value })}
            className="filter-select"
          >
            <option value="">Project Type</option>
            <option value="One-time">One-time</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Complex">Complex</option>
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
    </>
  );
};

/* ────────────────────────────────────────────
   My Job Postings Tab
   ──────────────────────────────────────────── */
const MyJobPostingsTab = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/jobs/my/jobs');
      setJobs(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load your job postings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateSuccess = (newJob) => {
    setJobs(prev => [newJob, ...prev]);
  };

  const handleCloseJob = async (jobId) => {
    if (!window.confirm('Close this job posting? No new proposals will be accepted.')) return;
    try {
      setActionLoading(jobId);
      await api.patch(`/jobs/${jobId}/close`);
      setJobs(prev =>
        prev.map(j => j._id === jobId ? { ...j, status: 'Closed' } : j)
      );
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to close job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Delete this job posting permanently?')) return;
    try {
      setActionLoading(jobId);
      await api.delete(`/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j._id !== jobId));
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete job');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredJobs = filterStatus === 'all'
    ? jobs
    : filterStatus === 'pending approval'
      ? jobs.filter(j => j.approvalStatus === 'Pending')
      : jobs.filter(j => j.status.toLowerCase() === filterStatus);

  const statusCounts = {
    all: jobs.length,
    open: jobs.filter(j => j.status === 'Open').length,
    'in progress': jobs.filter(j => j.status === 'In Progress').length,
    filled: jobs.filter(j => j.status === 'Filled').length,
    closed: jobs.filter(j => j.status === 'Closed').length,
    'pending approval': jobs.filter(j => j.approvalStatus === 'Pending').length
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your jobs...</p>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="status-tabs">
        {['all', 'open', 'in progress', 'filled', 'closed', 'pending approval'].map(status => (
          <button
            key={status}
            className={`status-tab ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status === 'in progress' ? 'In Progress' : status === 'pending approval' ? '⏳ Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="tab-count">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          + Post a Job
        </button>
      </div>

      {filteredJobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No {filterStatus !== 'all' ? filterStatus : ''} job postings</h3>
          <p>{filterStatus === 'all' ? 'Post your first job to start hiring!' : `No ${filterStatus} jobs found.`}</p>
          {filterStatus === 'all' && (
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              Post a Job
            </button>
          )}
        </div>
      ) : (
        <div className="jobs-grid">
          {filteredJobs.map(job => (
            <JobPostingCard
              key={job._id}
              job={job}
              showActions={true}
              onEdit={(j) => navigate(`/jobs/${j._id}`)}
              onClose={handleCloseJob}
              onDelete={handleDeleteJob}
            />
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateJobPostingModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
};

/* ────────────────────────────────────────────
   My Proposals Tab
   ──────────────────────────────────────────── */
const MyProposalsTab = ({ navigate }) => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/proposals/my');
      setProposals(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load your proposals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleWithdraw = async (proposalId) => {
    if (!window.confirm('Withdraw this proposal?')) return;
    try {
      setActionLoading(proposalId);
      await api.patch(`/proposals/${proposalId}/withdraw`);
      setProposals(prev =>
        prev.map(p => p._id === proposalId ? { ...p, status: 'Withdrawn' } : p)
      );
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to withdraw proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProposals = filterStatus === 'all'
    ? proposals
    : proposals.filter(p => p.status.toLowerCase() === filterStatus);

  const statusCounts = {
    all: proposals.length,
    pending: proposals.filter(p => p.status === 'Pending').length,
    accepted: proposals.filter(p => p.status === 'Accepted').length,
    rejected: proposals.filter(p => p.status === 'Rejected').length,
    withdrawn: proposals.filter(p => p.status === 'Withdrawn').length
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Accepted': return 'status-accepted';
      case 'Rejected': return 'status-rejected';
      case 'Withdrawn': return 'status-withdrawn';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your proposals...</p>
      </div>
    );
  }

  return (
    <>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="status-tabs">
        {['all', 'pending', 'accepted', 'rejected', 'withdrawn'].map(status => (
          <button
            key={status}
            className={`status-tab ${filterStatus === status ? 'active' : ''}`}
            onClick={() => setFilterStatus(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="tab-count">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      {filteredProposals.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>No {filterStatus !== 'all' ? filterStatus : ''} proposals</h3>
          <p>{filterStatus === 'all' ? 'Browse jobs and submit your first proposal!' : `No ${filterStatus} proposals found.`}</p>
        </div>
      ) : (
        <div className="proposals-table-container">
          <table className="proposals-table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Your Price</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map(proposal => {
                const job = proposal.jobPosting || {};
                return (
                  <React.Fragment key={proposal._id}>
                    <tr className="proposal-row">
                      <td>
                        <div
                          className="proposal-job-title"
                          onClick={() => navigate(`/jobs/${job._id}`)}
                          style={{ cursor: 'pointer', color: 'var(--primary-500)' }}
                        >
                          {job.title || 'Unknown Job'}
                        </div>
                        <div className="proposal-job-meta">
                          <span className="proposal-job-category">{job.category || 'General'}</span>
                          <span className="proposal-job-poster">
                            by {job.postedBy?.name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="proposal-price">
                          {proposal.proposedPrice} {proposal.currency || 'HT'}
                        </span>
                      </td>
                      <td>{proposal.deliveryDays} days</td>
                      <td>
                        <span className={`status-badge ${getStatusColor(proposal.status)}`}>
                          {proposal.status}
                        </span>
                        {proposal.status === 'Accepted' && (
                          <div className="proposal-accepted-note" style={{ fontSize: '0.75rem', color: 'var(--success-500)', marginTop: '4px' }}>
                            🎉 Check your invitations
                          </div>
                        )}
                        {proposal.status === 'Rejected' && (
                          <div className="proposal-rejected-note" style={{ fontSize: '0.75rem', color: 'var(--danger-500)', marginTop: '4px' }}>
                            Keep applying!
                          </div>
                        )}
                      </td>
                      <td>{new Date(proposal.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="proposal-actions">
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => navigate(`/jobs/${job._id}`)}
                          >
                            View Job
                          </button>
                          {proposal.status === 'Pending' && (
                            <button
                              className="btn btn-sm btn-danger-outline"
                              onClick={() => handleWithdraw(proposal._id)}
                              disabled={actionLoading === proposal._id}
                            >
                              {actionLoading === proposal._id ? '...' : 'Withdraw'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {proposal.status === 'Accepted' && proposal.milestones?.length > 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '0 1rem 1rem 1rem' }}>
                          <MilestoneTracker
                            proposal={proposal}
                            isFreelancer={true}
                            onMilestoneUpdate={(updatedMilestones) => {
                              setProposals(prev => prev.map(p =>
                                p._id === proposal._id ? { ...p, milestones: updatedMilestones } : p
                              ));
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default JobPostingsPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import JobPostingCard from '../components/JobPostingCard';
import CreateJobPostingModal from '../components/CreateJobPostingModal';

const MyJobPostings = () => {
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
    : jobs.filter(j => j.status.toLowerCase() === filterStatus);

  const statusCounts = {
    all: jobs.length,
    open: jobs.filter(j => j.status === 'Open').length,
    filled: jobs.filter(j => j.status === 'Filled').length,
    closed: jobs.filter(j => j.status === 'Closed').length
  };

  if (loading) {
    return (
      <div className="my-jobs-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-jobs-page page-enter">
      <header className="page-header">
        <div>
          <h1>My Job Postings</h1>
          <p>Manage your posted jobs and review proposals.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Post a Job
        </button>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="status-tabs">
        {['all', 'open', 'filled', 'closed'].map(status => (
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
    </div>
  );
};

export default MyJobPostings;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import RatingStars from '../components/RatingStars';
import SubmitProposalModal from '../components/SubmitProposalModal';
import AcceptProposalModal from '../components/AcceptProposalModal';

const JobPostingDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [acceptingProposal, setAcceptingProposal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')._id;

  useEffect(() => {
    fetchJobDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const [jobRes, proposalsRes, myProposalsRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/proposals/jobs/${jobId}/proposals`).catch(() => ({ data: { data: [] } })),
        api.get('/proposals/my').catch(() => ({ data: { data: [] } }))
      ]);

      setJob(jobRes.data.data);
      setProposals(proposalsRes.data.data || []);

      // Check if current user already submitted
      const myProposals = myProposalsRes.data.data || [];
      const alreadySubmitted = myProposals.some(
        p => String(p.jobPosting?._id || p.jobPosting) === String(jobId)
      );
      setHasSubmitted(alreadySubmitted);
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptProposal = (proposal) => {
    setAcceptingProposal(proposal);
  };

  const handleAcceptSuccess = () => {
    setAcceptingProposal(null);
    fetchJobDetails();
  };

  const handleRejectProposal = async (proposalId) => {
    if (!window.confirm('Reject this proposal?')) return;
    try {
      setActionLoading(proposalId);
      await api.patch(`/proposals/${proposalId}/reject`);
      fetchJobDetails();
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to reject proposal');
    } finally {
      setActionLoading(null);
    }
  };

  const isOwner = job && String(job.postedBy?._id || job.postedBy) === String(currentUserId);

  if (loading) {
    return (
      <div className="job-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="job-detail-page">
        <div className="error-state">
          <div className="empty-state-icon">⚠️</div>
          <h3>Job not found</h3>
          <p>{error || 'The job posting you are looking for does not exist.'}</p>
          <button onClick={() => navigate('/jobs')} className="btn btn-primary">
            ← Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  const postedBy = job.postedBy || {};

  return (
    <div className="job-detail-page page-enter">
      <div className="job-detail-header">
        <button onClick={() => navigate('/jobs')} className="btn btn-back">
          ← Back to Jobs
        </button>
      </div>

      <div className="job-detail-layout">
        <div className="job-detail-main">
          <div className="job-detail-meta">
            <span className={`job-status-badge status-${job.status?.toLowerCase()}`}>
              {job.status}
            </span>
            {job.visibility === 'Workspace' && (
              <span className="job-visibility-badge">🔒 Workspace</span>
            )}
            <span className="job-posted-date">
              Posted {new Date(job.createdAt).toLocaleDateString()}
            </span>
          </div>

          <h1>{job.title}</h1>

          <div className="job-detail-section">
            <h3>Description</h3>
            <p className="job-description">{job.description}</p>
          </div>

          {job.skills && job.skills.length > 0 && (
            <div className="job-detail-section">
              <h3>Skills Required</h3>
              <div className="skill-tags">
                {job.skills.map(skill => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Proposals Section */}
          {isOwner && proposals.length > 0 && (
            <div className="job-detail-section">
              <h3>Proposals ({proposals.length})</h3>
              <div className="proposals-list">
                {proposals.map(proposal => {
                  const freelancer = proposal.freelancer || {};
                  return (
                    <div key={proposal._id} className="proposal-card">
                      <div className="proposal-freelancer">
                        {freelancer.avatar ? (
                          <img src={freelancer.avatar} alt={freelancer.name} className="proposal-avatar" />
                        ) : (
                          <div className="proposal-avatar-placeholder">
                            {freelancer.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                        <div className="proposal-freelancer-info">
                          <span className="freelancer-name">{freelancer.name || 'Unknown'}</span>
                          <div className="freelancer-meta">
                            <RatingStars score={freelancer.ratingAverage || 0} size="small" />
                            <span>{freelancer.totalCompletedProjects || 0} projects</span>
                          </div>
                        </div>
                      </div>

                      <div className="proposal-details">
                        <div className="proposal-detail-item">
                          <span className="detail-label">💰 Proposed Price</span>
                          <span className="detail-value">{proposal.proposedPrice} {proposal.currency}</span>
                        </div>
                        <div className="proposal-detail-item">
                          <span className="detail-label">⏱️ Delivery</span>
                          <span className="detail-value">{proposal.deliveryDays} days</span>
                        </div>
                      </div>

                      <div className="proposal-cover-letter">
                        <h4>Cover Letter</h4>
                        <p>{proposal.coverLetter}</p>
                      </div>

                      {proposal.status === 'Pending' && job.status === 'Open' && (
                        <div className="proposal-actions">
                          <button
                            className="btn btn-success"
                            onClick={() => handleAcceptProposal(proposal)}
                            disabled={actionLoading === proposal._id}
                          >
                            {actionLoading === proposal._id ? 'Processing...' : '✓ Accept'}
                          </button>
                          <button
                            className="btn btn-danger-outline"
                            onClick={() => handleRejectProposal(proposal._id)}
                            disabled={actionLoading === proposal._id}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}

                      {proposal.status !== 'Pending' && (
                        <span className={`proposal-status status-${proposal.status.toLowerCase()}`}>
                          {proposal.status}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isOwner && proposals.length === 0 && job.status === 'Open' && (
            <div className="job-detail-section">
              <h3>Proposals</h3>
              <div className="empty-state-sm">
                <p>No proposals yet. Share this job to attract freelancers!</p>
              </div>
            </div>
          )}
        </div>

        <div className="job-detail-sidebar">
          <div className="job-info-card">
            <h3>Job Details</h3>

            <div className="job-info-list">
              <div className="info-item">
                <span className="info-label">💰 Budget</span>
                <span className="info-value">
                  {job.budget?.min && job.budget?.max
                    ? `${job.budget.min} - ${job.budget.max} ${job.budget.currency || 'HT'}`
                    : job.budget?.max
                    ? `Up to ${job.budget.max} ${job.budget.currency || 'HT'}`
                    : 'Not specified'}
                </span>
              </div>

              {job.deadline && (
                <div className="info-item">
                  <span className="info-label">📅 Deadline</span>
                  <span className="info-value">{new Date(job.deadline).toLocaleDateString()}</span>
                </div>
              )}

              <div className="info-item">
                <span className="info-label">📋 Proposals</span>
                <span className="info-value">{job.proposalsCount || 0}</span>
              </div>

              <div className="info-item">
                <span className="info-label">🏷️ Category</span>
                <span className="info-value">{job.category}</span>
              </div>
            </div>
          </div>

          <div className="job-poster-card">
            <h3>Posted By</h3>
            <div className="poster-info">
              {postedBy.avatar ? (
                <img src={postedBy.avatar} alt={postedBy.name} className="poster-avatar" />
              ) : (
                <div className="poster-avatar-placeholder">
                  {postedBy.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <span className="poster-name">{postedBy.name || 'Unknown'}</span>
            </div>
          </div>

          {!isOwner && job.status === 'Open' && (
            <>
              {hasSubmitted ? (
                <div className="proposal-submitted-notice">
                  ✅ You have already submitted a proposal for this job.
                </div>
              ) : (
                <button
                  className="btn btn-primary btn-lg btn-block"
                  onClick={() => setShowProposalModal(true)}
                >
                  Submit a Proposal
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showProposalModal && (
        <SubmitProposalModal
          job={job}
          onClose={() => setShowProposalModal(false)}
          onSuccess={() => {
            setShowProposalModal(false);
            setHasSubmitted(true);
            fetchJobDetails();
          }}
        />
      )}

      {acceptingProposal && (
        <AcceptProposalModal
          proposal={acceptingProposal}
          job={job}
          onClose={() => setAcceptingProposal(null)}
          onSuccess={handleAcceptSuccess}
        />
      )}
    </div>
  );
};

export default JobPostingDetail;

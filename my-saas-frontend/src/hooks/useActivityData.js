import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const ACTION_CONFIG = {
  task_created: { label: 'Created task', icon: 'FiFileText', color: '#3b82f6', bg: '#eff6ff' },
  task_updated: { label: 'Updated task', icon: 'FiCheckSquare', color: '#f59e0b', bg: '#fffbeb' },
  task_completed: { label: 'Completed task', icon: 'FiCheckSquare', color: '#10b981', bg: '#ecfdf5' },
  task_assigned: { label: 'Assigned task', icon: 'FiUserPlus', color: '#8b5cf6', bg: '#f5f3ff' },
  hire_sent: { label: 'Sent hire invitation', icon: 'FiUserPlus', color: '#3b82f6', bg: '#eff6ff' },
  hire_accepted: { label: 'Accepted hire invitation', icon: 'FiCheckSquare', color: '#10b981', bg: '#ecfdf5' },
  hire_rejected: { label: 'Declined hire invitation', icon: 'FiMessageSquare', color: '#ef4444', bg: '#fef2f2' },
  project_created: { label: 'Created project', icon: 'FiFolder', color: '#f59e0b', bg: '#fffbeb' },
  project_joined: { label: 'Joined project', icon: 'FiUserPlus', color: '#8b5cf6', bg: '#f5f3ff' },
  workspace_joined: { label: 'Joined workspace', icon: 'FiFolder', color: '#10b981', bg: '#ecfdf5' },
  workspace_created: { label: 'Created workspace', icon: 'FiFolder', color: '#f59e0b', bg: '#fffbeb' },
  message_sent: { label: 'Sent message', icon: 'FiMessageSquare', color: '#3b82f6', bg: '#eff6ff' },
  proposal_submitted: { label: 'Submitted proposal', icon: 'FiFileText', color: '#8b5cf6', bg: '#f5f3ff' },
  proposal_accepted: { label: 'Accepted proposal', icon: 'FiCheckSquare', color: '#10b981', bg: '#ecfdf5' },
  connection_request: { label: 'Connection request', icon: 'FiUserPlus', color: '#3b82f6', bg: '#eff6ff' },
  connection_accepted: { label: 'Connection accepted', icon: 'FiCheckSquare', color: '#10b981', bg: '#ecfdf5' },
  proposal_rejected: { label: 'Proposal not selected', icon: 'FiXCircle', color: '#ef4444', bg: '#fef2f2' },
  milestone_submitted: { label: 'Milestone submitted', icon: 'FiClock', color: '#3b82f6', bg: '#eff6ff' },
  milestone_approved: { label: 'Milestone approved', icon: 'FiCheckSquare', color: '#10b981', bg: '#ecfdf5' },
  milestone_rejected: { label: 'Milestone rejected', icon: 'FiXCircle', color: '#ef4444', bg: '#fef2f2' },
  counter_offer: { label: 'Counter-offer received', icon: 'FiRepeat', color: '#8b5cf6', bg: '#f5f3ff' },
  counter_offer_accepted: { label: 'Counter-offer accepted', icon: 'FiCheckSquare', color: '#10b981', bg: '#ecfdf5' },
  counter_offer_rejected: { label: 'Counter-offer declined', icon: 'FiXCircle', color: '#ef4444', bg: '#fef2f2' },
  redemption_approved: { label: 'Redemption approved', icon: 'FiGift', color: '#10b981', bg: '#ecfdf5' },
  redemption_denied: { label: 'Redemption denied', icon: 'FiXCircle', color: '#ef4444', bg: '#fef2f2' }
};

export const ACTION_TYPE_OPTIONS = [
  { value: 'all', label: 'All Activity Types' },
  { value: 'task_created', label: 'Task Created' },
  { value: 'task_updated', label: 'Task Updated' },
  { value: 'task_completed', label: 'Task Completed' },
  { value: 'task_assigned', label: 'Task Assigned' },
  { value: 'hire_sent', label: 'Hire Invitation Sent' },
  { value: 'hire_accepted', label: 'Hire Accepted' },
  { value: 'hire_rejected', label: 'Hire Rejected' },
  { value: 'project_created', label: 'Project Created' },
  { value: 'workspace_joined', label: 'Workspace Joined' },
  { value: 'connection_request', label: 'Connection Request' },
  { value: 'connection_accepted', label: 'Connection Accepted' },
  { value: 'workspace_created', label: 'Workspace Created' },
  { value: 'redemption_approved', label: 'Redemption Approved' },
  { value: 'redemption_denied', label: 'Redemption Denied' }
];

export const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export const formatDateHeader = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
};

export const groupActivitiesByDate = (activities) => {
  const grouped = {};
  activities.forEach(activity => {
    const dateKey = new Date(activity.createdAt).toDateString();
    if (!grouped[dateKey]) {
      grouped[dateKey] = { label: formatDateHeader(activity.createdAt), items: [] };
    }
    grouped[dateKey].items.push(activity);
  });
  return grouped;
};

export const useActivityData = (workspaces, { workspace = 'all', action = 'all', page = 1, limit = 20 } = {}) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page, limit });
      if (workspace !== 'all') params.append('workspace', workspace);
      if (action !== 'all') params.append('action', action);

      const res = await api.get(`/activities?${params.toString()}`);
      setActivities(res.data.data || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
      setError('Failed to load activity log.');
    } finally {
      setLoading(false);
    }
  }, [workspace, action, page, limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return { activities, loading, error, totalPages, total, refetch: fetchActivities };
};
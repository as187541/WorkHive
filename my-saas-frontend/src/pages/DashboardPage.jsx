import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  FiFolder, FiCheckSquare, FiAward, FiUserPlus,
  FiPlus, FiSearch, FiGift, FiClock
} from 'react-icons/fi';
import api from '../services/api';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, workspaces } = useOutletContext();
  const [stats, setStats] = useState({
    activeWorkspaces: 0,
    pendingTasks: 0,
    tokenBalance: 0,
    newHires: 0,
    newWorkspacesThisMonth: 0,
    tasksDueThisWeek: 0,
    pendingHiresCount: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for user data before fetching dashboard
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const [tasksResult, hiresResult] = await Promise.allSettled([
          api.get('/tasks/my'),
          api.get('/hires/received')
        ]);

        const tasks = tasksResult.status === 'fulfilled'
          ? (tasksResult.value.data.data || tasksResult.value.data || [])
          : [];
        const hires = hiresResult.status === 'fulfilled'
          ? (hiresResult.value.data.data || hiresResult.value.data || [])
          : [];

        if (tasksResult.status === 'rejected') {
          console.error('Tasks fetch error:', tasksResult.reason);
        }
        if (hiresResult.status === 'rejected') {
          console.error('Hires fetch error:', hiresResult.reason);
        }

        const pendingTasks = tasks.filter(t => t.status !== 'Done').length;
        const pendingHires = hires.filter(h => h.status === 'Pending').length;

        // Compute dynamic subtitle values
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const newWorkspacesThisMonth = (workspaces || []).filter(ws => {
          const created = new Date(ws.createdAt);
          return created >= thirtyDaysAgo;
        }).length;

        const tasksDueThisWeek = tasks.filter(t => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due >= now && due <= oneWeekFromNow && t.status !== 'Done';
        }).length;

        setStats({
          activeWorkspaces: workspaces?.length || 0,
          pendingTasks,
          tokenBalance: user?.wallet?.balance || 0,
          newHires: pendingHires,
          newWorkspacesThisMonth,
          tasksDueThisWeek,
          pendingHiresCount: pendingHires
        });

        const activityList = [];
        tasks.filter(t => t.status === 'Done').slice(0, 3).forEach(t => {
          activityList.push({
            id: `task-${t._id}`,
            user: t.assignedTo?.name || 'Someone',
            avatar: t.assignedTo?.avatar,
            action: 'completed task',
            target: t.title,
            time: t.updatedAt,
            type: 'task'
          });
        });

        hires.filter(h => h.status === 'Accepted').slice(0, 2).forEach(h => {
          activityList.push({
            id: `hire-${h._id}`,
            user: h.freelancer?.name || 'Someone',
            avatar: h.freelancer?.avatar,
            action: 'accepted hire invitation for',
            target: h.workspace?.name || 'a workspace',
            time: h.updatedAt,
            type: 'hire'
          });
        });

        activityList.sort((a, b) => new Date(b.time) - new Date(a.time));
        setActivities(activityList.slice(0, 6));
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [workspaces, user]);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  const statCards = [
    {
      title: 'Active Workspaces',
      value: stats.activeWorkspaces,
      subtitle: stats.newWorkspacesThisMonth > 0 ? `+${stats.newWorkspacesThisMonth} this month` : 'No new workspaces',
      icon: FiFolder,
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
      onClick: () => navigate('/workspaces')
    },
    {
      title: 'Pending Tasks',
      value: stats.pendingTasks,
      subtitle: stats.tasksDueThisWeek > 0 ? `${stats.tasksDueThisWeek} due this week` : 'No tasks due this week',
      icon: FiCheckSquare,
      iconColor: '#3b82f6',
      iconBg: '#eff6ff',
      onClick: () => navigate('/my-tasks')
    },
    {
      title: 'Hive Token Balance',
      value: stats.tokenBalance.toLocaleString(),
      subtitle: 'Available balance',
      icon: FiAward,
      iconColor: '#f59e0b',
      iconBg: '#fffbeb',
      onClick: () => navigate('/rewards')
    },
    {
      title: 'New Hire Invitations',
      value: stats.newHires,
      subtitle: stats.pendingHiresCount > 0 ? `${stats.pendingHiresCount} pending response` : 'No pending invitations',
      icon: FiUserPlus,
      iconColor: '#10b981',
      iconBg: '#ecfdf5',
      onClick: () => navigate('/hire-invitations')
    }
  ];

  const quickActions = [
    {
      title: 'Create Workspace',
      description: 'Start a new project collaboration',
      icon: FiFolder,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      onClick: () => navigate('/workspaces')
    },
    {
      title: 'Post Project',
      description: 'Find talent for your needs',
      icon: FiPlus,
      color: '#3b82f6',
      bgColor: '#eff6ff',
      onClick: () => navigate('/jobs')
    },
    {
      title: 'Browse Talent',
      description: 'Discover skilled freelancers',
      icon: FiSearch,
      color: '#10b981',
      bgColor: '#ecfdf5',
      onClick: () => navigate('/talent')
    },
    {
      title: 'View Rewards',
      description: 'Redeem your Hive Tokens',
      icon: FiGift,
      color: '#f59e0b',
      bgColor: '#fffbeb',
      onClick: () => navigate('/rewards')
    }
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Here's what's happening in your WorkHive today</h1>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card clickable" onClick={stat.onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && stat.onClick()}>
            <div className="stat-card-header">
              <span className="stat-title">{stat.title}</span>
              <div
                className="stat-icon"
                style={{ backgroundColor: stat.iconBg, color: stat.iconColor }}
              >
                <stat.icon size={20} />
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-subtitle">{stat.subtitle}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-content">
        <div className="activity-section">
          <div className="section-header">
            <h2>Recent Activity</h2>
            <p className="section-description">Latest updates from your workspaces</p>
          </div>

          <div className="activity-list">
            {activities.length > 0 ? (
              activities.map(activity => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-avatar">
                    {activity.avatar ? (
                      <img src={activity.avatar} alt={activity.user} />
                    ) : (
                      <div className="activity-avatar-placeholder">
                        {activity.user.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="activity-content">
                    <p>
                      <strong>{activity.user}</strong>{' '}
                      {activity.action}{' '}
                      <strong>{activity.target}</strong>
                    </p>
                    <span className="activity-time">
                      <FiClock size={12} style={{ marginRight: '4px' }} />
                      {formatTimeAgo(activity.time)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activity">
                <p>No recent activity yet.</p>
                <p className="empty-hint">Complete tasks and hire talent to see updates here.</p>
              </div>
            )}
          </div>
        </div>

        <div className="quick-actions-section">
          <div className="section-header">
            <h2>Quick Actions</h2>
            <p className="section-description">Get started with common tasks</p>
          </div>

          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-card"
                onClick={action.onClick}
              >
                <div
                  className="quick-action-icon"
                  style={{ backgroundColor: action.bgColor, color: action.color }}
                >
                  <action.icon size={22} />
                </div>
                <div className="quick-action-content">
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
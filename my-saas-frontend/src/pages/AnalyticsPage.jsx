import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiBarChart2, FiActivity, FiUsers, FiAward, FiBriefcase, FiTrendingUp } from 'react-icons/fi';
import api from '../services/api';
import WorkspaceOverviewCards from '../components/analytics/WorkspaceOverviewCards';
import ActivityTrendsChart from '../components/analytics/ActivityTrendsChart';
import ContractorUtilizationTable from '../components/analytics/ContractorUtilizationTable';
import TokenEconomyPanel from '../components/analytics/TokenEconomyPanel';
import JobConversionFunnel from '../components/analytics/JobConversionFunnel';
import ProjectVelocityChart from '../components/analytics/ProjectVelocityChart';

const TABS = [
  { key: 'overview', label: 'Overview', icon: FiBarChart2 },
  { key: 'activity', label: 'Activity', icon: FiActivity },
  { key: 'contractors', label: 'Contractors', icon: FiUsers },
  { key: 'tokens', label: 'Tokens', icon: FiAward },
  { key: 'jobs', label: 'Jobs', icon: FiBriefcase },
  { key: 'velocity', label: 'Velocity', icon: FiTrendingUp },
];

const AnalyticsPage = () => {
  const { workspaces } = useOutletContext();
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (workspaces?.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]._id);
    }
  }, [workspaces]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const endpoints = {
          overview: `/analytics/workspace/${selectedWorkspace}/overview`,
          activity: `/analytics/workspace/${selectedWorkspace}/activity-trends`,
          contractors: `/analytics/workspace/${selectedWorkspace}/contractor-utilization`,
          tokens: `/analytics/workspace/${selectedWorkspace}/token-economy`,
          jobs: `/analytics/workspace/${selectedWorkspace}/job-conversion`,
          velocity: `/analytics/workspace/${selectedWorkspace}/project-velocity`,
        };
        // Only fetch the active tab's data
        const res = await api.get(endpoints[activeTab]);
        setData(prev => ({ ...prev, [activeTab]: res.data.data }));
      } catch (err) {
        setError(err.response?.data?.msg || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedWorkspace, activeTab]);

  const renderTab = () => {
    if (!selectedWorkspace) {
      return <div className="analytics-empty">Select a workspace to view analytics</div>;
    }
    if (loading) return <div className="loading-spinner"></div>;
    if (error) return <div className="error-message">{error}</div>;

    switch (activeTab) {
      case 'overview':
        return <WorkspaceOverviewCards data={data.overview} />;
      case 'activity':
        return <ActivityTrendsChart data={data.activity} workspaceId={selectedWorkspace} />;
      case 'contractors':
        return <ContractorUtilizationTable data={data.contractors} />;
      case 'tokens':
        return <TokenEconomyPanel data={data.tokens} />;
      case 'jobs':
        return <JobConversionFunnel data={data.jobs} />;
      case 'velocity':
        return <ProjectVelocityChart data={data.velocity} />;
      default:
        return null;
    }
  };

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1><FiBarChart2 style={{ marginRight: 8 }} />Analytics</h1>
          <p>Workspace insights and metrics</p>
        </div>
        <div className="analytics-controls">
          <select
            value={selectedWorkspace}
            onChange={e => setSelectedWorkspace(e.target.value)}
            className="analytics-workspace-select"
          >
            <option value="">Select Workspace</option>
            {workspaces?.map(ws => (
              <option key={ws._id} value={ws._id}>{ws.name}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="analytics-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`analytics-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon style={{ marginRight: 6 }} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="analytics-content">
        {renderTab()}
      </div>
    </div>
  );
};

export default AnalyticsPage;
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

const ACTION_COLORS = {
  task_created: '#3b82f6',
  task_completed: '#10b981',
  task_updated: '#6b7280',
  message_sent: '#8b5cf6',
  proposal_submitted: '#f59e0b',
  proposal_accepted: '#22c55e',
  hire_sent: '#ec4899',
  hire_accepted: '#14b8a6',
  order_created: '#6366f1',
  order_accepted: '#059669',
};

const ActivityTrendsChart = ({ data, workspaceId }) => {
  const [period, setPeriod] = useState('daily');
  const [chartData, setChartData] = useState(data || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/analytics/workspace/${workspaceId}/activity-trends?period=${period}&days=30`);
        setChartData(res.data.data);
      } catch {
        // keep existing data
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [period, workspaceId]);

  // Get unique action types from data
  const actionTypes = [...new Set(chartData?.flatMap?.(d => Object.keys(d.actions || {})) || [])];

  // Transform data for recharts
  const transformed = (chartData || []).map(d => {
    const point = { date: d.date };
    actionTypes.forEach(action => {
      point[action] = (d.actions || {})[action] || 0;
    });
    return point;
  });

  return (
    <div className="analytics-section">
      <div className="analytics-section-header">
        <h3>Activity Trends</h3>
        <div className="period-selector">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"></div>
      ) : transformed.length === 0 ? (
        <div className="analytics-empty">No activity data for this period</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={transformed}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {actionTypes.slice(0, 5).map((action, idx) => (
              <Line
                key={action}
                type="monotone"
                dataKey={action}
                stroke={ACTION_COLORS[action] || ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default ActivityTrendsChart;
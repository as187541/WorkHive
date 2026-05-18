import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const FUNNEL_STAGES = [
  { key: 'totalPosted', label: 'Jobs Posted', color: '#3b82f6' },
  { key: 'totalProposals', label: 'Proposals Received', color: '#f59e0b' },
  { key: 'totalOrders', label: 'Orders Created', color: '#10b981' },
];

const JobConversionFunnel = ({ data }) => {
  if (!data) return <div className="analytics-empty">No job conversion data available</div>;

  const { totalPosted = 0, totalProposals = 0, totalOrders = 0, jobsByStatus = {}, proposalsByStatus = {}, ordersByStatus = {} } = data;

  const funnelData = [
    { name: 'Jobs Posted', value: totalPosted, color: '#3b82f6' },
    { name: 'Proposals', value: totalProposals, color: '#f59e0b' },
    { name: 'Orders', value: totalOrders, color: '#10b981' },
  ];

  const conversionRate = totalPosted > 0 ? Math.round((totalOrders / totalPosted) * 100) : 0;

  return (
    <div className="analytics-section">
      <div className="analytics-section-header">
        <h3>Job Conversion Funnel</h3>
        <div className="conversion-rate">
          Conversion Rate: <strong>{conversionRate}%</strong>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={funnelData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
          <XAxis type="number" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 13 }} width={120} />
          <Tooltip />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {funnelData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="analytics-details-grid" style={{ marginTop: 16 }}>
        <div className="detail-card">
          <h4>Jobs by Status</h4>
          <div className="status-list">
            {Object.entries(jobsByStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-card">
          <h4>Proposals by Status</h4>
          <div className="status-list">
            {Object.entries(proposalsByStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-card">
          <h4>Orders by Status</h4>
          <div className="status-list">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} className="status-item">
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobConversionFunnel;
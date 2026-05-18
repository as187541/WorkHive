import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiArrowUp, FiArrowDown, FiClock } from 'react-icons/fi';

const TokenEconomyPanel = ({ data }) => {
  if (!data) return <div className="analytics-empty">No token data available</div>;

  const { earned = 0, spent = 0, earnedCount = 0, spentCount = 0, redemptions = {}, distribution = [] } = data;

  const chartData = distribution.map(d => ({
    name: d.name?.split(' ')[0] || 'Unknown',
    balance: d.balance || 0
  }));

  return (
    <div className="analytics-section">
      <div className="analytics-cards-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="analytics-stat-card">
          <div className="stat-icon" style={{ color: '#10b981' }}><FiArrowUp /></div>
          <div className="stat-value" style={{ color: '#10b981' }}>{earned.toLocaleString()} HT</div>
          <div className="stat-label">Tokens Earned ({earnedCount} transactions)</div>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon" style={{ color: '#ef4444' }}><FiArrowDown /></div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{spent.toLocaleString()} HT</div>
          <div className="stat-label">Tokens Spent ({spentCount} transactions)</div>
        </div>
        <div className="analytics-stat-card">
          <div className="stat-icon" style={{ color: '#f59e0b' }}><FiClock /></div>
          <div className="stat-value" style={{ color: '#f59e0b' }}>{(redemptions.pending?.totalCost || 0).toLocaleString()} HT</div>
          <div className="stat-label">Pending Redemptions ({redemptions.pending?.count || 0})</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4>Token Distribution (Top 10)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${value} HT`, 'Balance']} />
              <Bar dataKey="balance" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TokenEconomyPanel;
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#ef4444'];

const ProjectVelocityChart = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return <div className="analytics-empty">No velocity data available</div>;
  }

  // Transform { projectName: [{ week, completed }] } into recharts-friendly format
  const projectNames = Object.keys(data);
  const allWeeks = [...new Set(projectNames.flatMap(name => data[name].map(d => d.week)))].sort();

  const chartData = allWeeks.map(week => {
    const point = { week };
    projectNames.forEach(name => {
      const weekData = data[name].find(d => d.week === week);
      point[name] = weekData ? weekData.completed : 0;
    });
    return point;
  });

  return (
    <div className="analytics-section">
      <h3>Project Velocity (Tasks Completed per Week)</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
          <XAxis dataKey="week" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {projectNames.slice(0, 8).map((name, idx) => (
            <Bar
              key={name}
              dataKey={name}
              fill={COLORS[idx % COLORS.length]}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProjectVelocityChart;
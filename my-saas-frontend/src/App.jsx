// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import WorkspaceDetail from './pages/WorkspaceDetail';
import DashboardPage from './pages/DashboardPage';
import WorkspaceDashboard from './pages/WorkspaceDashboard';
import ProfilePage from './pages/ProfilePage'; 
import RewardStore from './pages/RewardStore';
import './App.css';

import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminWorkspacesPage from './pages/AdminWorkspacesPage';
import AdminLogsPage from './pages/AdminLogsPage';
import AdminTokensPage from './pages/AdminTokensPage';
import AdminRedemptionsPage from './pages/AdminRedemptionsPage';
import TalentMarketplace from './pages/TalentMarketplace';
import TalentProfilePage from './pages/TalentProfilePage';
import HireInvitationsPage from './pages/HireInvitationsPage';
import MyServices from './pages/MyServices';
import ServicePackagesMarketplace from './pages/ServicePackagesMarketplace';
import ServicePackageDetail from './pages/ServicePackageDetail';
import MessagesPage from './pages/MessagesPage';
import JobPostingsPage from './pages/JobPostingsPage';
import JobPostingDetail from './pages/JobPostingDetail';
import MyJobPostings from './pages/MyJobPostings';
import MyProposals from './pages/MyProposals';
import MyTasksPage from './pages/MyTasksPage';
import ActivityLogPage from './pages/ActivityLogPage';
import ConnectionsPage from './pages/ConnectionsPage';

import { SocketProvider } from './contexts/SocketContext';

const AuthCheck = ({ children }) => {
  const isAuth = !!localStorage.getItem('token');
  return isAuth ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
    
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={<AuthCheck><MainLayout /></AuthCheck>}>

<Route index element={<DashboardPage />} />
          <Route path="workspaces" element={<WorkspaceDashboard />} />
            <Route path="workspaces/:workspaceId" element={<WorkspaceDetail />} />
     
            <Route path="profile" element={<ProfilePage />} />
            
          <Route path="rewards" element={<RewardStore />} />
          <Route path="talent" element={<TalentMarketplace />} />
          <Route path="talent/:userId" element={<TalentProfilePage />} />
          <Route path="hire-invitations" element={<HireInvitationsPage />} />
          <Route path="services" element={<ServicePackagesMarketplace />} />
          <Route path="services/:serviceId" element={<ServicePackageDetail />} />
          <Route path="my-services" element={<MyServices />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="jobs" element={<JobPostingsPage />} />
          <Route path="jobs/:jobId" element={<JobPostingDetail />} />
          <Route path="my-jobs" element={<MyJobPostings />} />
          <Route path="my-proposals" element={<MyProposals />} />
          <Route path="my-tasks" element={<MyTasksPage />} />
          <Route path="activity-log" element={<ActivityLogPage />} />
            
          </Route>

          <Route path="/admin" element={<AuthCheck><AdminRoute><MainLayout /></AdminRoute></AuthCheck>}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="workspaces" element={<AdminWorkspacesPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="tokens" element={<AdminTokensPage />} />
            <Route path="redemptions" element={<AdminRedemptionsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;
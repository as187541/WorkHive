// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import WorkspaceDetail from './pages/WorkspaceDetail';
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
import MyRedemptionsPage from './pages/MyRedemptionsPage';

// Helper component to protect routes
const AuthCheck = ({ children }) => {
  const isAuth = !!localStorage.getItem('token');
  return isAuth ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes - All wrapped in ONE MainLayout block */}
        <Route path="/" element={<AuthCheck><MainLayout /></AuthCheck>}>
          
          {/* 
             This is the "Home" page of your app. 
             It shows all your workspace cards (WorkspaceDashboard).
          */}
          <Route index element={<WorkspaceDashboard />} />
          
          {/* This shows a specific workspace when clicked */}
          <Route path="workspaces/:workspaceId" element={<WorkspaceDetail />} />
          
          {/* Profile page */}
          <Route path="profile" element={<ProfilePage />} />
          
        <Route path="rewards" element={<RewardStore />} />
        <Route path="my-redemptions" element={<MyRedemptionsPage />} />
        <Route path="review-redemptions" element={<AdminRedemptionsPage />} />
          
        </Route>

        {/* Admin Routes - Protected by AdminRoute */}
        <Route path="/admin" element={<AuthCheck><AdminRoute><MainLayout /></AdminRoute></AuthCheck>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="workspaces" element={<AdminWorkspacesPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
          <Route path="tokens" element={<AdminTokensPage />} />
          <Route path="redemptions" element={<AdminRedemptionsPage />} />
        </Route>

        {/* Catch-all: Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
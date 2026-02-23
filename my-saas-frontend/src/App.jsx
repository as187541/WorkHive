// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MainLayout from './pages/MainLayout';
import WorkspaceDetail from './pages/WorkspaceDetail';
import WorkspaceDashboard from './pages/WorkspaceDashboard';
import ProfilePage from './pages/ProfilePage'; //

import './App.css';

// Small component for the profile

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
        </Route>

        {/* Catch-all: Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
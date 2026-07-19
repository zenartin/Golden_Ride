import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import DashboardOverview from './pages/DashboardOverview';
import UsersList from './pages/UsersList';
import UserDetails from './pages/UserDetails';
import DriversList from './pages/DriversList';
import DriverDetails from './pages/DriverDetails';
import RidesList from './pages/RidesList';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="users" element={<UsersList />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="drivers" element={<DriversList />} />
            <Route path="drivers/:id" element={<DriverDetails />} />
            <Route path="rides" element={<RidesList />} />
            <Route path="*" element={<div style={{padding: 40}}>Page coming soon in Phase 2/3</div>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import DashboardOverview from './pages/DashboardOverview';
import UsersList from './pages/UsersList';
import UserDetails from './pages/UserDetails';
import DriversList from './pages/DriversList';
import DriverDetails from './pages/DriverDetails';
import RidesList from './pages/RidesList';
import StripeDashboard from './pages/StripeDashboard';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import SafetyPage from './pages/Safety';
import Payouts from './pages/Payouts';
import Login from './pages/Login';
import CouponsList from './pages/CouponsList';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="users" element={<UsersList />} />
            <Route path="users/:id" element={<UserDetails />} />
            <Route path="drivers" element={<DriversList />} />
            <Route path="drivers/:id" element={<DriverDetails />} />
            <Route path="rides" element={<RidesList />} />
            <Route path="stripe" element={<StripeDashboard />} />
            <Route path="payouts" element={<Payouts />} />
            <Route path="reports" element={<Reports />} />
            <Route path="coupons" element={<CouponsList />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="safety" element={<SafetyPage />} />
            {/* Catch-all: redirect unknown paths to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

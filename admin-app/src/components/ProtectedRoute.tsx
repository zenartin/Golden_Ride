import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
  allowedRoles?: ('super_admin' | 'admin')[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { token, role } = useAuthStore();

  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />; // Redirect to dashboard if unauthorized
  }

  return <Outlet />;
}

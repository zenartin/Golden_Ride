import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Each section gets its own accent so every page feels distinct.
const THEMES: Record<string, { accent: string; soft: string; grad: string }> = {
  '/': { accent: '#4f46e5', soft: 'rgba(79,70,229,0.1)', grad: 'linear-gradient(90deg,#4f46e5,#7c3aed)' },
  '/users': { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.12)', grad: 'linear-gradient(90deg,#0284c7,#14b8a6)' },
  '/drivers': { accent: '#10b981', soft: 'rgba(16,185,129,0.12)', grad: 'linear-gradient(90deg,#059669,#0d9488)' },
  '/rides': { accent: '#f43f5e', soft: 'rgba(244,63,94,0.1)', grad: 'linear-gradient(90deg,#e11d48,#f97316)' },
  '/payouts': { accent: '#7c3aed', soft: 'rgba(124,58,237,0.1)', grad: 'linear-gradient(90deg,#7c3aed,#c026d3)' },
  '/stripe': { accent: '#0891b2', soft: 'rgba(8,145,178,0.1)', grad: 'linear-gradient(90deg,#0891b2,#2563eb)' },
  '/coupons': { accent: '#eab308', soft: 'rgba(234,179,8,0.1)', grad: 'linear-gradient(90deg,#eab308,#f97316)' },
  '/reports': { accent: '#d97706', soft: 'rgba(217,119,6,0.12)', grad: 'linear-gradient(90deg,#d97706,#dc2626)' },
  '/settings': { accent: '#475569', soft: 'rgba(71,85,105,0.12)', grad: 'linear-gradient(90deg,#334155,#64748b)' },
};

export default function AdminLayout() {
  const { pathname } = useLocation();
  const key = pathname === '/' ? '/' : '/' + pathname.split('/')[1];
  const t = THEMES[key] || THEMES['/'];

  return (
    <div
      className="admin-shell"
      style={{ ['--page-accent' as any]: t.accent, ['--page-soft' as any]: t.soft, ['--page-grad' as any]: t.grad }}
    >
      <div className="page-stripe" />
      <Sidebar />
      <div className="admin-main">
        <Topbar />
        <main className="admin-content" key={key}>
          <div className="page-body">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

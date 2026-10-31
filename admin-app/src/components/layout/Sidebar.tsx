import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, Users, Car, Map, Settings, FileText, LogOut, CreditCard, Wallet, Tag } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Sidebar() {
  const { role, name, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <Users size={20} />, label: 'Users', path: '/users' },
    { icon: <Car size={20} />, label: 'Drivers', path: '/drivers' },
    { icon: <Map size={20} />, label: 'Rides', path: '/rides' },
    { icon: <Wallet size={20} />, label: 'Driver Payouts', path: '/payouts' },
    { icon: <CreditCard size={20} />, label: 'Payments', path: '/stripe' },
    { icon: <Tag size={20} />, label: 'Coupons', path: '/coupons' },
    { icon: <FileText size={20} />, label: 'Reports', path: '/reports' },
    { icon: <ShieldAlert size={20} />, label: 'Safety', path: '/safety' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="gr-sidebar" style={styles.sidebar}>
      <div className="gr-logo-wrap" style={styles.logoContainer}>
        <div style={styles.logo}>GR</div>
        <span className="gr-brand" style={styles.brandName}>Golden Ride</span>
      </div>

      <nav style={styles.nav}>
        <div style={styles.navGroup}>
          <p className="gr-navtitle" style={styles.navTitle}>MANAGEMENT</p>
          {menuItems.map((item, idx) => (
            <NavLink 
              key={idx} 
              to={item.path} 
              end={item.path === '/'}
              title={item.label}
              style={({ isActive }) => ({
                ...styles.navLink,
                background: isActive ? 'linear-gradient(90deg, rgba(99,102,241,0.35), rgba(99,102,241,0.08))' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8',
                boxShadow: isActive ? 'inset 3px 0 0 #818cf8' : 'none'
              })}
            >
              {item.icon}
              <span className="gr-label" style={{ fontWeight: 500 }}>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      <div style={styles.footer}>
        <div style={styles.adminProfile}>
          <div style={styles.avatar}>{name ? name.charAt(0).toUpperCase() : 'A'}</div>
          <div className="gr-profile-text" style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{name || 'Admin'}</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>
              {role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </p>
          </div>
          <LogOut 
            size={18} 
            color="#94a3b8" 
            style={{ cursor: 'pointer' }} 
            onClick={handleLogout} 
          />
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    background: 'linear-gradient(180deg, #0b1220 0%, #111a33 100%)',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    left: 0,
    top: 0,
    zIndex: 100,
  },
  logoContainer: {
    height: '70px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logo: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg,#f59e0b,#f97316)',
    boxShadow: '0 6px 14px -4px rgba(245,158,11,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '14px',
    color: '#fff',
  },
  brandName: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#f8fafc',
    letterSpacing: '-0.5px',
  },
  nav: {
    flex: 1,
    padding: '24px 0',
    overflowY: 'auto' as const,
  },
  navGroup: {
    marginBottom: '24px',
  },
  navTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '1.5px',
    padding: '0 24px',
    marginBottom: '12px',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    gap: '14px',
    textDecoration: 'none',
    fontSize: '14px',
    transition: 'var(--transition)',
  },
  footer: {
    padding: '20px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  adminProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: '#fff',
  }
};

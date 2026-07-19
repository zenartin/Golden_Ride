import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loginAdmin } from '../api/client';
import { Shield } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const data = await loginAdmin({ email, password });
      setAuth(data.access_token, data.role, data.name);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Decorative background element */}
      <div style={styles.bgBlob}></div>
      <div style={styles.bgBlob2}></div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <Shield size={32} color="#fff" />
          </div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to Golden Ride Dashboard</p>
        </div>
        
        {error && (
          <div style={styles.error}>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={styles.input} 
              placeholder="admin@goldenride.com"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={styles.input} 
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            style={isLoading ? { ...styles.button, opacity: 0.7 } : styles.button} 
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#f1f5f9',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  bgBlob: {
    position: 'absolute' as const,
    top: '-10%',
    left: '-10%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(59, 130, 246, 0))',
    filter: 'blur(80px)',
    zIndex: 0,
  },
  bgBlob2: {
    position: 'absolute' as const,
    bottom: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(52, 211, 153, 0))',
    filter: 'blur(80px)',
    zIndex: 0,
  },
  card: {
    backgroundColor: 'var(--bg-surface)',
    padding: '48px',
    borderRadius: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
    width: '100%',
    maxWidth: '440px',
    position: 'relative' as const,
    zIndex: 1,
    border: '1px solid rgba(255,255,255,0.5)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  logoWrap: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, var(--primary-accent), #3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '15px',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderLeft: '4px solid var(--danger)',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: '#f8fafc',
    color: 'var(--text-primary)',
  },
  button: {
    backgroundColor: 'var(--primary-accent)',
    color: 'white',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '12px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    transition: 'transform 0.1s, background-color 0.2s',
  }
};

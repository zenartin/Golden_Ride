import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { loginAdmin } from '../api/client';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        setError('Cannot connect to server. Please check your connection.');
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgBlob}></div>
      <div style={styles.bgBlob2}></div>

      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <Shield size={32} color="#fff" />
          </div>
          <h1 style={styles.title}>Golden Ride Admin</h1>
          <p style={styles.subtitle}>Sign in to your admin dashboard</p>
        </div>

        {error && (
          <div style={styles.error} role="alert">
            <span style={styles.errorDot}>●</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="admin@goldenride.com"
              autoComplete="email"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label} htmlFor="password">Password</label>
            <div style={styles.passwordWrap}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...styles.input, paddingRight: '48px' }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="login-btn"
            style={isLoading ? { ...styles.button, opacity: 0.75, cursor: 'not-allowed' } : styles.button}
            disabled={isLoading}
          >
            {isLoading ? (
              <span style={styles.loadingWrap}>
                <span style={styles.spinner}></span>
                Authenticating...
              </span>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        <p style={styles.footer}>Golden Ride Admin Panel &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  bgBlob: {
    position: 'absolute',
    top: '-15%',
    left: '-15%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(59,130,246,0))',
    filter: 'blur(80px)',
    zIndex: 0,
  },
  bgBlob2: {
    position: 'absolute',
    bottom: '-20%',
    right: '-10%',
    width: '700px',
    height: '700px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0))',
    filter: 'blur(80px)',
    zIndex: 0,
  },
  card: {
    backgroundColor: '#fff',
    padding: '48px',
    borderRadius: '24px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.05)',
    width: '100%',
    maxWidth: '460px',
    position: 'relative',
    zIndex: 1,
    border: '1px solid #e2e8f0',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoWrap: {
    width: '68px',
    height: '68px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    boxShadow: '0 10px 24px rgba(37,99,235,0.3)',
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#0f172a',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '15px',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '14px 16px',
    borderRadius: '10px',
    marginBottom: '24px',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  errorDot: {
    color: '#dc2626',
    fontSize: '10px',
    flexShrink: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  passwordWrap: {
    position: 'relative',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1.5px solid #e2e8f0',
    fontSize: '15px',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    width: '100%',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  eyeBtn: {
    position: 'absolute',
    right: '14px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    padding: '0',
  },
  button: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '16px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
    transition: 'transform 0.1s, box-shadow 0.2s',
    width: '100%',
  },
  loadingWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.4)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    display: 'inline-block',
  },
  footer: {
    textAlign: 'center',
    marginTop: '32px',
    color: '#94a3b8',
    fontSize: '12px',
  },
};

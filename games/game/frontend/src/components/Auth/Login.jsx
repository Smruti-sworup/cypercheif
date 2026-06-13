import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      SoundSynth.playClick();
      await login(email, password);
      SoundSynth.playWin();
    } catch (err) {
      setErrorMsg(err.message);
      SoundSynth.playLose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} className="card-panel" style={styles.form}>
        <div style={styles.header}>
          <h2>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Log in to access your game rooms and stats.
          </p>
        </div>

        {errorMsg && (
          <div style={styles.errorBanner}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email Address:</label>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password:</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: 10 }}>
          {loading ? 'Logging In...' : 'Log In'}
        </button>

        <p style={styles.switchText}>
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToRegister} style={styles.switchBtn}>
            Register Here
          </button>
        </p>
      </form>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24
  },
  form: {
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  header: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: 'var(--accent-danger)',
    padding: 10,
    borderRadius: 8,
    fontSize: 12
  },
  switchText: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginTop: 10
  },
  switchBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--primary)',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0
  }
};

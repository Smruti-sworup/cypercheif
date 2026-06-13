import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import SoundSynth from './utils/soundSynth';

// Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import GameRoom from './components/Games/GameRoom';

function MainApp() {
  const { user, loading } = useAuth();
  const [view, setView] = useState('home'); // 'home', 'login', 'register', 'dashboard', 'game'
  const [activeRoomDetails, setActiveRoomDetails] = useState(null);
  const [customTheme, setCustomTheme] = useState('theme_default');

  // Sync initial view based on login state
  useEffect(() => {
    if (!loading) {
      if (user) {
        setView('dashboard');
      } else if (view === 'dashboard' || view === 'game') {
        setView('home');
      }
    }
  }, [user, loading]);

  const handleStartPlaying = () => {
    SoundSynth.playClick();
    if (user) {
      setView('dashboard');
    } else {
      setView('login');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loaderSpinner}>🎮</div>
        <h2>Loading Gaming Arena...</h2>
      </div>
    );
  }

  // Inject active custom theme variables into the document
  const applyCustomTheme = (themeId) => {
    setCustomTheme(themeId);
    const root = document.documentElement;

    if (themeId === 'theme_neon') {
      root.style.setProperty('--primary', '#ff007f'); // Neon Pink
      root.style.setProperty('--primary-glow', 'rgba(255, 0, 127, 0.35)');
      root.style.setProperty('--bg-primary', '#020005');
      root.style.setProperty('--bg-secondary', '#0b0014');
      root.style.setProperty('--bg-tertiary', '#19002d');
    } else if (themeId === 'theme_matrix') {
      root.style.setProperty('--primary', '#00ff00'); // Matrix Green
      root.style.setProperty('--primary-glow', 'rgba(0, 255, 0, 0.35)');
      root.style.setProperty('--bg-primary', '#040d04');
      root.style.setProperty('--bg-secondary', '#0d1a0d');
      root.style.setProperty('--bg-tertiary', '#162d16');
    } else if (themeId === 'theme_sunset') {
      root.style.setProperty('--primary', '#f59e0b'); // Amber
      root.style.setProperty('--primary-glow', 'rgba(245, 158, 11, 0.35)');
      root.style.setProperty('--bg-primary', '#180f2a'); // Purple Sunset
      root.style.setProperty('--bg-secondary', '#24143e');
      root.style.setProperty('--bg-tertiary', '#321953');
    } else {
      // Default / reset
      root.removeAttribute('style');
    }
  };

  return (
    <div className="app-container">
      {/* 1. LANDING / HOME PAGE */}
      {view === 'home' && (
        <div style={styles.homeContainer}>
          <div style={styles.heroSection} className="card-panel">
            <h1 style={styles.title} className="text-gradient">Ultimate Gaming Hub</h1>
            <p style={styles.subtitle}>
              The premium multiplayer arena for classic board games. Play Chess, Carrom, Ludo, and Tic-Tac-Toe with players globally or practice against a perfect minimax AI.
            </p>
            <div style={styles.heroActions}>
              <button onClick={handleStartPlaying} className="btn-primary" style={{ padding: '16px 32px', fontSize: 16 }}>
                ⚡ Play Now
              </button>
              <button onClick={() => { setView('register'); SoundSynth.playClick(); }} className="btn-secondary" style={{ padding: '16px 32px', fontSize: 16 }}>
                Register Account
              </button>
            </div>
          </div>

          {/* Featured Games showcase */}
          <div style={styles.featuresRow}>
            {[
              { title: '♟️ Chess', desc: 'Drag-and-drop board, full legal movements validation, ELO ranking tracking, and bot matches.' },
              { title: '⚪ Carrom', desc: 'Canvas physics engine simulating striker aim, puck elastic collisions, friction, and board pocketings.' },
              { title: '🎲 Ludo', desc: 'Classic 2-4 player paths grid, roll-a-6 release rules, safety zones, and token capturing.' },
              { title: '❌ Tic Tac Toe', desc: 'Classic 3x3 grid with socket turn-sync, or try defeating the perfect Minimax bot offline.' }
            ].map((f, i) => (
              <div key={i} className="card-panel hover-card" style={styles.featureCard}>
                <h3>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 6 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          <footer style={styles.footer}>
            © 2026 Ultimate Multiplayer Gaming Hub. programmatically built with high-fidelity React, Sockets, and Audio Synthesis.
          </footer>
        </div>
      )}

      {/* 2. AUTHENTICATION PAGES */}
      {view === 'login' && <Login onSwitchToRegister={() => setView('register')} />}
      {view === 'register' && <Register onSwitchToLogin={() => setView('login')} />}

      {/* 3. CORE LOBBY DASHBOARD */}
      {view === 'dashboard' && (
        <Dashboard
          onStartGame={(roomDetails) => {
            setActiveRoomDetails(roomDetails);
            setView('game');
          }}
          setGlobalTheme={applyCustomTheme}
        />
      )}

      {/* 4. ACTIVE GAMEPLAY ROOM */}
      {view === 'game' && activeRoomDetails && (
        <div style={{ padding: 24 }}>
          <GameRoom
            roomDetails={activeRoomDetails}
            onBackToLobby={() => {
              setView('dashboard');
              setActiveRoomDetails(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [viewState, setViewState] = useState('home');

  return (
    <ThemeProvider>
      <AuthProvider setView={setViewState}>
        <SocketProvider>
          <div style={{ width: '100vw', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            <MainApp />
          </div>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0a0e17',
    color: '#fff',
    gap: 12
  },
  loaderSpinner: {
    fontSize: 48,
    animation: 'spin 2s linear infinite'
  },
  homeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
    padding: '48px 24px',
    maxWidth: 1000,
    margin: '0 auto',
    minHeight: '100vh'
  },
  heroSection: {
    width: '100%',
    textAlign: 'center',
    padding: '64px 32px',
    background: 'linear-gradient(135deg, rgba(22, 30, 49, 0.95) 0%, rgba(168, 85, 247, 0.1) 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: '-0.03em'
  },
  subtitle: {
    maxWidth: 680,
    color: 'var(--text-secondary)',
    fontSize: 16,
    lineHeight: 1.6
  },
  heroActions: {
    display: 'flex',
    gap: 16,
    marginTop: 12
  },
  featuresRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    width: '100%'
  },
  featureCard: {
    padding: 20
  },
  footer: {
    marginTop: 'auto',
    textAlign: 'center',
    fontSize: 12,
    color: 'var(--text-muted)'
  }
};

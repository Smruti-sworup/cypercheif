import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import SoundSynth from '../../utils/soundSynth';

// Subcomponents
import Lobby from '../Lobby/Lobby';
import Profile from '../Profile/Profile';
import Leaderboard from '../Leaderboard/Leaderboard';
import Shop from '../Shop/Shop';
import Chat from '../Chat/Chat';
import AdminPanel from '../Admin/AdminPanel';

export default function Dashboard({ onStartGame, setGlobalTheme }) {
  const { user, logout, claimDaily } = useAuth();
  const { onlineCount } = useSocket();

  const [activeTab, setActiveTab] = useState('lobby'); // 'lobby', 'profile', 'leaderboard', 'shop', 'chat', 'admin'
  const [claimMessage, setClaimMessage] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    SoundSynth.playClick();
  };

  const handleClaimDaily = async () => {
    try {
      setClaimLoading(true);
      setClaimMessage(null);
      SoundSynth.playClick();

      const data = await claimDaily();
      setClaimMessage({ success: true, text: data.message });
      SoundSynth.playWin();
    } catch (e) {
      setClaimMessage({ success: false, text: e.message });
      SoundSynth.playLose();
    } finally {
      setClaimLoading(false);
      setTimeout(() => setClaimMessage(null), 3000);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Navbar */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🎮</span>
          <h2>Ultimate Gaming Hub</h2>
        </div>

        <div style={styles.headerMeta}>
          <span style={styles.onlineBadge}>
            ● {onlineCount} online
          </span>

          <div style={styles.profileBadge}>
            <span style={styles.avatarSymbol}>{user?.username[0].toUpperCase()}</span>
            <div style={styles.profileMetaInfo}>
              <span style={styles.username}>{user?.username}</span>
              <span style={styles.statsMini}>ELO: {user?.elo} | 💰 {user?.coins}</span>
            </div>
          </div>

          <button
            onClick={handleClaimDaily}
            disabled={claimLoading}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: 12 }}
          >
            {claimLoading ? 'Claiming...' : '📅 Claim Daily'}
          </button>

          <button onClick={logout} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>
            Logout
          </button>
        </div>
      </header>

      {claimMessage && (
        <div
          style={{
            ...styles.alertBanner,
            background: claimMessage.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 110, 110, 0.15)',
            borderColor: claimMessage.success ? 'var(--accent-success)' : 'var(--accent-danger)',
            color: claimMessage.success ? 'var(--accent-success)' : 'var(--accent-danger)'
          }}
        >
          {claimMessage.text}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div style={styles.workspace}>
        {/* Sidebar Nav */}
        <nav style={styles.sidebar}>
          <button
            onClick={() => handleTabChange('lobby')}
            style={{ ...styles.navItem, ...(activeTab === 'lobby' ? styles.activeNav : {}) }}
          >
            🎮 Play Arena
          </button>
          <button
            onClick={() => handleTabChange('profile')}
            style={{ ...styles.navItem, ...(activeTab === 'profile' ? styles.activeNav : {}) }}
          >
            👤 My Profile
          </button>
          <button
            onClick={() => handleTabChange('leaderboard')}
            style={{ ...styles.navItem, ...(activeTab === 'leaderboard' ? styles.activeNav : {}) }}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => handleTabChange('shop')}
            style={{ ...styles.navItem, ...(activeTab === 'shop' ? styles.activeNav : {}) }}
          >
            🛍️ Customizer Shop
          </button>
          <button
            onClick={() => handleTabChange('chat')}
            style={{ ...styles.navItem, ...(activeTab === 'chat' ? styles.activeNav : {}) }}
          >
            💬 Chat Lounge
          </button>

          {user?.role === 'admin' && (
            <button
              onClick={() => handleTabChange('admin')}
              style={{ ...styles.navItem, ...styles.adminNavItem, ...(activeTab === 'admin' ? styles.activeNav : {}) }}
            >
              🛠️ Admin Control
            </button>
          )}
        </nav>

        {/* Tab Panel Render */}
        <main style={styles.content}>
          {activeTab === 'lobby' && <Lobby onStartGame={onStartGame} />}
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'shop' && <Shop setGlobalTheme={setGlobalTheme} />}
          {activeTab === 'chat' && <Chat />}
          {activeTab === 'admin' && user?.role === 'admin' && <AdminPanel />}
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden'
  },
  header: {
    height: 70,
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--card-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 24px',
    zIndex: 10
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  logoIcon: {
    fontSize: 28
  },
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 16
  },
  onlineBadge: {
    color: 'var(--accent-success)',
    fontSize: 12,
    fontWeight: '600'
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--card-border)',
    padding: '6px 12px',
    borderRadius: 8
  },
  avatarSymbol: {
    width: 32,
    height: 32,
    background: 'var(--primary-glow)',
    border: '1px solid var(--primary)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontWeight: 'bold',
    fontSize: 14
  },
  profileMetaInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  username: {
    fontWeight: 'bold',
    fontSize: 13,
    lineHeight: 1.2
  },
  statsMini: {
    fontSize: 11,
    color: 'var(--text-muted)'
  },
  alertBanner: {
    borderBottom: '1px solid',
    padding: '8px 24px',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '500'
  },
  workspace: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  sidebar: {
    width: 240,
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--card-border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
    gap: 8,
    overflowY: 'auto'
  },
  navItem: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    fontSize: 14,
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  activeNav: {
    background: 'var(--bg-tertiary)',
    color: 'var(--primary)',
    fontWeight: '600'
  },
  adminNavItem: {
    marginTop: 'auto',
    border: '1px dashed rgba(239, 68, 68, 0.25)',
    color: 'var(--accent-danger)'
  },
  content: {
    flex: 1,
    padding: 24,
    overflowY: 'auto',
    background: 'var(--bg-primary)'
  }
};

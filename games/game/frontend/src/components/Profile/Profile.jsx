import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function Profile() {
  const { user, token, equipAvatar, loadMe } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendUsername, setFriendUsername] = useState('');
  const [friendMsg, setFriendMsg] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/user/profile/${user.username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendUsername.trim()) return;

    try {
      setInviteLoading(true);
      setFriendMsg(null);
      SoundSynth.playClick();

      const res = await fetch('http://localhost:5000/api/user/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUsername: friendUsername.trim() })
      });
      const data = await res.json();

      if (res.ok) {
        setFriendMsg({ success: true, text: data.message });
        setFriendUsername('');
        SoundSynth.playWin();
      } else {
        setFriendMsg({ success: false, text: data.error });
        SoundSynth.playLose();
      }
    } catch (err) {
      setFriendMsg({ success: false, text: 'Network error sending request.' });
      SoundSynth.playLose();
    } finally {
      setInviteLoading(false);
      setTimeout(() => setFriendMsg(null), 3000);
    }
  };

  const handleEquip = async (avatarId) => {
    try {
      SoundSynth.playClick();
      await equipAvatar(avatarId);
      await loadProfile(); // Refresh profile state
      await loadMe(); // Refresh sidebar header
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !profileData) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading profile...</div>;
  }

  const { stats, matchHistory, achievements } = profileData;

  return (
    <div style={styles.container}>
      {/* Overview stats panel */}
      <div className="card-panel" style={styles.statsCard}>
        <div style={styles.avatarMain}>
          <span style={styles.avatarText}>{profileData.username[0].toUpperCase()}</span>
          <h3>{profileData.username}</h3>
          <span style={styles.roleBadge}>{profileData.role.toUpperCase()}</span>
        </div>

        <div style={styles.statMetrics}>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{profileData.elo}</span>
            <span style={styles.metricLabel}>ELO RATING</span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{stats.wins}</span>
            <span style={styles.metricLabel}>WINS</span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{stats.losses}</span>
            <span style={styles.metricLabel}>LOSSES</span>
          </div>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{stats.winRate}%</span>
            <span style={styles.metricLabel}>WIN RATE</span>
          </div>
        </div>
      </div>

      <div style={styles.subGrid}>
        {/* Left column: Friends request & inventory customizer */}
        <div style={styles.leftCol}>
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3>🤝 Send Friend Request</h3>
            <form onSubmit={handleAddFriend} style={styles.friendForm}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter friend's username..."
                value={friendUsername}
                onChange={(e) => setFriendUsername(e.target.value)}
              />
              <button type="submit" disabled={inviteLoading} className="btn-primary" style={{ flexShrink: 0 }}>
                Send Request
              </button>
            </form>
            {friendMsg && (
              <span
                style={{
                  fontSize: 12,
                  color: friendMsg.success ? 'var(--accent-success)' : 'var(--accent-danger)'
                }}
              >
                {friendMsg.text}
              </span>
            )}
          </div>

          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            <h3>🖼️ Avatar Customizer</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Unlocked avatars in inventory. Click to equip:
            </p>
            <div style={styles.avatarGrid}>
              {user.inventory.filter(i => i.startsWith('avatar')).map(av => {
                const isEquipped = profileData.avatarUrl === av;
                return (
                  <button
                    key={av}
                    onClick={() => handleEquip(av)}
                    style={{
                      ...styles.avatarBtn,
                      borderColor: isEquipped ? 'var(--primary)' : 'var(--card-border)',
                      background: isEquipped ? 'var(--primary-glow)' : 'transparent'
                    }}
                  >
                    <div>👦</div>
                    <span style={{ fontSize: 10, fontWeight: 'bold' }}>{av.replace('avatar_', '').toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: Match History & Achievements */}
        <div style={styles.rightCol}>
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3>🏆 Unlocked Achievements</h3>
            <div style={styles.achGrid}>
              {achievements.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No achievements unlocked yet. Play multiplayer matches!</div>
              ) : (
                achievements.map(a => (
                  <div key={a.id} style={styles.achCard} className="hover-card">
                    <span style={styles.achIcon}>{a.iconKey}</span>
                    <div style={styles.achDetails}>
                      <span style={{ fontWeight: 'bold', fontSize: 13 }}>{a.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.description}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            <h3>📜 Match History</h3>
            <div style={styles.matchList}>
              {matchHistory.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No games played yet. Go make history!</div>
              ) : (
                matchHistory.map(m => {
                  const me = m.players.find(p => p.userId === user.id);
                  const outcome = me ? me.outcome : 'unknown';
                  return (
                    <div key={m.id} style={styles.matchItem}>
                      <span style={{ fontWeight: 'bold', fontSize: 13 }}>{m.gameType.toUpperCase()}</span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: outcome === 'win' ? 'var(--accent-success)' : outcome === 'draw' ? 'var(--accent-warning)' : 'var(--accent-danger)'
                        }}
                      >
                        {outcome.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(m.date).toLocaleDateString()}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20
  },
  statsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 32,
    background: 'linear-gradient(135deg, rgba(22, 30, 49, 0.8) 0%, rgba(168, 85, 247, 0.1) 100%)'
  },
  avatarMain: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6
  },
  avatarText: {
    width: 64,
    height: 64,
    background: 'var(--secondary-glow)',
    border: '2px solid var(--secondary)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontSize: 28,
    fontWeight: 'bold'
  },
  roleBadge: {
    background: 'var(--primary-glow)',
    border: '1px solid var(--primary)',
    color: 'var(--primary)',
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 'bold'
  },
  statMetrics: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    padding: 16
  },
  metricVal: {
    fontSize: 24,
    fontWeight: '800',
    color: 'var(--primary)'
  },
  metricLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    marginTop: 4
  },
  subGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: 20
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  friendForm: {
    display: 'flex',
    gap: 10
  },
  avatarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10
  },
  avatarBtn: {
    border: '1px solid',
    borderRadius: 10,
    padding: 10,
    cursor: 'pointer',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4
  },
  achGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  achCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.01)',
    border: '1px solid var(--card-border)',
    borderRadius: 10,
    padding: 10
  },
  achIcon: {
    fontSize: 24
  },
  achDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  matchList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  matchItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.1)',
    border: '1px solid var(--card-border)',
    borderRadius: 8,
    padding: '10px 14px'
  }
};

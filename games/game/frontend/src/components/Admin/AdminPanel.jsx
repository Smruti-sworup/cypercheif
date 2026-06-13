import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function AdminPanel() {
  const { token } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch users
      const usersRes = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.ok ? await usersRes.json() : [];
      setUsers(usersData);

      // Fetch stats
      const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.ok ? await statsRes.json() : null;
      setStats(statsData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (userObj) => {
    const isBanning = !userObj.isBanned;
    const endpoint = isBanning ? 'ban' : 'unban';
    
    SoundSynth.playClick();
    setActionMsg(null);

    try {
      const res = await fetch(`http://localhost:5000/api/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: userObj.id })
      });
      const data = await res.json();

      if (res.ok) {
        setActionMsg({ success: true, text: data.message });
        SoundSynth.playWin();
        loadAdminData(); // Refresh lists
      } else {
        setActionMsg({ success: false, text: data.error });
        SoundSynth.playLose();
      }
    } catch (e) {
      setActionMsg({ success: false, text: 'Network failure toggling ban status.' });
      SoundSynth.playLose();
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading administration dashboard...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={{ marginBottom: 10 }}>🛠️ Server Administration</h2>

      {actionMsg && (
        <div
          style={{
            ...styles.alert,
            borderColor: actionMsg.success ? 'var(--accent-success)' : 'var(--accent-danger)',
            color: actionMsg.success ? 'var(--accent-success)' : 'var(--accent-danger)'
          }}
        >
          {actionMsg.text}
        </div>
      )}

      {/* Stats Summary cards */}
      {stats && (
        <div style={styles.statsRow}>
          <div className="card-panel" style={styles.statCard}>
            <span style={styles.statLabel}>TOTAL USERS</span>
            <span style={styles.statVal}>{stats.totalUsers} ({stats.bannedUsers} Banned)</span>
          </div>
          <div className="card-panel" style={styles.statCard}>
            <span style={styles.statLabel}>TOTAL MATCHES</span>
            <span style={styles.statVal}>{stats.totalMatches}</span>
          </div>
          <div className="card-panel" style={styles.statCard}>
            <span style={styles.statLabel}>AVERAGE ELO</span>
            <span style={styles.statVal}>{stats.avgElo}</span>
          </div>
          <div className="card-panel" style={styles.statCard}>
            <span style={styles.statLabel}>GAME POPULARITY</span>
            <span style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>
              Chess: {stats.breakdown.chess} | Carrom: {stats.breakdown.carrom} | Ludo: {stats.breakdown.ludo} | TTT: {stats.breakdown.ttt}
            </span>
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="card-panel" style={styles.tableCard}>
        <h3>👤 Registered User Accounts</h3>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>USERNAME</th>
                <th style={styles.th}>EMAIL</th>
                <th style={styles.th}>ELO</th>
                <th style={styles.th}>COINS</th>
                <th style={styles.th}>ROLE</th>
                <th style={styles.th}>STATUS</th>
                <th style={styles.th}>MODERATION</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={styles.tr}>
                  <td style={styles.td}>{u.username}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}>{u.elo}</td>
                  <td style={styles.td}>💰 {u.coins}</td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, color: u.role === 'admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ color: u.isBanned ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
                      {u.isBanned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => toggleBan(u)}
                        className="btn-secondary"
                        style={{
                          padding: '4px 10px',
                          fontSize: 12,
                          borderColor: u.isBanned ? 'var(--accent-success)' : 'var(--accent-danger)',
                          color: u.isBanned ? 'var(--accent-success)' : 'var(--accent-danger)'
                        }}
                      >
                        {u.isBanned ? 'Unban Account' : 'Ban Account'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  alert: {
    padding: 10,
    border: '1px solid',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '600'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: 16
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    fontWeight: 'bold'
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: 'var(--primary)',
    marginTop: 4
  },
  tableCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    borderBottom: '2px solid var(--card-border)'
  },
  th: {
    padding: 12,
    fontSize: 11,
    color: 'var(--text-muted)',
    fontWeight: 'bold'
  },
  tr: {
    borderBottom: '1px solid var(--card-border)'
  },
  td: {
    padding: 12,
    fontSize: 13
  },
  badge: {
    fontWeight: 'bold',
    fontSize: 11
  }
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function Leaderboard() {
  const { token } = useAuth();
  const [timeframe, setTimeframe] = useState('alltime'); // 'alltime', 'weekly', 'monthly'
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [timeframe]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:5000/api/game/leaderboard?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    SoundSynth.playClick();
  };

  return (
    <div style={styles.container} className="card-panel">
      <div style={styles.header}>
        <h3>🏆 Hall of Fame</h3>
        
        {/* Toggle timeline tabs */}
        <div style={styles.tabBar}>
          {['alltime', 'weekly', 'monthly'].map(tf => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              style={{
                ...styles.tabBtn,
                background: timeframe === tf ? 'var(--primary-glow)' : 'transparent',
                borderColor: timeframe === tf ? 'var(--primary)' : 'transparent',
                color: timeframe === tf ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              {tf === 'alltime' ? 'All Time ELO' : tf === 'weekly' ? 'Weekly Wins' : 'Monthly Wins'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', padding: 20 }}>Loading standings...</div>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>RANK</th>
                <th style={styles.th}>USER</th>
                <th style={styles.th}>ELO</th>
                <th style={styles.th}>
                  {timeframe === 'alltime' ? 'COINS' : 'PERIOD WINS'}
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.emptyCell}>
                    No records found for this period.
                  </td>
                </tr>
              ) : (
                leaderboard.map((player, idx) => {
                  const rank = idx + 1;
                  const isPodium = rank <= 3;
                  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                  return (
                    <tr
                      key={player.id}
                      style={{
                        ...styles.tr,
                        background: isPodium ? 'rgba(255, 255, 255, 0.02)' : 'transparent'
                      }}
                    >
                      <td style={{ ...styles.td, fontWeight: '800', fontSize: isPodium ? 16 : 13 }}>
                        {medal}
                      </td>
                      <td style={styles.td}>
                        <div style={styles.userCell}>
                          <span style={styles.avatarMini}>{player.username[0].toUpperCase()}</span>
                          <span style={{ fontWeight: '600' }}>{player.username}</span>
                        </div>
                      </td>
                      <td style={styles.td}>{player.elo}</td>
                      <td style={{ ...styles.td, color: 'var(--primary)' }}>
                        {timeframe === 'alltime' ? `💰 ${player.coins}` : `${player.periodWins} wins`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--card-border)',
    paddingBottom: 14
  },
  tabBar: {
    display: 'flex',
    gap: 10,
    background: 'rgba(0,0,0,0.15)',
    padding: 4,
    borderRadius: 8
  },
  tabBtn: {
    padding: '6px 12px',
    border: '1px solid transparent',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
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
    fontWeight: 'bold',
    color: 'var(--text-muted)',
    letterSpacing: '0.05em'
  },
  tr: {
    borderBottom: '1px solid var(--card-border)',
    transition: 'background-color 0.15s ease'
  },
  td: {
    padding: '14px 12px',
    fontSize: 13,
    color: 'var(--text-primary)'
  },
  emptyCell: {
    textAlign: 'center',
    padding: 24,
    color: 'var(--text-muted)'
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  avatarMini: {
    width: 24,
    height: 24,
    background: 'var(--primary-glow)',
    border: '1px solid var(--primary)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    fontSize: 11,
    fontWeight: 'bold'
  }
};

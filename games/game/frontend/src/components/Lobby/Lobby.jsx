import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

export default function Lobby({ onStartGame }) {
  const { socket, onlineCount } = useSocket();
  const { user, token } = useAuth();

  const [gameSelection, setGameSelection] = useState('chess');
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [queueStatus, setQueueStatus] = useState('idle'); // 'idle', 'searching'
  const [matchmakingTimer, setMatchmakingTimer] = useState(0);
  const [publicRooms, setPublicRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState(null);

  // Matchmaking timer effect
  useEffect(() => {
    let interval = null;
    if (queueStatus === 'searching') {
      interval = setInterval(() => {
        setMatchmakingTimer(t => t + 1);
      }, 1000);
    } else {
      setMatchmakingTimer(0);
    }
    return () => clearInterval(interval);
  }, [queueStatus]);

  // Load public rooms & listen for updates
  useEffect(() => {
    loadPublicRooms();

    if (!socket) return;

    // Room events
    socket.on('room_created', (room) => {
      SoundSynth.playWin();
      onStartGame({
        roomCode: room.roomCode,
        gameType: room.gameType,
        isMultiplayer: true,
        mySymbol: 'X',
        opponent: null,
        players: room.players
      });
    });

    socket.on('room_joined', (data) => {
      const { room } = data;
      SoundSynth.playWin();
      
      const isHost = room.hostId === user.id;
      const mySymbol = isHost ? 'X' : (room.gameType === 'chess' ? 'b' : 'O');
      const opponent = room.players.find(p => p.userId !== user.id) || null;

      onStartGame({
        roomCode: room.roomCode,
        gameType: room.gameType,
        isMultiplayer: true,
        mySymbol,
        opponent,
        players: room.players
      });
    });

    socket.on('matchmaking_found', (data) => {
      const { roomCode, gameType, players } = data;
      SoundSynth.playWin();

      const opponent = players.find(p => p.userId !== user.id) || null;
      const myIdx = players.findIndex(p => p.userId === user.id);
      const mySymbol = myIdx === 0 ? 'X' : 'O';

      setQueueStatus('idle');
      onStartGame({
        roomCode,
        gameType,
        isMultiplayer: true,
        mySymbol,
        opponent,
        players
      });
    });

    socket.on('matchmaking_status', (data) => {
      setQueueStatus(data.status);
    });

    socket.on('join_error', (data) => {
      setLobbyError(data.message);
      SoundSynth.playLose();
    });

    socket.on('public_rooms_changed', () => {
      loadPublicRooms();
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('matchmaking_found');
      socket.off('matchmaking_status');
      socket.off('join_error');
      socket.off('public_rooms_changed');
    };
  }, [socket, user, gameSelection, isPrivate]);

  const loadPublicRooms = async () => {
    try {
      setRoomsLoading(true);
      const res = await fetch('http://localhost:5000/api/game/match-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Lobbies are served dynamically, or we fallback
      if (res.ok) {
        // Fallback: we will fetch active rooms from DB.
        // For local simulation, we can query recent Match entries as a placeholder or mock active lobbies.
        // Let's create mock rooms if empty to demonstrate functionality.
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRoomsLoading(false);
    }
  };

  const startQuickMatch = () => {
    if (!socket) return;
    SoundSynth.playClick();
    socket.emit('start_matchmaking', { gameType: gameSelection });
    setQueueStatus('searching');
  };

  const cancelQuickMatch = () => {
    if (!socket) return;
    SoundSynth.playClick();
    socket.emit('stop_matchmaking', { gameType: gameSelection });
    setQueueStatus('idle');
  };

  const createRoom = () => {
    if (!socket) return;
    SoundSynth.playClick();
    socket.emit('create_room', { gameType: gameSelection, isPrivate });
  };

  const joinRoomByCode = () => {
    if (!socket || !roomCodeInput.trim()) return;
    SoundSynth.playClick();
    setLobbyError(null);
    socket.emit('join_room', { roomCode: roomCodeInput.toUpperCase() });
  };

  const playOffline = () => {
    SoundSynth.playClick();
    onStartGame({
      roomCode: 'OFFLINE',
      gameType: gameSelection,
      isMultiplayer: false,
      mySymbol: 'X',
      opponent: { username: 'AI Bot', elo: 1000 }
    });
  };

  return (
    <div style={styles.container}>
      {/* Search overlay modal */}
      {queueStatus === 'searching' && (
        <div style={styles.modalOverlay}>
          <div className="card-panel" style={styles.modalContent}>
            <div style={styles.spinner}>🎯</div>
            <h3>Finding Opponent...</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Game: {gameSelection.toUpperCase()}</p>
            <p style={{ fontSize: 24, fontWeight: '800', color: 'var(--primary)', margin: '12px 0' }}>
              {Math.floor(matchmakingTimer / 60)}:{(matchmakingTimer % 60).toString().padStart(2, '0')}
            </p>
            <button onClick={cancelQuickMatch} className="btn-secondary" style={{ width: '100%' }}>
              Cancel Search
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="card-panel" style={styles.heroBanner}>
        <h1 className="text-gradient">Gaming Arena</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Join {onlineCount} online players. Choose your game and show your skills!
        </p>
      </div>

      <div style={styles.mainGrid}>
        {/* Play Column */}
        <div className="card-panel" style={styles.configCol}>
          <h3>🎮 Game Configuration</h3>
          
          <div style={styles.controlGroup}>
            <label style={styles.label}>Select Game:</label>
            <div style={styles.gameGrid}>
              {['chess', 'carrom', 'ludo', 'ttt'].map(g => (
                <button
                  key={g}
                  onClick={() => { setGameSelection(g); SoundSynth.playClick(); }}
                  style={{
                    ...styles.gameBtn,
                    borderColor: gameSelection === g ? 'var(--primary)' : 'var(--card-border)',
                    background: gameSelection === g ? 'var(--primary-glow)' : 'transparent',
                    color: gameSelection === g ? 'var(--primary)' : 'var(--text-primary)'
                  }}
                >
                  {g === 'chess' ? '♟️ Chess' : g === 'carrom' ? '⚪ Carrom' : g === 'ludo' ? '🎲 Ludo' : '❌ Tic-Tac-Toe'}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.toggleRow}>
              <span>Private Custom Room:</span>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => { setIsPrivate(e.target.checked); SoundSynth.playClick(); }}
                style={styles.checkbox}
              />
            </label>
          </div>

          <div style={styles.actionRow}>
            <button onClick={startQuickMatch} className="btn-primary" style={{ flex: 1 }}>
              ⚡ Quick Match
            </button>
            <button onClick={createRoom} className="btn-secondary" style={{ flex: 1 }}>
              🏠 Create Room
            </button>
          </div>

          <div style={styles.divider}>OR PLAY OFFLINE</div>

          <button onClick={playOffline} className="btn-secondary" style={{ width: '100%', borderStyle: 'dashed' }}>
            🤖 Practice Vs AI Bot
          </button>
        </div>

        {/* Join Code Column */}
        <div className="card-panel" style={styles.joinCol}>
          <h3>🔑 Join Lobby Room</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>
            Have a room code? Enter it below to join your friends instantly.
          </p>

          <div style={styles.inputRow}>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. AB4C6D"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value)}
              style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}
            />
            <button onClick={joinRoomByCode} className="btn-primary" style={{ width: '100%' }}>
              Join Custom Room
            </button>
          </div>

          {lobbyError && (
            <div style={styles.errorText}>
              ⚠️ {lobbyError}
            </div>
          )}

          <div style={styles.infoBox}>
            <h4>Matchmaking Rules:</h4>
            <ul style={styles.rulesList}>
              <li>Chess and Tic-Tac-Toe are 2-player games.</li>
              <li>Ludo and Carrom support up to 4 players.</li>
              <li>Wins award virtual coins and ELO rating points.</li>
              <li>Achievements are only unlocked in multiplayer.</li>
            </ul>
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
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--shadow-overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    width: 320,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  spinner: {
    fontSize: 48,
    animation: 'spin 2s linear infinite'
  },
  heroBanner: {
    background: 'linear-gradient(135deg, rgba(22, 30, 49, 0.9) 0%, rgba(124, 58, 237, 0.15) 100%)',
    textAlign: 'center'
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20
  },
  configCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  joinCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  controlGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'var(--text-secondary)'
  },
  gameGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10
  },
  gameBtn: {
    padding: 12,
    border: '1px solid',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease'
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: '500'
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: 'pointer'
  },
  actionRow: {
    display: 'flex',
    gap: 12,
    marginTop: 10
  },
  divider: {
    textAlign: 'center',
    fontSize: 11,
    color: 'var(--text-muted)',
    position: 'relative',
    margin: '10px 0'
  },
  inputRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  errorText: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: 'var(--accent-danger)',
    padding: 10,
    borderRadius: 8,
    fontSize: 12
  },
  infoBox: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    padding: 14,
    marginTop: 'auto'
  },
  rulesList: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginLeft: 18,
    lineHeight: 1.6
  }
};

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import SoundSynth from '../../utils/soundSynth';

// Game Engines
import ChessGame from './Chess/ChessGame';
import CarromGame from './Carrom/CarromGame';
import LudoGame from './Ludo/LudoGame';
import TicTacToeGame from './TicTacToe/TicTacToeGame';

// Chat Component
import Chat from '../Chat/Chat';

export default function GameRoom({ roomDetails, onBackToLobby }) {
  const { socket } = useSocket();
  const { user, token } = useAuth();

  const { roomCode, gameType, isMultiplayer, mySymbol, opponent: initialOpponent } = roomDetails;

  const [players, setPlayers] = useState(roomDetails.players || []);
  const [isReady, setIsReady] = useState(false);
  const [gameStarted, setGameStarted] = useState(!isMultiplayer || roomDetails.players?.length >= 2);
  const [opponent, setOpponent] = useState(initialOpponent);
  const [friendsList, setFriendsList] = useState([]);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [inviteStatus, setInviteStatus] = useState(null);

  useEffect(() => {
    if (!isMultiplayer || !socket) return;

    // Listen to room updates
    socket.on('room_updated', (data) => {
      const { room } = data;
      setPlayers(room.players);
      
      const opp = room.players.find(p => p.userId !== user.id) || null;
      setOpponent(opp);
    });

    socket.on('room_joined', (data) => {
      const { room } = data;
      setPlayers(room.players);
      
      const opp = room.players.find(p => p.userId !== user.id) || null;
      setOpponent(opp);
      SoundSynth.playNotification();
    });

    socket.on('game_start', (data) => {
      setGameStarted(true);
      SoundSynth.playWin();
    });

    // Load active friends list for invitation
    loadFriends();

    return () => {
      socket.off('room_updated');
      socket.off('room_joined');
      socket.off('game_start');
    };
  }, [socket, isMultiplayer, user.id]);

  const loadFriends = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/user/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFriendsList(data.filter(f => f.status === 'accepted'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReadyToggle = () => {
    if (!socket) return;
    const nextReady = !isReady;
    setIsReady(nextReady);
    SoundSynth.playClick();
    socket.emit('player_ready', { roomCode, isReady: nextReady });
  };

  const handleInviteFriend = (friendId) => {
    if (!socket) return;
    SoundSynth.playClick();
    socket.emit('invite_friend', { friendId, roomCode, gameType });
    setInviteStatus(`Invitation sent to friend!`);
    setTimeout(() => setInviteStatus(null), 3000);
  };

  const handleLeave = () => {
    if (socket && isMultiplayer && !gameStarted) {
      socket.emit('leave_lobby_room', { roomCode });
    }
    SoundSynth.playClick();
    onBackToLobby();
  };

  return (
    <div style={styles.container}>
      {/* Game Header */}
      <div className="card-panel" style={styles.roomHeader}>
        <div style={styles.infoCol}>
          <h2>{gameType.toUpperCase()} ARENA</h2>
          {isMultiplayer && (
            <span style={styles.codeText}>
              Room Code: <strong style={{ color: 'var(--primary)', letterSpacing: '0.05em' }}>{roomCode}</strong>
            </span>
          )}
        </div>
        <button onClick={handleLeave} className="btn-secondary" style={{ padding: '8px 16px' }}>
          Leave Room
        </button>
      </div>

      <div style={styles.layoutGrid}>
        {/* Left Column: Game Area */}
        <div className="card-panel" style={styles.gameArea}>
          {gameStarted ? (
            gameType === 'chess' ? (
              <ChessGame
                roomCode={roomCode}
                isMultiplayer={isMultiplayer}
                opponent={opponent}
                myColor={mySymbol === 'X' ? 'w' : 'b'}
                onBackToLobby={onBackToLobby}
              />
            ) : gameType === 'carrom' ? (
              <CarromGame
                roomCode={roomCode}
                isMultiplayer={isMultiplayer}
                opponent={opponent}
                mySymbol={mySymbol}
                onBackToLobby={onBackToLobby}
              />
            ) : gameType === 'ludo' ? (
              <LudoGame
                roomCode={roomCode}
                isMultiplayer={isMultiplayer}
                opponent={opponent}
                myColor={mySymbol === 'X' ? 'r' : 'g'}
                onBackToLobby={onBackToLobby}
              />
            ) : (
              <TicTacToeGame
                roomCode={roomCode}
                isMultiplayer={isMultiplayer}
                opponent={opponent}
                mySymbol={mySymbol}
                onBackToLobby={onBackToLobby}
              />
            )
          ) : (
            // LOBBY WAITING SCREEN
            <div style={styles.waitingScreen}>
              <div style={styles.loader}>🎮</div>
              <h3>Waiting for Opponent...</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Share code <strong>{roomCode}</strong> with a friend to play!
              </p>

              {isMultiplayer && (
                <div style={styles.lobbyPlayers}>
                  <h4>Joined Players:</h4>
                  {players.map(p => (
                    <div key={p.userId} style={styles.playerRow}>
                      <span>{p.username}</span>
                      <span style={{ color: p.isReady ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {p.isReady ? 'READY' : 'NOT READY'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleReadyToggle}
                className="btn-primary"
                style={{
                  marginTop: 16,
                  width: '100%',
                  background: isReady ? 'var(--accent-success)' : 'var(--primary)'
                }}
              >
                {isReady ? '✓ You are Ready' : 'Set Ready'}
              </button>

              {/* Invite friend drawer */}
              <button
                onClick={() => { setShowInviteMenu(!showInviteMenu); SoundSynth.playClick(); }}
                className="btn-secondary"
                style={{ marginTop: 10, width: '100%' }}
              >
                ✉ Invite Friends
              </button>

              {showInviteMenu && (
                <div style={styles.inviteBox}>
                  {friendsList.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>No friends online to invite.</p>
                  ) : (
                    friendsList.map(f => (
                      <button
                        key={f.id}
                        onClick={() => handleInviteFriend(f.id)}
                        style={styles.inviteFriendRow}
                      >
                        <span>Invite {f.username}</span>
                        <span>✉</span>
                      </button>
                    ))
                  )}
                  {inviteStatus && <div style={{ fontSize: 11, color: 'var(--accent-success)', marginTop: 4 }}>{inviteStatus}</div>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: In-game chat pane */}
        {isMultiplayer && (
          <div style={styles.chatCol}>
            <Chat currentFriend={opponent} />
          </div>
        )}
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
  roomHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  codeText: {
    fontSize: 14,
    color: 'var(--text-secondary)'
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr',
    gap: 20
  },
  gameArea: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 450
  },
  waitingScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 320,
    textAlign: 'center'
  },
  loader: {
    fontSize: 48,
    animation: 'bounce 1s infinite alternate'
  },
  lobbyPlayers: {
    width: '100%',
    textAlign: 'left',
    marginTop: 16,
    background: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    border: '1px solid var(--card-border)'
  },
  playerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)'
  },
  inviteBox: {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--card-border)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  inviteFriendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--card-border)',
    padding: '8px 4px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: 12,
    textAlign: 'left',
    width: '100%'
  },
  chatCol: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  }
};

import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import SoundSynth from '../../../utils/soundSynth';

// Ludo 15x15 coordinate path mappings for Red ('r') and Green ('g')
// In a 2-player simplified setup, Red starts at bottom-left and Green starts at top-right.
// We map grid positions to (row, col) coordinates.
const trackCoordinates = [
  // Red start track (row 8, col 1)
  { r: 8, c: 1 }, { r: 8, c: 2 }, { r: 8, c: 3 }, { r: 8, c: 4 }, { r: 8, c: 5 },
  { r: 7, c: 5 }, { r: 6, c: 5 }, { r: 5, c: 5 }, { r: 4, c: 5 }, { r: 3, c: 5 }, { r: 2, c: 5 },
  { r: 2, c: 6 }, // Top track header
  { r: 2, c: 7 }, { r: 3, c: 7 }, { r: 4, c: 7 }, { r: 5, c: 7 }, { r: 6, c: 7 }, { r: 7, c: 7 },
  { r: 8, c: 7 }, { r: 8, c: 8 }, { r: 8, c: 9 }, { r: 8, c: 10 }, { r: 8, c: 11 }, { r: 8, c: 12 },
  { r: 8, c: 13 }, { r: 9, c: 13 }, // Right track header
  { r: 10, c: 13 }, { r: 10, c: 12 }, { r: 10, c: 11 }, { r: 10, c: 10 }, { r: 10, c: 9 }, { r: 10, c: 8 },
  { r: 10, c: 7 }, { r: 11, c: 7 }, { r: 12, c: 7 }, { r: 13, c: 7 }, { r: 14, c: 7 }, { r: 14, c: 6 }, // Bottom track header
  { r: 14, c: 5 }, { r: 13, c: 5 }, { r: 12, c: 5 }, { r: 11, c: 5 }, { r: 10, c: 5 }, { r: 9, c: 5 },
  { r: 9, c: 4 }, { r: 9, c: 3 }, { r: 9, c: 2 }, { r: 9, c: 1 }, { r: 9, c: 0 }, { r: 8, c: 0 } // Left track header
];

// Start offsets on the loop track
const startOffsets = { r: 0, g: 13 };
const safeCells = [0, 8, 13, 21, 26, 34, 39, 47]; // Star/Starting safety marks

export default function LudoGame({ roomCode, isMultiplayer, opponent, myColor, onBackToLobby }) {
  const { socket } = useSocket();
  const { user, setUser } = useAuth();

  const [tokens, setTokens] = useState({
    r: [
      { id: 0, pos: -1, x: 2, y: 2 }, // -1 means in Yard
      { id: 1, pos: -1, x: 3, y: 2 },
      { id: 2, pos: -1, x: 2, y: 3 },
      { id: 3, pos: -1, x: 3, y: 3 }
    ],
    g: [
      { id: 0, pos: -1, x: 11, y: 11 },
      { id: 1, pos: -1, x: 12, y: 11 },
      { id: 2, pos: -1, x: 11, y: 12 },
      { id: 3, pos: -1, x: 12, y: 12 }
    ]
  });

  const [diceVal, setDiceVal] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [turn, setTurn] = useState('r'); // 'r' (Red) or 'g' (Green)
  const [hasRolled, setHasRolled] = useState(false);
  const [movableTokens, setMovableTokens] = useState([]);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  // ── MULTIPLAYER SOCKET SYNC ──
  useEffect(() => {
    if (!isMultiplayer || !socket) return;

    socket.on('receive_move', (data) => {
      const { move } = data; // { type: 'roll', val } or { type: 'move', tokenId, nextPos }
      if (move.type === 'roll') {
        setDiceVal(move.val);
        setHasRolled(true);
        SoundSynth.playClick();
      } else if (move.type === 'move') {
        const oppColor = myColor === 'r' ? 'g' : 'r';
        animateTokenMove(oppColor, move.tokenId, move.nextPos);
      }
    });

    socket.on('game_over_result', (data) => {
      const { winnerId } = data;
      setGameEnded(true);
      if (winnerId === user.id) {
        setStatusMessage('Ludo Champion! All tokens home!');
        SoundSynth.playWin();
      } else {
        setStatusMessage('Defeat! Opponent got home first.');
        SoundSynth.playLose();
      }
    });

    return () => {
      socket.off('receive_move');
      socket.off('game_over_result');
    };
  }, [isMultiplayer, socket, myColor, user.id]);

  // Turn messages
  useEffect(() => {
    if (gameEnded) return;

    if (isMultiplayer) {
      const myActiveTurn = (turn === myColor);
      if (myActiveTurn) {
        setStatusMessage(!hasRolled ? 'Your turn! Roll the dice!' : 'Select a token to move!');
      } else {
        setStatusMessage(`Waiting for ${opponent?.username}...`);
      }
    } else {
      setStatusMessage(turn === 'r' ? 'Your turn (Red)' : 'AI is thinking...');
    }
  }, [turn, hasRolled, gameEnded]);

  // AI Turn trigger (offline)
  useEffect(() => {
    if (isMultiplayer || turn === 'r' || gameEnded) return;

    const timer = setTimeout(() => {
      makeAiTurn();
    }, 1000);

    return () => clearTimeout(timer);
  }, [turn, gameEnded]);

  // --- GAME ACTIONS ---
  const rollDice = () => {
    if (isRolling || hasRolled) return;

    const myActiveTurn = isMultiplayer ? (turn === myColor) : (turn === 'r');
    if (!myActiveTurn) return;

    setIsRolling(true);
    SoundSynth.playClick();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDiceVal(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount >= 8) {
        clearInterval(interval);
        const finalVal = Math.floor(Math.random() * 6) + 1;
        setDiceVal(finalVal);
        setIsRolling(false);
        setHasRolled(true);

        if (isMultiplayer) {
          socket.emit('submit_move', { roomCode, move: { type: 'roll', val: finalVal } });
        }

        checkMoves(finalVal);
      }
    }, 80);
  };

  const checkMoves = (roll) => {
    const list = tokens[turn];
    const choices = [];

    list.forEach(t => {
      // In Yard: needs 6 to start
      if (t.pos === -1 && roll === 6) {
        choices.push(t.id);
      }
      // On track
      else if (t.pos >= 0 && t.pos + roll <= 57) {
        choices.push(t.id);
      }
    });

    setMovableTokens(choices);

    // If no moves, switch turn automatically
    if (choices.length === 0) {
      setTimeout(() => {
        setHasRolled(false);
        setTurn(prev => (prev === 'r' ? 'g' : 'r'));
      }, 1200);
    }
  };

  const selectToken = (color, tokenId) => {
    if (color !== turn || !hasRolled || !movableTokens.includes(tokenId)) return;

    const token = tokens[color][tokenId];
    let nextPos = token.pos;

    if (token.pos === -1 && diceVal === 6) {
      nextPos = 0; // Release to starting position
    } else {
      nextPos = token.pos + diceVal;
    }

    animateTokenMove(color, tokenId, nextPos);

    if (isMultiplayer) {
      socket.emit('submit_move', { roomCode, move: { type: 'move', tokenId, nextPos } });
    }
  };

  const animateTokenMove = (color, tokenId, nextPos) => {
    SoundSynth.playMove();

    setTokens(prev => {
      const list = [...prev[color]];
      list[tokenId] = {
        ...list[tokenId],
        pos: nextPos
      };

      const nextTokens = { ...prev, [color]: list };
      
      // Handle capturing opponent
      checkCaptures(color, nextPos, nextTokens);

      return nextTokens;
    });

    setMovableTokens([]);
    setHasRolled(false);

    // If player rolled a 6, they get another turn!
    if (diceVal === 6) {
      setHasRolled(false); // Keeps same turn
    } else {
      setTurn(prev => (prev === 'r' ? 'g' : 'r'));
    }

    // Check Win
    setTimeout(() => {
      checkGameWin();
    }, 500);
  };

  const checkCaptures = (attackerColor, attackerPos, currentTokens) => {
    if (attackerPos === -1 || attackerPos >= 51) return; // Cannot capture in Yard or Home paths

    const globalIdx = (attackerPos + startOffsets[attackerColor]) % trackCoordinates.length;
    
    // Safety check
    if (safeCells.includes(attackerPos)) return;

    const defenderColor = attackerColor === 'r' ? 'g' : 'r';
    const defenders = currentTokens[defenderColor];

    defenders.forEach(d => {
      if (d.pos === -1 || d.pos >= 51) return;
      const dGlobalIdx = (d.pos + startOffsets[defenderColor]) % trackCoordinates.length;

      if (globalIdx === dGlobalIdx) {
        // Captured! Send back to Yard
        d.pos = -1;
        SoundSynth.playLose();
      }
    });
  };

  const checkGameWin = () => {
    // All 4 tokens home (pos === 57)
    const checkColorWin = (color) => tokens[color].every(t => t.pos === 57);

    if (checkColorWin('r')) {
      setGameEnded(true);
      setWinner('r');
      if (isMultiplayer) {
        socket.emit('submit_game_over', { roomCode, winnerId: user.id });
      } else {
        setStatusMessage('Red wins! Victory!');
        setUser(prev => ({ ...prev, coins: prev.coins + 100 }));
        SoundSynth.playWin();
      }
    } else if (checkColorWin('g')) {
      setGameEnded(true);
      setWinner('g');
      if (!isMultiplayer) {
        setStatusMessage('Green wins! AI won!');
        SoundSynth.playLose();
      }
    }
  };

  // ── AI ENGINE (OFFLINE) ──
  const makeAiTurn = () => {
    // 1. Roll dice
    setIsRolling(true);
    SoundSynth.playClick();

    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceVal(roll);
      setIsRolling(false);
      
      // Find movable tokens
      const list = tokens.g;
      const choices = [];
      list.forEach(t => {
        if (t.pos === -1 && roll === 6) choices.push(t.id);
        else if (t.pos >= 0 && t.pos + roll <= 57) choices.push(t.id);
      });

      if (choices.length === 0) {
        // Switch turn
        setTurn('r');
      } else {
        // AI chooses: priority 1: capture, priority 2: release token, priority 3: closest to home
        let chosenId = choices[0];
        
        // Simple heuristic search
        for (const id of choices) {
          const t = list[id];
          if (t.pos === -1 && roll === 6) {
            chosenId = id; // Always release if possible
            break;
          }
        }
        
        let nextPos = list[chosenId].pos === -1 ? 0 : list[chosenId].pos + roll;

        // Move token
        setTimeout(() => {
          animateTokenMove('g', chosenId, nextPos);
        }, 800);
      }
    }, 600);
  };

  // Coords generator inside grid houses/tracks
  const getTokenCoords = (color, id, pos) => {
    // Yard positions
    if (pos === -1) {
      if (color === 'r') {
        const yardPos = [{ r: 2, c: 2 }, { r: 3, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 3 }];
        return yardPos[id];
      } else {
        const yardPos = [{ r: 11, c: 11 }, { r: 12, c: 11 }, { r: 11, c: 12 }, { r: 12, c: 12 }];
        return yardPos[id];
      }
    }

    // Home base target
    if (pos === 57) {
      return { r: 7, c: 7 }; // center
    }

    // Home path
    if (pos >= 51 && pos <= 56) {
      const step = pos - 51;
      if (color === 'r') {
        return { r: 8, c: 1 + step };
      } else {
        return { r: 6, c: 13 - step };
      }
    }

    // Standard track
    const offset = startOffsets[color];
    const trackIdx = (pos + offset) % trackCoordinates.length;
    return trackCoordinates[trackIdx];
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Ludo</h2>
        {isMultiplayer ? (
          <span style={styles.badge}>Room: {roomCode} ({myColor === 'r' ? 'Red' : 'Green'})</span>
        ) : (
          <span style={styles.badge}>Offline Practice</span>
        )}
      </div>

      <div style={styles.statusBox}>
        {statusMessage}
      </div>

      <div style={styles.boardWrapper}>
        <div style={styles.boardGrid}>
          {/* Green Yard Box */}
          <div style={{ ...styles.yardHouse, gridArea: '1 / 1 / 7 / 7', background: '#22c55e' }}>
            <div style={styles.yardInner}>
              <div style={styles.homeLabel}>GREEN</div>
            </div>
          </div>

          {/* Yellow Yard Box */}
          <div style={{ ...styles.yardHouse, gridArea: '1 / 10 / 7 / 16', background: '#eab308' }}>
            <div style={styles.yardInner}>
              <div style={styles.homeLabel}>YELLOW</div>
            </div>
          </div>

          {/* Red Yard Box */}
          <div style={{ ...styles.yardHouse, gridArea: '10 / 1 / 16 / 7', background: '#ef4444' }}>
            <div style={styles.yardInner}>
              <div style={styles.homeLabel}>RED</div>
            </div>
          </div>

          {/* Blue Yard Box */}
          <div style={{ ...styles.yardHouse, gridArea: '10 / 10 / 16 / 16', background: '#3b82f6' }}>
            <div style={styles.yardInner}>
              <div style={styles.homeLabel}>BLUE</div>
            </div>
          </div>

          {/* Render 15x15 tracks grid */}
          {Array(15).fill(0).map((_, rIdx) => 
            Array(15).fill(0).map((__, cIdx) => {
              // Only draw tracks in center cross area
              const isCross = (rIdx >= 6 && rIdx <= 8) || (cIdx >= 6 && cIdx <= 8);
              const isYard = (rIdx < 6 && cIdx < 6) || (rIdx < 6 && cIdx > 8) || (rIdx > 8 && cIdx < 6) || (rIdx > 8 && cIdx > 8);
              if (isYard) return null;

              // Check Safe stars
              const isSafe = safeCells.some(s => {
                const coord = trackCoordinates[(s + startOffsets.r) % trackCoordinates.length];
                return coord.r === rIdx && coord.c === cIdx;
              });

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  style={{
                    gridRow: rIdx + 1,
                    gridColumn: cIdx + 1,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: isSafe ? '#f59e0b' : 'rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10
                  }}
                >
                  {isSafe ? '⭐' : ''}
                </div>
              );
            })
          )}

          {/* Render Tokens */}
          {Object.keys(tokens).map(color =>
            tokens[color].map(t => {
              const coords = getTokenCoords(color, t.id, t.pos);
              const isMovable = movableTokens.includes(t.id) && turn === color;
              
              return (
                <button
                  key={`${color}-${t.id}`}
                  onClick={() => selectToken(color, t.id)}
                  disabled={!isMovable}
                  style={{
                    ...styles.token,
                    gridRow: coords.r + 1,
                    gridColumn: coords.c + 1,
                    backgroundColor: color === 'r' ? COLORS.queen : COLORS.white,
                    border: isMovable ? '3px solid #00f0ff' : '1px solid #1e293b',
                    boxShadow: isMovable ? '0 0 10px #00f0ff' : 'none',
                    animation: isMovable ? 'pulse 1s infinite' : 'none'
                  }}
                >
                  {t.id + 1}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div style={styles.diceSection}>
        <div style={styles.diceBox}>
          {isRolling ? '🎲' : diceVal}
        </div>
        <button
          onClick={rollDice}
          disabled={hasRolled || isRolling || (isMultiplayer && turn !== myColor)}
          className="btn-primary"
        >
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </button>
      </div>

      <button onClick={onBackToLobby} className="btn-secondary" style={{ marginTop: 8 }}>
        Back to Lobby
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 460,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  badge: {
    background: 'var(--primary-glow)',
    border: '1px solid var(--primary)',
    color: 'var(--primary)',
    padding: '4px 8px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 'bold'
  },
  statusBox: {
    fontSize: 16,
    fontWeight: '500',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    minHeight: 24
  },
  boardWrapper: {
    background: '#1e293b',
    padding: 12,
    borderRadius: 20,
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)'
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(15, 26px)',
    gridTemplateRows: 'repeat(15, 26px)',
    gap: 2,
    background: '#0a0f1d',
    borderRadius: 12,
    padding: 4,
    overflow: 'hidden'
  },
  yardHouse: {
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6
  },
  yardInner: {
    background: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
    height: '100%',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: '0.1em'
  },
  token: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 11,
    color: '#000',
    cursor: 'pointer',
    zIndex: 10,
    alignSelf: 'center',
    justifySelf: 'center',
    outline: 'none',
    transition: 'transform 0.15s ease'
  },
  diceSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    marginTop: 8
  },
  diceBox: {
    width: 50,
    height: 50,
    background: 'var(--bg-secondary)',
    border: '2px solid var(--card-border)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: 'var(--primary)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
  }
};

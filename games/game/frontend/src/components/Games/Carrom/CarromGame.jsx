import React, { useRef, useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import SoundSynth from '../../../utils/soundSynth';

const BOARD_SIZE = 400;
const FRICTION = 0.985;
const POCKET_RADIUS = 20;
const PUCK_RADIUS = 10;
const STRIKER_RADIUS = 14;

// Base colors
const COLORS = {
  white: '#fef3c7',
  black: '#1f2937',
  queen: '#ef4444',
  striker: '#00f0ff',
  boardBg: '#d97706', // Warm wood brown
  boardBorder: '#78350f'
};

export default function CarromGame({ roomCode, isMultiplayer, opponent, mySymbol, onBackToLobby }) {
  const canvasRef = useRef(null);
  const { socket } = useSocket();
  const { user, setUser } = useAuth();

  const [turn, setTurn] = useState('w'); // 'w' (white/player 1) or 'b' (black/player 2)
  const [score, setScore] = useState({ w: 0, b: 0 });
  const [queenPocketed, setQueenPocketed] = useState(false);
  const [isStrikerSet, setIsStrikerSet] = useState(false);
  const [strikerPos, setStrikerPos] = useState({ x: BOARD_SIZE / 2, y: BOARD_SIZE - 40 });
  const [aimVector, setAimVector] = useState(null); // { x, y } offset
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [gameEnded, setGameEnded] = useState(false);

  // In-memory physics state
  const pucksRef = useRef([]);
  const animationFrameRef = useRef(null);

  // 1. Initialize Pucks in center
  useEffect(() => {
    resetPucks();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const resetPucks = () => {
    const center = BOARD_SIZE / 2;
    const list = [];

    // Red Queen at exact center
    list.push({ id: 'queen', type: 'queen', x: center, y: center, vx: 0, vy: 0, radius: PUCK_RADIUS, color: COLORS.queen, active: true });

    // Inner ring (6 pucks)
    const angleStep = Math.PI / 3;
    const ringRadius = PUCK_RADIUS * 2.2;
    for (let i = 0; i < 6; i++) {
      const angle = i * angleStep;
      const type = i % 2 === 0 ? 'white' : 'black';
      list.push({
        id: `puck_inner_${i}`,
        type,
        x: center + Math.cos(angle) * ringRadius,
        y: center + Math.sin(angle) * ringRadius,
        vx: 0,
        vy: 0,
        radius: PUCK_RADIUS,
        color: type === 'white' ? COLORS.white : COLORS.black,
        active: true
      });
    }

    // Striker (Initially inactive/at bottom line)
    list.push({
      id: 'striker',
      type: 'striker',
      x: center,
      y: BOARD_SIZE - 40,
      vx: 0,
      vy: 0,
      radius: STRIKER_RADIUS,
      color: COLORS.striker,
      active: true,
      placed: true
    });

    pucksRef.current = list;
    setIsStrikerSet(true);
    setStrikerPos({ x: center, y: BOARD_SIZE - 40 });
  };

  // ── MULTIPLAYER SOCKET EVENTS ──
  useEffect(() => {
    if (!isMultiplayer || !socket) return;

    socket.on('receive_move', (data) => {
      const { move } = data; // { vx, vy, x }
      const pucks = pucksRef.current;
      const striker = pucks.find(p => p.type === 'striker');
      
      if (striker) {
        striker.x = move.x;
        // Mirrors position for opponent who plays from top
        striker.y = 40;
        striker.vx = -move.vx; // Reverse directions
        striker.vy = -move.vy;
        setIsStrikerSet(false);
      }
      SoundSynth.playMove();
    });

    socket.on('game_over_result', (data) => {
      const { winnerId } = data;
      setGameEnded(true);
      if (winnerId === user.id) {
        setStatusMessage('Victory! You pocketed all pucks!');
        SoundSynth.playWin();
      } else {
        setStatusMessage('Defeat! Opponent won!');
        SoundSynth.playLose();
      }
    });

    return () => {
      socket.off('receive_move');
      socket.off('game_over_result');
    };
  }, [isMultiplayer, socket, user.id]);

  // Status message coordinator
  useEffect(() => {
    if (gameEnded) return;

    if (isMultiplayer) {
      const isMyTurn = (turn === mySymbol);
      setStatusMessage(isMyTurn ? 'Your turn! Aim and shoot!' : `Waiting for opponent's shot...`);
    } else {
      setStatusMessage(turn === 'w' ? 'White Turn (Drag striker to shoot)' : 'Black Turn (Drag striker to shoot)');
    }
  }, [turn, gameEnded]);

  // Main Canvas Render and Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const updatePhysics = () => {
      const pucks = pucksRef.current;
      let anyMoving = false;

      // Friction & Wall Bounce
      pucks.forEach(p => {
        if (!p.active) return;

        // Apply friction
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        // Stop if velocity gets extremely low
        if (Math.abs(p.vx) < 0.05) p.vx = 0;
        if (Math.abs(p.vy) < 0.05) p.vy = 0;

        if (p.vx !== 0 || p.vy !== 0) {
          anyMoving = true;
        }

        // Apply velocities
        p.x += p.vx;
        p.y += p.vy;

        // Wall collisions
        const minX = p.radius;
        const maxX = BOARD_SIZE - p.radius;
        const minY = p.radius;
        const maxY = BOARD_SIZE - p.radius;

        if (p.x < minX) { p.x = minX; p.vx = -p.vx * 0.8; SoundSynth.playMove(); }
        if (p.x > maxX) { p.x = maxX; p.vx = -p.vx * 0.8; SoundSynth.playMove(); }
        if (p.y < minY) { p.y = minY; p.vy = -p.vy * 0.8; SoundSynth.playMove(); }
        if (p.y > maxY) { p.y = maxY; p.vy = -p.vy * 0.8; SoundSynth.playMove(); }
      });

      // Puck-to-Puck collisions (Elastic response)
      for (let i = 0; i < pucks.length; i++) {
        const p1 = pucks[i];
        if (!p1.active) continue;

        for (let j = i + 1; j < pucks.length; j++) {
          const p2 = pucks[j];
          if (!p2.active) continue;

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = p1.radius + p2.radius;

          if (dist < minDist) {
            // Push pieces apart to prevent sticking/overlap
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;

            p1.x -= nx * overlap * 0.5;
            p1.y -= ny * overlap * 0.5;
            p2.x += nx * overlap * 0.5;
            p2.y += ny * overlap * 0.5;

            // Elastic velocity transfer vectors
            const kx = p1.vx - p2.vx;
            const ky = p1.vy - p2.vy;
            const p = 2 * (nx * kx + ny * ky) / 2; // Equal mass assumption

            p1.vx -= p * nx * 0.9;
            p1.vy -= p * ny * 0.9;
            p2.vx += p * nx * 0.9;
            p2.vy += p * ny * 0.9;

            SoundSynth.playMove();
          }
        }
      }

      // Corner Pocketing checks
      const pockets = [
        { x: POCKET_RADIUS, y: POCKET_RADIUS },
        { x: BOARD_SIZE - POCKET_RADIUS, y: POCKET_RADIUS },
        { x: POCKET_RADIUS, y: BOARD_SIZE - POCKET_RADIUS },
        { x: BOARD_SIZE - POCKET_RADIUS, y: BOARD_SIZE - POCKET_RADIUS }
      ];

      pucks.forEach(p => {
        if (!p.active || p.type === 'striker') return;

        pockets.forEach(pkt => {
          const dx = p.x - pkt.x;
          const dy = p.y - pkt.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Pocketed!
          if (dist < POCKET_RADIUS * 0.8) {
            p.active = false;
            p.vx = 0;
            p.vy = 0;
            SoundSynth.playWin();

            if (p.type === 'queen') {
              setQueenPocketed(true);
            } else {
              setScore(prev => {
                const updated = { ...prev };
                if (p.type === 'white') updated.w += 1;
                else updated.b += 1;
                return updated;
              });
            }
          }
        });
      });

      // Special Pocket check for striker
      const striker = pucks.find(p => p.type === 'striker');
      if (striker && striker.active) {
        pockets.forEach(pkt => {
          const dx = striker.x - pkt.x;
          const dy = striker.y - pkt.y;
          if (Math.sqrt(dx * dx + dy * dy) < POCKET_RADIUS * 0.8) {
            // Foul! Reset striker
            striker.vx = 0;
            striker.vy = 0;
            striker.x = BOARD_SIZE / 2;
            striker.y = BOARD_SIZE - 40;
            SoundSynth.playLose();
          }
        });
      }

      // Check Game Win Condition
      const remainingWhites = pucks.filter(p => p.type === 'white' && p.active).length;
      const remainingBlacks = pucks.filter(p => p.type === 'black' && p.active).length;

      if (remainingWhites === 0 && remainingBlacks === 0) {
        // All pocketed
        setGameEnded(true);
        if (isMultiplayer) {
          const winningId = score.w > score.b ? user.id : opponent.id;
          socket.emit('submit_game_over', { roomCode, winnerId: winningId });
        }
      }

      // Transition turn if all pucks stopped
      if (!anyMoving && !isStrikerSet && striker && striker.vx === 0 && striker.vy === 0) {
        // Reset striker location
        striker.x = BOARD_SIZE / 2;
        striker.y = turn === 'w' ? BOARD_SIZE - 40 : 40;
        setStrikerPos({ x: striker.x, y: striker.y });
        setIsStrikerSet(true);
        
        // Flip Turn
        setTurn(prev => (prev === 'w' ? 'b' : 'w'));
      }
    };

    const drawBoard = () => {
      ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Wood background
      ctx.fillStyle = COLORS.boardBg;
      ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Board Border Frame
      ctx.lineWidth = 8;
      ctx.strokeStyle = COLORS.boardBorder;
      ctx.strokeRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      // Pockets (black circles)
      const pockets = [
        { x: POCKET_RADIUS, y: POCKET_RADIUS },
        { x: BOARD_SIZE - POCKET_RADIUS, y: POCKET_RADIUS },
        { x: POCKET_RADIUS, y: BOARD_SIZE - POCKET_RADIUS },
        { x: BOARD_SIZE - POCKET_RADIUS, y: BOARD_SIZE - POCKET_RADIUS }
      ];
      pockets.forEach(pkt => {
        ctx.beginPath();
        ctx.arc(pkt.x, pkt.y, POCKET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Central circle ring
      ctx.beginPath();
      ctx.arc(BOARD_SIZE / 2, BOARD_SIZE / 2, 40, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Striker base lines
      ctx.beginPath();
      ctx.moveTo(40, BOARD_SIZE - 40);
      ctx.lineTo(BOARD_SIZE - 40, BOARD_SIZE - 40);
      ctx.moveTo(40, 40);
      ctx.lineTo(BOARD_SIZE - 40, 40);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Render Pucks
      const pucks = pucksRef.current;
      pucks.forEach(p => {
        if (!p.active) return;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();
      });

      // Render Aiming indicator vector
      if (isDragging && aimVector) {
        const striker = pucks.find(p => p.type === 'striker');
        if (striker) {
          ctx.beginPath();
          ctx.moveTo(striker.x, striker.y);
          ctx.lineTo(striker.x - aimVector.x * 2.5, striker.y - aimVector.y * 2.5);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
      }
    };

    const runLoop = () => {
      updatePhysics();
      drawBoard();
      animationFrameRef.current = requestAnimationFrame(runLoop);
    };

    runLoop();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [turn, isDragging, aimVector, isStrikerSet, gameEnded]);

  // --- STRIKER CONTROLS (AIM AND SHOOT) ---
  const handleMouseDown = (e) => {
    if (gameEnded) return;

    // Verify it is user's active turn
    const isMyTurn = isMultiplayer ? (turn === mySymbol) : true;
    if (!isMyTurn || !isStrikerSet) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const pucks = pucksRef.current;
    const striker = pucks.find(p => p.type === 'striker');

    if (striker) {
      const dist = Math.sqrt((clickX - striker.x) ** 2 + (clickY - striker.y) ** 2);
      if (dist <= striker.radius + 10) {
        setIsDragging(true);
        setAimVector({ x: 0, y: 0 });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dragX = e.clientX - rect.left;
    const dragY = e.clientY - rect.top;

    const pucks = pucksRef.current;
    const striker = pucks.find(p => p.type === 'striker');

    if (striker) {
      // Calculate drag vector
      const dx = dragX - striker.x;
      const dy = dragY - striker.y;
      
      // Limit speed/aim lines
      const maxDrag = 80;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDrag) {
        setAimVector({
          x: (dx / dist) * maxDrag,
          y: (dy / dist) * maxDrag
        });
      } else {
        setAimVector({ x: dx, y: dy });
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const pucks = pucksRef.current;
    const striker = pucks.find(p => p.type === 'striker');

    if (striker && aimVector) {
      // Launch velocity (opposite of drag vector)
      striker.vx = -aimVector.x * 0.22;
      striker.vy = -aimVector.y * 0.22;

      setIsStrikerSet(false);
      setAimVector(null);
      SoundSynth.playMove();

      if (isMultiplayer) {
        socket.emit('submit_move', {
          roomCode,
          move: { vx: striker.vx, vy: striker.vy, x: striker.x }
        });
      }
    }
  };

  // Drag slider to reposition striker along baseline
  const handleReposition = (e) => {
    if (!isStrikerSet) return;
    const newX = parseFloat(e.target.value);
    
    const pucks = pucksRef.current;
    const striker = pucks.find(p => p.type === 'striker');
    if (striker) {
      striker.x = newX;
      setStrikerPos({ x: newX, y: striker.y });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Carrom</h2>
        <div style={styles.scoreRow}>
          <span style={styles.scoreText}>White: {score.w}</span>
          <span style={styles.scoreText}>Black: {score.b}</span>
          {queenPocketed && <span style={styles.queenBadge}>Queen Pocketed!</span>}
        </div>
      </div>

      <div style={styles.statusBox}>
        {statusMessage}
      </div>

      <div style={styles.boardWrapper}>
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={styles.canvas}
        />
      </div>

      {isStrikerSet && (isMultiplayer ? turn === mySymbol : true) && (
        <div style={styles.sliderWrapper}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Reposition:</span>
          <input
            type="range"
            min={40}
            max={BOARD_SIZE - 40}
            value={strikerPos.x}
            onChange={handleReposition}
            style={styles.slider}
          />
        </div>
      )}

      <div style={styles.footerRow}>
        {!isMultiplayer && (
          <button onClick={resetPucks} className="btn-secondary" style={{ padding: '8px 16px' }}>
            Reset Game
          </button>
        )}
        <button onClick={onBackToLobby} className="btn-secondary" style={{ padding: '8px 16px' }}>
          Back to Lobby
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 440,
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
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12
  },
  scoreText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: 'var(--text-secondary)'
  },
  queenBadge: {
    background: 'var(--accent-danger)',
    color: '#fff',
    fontSize: 11,
    padding: '2px 6px',
    borderRadius: 4,
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
    padding: 8,
    borderRadius: 20,
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)'
  },
  canvas: {
    borderRadius: 12,
    display: 'block',
    cursor: 'crosshair'
  },
  sliderWrapper: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '4px 8px'
  },
  slider: {
    flex: 1,
    cursor: 'ew-resize'
  },
  footerRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8
  }
};

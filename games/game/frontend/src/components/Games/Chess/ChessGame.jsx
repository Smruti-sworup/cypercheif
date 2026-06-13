import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import SoundSynth from '../../../utils/soundSynth';

// Initialize Standard Chess board 8x8 representation
const initialBoard = [
  { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' }, { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' },
  { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' },
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null,
  { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' },
  { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' }, { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
];

const pieceSymbols = {
  w: { r: '♖', n: '♘', b: '♗', q: '♕', k: '♔', p: '♙' },
  b: { r: '♜', n: '♞', b: '♝', q: '♛', k: '♚', p: '♟' }
};

export default function ChessGame({ roomCode, isMultiplayer, opponent, myColor, onBackToLobby }) {
  const { socket } = useSocket();
  const { user, setUser } = useAuth();

  const [board, setBoard] = useState(initialBoard);
  const [turn, setTurn] = useState('w'); // 'w' or 'b'
  const [selectedSquare, setSelectedSquare] = useState(null); // index 0-63
  const [validMoves, setValidMoves] = useState([]);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [winner, setWinner] = useState(null); // 'w', 'b', 'draw', or null
  const [gameEnded, setGameEnded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // ── MULTIPLAYER SOCKET EVENTS ──
  useEffect(() => {
    if (!isMultiplayer || !socket) return;

    socket.on('receive_move', (data) => {
      const { move } = data;
      const { from, to } = move;

      setBoard(prev => {
        const next = [...prev];
        next[to] = next[from];
        next[from] = null;
        
        // Pawn promotion logic (simple auto-queen)
        const piece = next[to];
        if (piece && piece.type === 'p' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7)) {
          next[to] = { type: 'q', color: piece.color };
        }
        return next;
      });

      setTurn(prev => (prev === 'w' ? 'b' : 'w'));
      SoundSynth.playMove();
    });

    socket.on('game_over_result', (data) => {
      const { winnerId, isDraw } = data;
      setGameEnded(true);

      if (isDraw) {
        setWinner('draw');
        setStatusMessage('Game Draw!');
        SoundSynth.playLose();
      } else if (winnerId === user.id) {
        setWinner(myColor);
        setStatusMessage('Victory! You win!');
        SoundSynth.playWin();
      } else {
        const oppColor = myColor === 'w' ? 'b' : 'w';
        setWinner(oppColor);
        setStatusMessage('Defeat! Opponent wins!');
        SoundSynth.playLose();
      }
    });

    return () => {
      socket.off('receive_move');
      socket.off('game_over_result');
    };
  }, [isMultiplayer, socket, myColor, user.id]);

  // Check Game End locally
  useEffect(() => {
    // Check if kings are missing to determine simple win
    const whiteKing = board.some(p => p && p.type === 'k' && p.color === 'w');
    const blackKing = board.some(p => p && p.type === 'k' && p.color === 'b');

    if (!whiteKing || !blackKing) {
      setGameEnded(true);
      const localWinner = !blackKing ? 'w' : 'b';
      setWinner(localWinner);

      if (isMultiplayer) {
        // Only host submits game over or the winning player
        const isMyWin = (localWinner === myColor);
        if (isMyWin) {
          socket.emit('submit_game_over', {
            roomCode,
            winnerId: user.id,
            isDraw: false
          });
        }
      } else {
        if (localWinner === 'w') {
          setStatusMessage('Checkmate! You win! (+50 Coins)');
          setUser(prev => ({ ...prev, coins: prev.coins + 50 }));
          SoundSynth.playWin();
        } else {
          setStatusMessage('Checkmate! AI wins!');
          SoundSynth.playLose();
        }
      }
      return;
    }

    // Set standard status message
    if (isMultiplayer) {
      const myTurn = (turn === myColor);
      setStatusMessage(myTurn ? 'Your turn!' : `Waiting for ${opponent?.username}...`);
    } else {
      setStatusMessage(turn === 'w' ? 'Your turn (White)' : 'AI is thinking...');
    }
  }, [board, turn]);

  // ── AI TURN TRIGGER (OFFLINE) ──
  useEffect(() => {
    if (isMultiplayer || turn === 'w' || gameEnded) return;

    const timer = setTimeout(() => {
      makeAiMove();
    }, 800);

    return () => clearTimeout(timer);
  }, [turn, gameEnded]);

  // --- MOVE VALIDATION RULES ---
  const getLegalMoves = (fromIdx, currentBoard) => {
    const piece = currentBoard[fromIdx];
    if (!piece) return [];

    const moves = [];
    const fromRow = Math.floor(fromIdx / 8);
    const fromCol = fromIdx % 8;

    const addMoveIfLegal = (row, col) => {
      if (row < 0 || row > 7 || col < 0 || col > 7) return false;
      const targetIdx = row * 8 + col;
      const targetPiece = currentBoard[targetIdx];

      if (!targetPiece) {
        moves.push(targetIdx);
        return true; // continue line
      } else if (targetPiece.color !== piece.color) {
        moves.push(targetIdx);
        return false; // capture and block
      }
      return false; // blocked by friendly
    };

    switch (piece.type) {
      case 'p': {
        const dir = piece.color === 'w' ? -1 : 1;
        const startRow = piece.color === 'w' ? 6 : 1;

        // 1 step forward
        const forwardIdx = (fromRow + dir) * 8 + fromCol;
        if (fromRow + dir >= 0 && fromRow + dir <= 7 && !currentBoard[forwardIdx]) {
          moves.push(forwardIdx);

          // 2 steps forward from start row
          const doubleForwardIdx = (fromRow + 2 * dir) * 8 + fromCol;
          if (fromRow === startRow && !currentBoard[doubleForwardIdx]) {
            moves.push(doubleForwardIdx);
          }
        }

        // Diagonals captures
        [-1, 1].forEach(dc => {
          const tc = fromCol + dc;
          const tr = fromRow + dir;
          if (tc >= 0 && tc <= 7 && tr >= 0 && tr <= 7) {
            const diagIdx = tr * 8 + tc;
            const target = currentBoard[diagIdx];
            if (target && target.color !== piece.color) {
              moves.push(diagIdx);
            }
          }
        });
        break;
      }
      case 'r': {
        // Straight lines
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        directions.forEach(([dr, dc]) => {
          let r = fromRow + dr;
          let c = fromCol + dc;
          while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const result = addMoveIfLegal(r, c);
            if (!result) break;
            r += dr;
            c += dc;
          }
        });
        break;
      }
      case 'b': {
        // Diagonals
        const directions = [[1, 1], [-1, -1], [1, -1], [-1, 1]];
        directions.forEach(([dr, dc]) => {
          let r = fromRow + dr;
          let c = fromCol + dc;
          while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const result = addMoveIfLegal(r, c);
            if (!result) break;
            r += dr;
            c += dc;
          }
        });
        break;
      }
      case 'n': {
        // L-shapes
        const knightMoves = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightMoves.forEach(([dr, dc]) => {
          addMoveIfLegal(fromRow + dr, fromCol + dc);
        });
        break;
      }
      case 'q': {
        // Combines Rook and Bishop
        const directions = [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [-1, -1], [1, -1], [-1, 1]
        ];
        directions.forEach(([dr, dc]) => {
          let r = fromRow + dr;
          let c = fromCol + dc;
          while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
            const result = addMoveIfLegal(r, c);
            if (!result) break;
            r += dr;
            c += dc;
          }
        });
        break;
      }
      case 'k': {
        // King steps
        const kingMoves = [
          [-1, -1], [-1, 0], [-1, 1],
          [0, -1],           [0, 1],
          [1, -1],  [1, 0],  [1, 1]
        ];
        kingMoves.forEach(([dr, dc]) => {
          addMoveIfLegal(fromRow + dr, fromCol + dc);
        });
        break;
      }
    }

    return moves;
  };

  const handleSquareClick = (index) => {
    if (gameEnded) return;

    // Verify it is player's turn to move
    const myActiveTurn = isMultiplayer ? (turn === myColor) : (turn === 'w');
    if (!myActiveTurn) return;

    const clickedPiece = board[index];

    // If square contains a piece of my color, select it
    if (clickedPiece && clickedPiece.color === (isMultiplayer ? myColor : 'w')) {
      setSelectedSquare(index);
      setValidMoves(getLegalMoves(index, board));
      SoundSynth.playClick();
      return;
    }

    // Execute Move
    if (selectedSquare !== null && validMoves.includes(index)) {
      executeMove(selectedSquare, index);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (from, to) => {
    SoundSynth.playMove();

    setBoard(prev => {
      const next = [...prev];
      next[to] = next[from];
      next[from] = null;

      // Auto-queen promotion
      const piece = next[to];
      if (piece && piece.type === 'p' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7)) {
        next[to] = { type: 'q', color: piece.color };
      }
      return next;
    });

    setSelectedSquare(null);
    setValidMoves([]);

    const nextTurn = turn === 'w' ? 'b' : 'w';
    setTurn(nextTurn);

    if (isMultiplayer) {
      socket.emit('submit_move', { roomCode, move: { from, to } });
    }
  };

  // ── CHESS BOT AI (OFFLINE) ──
  const makeAiMove = () => {
    // Find all legal black moves
    const aiMoves = [];
    board.forEach((piece, idx) => {
      if (piece && piece.color === 'b') {
        const moves = getLegalMoves(idx, board);
        moves.forEach(m => {
          aiMoves.push({ from: idx, to: m, targetPiece: board[m] });
        });
      }
    });

    if (aiMoves.length === 0) {
      // Dethroned or stalemated
      return;
    }

    let chosenMove = null;

    if (aiDifficulty === 'easy') {
      // Pick random
      chosenMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
    } else if (aiDifficulty === 'medium') {
      // Prioritize captures, otherwise random
      const captures = aiMoves.filter(m => m.targetPiece !== null);
      if (captures.length > 0 && Math.random() > 0.3) {
        chosenMove = captures[Math.floor(Math.random() * captures.length)];
      } else {
        chosenMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
      }
    } else {
      // Heuristic valuation (captures high value, else positional)
      const values = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
      let bestVal = -Infinity;
      const candidates = [];

      aiMoves.forEach(m => {
        let val = 0;
        if (m.targetPiece) {
          val += values[m.targetPiece.type] * 10;
        }
        // Prefer center board positions
        const targetRow = Math.floor(m.to / 8);
        const targetCol = m.to % 8;
        if (targetRow >= 3 && targetRow <= 4 && targetCol >= 3 && targetCol <= 4) {
          val += 2;
        }

        if (val > bestVal) {
          bestVal = val;
          candidates.length = 0;
          candidates.push(m);
        } else if (val === bestVal) {
          candidates.push(m);
        }
      });

      chosenMove = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (chosenMove) {
      executeMove(chosenMove.from, chosenMove.to);
    }
  };

  const handleResetOffline = () => {
    setBoard(initialBoard);
    setTurn('w');
    setSelectedSquare(null);
    setValidMoves([]);
    setWinner(null);
    setGameEnded(false);
    setStatusMessage('Your turn (White)');
    SoundSynth.playClick();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Chess</h2>
        {isMultiplayer ? (
          <span style={styles.badge}>Lobby: {roomCode} ({myColor === 'w' ? 'White' : 'Black'})</span>
        ) : (
          <select
            value={aiDifficulty}
            onChange={(e) => setAiDifficulty(e.target.value)}
            style={styles.select}
          >
            <option value="easy">Easy (Random)</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard (Heuristic)</option>
          </select>
        )}
      </div>

      <div style={styles.statusBox}>
        {statusMessage}
      </div>

      <div style={styles.boardWrapper}>
        <div style={styles.boardGrid}>
          {board.map((piece, idx) => {
            const row = Math.floor(idx / 8);
            const col = idx % 8;
            const isDarkSquare = (row + col) % 2 === 1;
            const isSelected = selectedSquare === idx;
            const isValidDestination = validMoves.includes(idx);

            let squareColor = isDarkSquare ? '#4b5563' : '#e5e7eb'; // Dark slate vs Light gray
            if (isSelected) squareColor = 'rgba(0, 240, 255, 0.4)'; // Cyan selected highlight
            
            return (
              <div
                key={idx}
                onClick={() => handleSquareClick(idx)}
                style={{
                  ...styles.square,
                  backgroundColor: squareColor,
                  border: isValidDestination ? '3px solid var(--primary)' : 'none',
                  cursor: (piece && piece.color === (isMultiplayer ? myColor : 'w')) ? 'pointer' : 'default'
                }}
              >
                {piece && (
                  <span
                    style={{
                      ...styles.piece,
                      color: piece.color === 'w' ? '#ffffff' : '#000000',
                      textShadow: piece.color === 'w' ? '0 0 4px #000' : '0 0 4px #fff'
                    }}
                  >
                    {pieceSymbols[piece.color][piece.type]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.footerRow}>
        {!isMultiplayer && (
          <button onClick={handleResetOffline} className="btn-secondary" style={{ padding: '8px 16px' }}>
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
    maxWidth: 500,
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
  select: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--card-border)',
    borderRadius: 6,
    padding: '4px 8px',
    outline: 'none',
    cursor: 'pointer'
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
    background: '#1f2937',
    padding: 8,
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 50px)',
    gridTemplateRows: 'repeat(8, 50px)',
    width: 400,
    height: 400,
    borderRadius: 8,
    overflow: 'hidden'
  },
  square: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none'
  },
  piece: {
    fontSize: 36,
    userSelect: 'none',
    lineHeight: 1
  },
  footerRow: {
    display: 'flex',
    gap: 12,
    marginTop: 8
  }
};

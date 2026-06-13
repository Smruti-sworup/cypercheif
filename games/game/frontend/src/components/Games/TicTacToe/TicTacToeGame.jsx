import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext';
import { useAuth } from '../../../context/AuthContext';
import SoundSynth from '../../../utils/soundSynth';

export default function TicTacToeGame({ roomCode, isMultiplayer, opponent, mySymbol, onBackToLobby }) {
  const { socket } = useSocket();
  const { user, setUser } = useAuth();
  
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isMyTurn, setIsMyTurn] = useState(!isMultiplayer || mySymbol === 'X');
  const [winner, setWinner] = useState(null); // 'X', 'O', 'draw', or null
  const [winningLine, setWinningLine] = useState([]);
  const [aiDifficulty, setAiDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'
  const [gameEnded, setGameEnded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  // ── MULTIPLAYER SOCKET EVENTS ──
  useEffect(() => {
    if (!isMultiplayer || !socket) return;

    socket.on('receive_move', (data) => {
      const { move } = data;
      const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
      
      setBoard(prev => {
        const next = [...prev];
        next[move] = opponentSymbol;
        return next;
      });
      setIsMyTurn(true);
      SoundSynth.playMove();
    });

    socket.on('game_over_result', (data) => {
      const { winnerId, isDraw } = data;
      setGameEnded(true);

      if (isDraw) {
        setWinner('draw');
        SoundSynth.playLose(); // Dissonant but let's play lose for draw/lose
      } else if (winnerId === user.id) {
        setWinner(mySymbol);
        SoundSynth.playWin();
      } else {
        setWinner(mySymbol === 'X' ? 'O' : 'X');
        SoundSynth.playLose();
      }
    });

    return () => {
      socket.off('receive_move');
      socket.off('game_over_result');
    };
  }, [isMultiplayer, socket, mySymbol, user.id]);

  // Check board wins locally
  useEffect(() => {
    const result = checkWin(board);
    if (result) {
      setWinningLine(result.line);
      setWinner(result.winner);
      setGameEnded(true);

      if (!isMultiplayer) {
        if (result.winner === 'draw') {
          setStatusMessage("It's a draw!");
          SoundSynth.playClick();
        } else if (result.winner === 'X') {
          setStatusMessage("You win! (+20 Coins)");
          SoundSynth.playWin();
          // Offline coin reward
          setUser(prev => ({ ...prev, coins: prev.coins + 20 }));
        } else {
          setStatusMessage("AI wins!");
          SoundSynth.playLose();
        }
      }
    } else {
      if (isMultiplayer) {
        setStatusMessage(isMyTurn ? "Your turn!" : `Waiting for ${opponent?.username}...`);
      } else {
        setStatusMessage(isMyTurn ? "Your turn (X)" : "AI is thinking...");
      }
    }
  }, [board, isMyTurn]);

  // ── AI TURN TRIGGER ──
  useEffect(() => {
    if (isMultiplayer || isMyTurn || gameEnded) return;

    const timer = setTimeout(() => {
      makeAiMove();
    }, 600);

    return () => clearTimeout(timer);
  }, [isMyTurn, gameEnded]);

  const checkWin = (grid) => {
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (grid[a] && grid[a] === grid[b] && grid[a] === grid[c]) {
        return { winner: grid[a], line: pattern };
      }
    }
    if (grid.every(cell => cell !== null)) {
      return { winner: 'draw', line: [] };
    }
    return null;
  };

  const handleCellClick = (index) => {
    if (board[index] || !isMyTurn || gameEnded) return;

    SoundSynth.playMove();

    const newBoard = [...board];
    const playerSymbol = isMultiplayer ? mySymbol : 'X';
    newBoard[index] = playerSymbol;
    setBoard(newBoard);

    if (isMultiplayer) {
      setIsMyTurn(false);
      socket.emit('submit_move', { roomCode, move: index });

      // Check if this final move won the match locally to submit
      const localResult = checkWin(newBoard);
      if (localResult) {
        socket.emit('submit_game_over', {
          roomCode,
          winnerId: localResult.winner === 'draw' ? null : user.id,
          isDraw: localResult.winner === 'draw'
        });
      }
    } else {
      setIsMyTurn(false);
    }
  };

  // ── MINIMAX AI LOGIC ──
  const makeAiMove = () => {
    let chosenIndex = null;

    if (aiDifficulty === 'easy') {
      // Pick random empty cell
      const empties = board.map((c, i) => c === null ? i : null).filter(c => c !== null);
      chosenIndex = empties[Math.floor(Math.random() * empties.length)];
    } else if (aiDifficulty === 'medium') {
      // 50% minimax, 50% random
      if (Math.random() > 0.5) {
        chosenIndex = minimaxSearch(board, 'O').index;
      } else {
        const empties = board.map((c, i) => c === null ? i : null).filter(c => c !== null);
        chosenIndex = empties[Math.floor(Math.random() * empties.length)];
      }
    } else {
      // Hard/Perfect minimax
      chosenIndex = minimaxSearch(board, 'O').index;
    }

    if (chosenIndex !== null && chosenIndex !== undefined) {
      setBoard(prev => {
        const next = [...prev];
        next[chosenIndex] = 'O';
        return next;
      });
      setIsMyTurn(true);
      SoundSynth.playMove();
    }
  };

  const minimaxSearch = (tempBoard, player) => {
    const emptyCells = tempBoard.map((c, i) => c === null ? i : null).filter(c => c !== null);
    
    // Check base states
    const result = checkWin(tempBoard);
    if (result) {
      if (result.winner === 'X') return { score: -10 };
      if (result.winner === 'O') return { score: 10 };
      if (result.winner === 'draw') return { score: 0 };
    }

    const moves = [];
    for (let i = 0; i < emptyCells.length; i++) {
      const idx = emptyCells[i];
      const backup = tempBoard[idx];
      tempBoard[idx] = player;

      let score = 0;
      if (player === 'O') {
        const next = minimaxSearch(tempBoard, 'X');
        score = next.score;
      } else {
        const next = minimaxSearch(tempBoard, 'O');
        score = next.score;
      }

      tempBoard[idx] = backup;
      moves.push({ index: idx, score });
    }

    let bestMove;
    if (player === 'O') {
      let bestScore = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }

    return moves[bestMove] || { score: 0 };
  };

  const handleResetOffline = () => {
    setBoard(Array(9).fill(null));
    setIsMyTurn(true);
    setWinner(null);
    setWinningLine([]);
    setGameEnded(false);
    setStatusMessage('Your turn (X)');
    SoundSynth.playClick();
  };

  return (
    <div className="ttt-container" style={styles.container}>
      <div className="game-header" style={styles.header}>
        <h2>Tic Tac Toe</h2>
        {isMultiplayer ? (
          <span style={styles.badge}>Room: {roomCode}</span>
        ) : (
          <div style={styles.difficultyRow}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Difficulty:</span>
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
              style={styles.select}
            >
              <option value="easy">Easy (Random)</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard (Minimax)</option>
            </select>
          </div>
        )}
      </div>

      <div style={styles.statusBox}>
        {statusMessage}
      </div>

      <div style={styles.boardGrid}>
        {board.map((cell, idx) => {
          const isWinningCell = winningLine.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={cell !== null || !isMyTurn || gameEnded}
              style={{
                ...styles.cell,
                color: cell === 'X' ? 'var(--primary)' : 'var(--secondary)',
                borderColor: isWinningCell ? 'var(--primary)' : 'var(--card-border)',
                background: isWinningCell ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.02)',
                boxShadow: isWinningCell ? '0 0 15px var(--primary)' : 'none'
              }}
            >
              {cell}
            </button>
          );
        })}
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
    maxWidth: 400,
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
  difficultyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
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
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: 10,
    width: 320,
    height: 320
  },
  cell: {
    fontSize: 48,
    fontWeight: '800',
    border: '1px solid',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    outline: 'none',
    transition: 'all 0.15s ease'
  },
  footerRow: {
    display: 'flex',
    gap: 12,
    marginTop: 12
  }
};

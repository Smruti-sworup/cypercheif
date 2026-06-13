const { User, Room, Match, ChatMessage, Notification, Achievement, UserAchievement } = require('../models');

// In-memory mappings
const onlineUsers = new Map(); // userId -> socket.id
const userSockets = new Map(); // socket.id -> user object (id, username, elo, avatarUrl)
const matchmakingQueues = {
  chess: [],
  carrom: [],
  ludo: [],
  ttt: []
};

// In-memory active game states (keeps real-time sub-second sync snappy)
const activeGames = new Map(); // roomCode -> game state object

function initSockets(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // ── 1. AUTHENTICATE / REGISTER ONLINE STATUS ──
    socket.on('auth_user', async (data) => {
      const { userId } = data;
      if (!userId) return;

      try {
        const user = await User.findByPk(userId);
        if (!user || user.isBanned) {
          socket.emit('auth_error', { message: 'User banned or invalid' });
          return;
        }

        // Map socket to user
        onlineUsers.set(userId, socket.id);
        userSockets.set(socket.id, {
          id: user.id,
          username: user.username,
          elo: user.elo,
          avatarUrl: user.avatarUrl,
          role: user.role
        });

        // Broadcast online user count & status
        io.emit('online_count', { count: onlineUsers.size });
        io.emit('user_status_change', { userId, status: 'online' });
        console.log(`User registered: ${user.username} (${socket.id})`);
      } catch (err) {
        console.error('Socket auth error:', err);
      }
    });

    // ── 2. GLOBAL CHAT ──
    socket.on('send_global_message', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;

      try {
        const msg = await ChatMessage.create({
          chatType: 'global',
          senderId: user.id,
          messageText: data.text
        });

        io.emit('receive_global_message', {
          id: msg.id,
          chatType: 'global',
          messageText: msg.messageText,
          createdAt: msg.createdAt,
          sender: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl,
            role: user.role
          }
        });
      } catch (err) {
        console.error('Global msg error:', err);
      }
    });

    // Typing indicators
    socket.on('typing_status', (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { channel, isTyping, friendId, roomCode } = data;

      if (channel === 'global') {
        socket.broadcast.emit('user_typing', { username: user.username, channel, isTyping });
      } else if (channel === 'room' && roomCode) {
        socket.to(roomCode).emit('user_typing', { username: user.username, channel, isTyping });
      } else if (channel === 'direct' && friendId) {
        const friendSocketId = onlineUsers.get(friendId);
        if (friendSocketId) {
          io.to(friendSocketId).emit('user_typing', { username: user.username, channel, isTyping, senderId: user.id });
        }
      }
    });

    // ── 3. DIRECT MESSAGING (FRIEND CHAT) ──
    socket.on('send_direct_message', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { recipientId, text } = data;

      try {
        const msg = await ChatMessage.create({
          chatType: 'direct',
          senderId: user.id,
          recipientId,
          messageText: text
        });

        const packet = {
          id: msg.id,
          chatType: 'direct',
          senderId: user.id,
          recipientId,
          messageText: msg.messageText,
          createdAt: msg.createdAt,
          sender: {
            id: user.id,
            username: user.username,
            avatarUrl: user.avatarUrl
          }
        };

        // Emit to sender & recipient
        socket.emit('receive_direct_message', packet);
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_direct_message', packet);
          io.to(recipientSocketId).emit('new_notification', {
            type: 'message',
            title: `New DM from ${user.username}`,
            message: text.substring(0, 30) + (text.length > 30 ? '...' : '')
          });
        }
      } catch (err) {
        console.error('Direct message error:', err);
      }
    });

    // ── 4. MATCHMAKING & ROOMS ──

    // Create custom lobby room
    socket.on('create_room', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { gameType, isPrivate } = data;

      try {
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const maxPlayers = (gameType === 'chess' || gameType === 'ttt') ? 2 : 4;

        const dbRoom = await Room.create({
          roomCode,
          gameType,
          isPrivate,
          maxPlayers,
          hostId: user.id,
          players: [{ userId: user.id, username: user.username, avatarUrl: user.avatarUrl, isReady: false }]
        });

        socket.join(roomCode);
        socket.emit('room_created', {
          roomCode,
          gameType,
          isPrivate,
          maxPlayers,
          hostId: user.id,
          players: dbRoom.players
        });

        // Broadcast updated room list if public
        if (!isPrivate) {
          io.emit('public_rooms_changed');
        }
      } catch (err) {
        console.error('Room create error:', err);
      }
    });

    // Join room via Room Code
    socket.on('join_room', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { roomCode } = data;

      try {
        const dbRoom = await Room.findOne({ where: { roomCode, status: 'waiting' } });
        if (!dbRoom) {
          socket.emit('join_error', { message: 'Room not found or game already started.' });
          return;
        }

        const players = dbRoom.players;
        if (players.length >= dbRoom.maxPlayers) {
          socket.emit('join_error', { message: 'Room is full.' });
          return;
        }

        // Check if player already inside
        if (players.some(p => p.userId === user.id)) {
          socket.join(roomCode);
          socket.emit('room_joined', { room: dbRoom });
          return;
        }

        // Add player
        players.push({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          isReady: false
        });

        dbRoom.players = players;
        await dbRoom.save();

        socket.join(roomCode);
        io.to(roomCode).emit('room_joined', { room: dbRoom });
        
        if (!dbRoom.isPrivate) {
          io.emit('public_rooms_changed');
        }
      } catch (err) {
        console.error('Join room error:', err);
      }
    });

    // Invite friend to room
    socket.on('invite_friend', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { friendId, roomCode, gameType } = data;

      try {
        const recipientSocketId = onlineUsers.get(friendId);
        if (recipientSocketId) {
          // Add notification to DB
          await Notification.create({
            userId: friendId,
            type: 'room_invite',
            message: `${user.username} invited you to play ${gameType.toUpperCase()}!`,
            senderId: user.id,
            roomCode
          });

          io.to(recipientSocketId).emit('room_invite_received', {
            sender: user,
            roomCode,
            gameType
          });
        }
      } catch (err) {
        console.error('Invite error:', err);
      }
    });

    // Set Ready status
    socket.on('player_ready', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { roomCode, isReady } = data;

      try {
        const dbRoom = await Room.findOne({ where: { roomCode } });
        if (!dbRoom) return;

        const players = dbRoom.players.map(p => {
          if (p.userId === user.id) {
            return { ...p, isReady };
          }
          return p;
        });

        dbRoom.players = players;
        await dbRoom.save();

        io.to(roomCode).emit('room_updated', { room: dbRoom });

        // Auto-start if all ready and count equals maxPlayers or at least 2 players
        const allReady = players.every(p => p.isReady);
        if (allReady && players.length >= 2) {
          dbRoom.status = 'playing';
          await dbRoom.save();

          // Initialize active game state
          activeGames.set(roomCode, {
            gameType: dbRoom.gameType,
            players: players.map(p => p.userId),
            turnIndex: 0,
            boardState: {}, // customizable per game type
            moves: []
          });

          io.to(roomCode).emit('game_start', {
            roomCode,
            gameType: dbRoom.gameType,
            players: players
          });

          if (!dbRoom.isPrivate) {
            io.emit('public_rooms_changed');
          }
        }
      } catch (err) {
        console.error('Player ready error:', err);
      }
    });

    // Quick Match Matchmaking Queue
    socket.on('start_matchmaking', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { gameType } = data;

      const queue = matchmakingQueues[gameType];
      // Check if already in queue
      if (queue.some(q => q.userId === user.id)) {
        return;
      }

      // Add to queue
      queue.push({ userId: user.id, socketId: socket.id, elo: user.elo });
      console.log(`User ${user.username} entered matchmaking queue for ${gameType}`);

      socket.emit('matchmaking_status', { status: 'searching' });

      // Match check
      const maxPlayers = (gameType === 'chess' || gameType === 'ttt') ? 2 : 4;
      if (queue.length >= 2) {
        // Quick pair: take the first two players
        const p1 = queue.shift();
        const p2 = queue.shift();

        const roomCode = 'QM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        try {
          const dbRoom = await Room.create({
            roomCode,
            gameType,
            isPrivate: true, // Quick Match matches are private by code
            maxPlayers,
            hostId: p1.userId,
            status: 'playing',
            players: [
              { userId: p1.userId, username: userSockets.get(p1.socketId).username, avatarUrl: userSockets.get(p1.socketId).avatarUrl, isReady: true },
              { userId: p2.userId, username: userSockets.get(p2.socketId).username, avatarUrl: userSockets.get(p2.socketId).avatarUrl, isReady: true }
            ]
          });

          // Join sockets to room
          const s1 = io.sockets.sockets.get(p1.socketId);
          const s2 = io.sockets.sockets.get(p2.socketId);

          if (s1) s1.join(roomCode);
          if (s2) s2.join(roomCode);

          activeGames.set(roomCode, {
            gameType,
            players: [p1.userId, p2.userId],
            turnIndex: 0,
            boardState: {},
            moves: []
          });

          const matchPacket = {
            roomCode,
            gameType,
            players: dbRoom.players
          };

          io.to(p1.socketId).emit('matchmaking_found', matchPacket);
          io.to(p2.socketId).emit('matchmaking_found', matchPacket);

          io.to(roomCode).emit('game_start', matchPacket);
        } catch (err) {
          console.error('QuickMatch setup error:', err);
        }
      }
    });

    // Cancel matchmaking
    socket.on('stop_matchmaking', (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { gameType } = data;

      if (matchmakingQueues[gameType]) {
        matchmakingQueues[gameType] = matchmakingQueues[gameType].filter(q => q.userId !== user.id);
        socket.emit('matchmaking_status', { status: 'idle' });
        console.log(`User ${user.username} cancelled matchmaking for ${gameType}`);
      }
    });

    // ── 5. GAMEPLAY EVENT COORDINATION ──
    socket.on('submit_move', (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { roomCode, move } = data;

      const game = activeGames.get(roomCode);
      if (!game) return;

      // Broadcast move to opponent(s)
      socket.to(roomCode).emit('receive_move', { move, turnIndex: game.turnIndex });

      // Save move sequence if tracking
      game.moves.push(move);
      game.turnIndex = (game.turnIndex + 1) % game.players.length;
      activeGames.set(roomCode, game);
    });

    // AI Turn relay (client requests server validation or triggers bot decision)
    socket.on('ai_turn_request', (data) => {
      const { roomCode, difficulty } = data;
      // In full implementation, bot returns move. We will coordinate this logic on client
      // or simple relay. So bots will be fully simulated.
    });

    // Game over triggers: record matches, ELO adjustment, coins, and achievements
    socket.on('submit_game_over', async (data) => {
      const { roomCode, winnerId, isDraw } = data;

      const game = activeGames.get(roomCode);
      if (!game) return;

      try {
        const dbRoom = await Room.findOne({ where: { roomCode } });
        if (!dbRoom) return;

        dbRoom.status = 'closed';
        await dbRoom.save();

        activeGames.delete(roomCode);

        // Fetch user profiles to update ELO and coins
        const players = dbRoom.players;
        const details = [];

        for (const p of players) {
          const u = await User.findByPk(p.userId);
          if (!u) continue;

          const eloBefore = u.elo;
          const coinsBefore = u.coins;

          let outcome = 'loss';
          let eloChange = -10;
          let coinsEarned = 20; // Participating coins

          if (isDraw) {
            outcome = 'draw';
            eloChange = 0;
            coinsEarned = 40;
          } else if (u.id === winnerId) {
            outcome = 'win';
            eloChange = 15;
            coinsEarned = 100; // Winning coins
          }

          u.elo = Math.max(100, u.elo + eloChange);
          u.coins += coinsEarned;
          await u.save();

          details.push({
            userId: u.id,
            username: u.username,
            eloBefore,
            eloAfter: u.elo,
            coinsEarned,
            outcome
          });

          // Check achievements
          await checkAndUnlockAchievements(u, outcome);
        }

        // Record Match history
        const match = await Match.create({
          gameType: dbRoom.gameType,
          status: 'completed',
          winnerId: isDraw ? null : winnerId,
          details
        });

        io.to(roomCode).emit('game_over_result', {
          matchId: match.id,
          winnerId,
          isDraw,
          details
        });
      } catch (err) {
        console.error('Game over submit error:', err);
      }
    });

    // ── 6. DISCONNECT & LEAVE ──
    socket.on('leave_lobby_room', async (data) => {
      const user = userSockets.get(socket.id);
      if (!user) return;
      const { roomCode } = data;

      try {
        const dbRoom = await Room.findOne({ where: { roomCode, status: 'waiting' } });
        if (!dbRoom) return;

        let players = dbRoom.players.filter(p => p.userId !== user.id);
        socket.leave(roomCode);

        if (players.length === 0) {
          dbRoom.status = 'closed';
          await dbRoom.save();
        } else {
          dbRoom.players = players;
          // Re-appoint host if host left
          if (dbRoom.hostId === user.id) {
            dbRoom.hostId = players[0].userId;
          }
          await dbRoom.save();
          io.to(roomCode).emit('room_updated', { room: dbRoom });
        }

        if (!dbRoom.isPrivate) {
          io.emit('public_rooms_changed');
        }
      } catch (err) {
        console.error('Leave room error:', err);
      }
    });

    socket.on('disconnect', () => {
      const user = userSockets.get(socket.id);
      if (user) {
        console.log(`Socket disconnected: ${user.username} (${socket.id})`);
        onlineUsers.delete(user.id);
        userSockets.delete(socket.id);

        // Remove from matchmaking queues
        Object.keys(matchmakingQueues).forEach(gt => {
          matchmakingQueues[gt] = matchmakingQueues[gt].filter(q => q.socketId !== socket.id);
        });

        // Notify friends
        io.emit('user_status_change', { userId: user.id, status: 'offline' });
        io.emit('online_count', { count: onlineUsers.size });
      }
    });
  });
}

// Helper: Achievement checks
async function checkAndUnlockAchievements(user, outcome) {
  try {
    // 1. First Win
    if (outcome === 'win') {
      const achId = 'first_win';
      const hasAch = await UserAchievement.findOne({ where: { userId: user.id, achievementId: achId } });
      if (!hasAch) {
        await UserAchievement.create({ userId: user.id, achievementId: achId });
        const ach = await Achievement.findByPk(achId);
        user.coins += ach.coinReward;
        await user.save();
        await Notification.create({
          userId: user.id,
          type: 'system',
          message: `Unlocked achievement: ${ach.name}! Received ${ach.coinReward} coins.`
        });
      }
    }

    // 2. Ten Wins
    // Query historical matches to calculate total wins
    const matches = await Match.findAll();
    let totalWins = 0;
    matches.forEach(m => {
      if (m.winnerId === user.id && m.status === 'completed') {
        totalWins++;
      }
    });

    if (totalWins >= 10) {
      const achId = 'ten_wins';
      const hasAch = await UserAchievement.findOne({ where: { userId: user.id, achievementId: achId } });
      if (!hasAch) {
        await UserAchievement.create({ userId: user.id, achievementId: achId });
        const ach = await Achievement.findByPk(achId);
        user.coins += ach.coinReward;
        await user.save();
        await Notification.create({
          userId: user.id,
          type: 'system',
          message: `Unlocked achievement: ${ach.name}! Received ${ach.coinReward} coins.`
        });
      }
    }

    // 3. Hundred Wins
    if (totalWins >= 100) {
      const achId = 'hundred_wins';
      const hasAch = await UserAchievement.findOne({ where: { userId: user.id, achievementId: achId } });
      if (!hasAch) {
        await UserAchievement.create({ userId: user.id, achievementId: achId });
        const ach = await Achievement.findByPk(achId);
        user.coins += ach.coinReward;
        await user.save();
        await Notification.create({
          userId: user.id,
          type: 'system',
          message: `Unlocked achievement: ${ach.name}! Received ${ach.coinReward} coins.`
        });
      }
    }

    // 4. Streak 5 (Check last 5 matches outcome)
    // Filter matches that involve this user
    const userMatches = matches
      .filter(m => (m.details || []).some(p => p.userId === user.id))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // latest first

    let winStreak = 0;
    for (const m of userMatches) {
      if (m.winnerId === user.id) {
        winStreak++;
      } else if (m.winnerId === null) {
        // Draw does not break streak in some rules, but let's count only consecutive wins
        break;
      } else {
        break; // Lost
      }
    }

    if (winStreak >= 5) {
      const achId = 'streak_five';
      const hasAch = await UserAchievement.findOne({ where: { userId: user.id, achievementId: achId } });
      if (!hasAch) {
        await UserAchievement.create({ userId: user.id, achievementId: achId });
        const ach = await Achievement.findByPk(achId);
        user.coins += ach.coinReward;
        await user.save();
        await Notification.create({
          userId: user.id,
          type: 'system',
          message: `Unlocked achievement: ${ach.name}! Received ${ach.coinReward} coins.`
        });
      }
    }
  } catch (err) {
    console.error('Error checking achievements:', err);
  }
}

module.exports = initSockets;

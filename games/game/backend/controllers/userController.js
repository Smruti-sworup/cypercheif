const { Op } = require('sequelize');
const { User, Friend, Notification, Match, Achievement, UserAchievement } = require('../models');

async function getProfile(req, res) {
  try {
    const { username } = req.params;
    const user = await User.findOne({
      where: { username },
      include: [
        {
          model: Achievement,
          as: 'achievements',
          through: { attributes: [] }
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch match history
    const allMatches = await Match.findAll({
      order: [['created_at', 'DESC']],
      limit: 15
    });

    // Filter matches that involve this user
    const matchHistory = allMatches.filter(m => {
      const details = m.details || [];
      return details.some(p => p.userId === user.id);
    });

    // Calculate detailed statistics
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let chessWins = 0, chessTotal = 0;
    let carromWins = 0, carromTotal = 0;
    let ludoWins = 0, ludoTotal = 0;
    let tttWins = 0, tttTotal = 0;

    matchHistory.forEach(m => {
      const details = m.details || [];
      const userDetails = details.find(p => p.userId === user.id);
      if (!userDetails) return;

      const isWinner = m.winnerId === user.id;
      const isDraw = m.winnerId === null; // Wait, Chess/TTT can have null winner for draw

      if (isWinner) {
        wins++;
        if (m.gameType === 'chess') chessWins++;
        if (m.gameType === 'carrom') carromWins++;
        if (m.gameType === 'ludo') ludoWins++;
        if (m.gameType === 'ttt') tttWins++;
      } else if (isDraw) {
        draws++;
      } else {
        losses++;
      }

      if (m.gameType === 'chess') chessTotal++;
      if (m.gameType === 'carrom') carromTotal++;
      if (m.gameType === 'ludo') ludoTotal++;
      if (m.gameType === 'ttt') tttTotal++;
    });

    const totalGames = wins + losses + draws;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    return res.json({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      elo: user.elo,
      coins: user.coins,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        totalGames,
        wins,
        losses,
        draws,
        winRate,
        byGame: {
          chess: { wins: chessWins, total: chessTotal },
          carrom: { wins: carromWins, total: carromTotal },
          ludo: { wins: ludoWins, total: ludoTotal },
          ttt: { wins: tttWins, total: tttTotal }
        }
      },
      matchHistory: matchHistory.map(m => ({
        id: m.id,
        gameType: m.gameType,
        status: m.status,
        winnerId: m.winnerId,
        date: m.createdAt,
        players: m.details
      })),
      achievements: user.achievements
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return res.status(500).json({ error: 'Internal server error fetching profile' });
  }
}

async function updateAvatar(req, res) {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res.status(400).json({ error: 'Avatar identifier is required' });
    }

    req.user.avatarUrl = avatarUrl;
    await req.user.save();

    return res.json({ message: 'Avatar updated successfully', avatarUrl: req.user.avatarUrl });
  } catch (error) {
    console.error('updateAvatar error:', error);
    return res.status(500).json({ error: 'Internal server error updating avatar' });
  }
}

async function getFriends(req, res) {
  try {
    const userId = req.user.id;
    // Find all friendships where user is participant
    const friendships = await Friend.findAll({
      where: {
        [Op.or]: [{ userId }, { friendId: userId }]
      }
    });

    const friendsList = [];
    for (const f of friendships) {
      const isInitiator = f.userId === userId;
      const targetId = isInitiator ? f.friendId : f.userId;
      const friendUser = await User.findByPk(targetId, {
        attributes: ['id', 'username', 'avatarUrl', 'elo']
      });

      if (friendUser) {
        friendsList.push({
          friendshipId: f.id,
          id: friendUser.id,
          username: friendUser.username,
          avatarUrl: friendUser.avatarUrl,
          elo: friendUser.elo,
          status: f.status,
          initiatedByMe: isInitiator
        });
      }
    }

    return res.json(friendsList);
  } catch (error) {
    console.error('getFriends error:', error);
    return res.status(500).json({ error: 'Internal server error fetching friends' });
  }
}

async function sendOrAcceptFriend(req, res) {
  try {
    const { targetUsername } = req.body;
    const userId = req.user.id;

    if (!targetUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    if (targetUsername === req.user.username) {
      return res.status(400).json({ error: 'You cannot add yourself' });
    }

    const targetUser = await User.findOne({ where: { username: targetUsername } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if friendship already exists
    const existing = await Friend.findOne({
      where: {
        [Op.or]: [
          { userId, friendId: targetUser.id },
          { userId: targetUser.id, friendId: userId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends' });
      }

      // If pending and current user was the recipient, accept it!
      if (existing.status === 'pending' && existing.friendId === userId) {
        existing.status = 'accepted';
        await existing.save();

        // Create system notifications
        await Notification.create({
          userId: existing.userId,
          type: 'system',
          message: `${req.user.username} accepted your friend request.`
        });

        return res.json({ message: 'Friend request accepted', status: 'accepted' });
      } else {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
    }

    // Create a new pending friendship
    const friendship = await Friend.create({
      userId,
      friendId: targetUser.id,
      status: 'pending'
    });

    // Create notification for friend
    await Notification.create({
      userId: targetUser.id,
      type: 'friend_request',
      message: `${req.user.username} sent you a friend request.`,
      senderId: userId
    });

    return res.status(201).json({ message: 'Friend request sent', status: 'pending' });
  } catch (error) {
    console.error('sendOrAcceptFriend error:', error);
    return res.status(500).json({ error: 'Internal server error with friend operation' });
  }
}

async function getNotifications(req, res) {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 30
    });
    return res.json(notifications);
  } catch (error) {
    console.error('getNotifications error:', error);
    return res.status(500).json({ error: 'Internal server error fetching notifications' });
  }
}

async function markNotificationsRead(req, res) {
  try {
    await Notification.update(
      { isRead: true },
      { where: { userId: req.user.id, isRead: false } }
    );
    return res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error('markNotificationsRead error:', error);
    return res.status(500).json({ error: 'Internal server error updating notifications' });
  }
}

async function claimDailyBonus(req, res) {
  try {
    const user = req.user;
    
    // We store inventory or daily claim details on User. Since SQLite can extend, or we can use metadata,
    // let's do a simple calculation of checking when the user was updated or a log, or we can save a
    // last_login_claim date on User.
    // Wait! Let's check User details. We didn't add dailyClaimDate on User, but wait, Sequelize allows dynamically
    // adding it, or we can check User's updated_at, or let's use the Notification table as a log of daily claims!
    // Search notifications for a 'daily_login' type in the last 24 hours.
    const lastClaim = await Notification.findOne({
      where: {
        userId: user.id,
        message: { [Op.like]: '%Daily login bonus claimed%' },
        createdAt: {
          [Op.gt]: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (lastClaim) {
      return res.status(400).json({ error: 'Daily bonus already claimed within the last 24 hours. Come back tomorrow!' });
    }

    // Add 50 coins to User
    user.coins += 50;
    await user.save();

    // Log the claim in Notifications
    await Notification.create({
      userId: user.id,
      type: 'system',
      message: 'Daily login bonus claimed! Received 50 coins.'
    });

    // Check achievement: see if they have claimed achievements
    const achId = 'daily_login';
    const hasAch = await UserAchievement.findOne({ where: { userId: user.id, achievementId: achId } });
    if (!hasAch) {
      await UserAchievement.create({ userId: user.id, achievementId: achId });
      const ach = await Achievement.findByPk(achId);
      user.coins += ach.coinReward;
      await user.save();
      
      await Notification.create({
        userId: user.id,
        type: 'system',
        message: `Unlocked achievement: ${ach.name}! Received ${ach.coinReward} bonus coins.`
      });
    }

    return res.json({
      message: 'Daily bonus claimed successfully!',
      coinsAwarded: 50,
      newCoinsBalance: user.coins
    });
  } catch (error) {
    console.error('claimDailyBonus error:', error);
    return res.status(500).json({ error: 'Internal server error claiming daily bonus' });
  }
}

module.exports = {
  getProfile,
  updateAvatar,
  getFriends,
  sendOrAcceptFriend,
  getNotifications,
  markNotificationsRead,
  claimDailyBonus
};

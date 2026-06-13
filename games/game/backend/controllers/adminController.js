const { User, ChatMessage, Match, sequelize } = require('../models');

async function getUsers(req, res) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'avatarUrl', 'elo', 'coins', 'role', 'isBanned', 'createdAt'],
      order: [['created_at', 'DESC']]
    });
    return res.json(users);
  } catch (error) {
    console.error('admin getUsers error:', error);
    return res.status(500).json({ error: 'Internal server error listing users' });
  }
}

async function banUser(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot ban another administrator' });
    }

    user.isBanned = true;
    await user.save();

    return res.json({ message: `User ${user.username} has been banned.` });
  } catch (error) {
    console.error('admin banUser error:', error);
    return res.status(500).json({ error: 'Internal server error banning user' });
  }
}

async function unbanUser(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBanned = false;
    await user.save();

    return res.json({ message: `User ${user.username} has been unbanned.` });
  } catch (error) {
    console.error('admin unbanUser error:', error);
    return res.status(500).json({ error: 'Internal server error unbanning user' });
  }
}

async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const msg = await ChatMessage.findByPk(messageId);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await msg.destroy();
    return res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    console.error('admin deleteMessage error:', error);
    return res.status(500).json({ error: 'Internal server error deleting message' });
  }
}

async function getStats(req, res) {
  try {
    const totalUsers = await User.count();
    const bannedUsers = await User.count({ where: { isBanned: true } });
    const totalMatches = await Match.count();
    const completedMatches = await Match.count({ where: { status: 'completed' } });
    
    // Average ELO rating
    const avgEloResult = await User.findAll({
      attributes: [[sequelize.fn('AVG', sequelize.col('elo')), 'avgElo']]
    });
    const avgElo = avgEloResult[0] ? Math.round(parseFloat(avgEloResult[0].getDataValue('avgElo')) || 0) : 1000;

    // Sum of all player coins
    const sumCoinsResult = await User.findAll({
      attributes: [[sequelize.fn('SUM', sequelize.col('coins')), 'totalCoins']]
    });
    const totalCoins = sumCoinsResult[0] ? parseInt(sumCoinsResult[0].getDataValue('totalCoins')) || 0 : 0;

    // Games breakdown
    const chessCount = await Match.count({ where: { gameType: 'chess' } });
    const carromCount = await Match.count({ where: { gameType: 'carrom' } });
    const ludoCount = await Match.count({ where: { gameType: 'ludo' } });
    const tttCount = await Match.count({ where: { gameType: 'ttt' } });

    return res.json({
      totalUsers,
      bannedUsers,
      totalMatches,
      completedMatches,
      avgElo,
      totalCoins,
      breakdown: {
        chess: chessCount,
        carrom: carromCount,
        ludo: ludoCount,
        ttt: tttCount
      }
    });
  } catch (error) {
    console.error('admin getStats error:', error);
    return res.status(500).json({ error: 'Internal server error fetching stats' });
  }
}

module.exports = {
  getUsers,
  banUser,
  unbanUser,
  deleteMessage,
  getStats
};

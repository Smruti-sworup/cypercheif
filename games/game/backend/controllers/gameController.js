const { User, Match, Notification } = require('../models');
const { Op } = require('sequelize');

const SHOP_ITEMS = [
  // Themes
  { id: 'theme_neon', name: 'Cyber Neon Theme', type: 'theme', cost: 200, desc: 'Electrifying cyber glow' },
  { id: 'theme_matrix', name: 'Matrix Digital Theme', type: 'theme', cost: 200, desc: 'Green digital cascade style' },
  { id: 'theme_sunset', name: 'Sunset Haze Theme', type: 'theme', cost: 250, desc: 'Warm amber & purple gradients' },
  // Avatars
  { id: 'avatar_ninja', name: 'Shadow Ninja', type: 'avatar', cost: 100, desc: 'A mysterious shadow warrior' },
  { id: 'avatar_wizard', name: 'Arcane Mage', type: 'avatar', cost: 100, desc: 'Wielder of ancient gaming spells' },
  { id: 'avatar_cypher', name: 'Netrunner Cypher', type: 'avatar', cost: 150, desc: 'Sci-fi hacker persona' },
  // Board Skins
  { id: 'skin_wood', name: 'Grandmaster Mahogany Board', type: 'skin', cost: 150, desc: 'Classic wooden finish' },
  { id: 'skin_glass', name: 'Frost Glass Board', type: 'skin', cost: 200, desc: 'Modern semi-transparent board' },
  { id: 'skin_lava', name: 'Lava Flow Board', type: 'skin', cost: 250, desc: 'Volcanic red styled grid lines' }
];

async function getLeaderboard(req, res) {
  try {
    const { timeframe } = req.query; // 'alltime', 'weekly', 'monthly'

    if (timeframe === 'weekly' || timeframe === 'monthly') {
      const days = timeframe === 'weekly' ? 7 : 30;
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Fetch all matches in the period
      const matches = await Match.findAll({
        where: {
          status: 'completed',
          createdAt: { [Op.gt]: cutoffDate }
        }
      });

      // Aggregate wins per user
      const winCounts = {};
      matches.forEach(m => {
        if (m.winnerId) {
          winCounts[m.winnerId] = (winCounts[m.winnerId] || 0) + 1;
        }
      });

      // Fetch users who won in this period
      const users = await User.findAll({
        attributes: ['id', 'username', 'avatarUrl', 'elo'],
        where: { isBanned: false }
      });

      // Map win counts
      const leaderboard = users.map(u => ({
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        elo: u.elo,
        periodWins: winCounts[u.id] || 0
      }));

      // Sort by period wins first, then ELO
      leaderboard.sort((a, b) => b.periodWins - a.periodWins || b.elo - a.elo);

      return res.json(leaderboard.slice(0, 50));
    } else {
      // Default: All-time sorted by ELO
      const leaderboard = await User.findAll({
        attributes: ['id', 'username', 'avatarUrl', 'elo', 'coins'],
        where: { isBanned: false },
        order: [['elo', 'DESC']],
        limit: 50
      });
      return res.json(leaderboard);
    }
  } catch (error) {
    console.error('getLeaderboard error:', error);
    return res.status(500).json({ error: 'Internal server error fetching leaderboard' });
  }
}

async function getMatchHistory(req, res) {
  try {
    const matches = await Match.findAll({
      order: [['created_at', 'DESC']],
      limit: 30
    });

    return res.json(matches);
  } catch (error) {
    console.error('getMatchHistory error:', error);
    return res.status(500).json({ error: 'Internal server error fetching matches' });
  }
}

function getShopItems(req, res) {
  return res.json(SHOP_ITEMS);
}

async function buyShopItem(req, res) {
  try {
    const { itemId } = req.body;
    const user = req.user;

    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found in shop' });
    }

    const inventory = user.inventory; // Array thanks to getter
    if (inventory.includes(itemId)) {
      return res.status(400).json({ error: 'You already own this item' });
    }

    if (user.coins < item.cost) {
      return res.status(400).json({ error: 'Insufficient coins balance' });
    }

    // Deduct coins & Add to inventory
    user.coins -= item.cost;
    const updatedInventory = [...inventory, itemId];
    user.inventory = updatedInventory; // Set trigger
    await user.save();

    // Check achievement: save up to 2000 coins (this might be checked elsewhere, but let's check coin total here)
    if (user.coins >= 2000) {
      // Trigger achievement
      const achId = 'wealthy_gamer';
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

    return res.json({
      message: `Successfully purchased ${item.name}!`,
      newCoinsBalance: user.coins,
      inventory: updatedInventory
    });
  } catch (error) {
    console.error('buyShopItem error:', error);
    return res.status(500).json({ error: 'Internal server error processing purchase' });
  }
}

module.exports = {
  getLeaderboard,
  getMatchHistory,
  getShopItems,
  buyShopItem
};

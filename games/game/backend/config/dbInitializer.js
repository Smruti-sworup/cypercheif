const { sequelize, Achievement } = require('../models');

const seedAchievements = [
  {
    id: 'first_win',
    name: 'First Blood',
    description: 'Win your first game in the hub!',
    coinReward: 100,
    iconKey: '🏆'
  },
  {
    id: 'ten_wins',
    name: 'Hub Regular',
    description: 'Win 10 games in the hub!',
    coinReward: 250,
    iconKey: '⚔️'
  },
  {
    id: 'hundred_wins',
    name: 'Grandmaster',
    description: 'Win 100 games in the hub!',
    coinReward: 1000,
    iconKey: '👑'
  },
  {
    id: 'daily_login',
    name: 'Daily Devotee',
    description: 'Log in daily to claim your bonus!',
    coinReward: 50,
    iconKey: '📅'
  },
  {
    id: 'streak_five',
    name: 'On Fire',
    description: 'Reach a win streak of 5!',
    coinReward: 300,
    iconKey: '🔥'
  },
  {
    id: 'wealthy_gamer',
    name: 'Coin Collector',
    description: 'Accumulate 2000 coins in your bank!',
    coinReward: 200,
    iconKey: '💰'
  }
];

async function initializeDatabase() {
  try {
    // Sync models with database
    await sequelize.sync({ alter: false }); // Change to true if changing schema dynamically during dev
    console.log('Database synchronized.');

    // Seed achievements if they don't exist
    const count = await Achievement.count();
    if (count === 0) {
      await Achievement.bulkCreate(seedAchievements);
      console.log('Achievements database seeded.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

module.exports = initializeDatabase;

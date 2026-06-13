const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Match = sequelize.define('Match', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  gameType: {
    type: DataTypes.ENUM('chess', 'carrom', 'ludo', 'ttt'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  winnerId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  // Details stores list of participants: [{ userId, username, eloBefore, eloAfter, coinsEarned, score, placement }]
  details: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('details');
      try {
        return val ? JSON.parse(val) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('details', JSON.stringify(val));
    }
  }
}, {
  indexes: [
    { fields: ['game_type'] },
    { fields: ['winner_id'] }
  ]
});

module.exports = Match;

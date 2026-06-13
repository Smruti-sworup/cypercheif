const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAchievement = sequelize.define('UserAchievement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  achievementId: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  tableName: 'user_achievements',
  indexes: [
    { fields: ['user_id', 'achievement_id'] }
  ]
});

module.exports = UserAchievement;

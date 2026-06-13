const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.STRING, // e.g., 'first_win', 'ten_wins', 'daily_login'
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  coinReward: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  iconKey: {
    type: DataTypes.STRING,
    defaultValue: 'award_default'
  }
}, {
  timestamps: false
});

module.exports = Achievement;

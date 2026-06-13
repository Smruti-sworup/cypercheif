const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 20]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatarUrl: {
    type: DataTypes.STRING,
    defaultValue: 'avatar_default_1'
  },
  coins: {
    type: DataTypes.INTEGER,
    defaultValue: 500
  },
  elo: {
    type: DataTypes.INTEGER,
    defaultValue: 1000
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user'
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  inventory: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '["avatar_default_1"]',
    get() {
      const val = this.getDataValue('inventory');
      try {
        return val ? JSON.parse(val) : ["avatar_default_1"];
      } catch (e) {
        return ["avatar_default_1"];
      }
    },
    set(val) {
      this.setDataValue('inventory', JSON.stringify(val));
    }
  }
}, {
  indexes: [
    { unique: true, fields: ['username'] },
    { unique: true, fields: ['email'] }
  ]
});

module.exports = User;

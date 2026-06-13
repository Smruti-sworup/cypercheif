const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  roomCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  gameType: {
    type: DataTypes.ENUM('chess', 'carrom', 'ludo', 'ttt'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('waiting', 'playing', 'closed'),
    defaultValue: 'waiting'
  },
  isPrivate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  maxPlayers: {
    type: DataTypes.INTEGER,
    defaultValue: 2
  },
  hostId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Active players in room: [{ userId, username, avatarUrl, isReady }]
  players: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: '[]',
    get() {
      const val = this.getDataValue('players');
      try {
        return val ? JSON.parse(val) : [];
      } catch (e) {
        return [];
      }
    },
    set(val) {
      this.setDataValue('players', JSON.stringify(val));
    }
  }
}, {
  indexes: [
    { unique: true, fields: ['room_code'] },
    { fields: ['status'] }
  ]
});

module.exports = Room;

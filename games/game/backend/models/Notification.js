const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('friend_request', 'room_invite', 'system'),
    allowNull: false
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  roomCode: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ['user_id'] },
    { fields: ['is_read'] }
  ]
});

module.exports = Notification;

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  chatType: {
    type: DataTypes.ENUM('global', 'room', 'direct'),
    defaultValue: 'global'
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  recipientId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  messageText: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'chat_messages',
  indexes: [
    { fields: ['chat_type'] },
    { fields: ['room_id'] },
    { fields: ['sender_id'] },
    { fields: ['recipient_id'] }
  ]
});

module.exports = ChatMessage;

const sequelize = require('../config/database');
const User = require('./User');
const Friend = require('./Friend');
const Match = require('./Match');
const Room = require('./Room');
const ChatMessage = require('./ChatMessage');
const Achievement = require('./Achievement');
const UserAchievement = require('./UserAchievement');
const Notification = require('./Notification');

// --- Associations ---

// User <-> ChatMessages
User.hasMany(ChatMessage, { foreignKey: 'senderId', as: 'sentMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// User <-> Friends
User.hasMany(Friend, { foreignKey: 'userId', as: 'initiatedFriendships' });
User.hasMany(Friend, { foreignKey: 'friendId', as: 'receivedFriendships' });
Friend.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Friend.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

// User <-> Achievements (Many-to-Many)
User.belongsToMany(Achievement, { through: UserAchievement, foreignKey: 'userId', otherKey: 'achievementId', as: 'achievements' });
Achievement.belongsToMany(User, { through: UserAchievement, foreignKey: 'achievementId', otherKey: 'userId', as: 'users' });

// User <-> Notifications
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

module.exports = {
  sequelize,
  User,
  Friend,
  Match,
  Room,
  ChatMessage,
  Achievement,
  UserAchievement,
  Notification
};

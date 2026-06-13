const { ChatMessage, User } = require('../models');
const { Op } = require('sequelize');

async function getGlobalChat(req, res) {
  try {
    const messages = await ChatMessage.findAll({
      where: { chatType: 'global' },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatarUrl', 'role']
        }
      ],
      order: [['created_at', 'ASC']],
      limit: 100
    });

    return res.json(messages);
  } catch (error) {
    console.error('getGlobalChat error:', error);
    return res.status(500).json({ error: 'Internal server error fetching global chat' });
  }
}

async function getPrivateChat(req, res) {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    if (!friendId) {
      return res.status(400).json({ error: 'Friend ID is required' });
    }

    const messages = await ChatMessage.findAll({
      where: {
        chatType: 'direct',
        [Op.or]: [
          { senderId: userId, recipientId: friendId },
          { senderId: friendId, recipientId: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'username', 'avatarUrl', 'role']
        }
      ],
      order: [['created_at', 'ASC']],
      limit: 100
    });

    return res.json(messages);
  } catch (error) {
    console.error('getPrivateChat error:', error);
    return res.status(500).json({ error: 'Internal server error fetching private chat' });
  }
}

module.exports = {
  getGlobalChat,
  getPrivateChat
};

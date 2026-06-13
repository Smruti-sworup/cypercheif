const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

router.get('/global', authenticateToken, chatController.getGlobalChat);
router.get('/direct/:friendId', authenticateToken, chatController.getPrivateChat);

module.exports = router;

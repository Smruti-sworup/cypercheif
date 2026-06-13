const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/profile/:username', authenticateToken, userController.getProfile);
router.put('/avatar', authenticateToken, userController.updateAvatar);
router.get('/friends', authenticateToken, userController.getFriends);
router.post('/friends', authenticateToken, userController.sendOrAcceptFriend);
router.get('/notifications', authenticateToken, userController.getNotifications);
router.put('/notifications/read', authenticateToken, userController.markNotificationsRead);
router.post('/claim-daily', authenticateToken, userController.claimDailyBonus);

module.exports = router;

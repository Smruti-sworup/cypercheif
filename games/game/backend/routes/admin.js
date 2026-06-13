const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.get('/users', authenticateToken, requireAdmin, adminController.getUsers);
router.post('/ban', authenticateToken, requireAdmin, adminController.banUser);
router.post('/unban', authenticateToken, requireAdmin, adminController.unbanUser);
router.delete('/message/:messageId', authenticateToken, requireAdmin, adminController.deleteMessage);
router.get('/stats', authenticateToken, requireAdmin, adminController.getStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const rateLimiter = require('../middleware/rateLimiter');

// Rate limit login/register to 20 requests per 15 minutes
const authLimiter = rateLimiter(20, 15 * 60 * 1000);

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;

const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { authenticateToken } = require('../middleware/auth');

router.get('/leaderboard', gameController.getLeaderboard);
router.get('/match-history', gameController.getMatchHistory);
router.get('/shop', authenticateToken, gameController.getShopItems);
router.post('/shop/buy', authenticateToken, gameController.buyShopItem);

module.exports = router;

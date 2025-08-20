const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { sessionLimiter } = require('../middleware/rateLimit');

// Đăng nhập hoặc tạo user mới
router.post('/login', sessionLimiter, userController.loginOrCreateUser);

// Lấy thông tin user theo session
router.get('/session/:sessionId', userController.getUserBySession);

// Cập nhật thông tin user
router.patch('/session/:sessionId', userController.updateUser);

// Lấy thống kê user
router.get('/stats', userController.getUserStats);

module.exports = router;

const express = require('express');
const router = express.Router();
const aiInteractionController = require('../controllers/aiInteractionController');
const { authenticateUser, optionalAuth } = require('../middleware/auth');
const { generalLimiter, aiInteractionLimiter } = require('../middleware/rateLimit');

// Lưu tương tác AI mới
router.post('/save', aiInteractionLimiter, aiInteractionController.saveAIInteraction);

// Phân tích hình ảnh
router.post('/analyze-image', aiInteractionLimiter, aiInteractionController.analyzeImage);

// Tạo bài tập
router.post('/generate-exercises', aiInteractionLimiter, aiInteractionController.generateExercises);

// Phân tích chi tiết từ vựng
router.post('/analyze-word-details', aiInteractionLimiter, aiInteractionController.analyzeWordDetails);

// Phân tích phát âm
router.post('/analyze-pronunciation', aiInteractionLimiter, aiInteractionController.analyzePronunciation);

// Lấy lịch sử AI interactions
router.get('/history', generalLimiter, aiInteractionController.getInteractionHistory);

// Lấy thống kê AI interactions
router.get('/stats', generalLimiter, aiInteractionController.getInteractionStats);

// Lấy tương tác AI theo session
router.get('/session/:sessionId', generalLimiter, aiInteractionController.getAIInteractionsBySession);

// Lấy dữ liệu AI interaction đầy đủ (bao gồm cả dữ liệu lớn từ buffer)
router.get('/full/:id', generalLimiter, aiInteractionController.getFullAIInteraction);

// Xóa tương tác AI
router.delete('/:id', generalLimiter, aiInteractionController.deleteAIInteraction);

module.exports = router;

const express = require('express');
const router = express.Router();
const userProgressController = require('../controllers/userProgressController');
const { authenticateUser } = require('../middleware/auth');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authenticateUser);

// GET /api/user-progress - Lấy tiến độ học tập của người dùng
router.get('/', userProgressController.getUserProgress);

// PUT /api/user-progress - Cập nhật tiến độ học tập
router.put('/', userProgressController.updateUserProgress);

// POST /api/user-progress/experience - Thêm XP cho người dùng
router.post('/experience', userProgressController.addExperience);

// POST /api/user-progress/streak - Cập nhật streak học tập
router.post('/streak', userProgressController.updateStreak);

// GET /api/user-progress/weekly - Lấy thống kê học tập theo tuần
router.get('/weekly', userProgressController.getWeeklyProgress);

// GET /api/user-progress/daily - Lấy thống kê học tập theo ngày
router.get('/daily', userProgressController.getDailyProgress);

// GET /api/user-progress/achievements - Lấy danh sách achievements
router.get('/achievements', userProgressController.getAchievements);

// POST /api/user-progress/daily - Cập nhật tiến độ học tập trong ngày
router.post('/daily', userProgressController.updateDailyProgress);

// POST /api/user-progress/weekly - Cập nhật tiến độ học tập trong tuần
router.post('/weekly', userProgressController.updateWeeklyProgress);

// POST /api/user-progress/check-achievements - Kiểm tra và mở khóa achievements
router.post('/check-achievements', userProgressController.checkAchievements);

// GET /api/user-progress/overall-stats - Lấy thống kê tổng quan
router.get('/overall-stats', userProgressController.getOverallStats);

// GET /api/user-progress/vocabulary-stats - Lấy thống kê từ vựng
router.get('/vocabulary-stats', userProgressController.getVocabularyStats);

// GET /api/user-progress/date-range - Lấy thống kê học tập theo khoảng thời gian
router.get('/date-range', userProgressController.getProgressByDateRange);

// DELETE /api/user-progress/reset - Reset tiến độ người dùng (chỉ cho development)
router.delete('/reset', userProgressController.resetUserProgress);

module.exports = router;

const express = require('express');
const router = express.Router();
const frontendActivityController = require('../controllers/frontendActivityController');

// Lưu hoạt động frontend mới
router.post('/', frontendActivityController.saveFrontendActivity);

// Lấy danh sách hoạt động frontend theo session
router.get('/session/:sessionId', frontendActivityController.getFrontendActivitiesBySession);

// Lấy thống kê hoạt động frontend
router.get('/stats', frontendActivityController.getFrontendActivityStats);

// Lấy hoạt động gần đây
router.get('/recent', frontendActivityController.getRecentActivities);

// Xóa hoạt động frontend
router.delete('/:id', frontendActivityController.deleteFrontendActivity);

module.exports = router;

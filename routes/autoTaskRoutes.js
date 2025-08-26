const express = require('express');
const router = express.Router();
const {
    getAutoTaskStatus,
    getAutoTaskHistory,
    getAutoTaskAnalytics,
    rerunAutoTask,
    cleanupAutoTaskData
} = require('../controllers/autoTaskController');
const { authenticateUser } = require('../middleware/auth');

/**
 * Routes để quản lý các task tự động
 */

// Lấy trạng thái tổng quan của các task tự động
router.get('/status', authenticateUser, getAutoTaskStatus);

// Lấy lịch sử các task tự động đã thực hiện
router.get('/history', authenticateUser, getAutoTaskHistory);

// Lấy thống kê chi tiết về task tự động
router.get('/analytics', authenticateUser, getAutoTaskAnalytics);

// Chạy lại task tự động cho một session cụ thể
router.post('/rerun/:sessionId/:endpoint', authenticateUser, rerunAutoTask);

// Xóa dữ liệu được tạo bởi task tự động
router.delete('/cleanup/:sessionId/:endpoint', authenticateUser, cleanupAutoTaskData);

module.exports = router;

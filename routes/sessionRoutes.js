const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// Tạo phiên mới
router.post('/', sessionController.createSession);

// Validate session nhanh
router.get('/:sessionId/validate', sessionController.validateSession);

// Lấy thông tin phiên
router.get('/:sessionId', sessionController.getSession);

// Cập nhật hoạt động cuối cùng của phiên
router.patch('/:sessionId/activity', sessionController.updateSessionActivity);

// Kết thúc phiên
router.patch('/:sessionId/end', sessionController.endSession);

// Lấy danh sách phiên
router.get('/', sessionController.getSessions);

// Lấy thống kê phiên
router.get('/stats', sessionController.getSessionStats);

// Xóa phiên
router.delete('/:sessionId', sessionController.deleteSession);

module.exports = router;

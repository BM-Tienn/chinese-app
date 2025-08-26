const express = require('express');
const router = express.Router();
const personalVocabularyController = require('../controllers/personalVocabularyController');
const { authenticateUser } = require('../middleware/auth');

// Áp dụng middleware xác thực cho tất cả routes
router.use(authenticateUser);

// GET /api/personal-vocabulary - Lấy danh sách từ vựng cá nhân
router.get('/', personalVocabularyController.getPersonalVocabulary);

// GET /api/personal-vocabulary/:id - Lấy từ vựng cá nhân theo ID
router.get('/:id', personalVocabularyController.getPersonalVocabularyById);

// POST /api/personal-vocabulary - Thêm từ vựng mới vào danh sách cá nhân
router.post('/', personalVocabularyController.addPersonalWord);

// PUT /api/personal-vocabulary/:id - Cập nhật từ vựng cá nhân
router.put('/:id', personalVocabularyController.updatePersonalWord);

// DELETE /api/personal-vocabulary/:id - Xóa từ vựng cá nhân
router.delete('/:id', personalVocabularyController.deletePersonalWord);

// GET /api/personal-vocabulary/review/words - Lấy từ vựng cần ôn tập
router.get('/review/words', personalVocabularyController.getWordsForReview);

// GET /api/personal-vocabulary/new/words - Lấy từ vựng mới để học
router.get('/new/words', personalVocabularyController.getNewWords);

// PUT /api/personal-vocabulary/:id/study-result - Cập nhật kết quả học tập
router.put('/:id/study-result', personalVocabularyController.updateStudyResult);

// GET /api/personal-vocabulary/schedule/review - Tạo lịch ôn tập
router.get('/schedule/review', personalVocabularyController.generateReviewSchedule);

// GET /api/personal-vocabulary/stats - Lấy thống kê từ vựng cá nhân
router.get('/stats', personalVocabularyController.getVocabularyStats);

// GET /api/personal-vocabulary/mastery/:masteryLevel - Lấy từ vựng theo mức độ thành thạo
router.get('/mastery/:masteryLevel', personalVocabularyController.getWordsByMasteryLevel);

// GET /api/personal-vocabulary/search - Tìm kiếm từ vựng cá nhân
router.get('/search', personalVocabularyController.searchPersonalVocabulary);

module.exports = router;

const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabularyController');
const {
    validateCreateVocabulary,
    validateUpdateVocabulary,
    validateSearchVocabularies,
    validateGetVocabulariesByHSKLevel,
    validateUpdateLearningStatistics,
    validateGetRandomVocabularies,
    validateGetVocabularies,
    validateMongoId
} = require('../middleware/validation');

// GET /api/vocabularies - Lấy danh sách từ vựng với phân trang và lọc
router.get('/', validateGetVocabularies, vocabularyController.getVocabularies);

// GET /api/vocabularies/stats - Lấy thống kê tổng quan về kho từ vựng
router.get('/stats', vocabularyController.getVocabularyStats);

// GET /api/vocabularies/search - Tìm kiếm từ vựng nâng cao
router.get('/search', validateSearchVocabularies, vocabularyController.searchVocabularies);

// GET /api/vocabularies/random - Lấy từ vựng ngẫu nhiên cho bài tập
router.get('/random', validateGetRandomVocabularies, vocabularyController.getRandomVocabularies);

// GET /api/vocabularies/hsk/:level - Lấy từ vựng theo cấp độ HSK
router.get('/hsk/:level', validateGetVocabulariesByHSKLevel, vocabularyController.getVocabulariesByHSKLevel);

// GET /api/vocabularies/:id - Lấy từ vựng theo ID
router.get('/:id', validateMongoId, vocabularyController.getVocabularyById);

// POST /api/vocabularies - Tạo từ vựng mới
router.post('/', validateCreateVocabulary, vocabularyController.createVocabulary);

// PUT /api/vocabularies/:id - Cập nhật từ vựng
router.put('/:id', validateUpdateVocabulary, vocabularyController.updateVocabulary);

// DELETE /api/vocabularies/:id - Xóa từ vựng (soft delete)
router.delete('/:id', validateMongoId, vocabularyController.deleteVocabulary);

// PATCH /api/vocabularies/:id/statistics - Cập nhật thống kê học tập
router.patch('/:id/statistics', validateUpdateLearningStatistics, vocabularyController.updateLearningStatistics);

module.exports = router;

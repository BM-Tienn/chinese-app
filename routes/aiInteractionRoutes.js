const express = require('express');
const router = express.Router();
const aiInteractionController = require('../controllers/aiInteractionController');
const { aiInteractionLimiter } = require('../middleware/rateLimit');

// AI Analysis endpoints
router.post('/analyze-image', aiInteractionController.analyzeImage);
router.post('/generate-exercises', aiInteractionController.generateExercises);
router.post('/analyze-word-details', aiInteractionController.analyzeWordDetails);
router.post('/analyze-pronunciation', aiInteractionController.analyzePronunciation);

// History and Analytics endpoints
router.get('/history', aiInteractionController.getInteractionHistory);
router.get('/stats', aiInteractionController.getInteractionStats);

// Lấy dữ liệu đầy đủ của một AI interaction
router.get('/full/:id', aiInteractionController.getFullAIInteraction);

module.exports = router;

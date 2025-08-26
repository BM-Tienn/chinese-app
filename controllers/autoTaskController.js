const AutoTaskService = require('../services/autoTaskService');
const AIInteraction = require('../models/AIInteraction');
const Exercise = require('../models/Exercise');
const Vocabulary = require('../models/Vocabulary');
const PersonalVocabulary = require('../models/PersonalVocabulary');
const UserProgress = require('../models/UserProgress');

/**
 * Controller để quản lý các task tự động
 */

/**
 * Lấy trạng thái tổng quan của các task tự động
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAutoTaskStatus = async (req, res) => {
    try {
        const { sessionId, userId, dateFrom, dateTo } = req.query;

        // Lấy thống kê AI interactions
        const aiStats = await AIInteraction.getStats({
            sessionId,
            userId,
            dateFrom,
            dateTo
        });

        // Lấy thống kê bài tập được tạo
        const exerciseStats = await Exercise.getStats();

        // Lấy thống kê từ vựng
        const vocabStats = await Vocabulary.getStats({
            source: 'AI Generated'
        });

        // Lấy thống kê từ vựng cá nhân
        let personalVocabStats = null;
        if (userId) {
            personalVocabStats = await PersonalVocabulary.getStats({
                userId,
                tags: ['AI Generated']
            });
        }

        const status = {
            aiInteractions: aiStats[0] || {
                totalCalls: 0,
                successCalls: 0,
                errorCalls: 0,
                avgResponseTime: 0
            },
            exercises: exerciseStats[0] || {
                totalExercises: 0,
                totalUsage: 0,
                avgAccuracy: 0
            },
            vocabulary: vocabStats[0] || {
                totalAIWords: 0
            },
            personalVocabulary: personalVocabStats ? personalVocabStats[0] : null,
            lastUpdated: new Date()
        };

        res.json({
            success: true,
            data: status
        });

    } catch (error) {
        console.error('Lỗi khi lấy trạng thái task tự động:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy trạng thái task tự động',
            error: error.message
        });
    }
};

/**
 * Lấy lịch sử các task tự động đã thực hiện
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAutoTaskHistory = async (req, res) => {
    try {
        const { sessionId, userId, endpoint, limit = 20, skip = 0 } = req.query;

        const matchStage = {};
        if (sessionId) matchStage.sessionId = sessionId;
        if (userId) matchStage.userId = userId;
        if (endpoint) matchStage.endpoint = endpoint;

        const history = await AIInteraction.find(matchStage)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .select('-requestPayload -responseData');

        const total = await AIInteraction.countDocuments(matchStage);

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: total > parseInt(skip) + parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy lịch sử task tự động:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy lịch sử task tự động',
            error: error.message
        });
    }
};

/**
 * Lấy thống kê chi tiết về task tự động
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAutoTaskAnalytics = async (req, res) => {
    try {
        const { dateFrom, dateTo, groupBy = 'day' } = req.query;

        const matchStage = {};
        if (dateFrom || dateTo) {
            matchStage.createdAt = {};
            if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
            if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
        }

        // Thống kê theo thời gian
        let timeGroup;
        switch (groupBy) {
            case 'hour':
                timeGroup = { $hour: '$createdAt' };
                break;
            case 'day':
                timeGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
                break;
            case 'week':
                timeGroup = { $week: '$createdAt' };
                break;
            case 'month':
                timeGroup = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
                break;
            default:
                timeGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        }

        const analytics = await AIInteraction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        time: timeGroup,
                        endpoint: '$endpoint'
                    },
                    count: { $sum: 1 },
                    avgResponseTime: { $avg: '$responseTime' },
                    successCount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                    errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } }
                }
            },
            {
                $group: {
                    _id: '$_id.time',
                    endpoints: {
                        $push: {
                            endpoint: '$_id.endpoint',
                            count: '$count',
                            avgResponseTime: '$avgResponseTime',
                            successCount: '$successCount',
                            errorCount: '$errorCount'
                        }
                    },
                    totalCount: { $sum: '$count' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);

        // Thống kê tổng quan
        const overview = await AIInteraction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalInteractions: { $sum: 1 },
                    totalSuccess: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
                    totalErrors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
                    avgResponseTime: { $avg: '$responseTime' },
                    byEndpoint: { $push: '$endpoint' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                analytics,
                overview: overview[0] || {
                    totalInteractions: 0,
                    totalSuccess: 0,
                    totalErrors: 0,
                    avgResponseTime: 0
                }
            }
        });

    } catch (error) {
        console.error('Lỗi khi lấy thống kê task tự động:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê task tự động',
            error: error.message
        });
    }
};

/**
 * Chạy lại task tự động cho một session cụ thể
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const rerunAutoTask = async (req, res) => {
    try {
        const { sessionId, endpoint } = req.params;
        const { force = false } = req.body;

        // Lấy AI interaction gốc
        const originalInteraction = await AIInteraction.findOne({ sessionId, endpoint });
        if (!originalInteraction) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy AI interaction để chạy lại'
            });
        }

        // Chạy lại task tự động
        let result;
        switch (endpoint) {
            case 'analyzeImage':
                result = await AutoTaskService.processImageAnalysisResult(
                    originalInteraction.responseData.parsedResult,
                    { sessionId, userId: originalInteraction.userId, force }
                );
                break;
            case 'generateExercises':
                result = await AutoTaskService.processGeneratedExercises(
                    originalInteraction.responseData.parsedResult,
                    { sessionId, userId: originalInteraction.userId, force }
                );
                break;
            case 'analyzeWordDetails':
                result = await AutoTaskService.processWordDetailsResult(
                    originalInteraction.responseData.parsedResult,
                    { sessionId, userId: originalInteraction.userId, force }
                );
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Endpoint không được hỗ trợ để chạy lại'
                });
        }

        res.json({
            success: true,
            message: 'Task tự động đã được chạy lại thành công',
            data: result
        });

    } catch (error) {
        console.error('Lỗi khi chạy lại task tự động:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi chạy lại task tự động',
            error: error.message
        });
    }
};

/**
 * Xóa dữ liệu được tạo bởi task tự động
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const cleanupAutoTaskData = async (req, res) => {
    try {
        const { sessionId, endpoint } = req.params;
        const { keepVocabulary = true, keepExercises = true } = req.body;

        let deletedCount = 0;

        // Xóa từ vựng được tạo bởi AI (nếu không giữ lại)
        if (!keepVocabulary) {
            const vocabResult = await Vocabulary.deleteMany({
                'metadata.sessionId': sessionId,
                'metadata.source': 'AI Generated'
            });
            deletedCount += vocabResult.deletedCount;
        }

        // Xóa bài tập được tạo bởi AI (nếu không giữ lại)
        if (!keepExercises) {
            const exerciseResult = await Exercise.deleteMany({
                sessionId,
                source: 'AI Generated'
            });
            deletedCount += exerciseResult.deletedCount;
        }

        // Xóa từ vựng cá nhân liên quan
        const personalVocabResult = await PersonalVocabulary.deleteMany({
            'metadata.sessionId': sessionId,
            tags: { $in: ['AI Generated'] }
        });
        deletedCount += personalVocabResult.deletedCount;

        res.json({
            success: true,
            message: `Đã xóa ${deletedCount} dữ liệu được tạo bởi task tự động`,
            data: {
                deletedCount,
                sessionId,
                endpoint,
                options: { keepVocabulary, keepExercises }
            }
        });

    } catch (error) {
        console.error('Lỗi khi dọn dẹp dữ liệu task tự động:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi dọn dẹp dữ liệu task tự động',
            error: error.message
        });
    }
};

module.exports = {
    getAutoTaskStatus,
    getAutoTaskHistory,
    getAutoTaskAnalytics,
    rerunAutoTask,
    cleanupAutoTaskData
};

const FrontendActivity = require('../models/FrontendActivity');

// Lưu hoạt động frontend mới
exports.saveFrontendActivity = async (req, res) => {
    try {
        const {
            sessionId,
            userId = 'anonymous',
            action,
            page,
            component = '',
            details = {},
            userAgent = '',
            ipAddress = '',
            metadata = {}
        } = req.body;

        if (!sessionId || !action || !page) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: sessionId, action, page'
            });
        }

        const activity = new FrontendActivity({
            sessionId,
            userId,
            action,
            page,
            component,
            details,
            userAgent,
            ipAddress,
            metadata
        });

        await activity.save();

        res.status(201).json({
            success: true,
            message: 'Đã lưu hoạt động frontend thành công',
            data: activity
        });
    } catch (error) {
        console.error('Lỗi khi lưu hoạt động frontend:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lưu hoạt động frontend',
            error: error.message
        });
    }
};

// Lấy danh sách hoạt động frontend theo session
exports.getFrontendActivitiesBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { page = 1, limit = 20, sort = '-timestamp', action, page: pageName } = req.query;

        const skip = (page - 1) * limit;

        let matchQuery = { sessionId };
        if (action) matchQuery.action = action;
        if (pageName) matchQuery.page = pageName;

        const activities = await FrontendActivity.find(matchQuery)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v');

        const total = await FrontendActivity.countDocuments(matchQuery);

        res.json({
            success: true,
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy hoạt động frontend:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy hoạt động frontend',
            error: error.message
        });
    }
};

// Lấy thống kê hoạt động frontend
exports.getFrontendActivityStats = async (req, res) => {
    try {
        const { sessionId, userId, startDate, endDate, action, page } = req.query;

        let matchQuery = {};

        if (sessionId) matchQuery.sessionId = sessionId;
        if (userId) matchQuery.userId = userId;
        if (action) matchQuery.action = action;
        if (page) matchQuery.page = page;
        if (startDate || endDate) {
            matchQuery.timestamp = {};
            if (startDate) matchQuery.timestamp.$gte = new Date(startDate);
            if (endDate) matchQuery.timestamp.$lte = new Date(endDate);
        }

        const stats = await FrontendActivity.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalActivities: { $sum: 1 },
                    uniqueSessions: { $addToSet: '$sessionId' },
                    uniqueUsers: { $addToSet: '$userId' }
                }
            }
        ]);

        const actionStats = await FrontendActivity.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const pageStats = await FrontendActivity.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$page',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const hourlyStats = await FrontendActivity.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $hour: '$timestamp' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: stats[0] ? {
                    totalActivities: stats[0].totalActivities,
                    uniqueSessions: stats[0].uniqueSessions.length,
                    uniqueUsers: stats[0].uniqueUsers.length
                } : {
                    totalActivities: 0,
                    uniqueSessions: 0,
                    uniqueUsers: 0
                },
                actionStats,
                pageStats,
                hourlyStats
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê hoạt động frontend:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê hoạt động frontend',
            error: error.message
        });
    }
};

// Lấy hoạt động gần đây
exports.getRecentActivities = async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const activities = await FrontendActivity.find()
            .sort('-timestamp')
            .limit(parseInt(limit))
            .select('-__v')
            .populate('sessionId', 'sessionId userId');

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Lỗi khi lấy hoạt động gần đây:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy hoạt động gần đây',
            error: error.message
        });
    }
};

// Xóa hoạt động frontend
exports.deleteFrontendActivity = async (req, res) => {
    try {
        const { id } = req.params;

        const activity = await FrontendActivity.findByIdAndDelete(id);

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hoạt động frontend'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa hoạt động frontend thành công'
        });
    } catch (error) {
        console.error('Lỗi khi xóa hoạt động frontend:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa hoạt động frontend',
            error: error.message
        });
    }
};

const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// Tạo phiên mới
exports.createSession = async (req, res) => {
    try {
        const {
            userId = 'anonymous',
            userAgent = '',
            ipAddress = '',
            deviceInfo = {},
            metadata = {}
        } = req.body;

        const sessionId = uuidv4();

        const session = new Session({
            sessionId,
            userId,
            userAgent,
            ipAddress,
            deviceInfo,
            metadata
        });

        await session.save();

        // Tự động lưu hoạt động đầu tiên nếu có thông tin page
        if (metadata.page) {
            try {
                const FrontendActivity = require('../models/FrontendActivity');
                const activity = new FrontendActivity({
                    sessionId: session.sessionId,
                    userId: session.userId === 'anonymous' ? undefined : session.userId,
                    action: 'page_view',
                    page: metadata.page,
                    component: metadata.component || 'App',
                    userAgent: session.userAgent,
                    ipAddress: session.ipAddress,
                    metadata: metadata
                });
                await activity.save();
            } catch (activityError) {
                console.warn('Không thể lưu hoạt động đầu tiên:', activityError);
            }
        }

        res.status(201).json({
            success: true,
            message: 'Đã tạo phiên mới thành công',
            data: {
                sessionId: session.sessionId,
                userId: session.userId,
                startTime: session.startTime,
                lastActivity: session.lastActivity,
                isActive: session.isActive,
                userAgent: session.userAgent,
                ipAddress: session.ipAddress,
                deviceInfo: session.deviceInfo,
                metadata: session.metadata
            }
        });
    } catch (error) {
        console.error('Lỗi khi tạo phiên mới:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo phiên mới',
            error: error.message
        });
    }
};

// Lấy thông tin phiên
exports.getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'SessionId là bắt buộc'
            });
        }

        const session = await Session.findOne({ sessionId });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiên'
            });
        }

        // Cập nhật lastActivity nếu session còn active
        if (session.isActive) {
            session.lastActivity = new Date();
            await session.save();
        }

        res.json({
            success: true,
            data: {
                sessionId: session.sessionId,
                userId: session.userId,
                startTime: session.startTime,
                lastActivity: session.lastActivity,
                isActive: session.isActive,
                userAgent: session.userAgent,
                ipAddress: session.ipAddress,
                deviceInfo: session.deviceInfo,
                metadata: session.metadata
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin phiên:', error);

        // Xác định loại lỗi cụ thể
        let statusCode = 500;
        let errorMessage = 'Lỗi server khi lấy thông tin phiên';

        if (error.name === 'CastError') {
            statusCode = 400;
            errorMessage = 'SessionId không hợp lệ';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

// Cập nhật hoạt động cuối cùng của phiên
exports.updateSessionActivity = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'SessionId là bắt buộc'
            });
        }

        // Trước tiên, lấy session để kiểm tra thời gian
        const session = await Session.findOne({ sessionId, isActive: true });
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiên hoặc phiên đã hết hạn'
            });
        }

        // Kiểm tra session có quá cũ không (24 giờ)
        const now = new Date();
        const hoursDiff = (now - session.startTime) / (1000 * 60 * 60);
        const shouldBeActive = hoursDiff < 24;

        // Cập nhật session
        const updatedSession = await Session.findOneAndUpdate(
            { sessionId },
            {
                lastActivity: now,
                isActive: shouldBeActive
            },
            { new: true }
        );

        if (!updatedSession) {
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật session'
            });
        }

        res.json({
            success: true,
            message: 'Đã cập nhật hoạt động phiên thành công',
            data: {
                sessionId: updatedSession.sessionId,
                userId: updatedSession.userId,
                startTime: updatedSession.startTime,
                lastActivity: updatedSession.lastActivity,
                isActive: updatedSession.isActive,
                userAgent: updatedSession.userAgent,
                ipAddress: updatedSession.ipAddress,
                deviceInfo: updatedSession.deviceInfo,
                metadata: updatedSession.metadata
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật hoạt động phiên:', error);

        // Xác định loại lỗi cụ thể
        let statusCode = 500;
        let errorMessage = 'Lỗi server khi cập nhật hoạt động phiên';

        if (error.name === 'CastError') {
            statusCode = 400;
            errorMessage = 'Dữ liệu session không hợp lệ';
        } else if (error.name === 'ValidationError') {
            statusCode = 400;
            errorMessage = 'Dữ liệu cập nhật không hợp lệ';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

// Kết thúc phiên
exports.endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'SessionId là bắt buộc'
            });
        }

        const session = await Session.findOneAndUpdate(
            { sessionId },
            { isActive: false },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiên'
            });
        }

        res.json({
            success: true,
            message: 'Đã kết thúc phiên thành công',
            data: session
        });
    } catch (error) {
        console.error('Lỗi khi kết thúc phiên:', error);

        // Xác định loại lỗi cụ thể
        let statusCode = 500;
        let errorMessage = 'Lỗi server khi kết thúc phiên';

        if (error.name === 'CastError') {
            statusCode = 400;
            errorMessage = 'SessionId không hợp lệ';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

// Lấy danh sách phiên
exports.getSessions = async (req, res) => {
    try {
        const { page = 1, limit = 20, sort = '-lastActivity', isActive, userId } = req.query;

        const skip = (page - 1) * limit;

        let matchQuery = {};
        if (isActive !== undefined) matchQuery.isActive = isActive === 'true';
        if (userId) matchQuery.userId = userId;

        const sessions = await Session.find(matchQuery)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-__v');

        const total = await Session.countDocuments(matchQuery);

        res.json({
            success: true,
            data: sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phiên:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách phiên',
            error: error.message
        });
    }
};

// Lấy thống kê phiên
exports.getSessionStats = async (req, res) => {
    try {
        const { startDate, endDate, userId } = req.query;

        let matchQuery = {};
        if (userId) matchQuery.userId = userId;
        if (startDate || endDate) {
            matchQuery.startTime = {};
            if (startDate) matchQuery.startTime.$gte = new Date(startDate);
            if (endDate) matchQuery.startTime.$lte = new Date(endDate);
        }

        const stats = await Session.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    activeSessions: { $sum: { $cond: ['$isActive', 1, 0] } },
                    avgSessionDuration: {
                        $avg: {
                            $subtract: ['$lastActivity', '$startTime']
                        }
                    }
                }
            }
        ]);

        const hourlyStats = await Session.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $hour: '$startTime' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const userStats = await Session.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$userId',
                    sessionCount: { $sum: 1 },
                    avgDuration: {
                        $avg: {
                            $subtract: ['$lastActivity', '$startTime']
                        }
                    }
                }
            },
            { $sort: { sessionCount: -1 } }
        ]);

        res.json({
            success: true,
            data: {
                overview: stats[0] ? {
                    totalSessions: stats[0].totalSessions,
                    activeSessions: stats[0].activeSessions,
                    avgSessionDuration: stats[0].avgSessionDuration
                } : {
                    totalSessions: 0,
                    activeSessions: 0,
                    avgSessionDuration: 0
                },
                hourlyStats,
                userStats
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê phiên:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê phiên',
            error: error.message
        });
    }
};

// Xóa phiên
exports.deleteSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'SessionId là bắt buộc'
            });
        }

        const session = await Session.findOneAndDelete({ sessionId });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy phiên'
            });
        }

        res.json({
            success: true,
            message: 'Đã xóa phiên thành công'
        });
    } catch (error) {
        console.error('Lỗi khi xóa phiên:', error);

        // Xác định loại lỗi cụ thể
        let statusCode = 500;
        let errorMessage = 'Lỗi server khi xóa phiên';

        if (error.name === 'CastError') {
            statusCode = 400;
            errorMessage = 'SessionId không hợp lệ';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

// Validate session nhanh (chỉ kiểm tra có hợp lệ không)
exports.validateSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'SessionId là bắt buộc'
            });
        }

        const session = await Session.findOne(
            { sessionId, isActive: true },
            { sessionId: 1, userId: 1, isActive: 1, lastActivity: 1, startTime: 1 }
        );

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Phiên không tồn tại hoặc đã hết hạn'
            });
        }

        // Kiểm tra session có quá cũ không (24 giờ)
        const hoursDiff = (new Date() - session.startTime) / (1000 * 60 * 60);
        if (hoursDiff >= 24) {
            // Tự động set session thành inactive
            try {
                await Session.findOneAndUpdate(
                    { sessionId },
                    { isActive: false }
                );
            } catch (updateError) {
                console.warn('Không thể cập nhật session thành inactive:', updateError);
            }

            return res.status(410).json({
                success: false,
                message: 'Phiên đã hết hạn (quá 24 giờ)'
            });
        }

        res.json({
            success: true,
            data: {
                sessionId: session.sessionId,
                userId: session.userId,
                isActive: session.isActive,
                lastActivity: session.lastActivity
            }
        });
    } catch (error) {
        console.error('Lỗi khi validate session:', error);

        // Xác định loại lỗi cụ thể
        let statusCode = 500;
        let errorMessage = 'Lỗi server khi validate session';

        if (error.name === 'CastError') {
            statusCode = 400;
            errorMessage = 'SessionId không hợp lệ';
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
};

const User = require('../models/User');
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');

// Đăng nhập hoặc tạo user mới
exports.loginOrCreateUser = async (req, res) => {
    try {
        const { email, displayName = '' } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email là bắt buộc'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email không hợp lệ'
            });
        }

        // Tìm hoặc tạo user
        const user = await User.findOrCreate(email, displayName);

        // Tạo session mới cho user
        const sessionId = uuidv4();
        const session = new Session({
            sessionId,
            userId: user._id.toString(),
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip || req.connection.remoteAddress,
            deviceInfo: {
                platform: req.headers['sec-ch-ua-platform'] || 'unknown',
                language: req.headers['accept-language'] || 'vi-VN'
            },
            metadata: {
                loginMethod: 'email',
                userEmail: user.email
            }
        });

        await session.save();

        res.json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    lastLogin: user.lastLogin,
                    loginCount: user.loginCount
                },
                session: {
                    sessionId: session.sessionId,
                    startTime: session.startTime,
                    isActive: session.isActive
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi đăng nhập',
            error: error.message
        });
    }
};

// Lấy thông tin user theo session
exports.getUserBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await Session.findOne({ sessionId, isActive: true });
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Phiên không tồn tại hoặc đã hết hạn'
            });
        }

        const user = await User.findById(session.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        session.lastActivity = new Date();
        await session.save();

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    lastLogin: user.lastLogin,
                    loginCount: user.loginCount,
                    preferences: user.preferences
                },
                session: {
                    sessionId: session.sessionId,
                    startTime: session.startTime,
                    lastActivity: session.lastActivity,
                    isActive: session.isActive,
                    userAgent: session.userAgent,
                    deviceInfo: session.deviceInfo
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thông tin user',
            error: error.message
        });
    }
};

// Cập nhật thông tin user
exports.updateUser = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { displayName, preferences } = req.body;

        const session = await Session.findOne({ sessionId, isActive: true });
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Phiên không tồn tại hoặc đã hết hạn'
            });
        }

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (preferences !== undefined) updateData.preferences = preferences;

        const user = await User.findByIdAndUpdate(
            session.userId,
            updateData,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({
            success: true,
            message: 'Cập nhật thông tin thành công',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    displayName: user.displayName,
                    preferences: user.preferences
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật user',
            error: error.message
        });
    }
};

// Lấy thống kê user
exports.getUserStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        let matchQuery = { isActive: true };
        if (startDate || endDate) {
            matchQuery.createdAt = {};
            if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
            if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
        }

        const stats = await User.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
                    avgLoginCount: { $avg: '$loginCount' }
                }
            }
        ]);

        const recentUsers = await User.find(matchQuery)
            .sort({ lastLogin: -1 })
            .limit(10)
            .select('email displayName lastLogin loginCount');

        res.json({
            success: true,
            data: {
                overview: stats[0] ? {
                    totalUsers: stats[0].totalUsers,
                    activeUsers: stats[0].activeUsers,
                    avgLoginCount: Math.round(stats[0].avgLoginCount * 100) / 100
                } : {
                    totalUsers: 0,
                    activeUsers: 0,
                    avgLoginCount: 0
                },
                recentUsers
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê user:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê user',
            error: error.message
        });
    }
};

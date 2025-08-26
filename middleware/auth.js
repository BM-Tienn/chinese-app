const Session = require('../models/Session');

// Middleware xác thực người dùng
const authenticateUser = async (req, res, next) => {
    try {
        // Lấy sessionId từ headers hoặc query params
        const sessionId = req.headers['x-session-id'] || req.query.sessionId || req.body.sessionId;

        if (!sessionId) {
            return res.status(401).json({
                success: false,
                message: 'Thiếu session ID'
            });
        }

        // Tìm session trong database
        const session = await Session.findOne({
            sessionId: sessionId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(401).json({
                success: false,
                message: 'Session không hợp lệ hoặc đã hết hạn'
            });
        }

        // Cập nhật lastActivity
        session.lastActivity = new Date();
        await session.save();

        // Gán thông tin session vào request
        req.session = session;
        req.user = {
            id: session.userId,
            sessionId: session.sessionId
        };

        next();
    } catch (error) {
        console.error('Lỗi authentication middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi xác thực'
        });
    }
};

// Middleware xác thực tùy chọn (cho các API không bắt buộc đăng nhập)
const optionalAuth = async (req, res, next) => {
    try {
        const sessionId = req.headers['x-session-id'] || req.query.sessionId || req.body.sessionId;

        if (sessionId) {
            const session = await Session.findOne({
                sessionId: sessionId,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (session) {
                session.lastActivity = new Date();
                await session.save();

                req.session = session;
                req.user = {
                    id: session.userId,
                    sessionId: session.sessionId
                };
            }
        }

        next();
    } catch (error) {
        console.error('Lỗi optional auth middleware:', error);
        next(); // Không block request
    }
};

module.exports = {
    authenticateUser,
    optionalAuth
};

const rateLimit = require('express-rate-limit');

// Rate limit cho API chung
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Giới hạn 100 requests mỗi IP trong 15 phút
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit cho AI interactions
const aiInteractionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 20, // Giới hạn 20 AI interactions mỗi IP trong 1 phút
  message: {
    success: false,
    message: 'Quá nhiều tương tác AI, vui lòng thử lại sau 1 phút'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit cho session creation
const sessionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 phút
  max: 10, // Giới hạn 10 session mới mỗi IP trong 5 phút
  message: {
    success: false,
    message: 'Quá nhiều phiên mới, vui lòng thử lại sau 5 phút'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  aiInteractionLimiter,
  sessionLimiter
};

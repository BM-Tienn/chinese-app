const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    default: 'anonymous'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Session hết hạn sau 24 giờ
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  deviceInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index để tối ưu truy vấn
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ isActive: 1, lastActivity: -1 });
sessionSchema.index({ expiresAt: 1 });

// Middleware để tự động cập nhật expiresAt khi lastActivity thay đổi
sessionSchema.pre('save', function(next) {
  if (this.isModified('lastActivity')) {
    // Gia hạn session thêm 24 giờ mỗi khi có hoạt động
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
  next();
});

// Method để kiểm tra session có hết hạn không
sessionSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method để gia hạn session
sessionSchema.methods.extend = function() {
  this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Session', sessionSchema);

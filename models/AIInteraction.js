const mongoose = require('mongoose');

const AIInteractionSchema = new mongoose.Schema({
  // Thông tin cơ bản
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: false,
    index: true
  },

  // Thông tin API call
  endpoint: {
    type: String,
    required: true,
    enum: ['analyzeImage', 'generateExercises', 'analyzeWordDetails', 'analyzePronunciation']
  },
  aiModel: {
    type: String,
    required: true,
    default: 'gemini-2.5-flash-preview-05-20'
  },

  // Dữ liệu request/response - Sử dụng Buffer để lưu trữ không giới hạn
  requestPayload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    // Cho phép lưu trữ dữ liệu lớn
    get: function (data) {
      if (data && typeof data === 'string' && data.length > 0) {
        return data;
      }
      return data;
    },
    set: function (data) {
      if (data && typeof data === 'object') {
        return JSON.stringify(data);
      }
      return data;
    }
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    // Cho phép lưu trữ dữ liệu lớn
    get: function (data) {
      if (data && typeof data === 'string' && data.length > 0) {
        try {
          return JSON.parse(data);
        } catch (e) {
          return data;
        }
      }
      return data;
    },
    set: function (data) {
      if (data && typeof data === 'object') {
        return JSON.stringify(data);
      }
      return data;
    }
  },

  // Thêm trường để lưu trữ dữ liệu lớn dưới dạng Buffer nếu cần
  requestPayloadBuffer: {
    type: Buffer,
    required: false
  },
  responseDataBuffer: {
    type: Buffer,
    required: false
  },

  // Metadata
  requestTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  responseTimestamp: {
    type: Date,
    required: true
  },
  responseTime: {
    type: Number, // milliseconds
    required: true
  },

  // Trạng thái và lỗi
  status: {
    type: String,
    required: true,
    enum: ['pending', 'success', 'error', 'timeout'],
    default: 'pending'
  },
  errorMessage: {
    type: String,
    required: false
  },

  // Thông tin bổ sung
  userAgent: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  },

  // Tags để phân loại
  tags: [{
    type: String
  }],

  // Ghi chú
  notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'ai_interactions',
  // Bật toJSON và toObject để xử lý getter/setter
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes để tối ưu truy vấn
AIInteractionSchema.index({ sessionId: 1, createdAt: -1 });
AIInteractionSchema.index({ userId: 1, createdAt: -1 });
AIInteractionSchema.index({ endpoint: 1, createdAt: -1 });
AIInteractionSchema.index({ status: 1, createdAt: -1 });
AIInteractionSchema.index({ createdAt: -1 });

// Virtual để tính thời gian xử lý
AIInteractionSchema.virtual('processingTime').get(function () {
  if (this.requestTimestamp && this.responseTimestamp) {
    return this.responseTimestamp.getTime() - this.requestTimestamp.getTime();
  }
  return null;
});

// Method để cập nhật response
AIInteractionSchema.methods.updateResponse = function (responseData, status = 'success', errorMessage = null) {
  this.responseData = responseData;
  this.responseTimestamp = new Date();
  this.status = status;
  this.errorMessage = errorMessage;
  this.responseTime = this.processingTime;
  return this.save();
};

// Method để thêm tags
AIInteractionSchema.methods.addTags = function (tags) {
  if (Array.isArray(tags)) {
    this.tags = [...new Set([...this.tags, ...tags])];
  } else {
    this.tags = [...new Set([...this.tags, tags])];
  }
  return this.save();
};

// Method để lưu trữ dữ liệu lớn
AIInteractionSchema.methods.setLargeRequestPayload = function (data) {
  if (data && typeof data === 'object') {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > 16000000) { // 16MB limit
      this.requestPayloadBuffer = Buffer.from(jsonString, 'utf8');
      this.requestPayload = { message: 'Dữ liệu được lưu trong buffer' };
    } else {
      this.requestPayload = data;
      this.requestPayloadBuffer = undefined;
    }
  }
  return this;
};

AIInteractionSchema.methods.setLargeResponseData = function (data) {
  if (data && typeof data === 'object') {
    const jsonString = JSON.stringify(data);
    if (jsonString.length > 16000000) { // 16MB limit
      this.responseDataBuffer = Buffer.from(jsonString, 'utf8');
      this.responseData = { message: 'Dữ liệu được lưu trong buffer' };
    } else {
      this.responseData = data;
      this.responseDataBuffer = undefined;
    }
  }
  return this;
};

// Method để lấy dữ liệu lớn
AIInteractionSchema.methods.getFullRequestPayload = function () {
  if (this.requestPayloadBuffer) {
    try {
      return JSON.parse(this.requestPayloadBuffer.toString('utf8'));
    } catch (e) {
      return this.requestPayload;
    }
  }
  return this.requestPayload;
};

AIInteractionSchema.methods.getFullResponseData = function () {
  if (this.responseDataBuffer) {
    try {
      return JSON.parse(this.responseDataBuffer.toString('utf8'));
    } catch (e) {
      return this.responseData;
    }
  }
  return this.responseData;
};

// Static method để tìm kiếm theo session
AIInteractionSchema.statics.findBySession = function (sessionId, limit = 50) {
  return this.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method để tìm kiếm theo user
AIInteractionSchema.statics.findByUser = function (userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method để thống kê
AIInteractionSchema.statics.getStats = function (filters = {}) {
  const matchStage = {};

  if (filters.sessionId) matchStage.sessionId = filters.sessionId;
  if (filters.userId) matchStage.userId = filters.userId;
  if (filters.endpoint) matchStage.endpoint = filters.endpoint;
  if (filters.status) matchStage.status = filters.status;
  if (filters.dateFrom) matchStage.createdAt = { $gte: new Date(filters.dateFrom) };
  if (filters.dateTo) {
    if (matchStage.createdAt) {
      matchStage.createdAt.$lte = new Date(filters.dateTo);
    } else {
      matchStage.createdAt = { $lte: new Date(filters.dateTo) };
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        successCalls: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        errorCalls: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        avgResponseTime: { $avg: '$responseTime' },
        totalResponseTime: { $sum: '$responseTime' }
      }
    }
  ]);
};

module.exports = mongoose.model('AIInteraction', AIInteractionSchema);

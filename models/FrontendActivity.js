const mongoose = require('mongoose');

const frontendActivitySchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    default: 'anonymous'
  },
  action: {
    type: String,
    required: true,
    enum: ['page_view', 'button_click', 'form_submit', 'navigation', 'error', 'other']
  },
  page: {
    type: String,
    required: true
  },
  component: {
    type: String,
    default: ''
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userAgent: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index để tối ưu truy vấn
frontendActivitySchema.index({ sessionId: 1, timestamp: -1 });
frontendActivitySchema.index({ userId: 1, timestamp: -1 });
frontendActivitySchema.index({ action: 1, timestamp: -1 });
frontendActivitySchema.index({ page: 1, timestamp: -1 });

module.exports = mongoose.model('FrontendActivity', frontendActivitySchema);

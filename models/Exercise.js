const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
    // Thông tin cơ bản
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['multipleChoice', 'selectPinyin', 'findTheMistake', 'fillInTheBlank', 'sentenceBuilding', 'pronunciation', 'grammar'],
        default: 'multipleChoice'
    },

    // Nội dung bài tập
    question: {
        type: String,
        required: true,
        trim: true
    },
    options: [{
        type: String,
        trim: true
    }],
    correctAnswer: {
        type: String,
        required: true,
        trim: true
    },
    explanation: {
        type: String,
        trim: true
    },

    // Ngữ cảnh và từ vựng liên quan
    vocabulary: [{
        hanzi: String,
        pinyin: String,
        meaning: String
    }],
    grammar: [{
        point: String,
        explanation: String,
        example: String
    }],

    // Cấu hình bài tập
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    hskLevel: {
        type: Number,
        min: 1,
        max: 6,
        default: null
    },
    category: {
        type: String,
        enum: ['Vocabulary', 'Grammar', 'Reading', 'Listening', 'Writing', 'Speaking', 'Mixed'],
        default: 'Mixed'
    },

    // Metadata
    source: {
        type: String,
        enum: ['AI Generated', 'Manual', 'Imported'],
        default: 'AI Generated'
    },
    aiModel: {
        type: String,
        default: 'gemini-2.5-flash-preview-05-20'
    },
    sessionId: {
        type: String,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // Thống kê sử dụng
    usageStats: {
        totalAttempts: {
            type: Number,
            default: 0
        },
        correctAttempts: {
            type: Number,
            default: 0
        },
        averageScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        lastUsed: {
            type: Date,
            default: null
        }
    },

    // Trạng thái
    isActive: {
        type: Boolean,
        default: true
    },

    // Tags để phân loại
    tags: [{
        type: String,
        trim: true
    }],

    // Ghi chú
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'exercises'
});

// Indexes để tối ưu truy vấn
exerciseSchema.index({ type: 1, difficulty: 1, hskLevel: 1 });
exerciseSchema.index({ category: 1, isActive: 1 });
exerciseSchema.index({ 'vocabulary.hanzi': 1 });
exerciseSchema.index({ sessionId: 1, createdAt: -1 });
exerciseSchema.index({ userId: 1, createdAt: -1 });

// Virtual để tính độ chính xác
exerciseSchema.virtual('accuracy').get(function () {
    if (this.usageStats.totalAttempts === 0) return 0;
    return Math.round((this.usageStats.correctAttempts / this.usageStats.totalAttempts) * 100);
});

// Method để cập nhật thống kê sử dụng
exerciseSchema.methods.updateUsageStats = function (isCorrect, score = null) {
    this.usageStats.totalAttempts += 1;
    if (isCorrect) {
        this.usageStats.correctAttempts += 1;
    }

    // Cập nhật điểm trung bình
    if (score !== null) {
        const currentTotal = this.usageStats.averageScore * (this.usageStats.totalAttempts - 1);
        this.usageStats.averageScore = Math.round((currentTotal + score) / this.usageStats.totalAttempts);
    }

    this.usageStats.lastUsed = new Date();
    return this.save();
};

// Method để thêm tags
exerciseSchema.methods.addTags = function (tags) {
    if (Array.isArray(tags)) {
        this.tags = [...new Set([...this.tags, ...tags])];
    } else {
        this.tags = [...new Set([...this.tags, tags])];
    }
    return this.save();
};

// Static method để tìm bài tập theo tiêu chí
exerciseSchema.statics.findByCriteria = function (criteria = {}, limit = 20, skip = 0) {
    const query = { isActive: true };

    if (criteria.type) query.type = criteria.type;
    if (criteria.difficulty) query.difficulty = criteria.difficulty;
    if (criteria.hskLevel) query.hskLevel = criteria.hskLevel;
    if (criteria.category) query.category = criteria.category;
    if (criteria.vocabulary) {
        query['vocabulary.hanzi'] = { $in: criteria.vocabulary };
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

// Static method để lấy thống kê
exerciseSchema.statics.getStats = function () {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: null,
                totalExercises: { $sum: 1 },
                byType: { $push: '$type' },
                byDifficulty: { $push: '$difficulty' },
                byCategory: { $push: '$category' },
                totalUsage: { $sum: '$usageStats.totalAttempts' },
                avgAccuracy: { $avg: { $divide: ['$usageStats.correctAttempts', { $max: ['$usageStats.totalAttempts', 1] }] } }
            }
        }
    ]);
};

module.exports = mongoose.model('Exercise', exerciseSchema);

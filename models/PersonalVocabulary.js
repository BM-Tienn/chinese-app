const mongoose = require('mongoose');

// Schema cho từ vựng cá nhân của người dùng
const personalVocabularySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Personal vocabulary must belong to a user!'],
        index: true
    },
    wordId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vocabulary',
        required: [true, 'Personal vocabulary must reference a vocabulary word!'],
        index: true
    },
    // Thông tin từ vựng (có thể khác với từ điển gốc)
    hanzi: {
        type: String,
        required: [true, 'Personal vocabulary must have Chinese characters!'],
        trim: true
    },
    pinyin: {
        type: String,
        required: [true, 'Personal vocabulary must have Pinyin!'],
        trim: true
    },
    meaning: {
        type: String,
        required: [true, 'Personal vocabulary mu fst have meaning!'],
        trim: true
    },
    // Mức độ thành thạo (1-5: 1=mới học, 5=thuộc lòng)
    masteryLevel: {
        type: Number,
        min: 1,
        max: 5,
        default: 1,
        required: true
    },
    // Thống kê học tập
    learningStats: {
        reviewCount: {
            type: Number,
            default: 0
        },
        correctAnswers: {
            type: Number,
            default: 0
        },
        totalAttempts: {
            type: Number,
            default: 0
        },
        lastReviewed: {
            type: Date,
            default: null
        },
        nextReview: {
            type: Date,
            default: null
        },
        // Thuật toán spaced repetition
        interval: {
            type: Number,
            default: 1 // Số ngày đến lần ôn tập tiếp theo
        },
        easeFactor: {
            type: Number,
            default: 2.5 // Hệ số dễ dàng (ảnh hưởng đến interval)
        },
        consecutiveCorrect: {
            type: Number,
            default: 0 // Số lần trả lời đúng liên tiếp
        }
    },
    // Ghi chú cá nhân
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    // Tags cá nhân
    tags: [{
        type: String,
        trim: true
    }],
    // Trạng thái học tập
    studyStatus: {
        type: String,
        enum: ['new', 'learning', 'reviewing', 'mastered'],
        default: 'new'
    },
    // Độ ưu tiên học tập
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    // Lịch sử học tập
    studyHistory: [{
        date: {
            type: Date,
            required: true
        },
        action: {
            type: String,
            enum: ['added', 'reviewed', 'mastered', 'updated'],
            required: true
        },
        score: {
            type: Number,
            min: 0,
            max: 100
        },
        timeSpent: Number, // Thời gian học (giây)
        notes: String
    }],
    // Cài đặt cá nhân cho từ này
    personalSettings: {
        autoPlay: {
            type: Boolean,
            default: true
        },
        showPinyin: {
            type: Boolean,
            default: true
        },
        showMeaning: {
            type: Boolean,
            default: true
        }
    }
}, {
    timestamps: true,
    collection: 'personal_vocabularies'
});

// Index để tối ưu truy vấn
personalVocabularySchema.index({ userId: 1, wordId: 1 }, { unique: true });
personalVocabularySchema.index({ userId: 1, masteryLevel: 1 });
personalVocabularySchema.index({ userId: 1, nextReview: 1 });
personalVocabularySchema.index({ userId: 1, studyStatus: 1 });
personalVocabularySchema.index({ userId: 1, priority: 1 });

// Virtual field để tính độ chính xác
personalVocabularySchema.virtual('accuracy').get(function () {
    if (this.learningStats.totalAttempts === 0) return 0;
    return Math.round((this.learningStats.correctAnswers / this.learningStats.totalAttempts) * 100);
});

// Method để cập nhật thống kê học tập
personalVocabularySchema.methods.updateLearningStats = function (isCorrect, timeSpent = 0) {
    this.learningStats.totalAttempts += 1;
    this.learningStats.lastReviewed = new Date();

    if (isCorrect) {
        this.learningStats.correctAnswers += 1;
        this.learningStats.consecutiveCorrect += 1;
    } else {
        this.learningStats.consecutiveCorrect = 0;
    }

    // Cập nhật interval dựa trên thuật toán spaced repetition
    this.updateSpacedRepetitionInterval(isCorrect);

    // Thêm vào lịch sử học tập
    this.studyHistory.push({
        date: new Date(),
        action: 'reviewed',
        score: isCorrect ? 100 : 0,
        timeSpent,
        notes: isCorrect ? 'Trả lời đúng' : 'Trả lời sai'
    });

    return this.save();
};

// Method để cập nhật interval theo spaced repetition
personalVocabularySchema.methods.updateSpacedRepetitionInterval = function (isCorrect) {
    if (isCorrect) {
        if (this.learningStats.consecutiveCorrect === 1) {
            this.learningStats.interval = 1;
        } else if (this.learningStats.consecutiveCorrect === 2) {
            this.learningStats.interval = 6;
        } else {
            this.learningStats.interval = Math.round(this.learningStats.interval * this.learningStats.easeFactor);
        }

        // Tăng ease factor nếu trả lời đúng
        this.learningStats.easeFactor = Math.min(2.5, this.learningStats.easeFactor + 0.1);
    } else {
        // Reset về 1 ngày nếu trả lời sai
        this.learningStats.interval = 1;
        this.learningStats.easeFactor = Math.max(1.3, this.learningStats.easeFactor - 0.2);
    }

    // Cập nhật ngày ôn tập tiếp theo
    this.learningStats.nextReview = new Date();
    this.learningStats.nextReview.setDate(this.learningStats.nextReview.getDate() + this.learningStats.interval);
};

// Method để cập nhật mức độ thành thạo
personalVocabularySchema.methods.updateMasteryLevel = function () {
    const accuracy = this.accuracy;
    const consecutiveCorrect = this.learningStats.consecutiveCorrect;

    if (accuracy >= 90 && consecutiveCorrect >= 5) {
        this.masteryLevel = 5;
        this.studyStatus = 'mastered';
    } else if (accuracy >= 80 && consecutiveCorrect >= 3) {
        this.masteryLevel = 4;
        this.studyStatus = 'reviewing';
    } else if (accuracy >= 70 && consecutiveCorrect >= 2) {
        this.masteryLevel = 3;
        this.studyStatus = 'reviewing';
    } else if (accuracy >= 50) {
        this.masteryLevel = 2;
        this.studyStatus = 'learning';
    } else {
        this.masteryLevel = 1;
        this.studyStatus = 'learning';
    }

    return this.save();
};

// Static method để tìm từ vựng cần ôn tập
personalVocabularySchema.statics.findDueForReview = function (userId, limit = 20) {
    return this.find({
        userId,
        nextReview: { $lte: new Date() },
        studyStatus: { $ne: 'mastered' }
    })
        .sort({ priority: -1, nextReview: 1 })
        .limit(limit)
        .populate('wordId', 'chinese pinyin meaning examples');
};

// Static method để tìm từ vựng mới
personalVocabularySchema.statics.findNewWords = function (userId, limit = 10) {
    return this.find({
        userId,
        studyStatus: 'new'
    })
        .sort({ createdAt: 1 })
        .limit(limit)
        .populate('wordId', 'chinese pinyin meaning examples');
};

// Static method để tìm từ vựng theo mức độ thành thạo
personalVocabularySchema.statics.findByMasteryLevel = function (userId, masteryLevel) {
    return this.find({
        userId,
        masteryLevel
    })
        .populate('wordId', 'chinese pinyin meaning examples');
};

// Static method để lấy thống kê
personalVocabularySchema.statics.getStats = function (filters = {}) {
    const matchStage = {};

    if (filters.userId) matchStage.userId = filters.userId;
    if (filters.studyStatus) matchStage.studyStatus = filters.studyStatus;
    if (filters.masteryLevel) matchStage.masteryLevel = filters.masteryLevel;
    if (filters.tags) matchStage.tags = { $in: filters.tags };

    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalWords: { $sum: 1 },
                byStudyStatus: { $push: '$studyStatus' },
                byMasteryLevel: { $push: '$masteryLevel' },
                byPriority: { $push: '$priority' },
                avgMasteryLevel: { $avg: '$masteryLevel' },
                totalReviews: { $sum: '$learningStats.reviewCount' },
                avgAccuracy: { $avg: { $divide: ['$learningStats.correctAnswers', { $max: ['$learningStats.totalAttempts', 1] }] } }
            }
        }
    ]);
};

const PersonalVocabulary = mongoose.model('PersonalVocabulary', personalVocabularySchema);

module.exports = PersonalVocabulary;

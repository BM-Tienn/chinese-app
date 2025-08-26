const mongoose = require('mongoose');

// Schema để theo dõi tiến độ học tập tổng thể của người dùng
const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User progress must belong to a user!'],
    unique: true,
    index: true
  },
  // Thống kê tổng quan
  totalWords: {
    type: Number,
    default: 0
  },
  masteredWords: {
    type: Number,
    default: 0
  },
  learningStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastStudyDate: {
    type: Date,
    default: null
  },
  // Hệ thống level và XP
  currentLevel: {
    type: Number,
    default: 1
  },
  experiencePoints: {
    type: Number,
    default: 0
  },
  totalExperience: {
    type: Number,
    default: 0
  },
  // Tiến độ theo tuần
  weeklyProgress: [{
    week: {
      type: String, // Format: "YYYY-WW" (năm-tuần)
      required: true
    },
    wordsLearned: {
      type: Number,
      default: 0
    },
    exercisesCompleted: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number, // Thời gian học (phút)
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    }
  }],
  // Thành tích đã đạt được
  achievements: [{
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    },
    maxProgress: {
      type: Number,
      required: true
    }
  }],
  // Thống kê học tập chi tiết
  studyStats: {
    totalStudyTime: {
      type: Number, // Tổng thời gian học (phút)
      default: 0
    },
    averageStudyTimePerDay: {
      type: Number, // Thời gian học trung bình mỗi ngày (phút)
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    bestAccuracy: {
      type: Number,
      default: 0
    },
    totalExercises: {
      type: Number,
      default: 0
    },
    correctExercises: {
      type: Number,
      default: 0
    }
  },
  // Cài đặt học tập
  studySettings: {
    dailyGoal: {
      type: Number, // Mục tiêu từ vựng mỗi ngày
      default: 10
    },
    studyReminder: {
      type: Boolean,
      default: true
    },
    reminderTime: {
      type: String, // Format: "HH:MM"
      default: "09:00"
    },
    autoReview: {
      type: Boolean,
      default: true
    }
  },
  // Lịch sử học tập theo ngày
  dailyHistory: [{
    date: {
      type: Date,
      required: true
    },
    wordsLearned: {
      type: Number,
      default: 0
    },
    exercisesCompleted: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number, // Phút
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    streakMaintained: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true,
  collection: 'user_progress'
});

// Index để tối ưu truy vấn
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ 'weeklyProgress.week': 1 });
userProgressSchema.index({ 'dailyHistory.date': 1 });

// Virtual field để tính tỷ lệ hoàn thành
userProgressSchema.virtual('completionRate').get(function () {
  if (this.totalWords === 0) return 0;
  return Math.round((this.masteredWords / this.totalWords) * 100);
});

// Virtual field để tính XP cần thiết cho level tiếp theo
userProgressSchema.virtual('xpForNextLevel').get(function () {
  return Math.pow(this.currentLevel + 1, 2) * 100;
});

// Virtual field để tính tỷ lệ hoàn thành level hiện tại
userProgressSchema.virtual('levelProgress').get(function () {
  const currentLevelXP = Math.pow(this.currentLevel, 2) * 100;
  const nextLevelXP = Math.pow(this.currentLevel + 1, 2) * 100;
  const xpInCurrentLevel = this.experiencePoints - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;

  return Math.round((xpInCurrentLevel / xpNeededForLevel) * 100);
});

// Method để cập nhật streak
userProgressSchema.methods.updateStreak = function () {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Kiểm tra xem hôm qua có học không
  const yesterdayStudy = this.dailyHistory.find(day =>
    day.date.toDateString() === yesterday.toDateString()
  );

  if (yesterdayStudy && yesterdayStudy.timeSpent > 0) {
    // Duy trì streak
    this.learningStreak += 1;
    if (this.learningStreak > this.longestStreak) {
      this.longestStreak = this.learningStreak;
    }
  } else {
    // Reset streak
    this.learningStreak = 0;
  }

  this.lastStudyDate = today;
  return this.save();
};

// Method để thêm XP
userProgressSchema.methods.addExperience = function (amount, reason = '') {
  this.experiencePoints += amount;
  this.totalExperience += amount;

  // Kiểm tra level up
  while (this.experiencePoints >= this.xpForNextLevel) {
    this.currentLevel += 1;
    // Có thể thêm logic thông báo level up ở đây
  }

  return this.save();
};

// Method để cập nhật tiến độ tuần
userProgressSchema.methods.updateWeeklyProgress = function (weekData) {
  const weekIndex = this.weeklyProgress.findIndex(w => w.week === weekData.week);

  if (weekIndex !== -1) {
    // Cập nhật tuần hiện tại
    this.weeklyProgress[weekIndex] = {
      ...this.weeklyProgress[weekIndex],
      ...weekData
    };
  } else {
    // Thêm tuần mới
    this.weeklyProgress.push(weekData);
  }

  // Giữ chỉ 12 tuần gần nhất
  if (this.weeklyProgress.length > 12) {
    this.weeklyProgress = this.weeklyProgress.slice(-12);
  }

  return this.save();
};

// Method để cập nhật tiến độ ngày
userProgressSchema.methods.updateDailyProgress = function (dailyData) {
  const today = new Date().toDateString();
  const dayIndex = this.dailyHistory.findIndex(day =>
    day.date.toDateString() === today
  );

  if (dayIndex !== -1) {
    // Cập nhật ngày hiện tại
    this.dailyHistory[dayIndex] = {
      ...this.dailyHistory[dayIndex],
      ...dailyData
    };
  } else {
    // Thêm ngày mới
    this.dailyHistory.push({
      date: new Date(),
      ...dailyData
    });
  }

  // Giữ chỉ 30 ngày gần nhất
  if (this.dailyHistory.length > 30) {
    this.dailyHistory = this.dailyHistory.slice(-30);
  }

  return this.save();
};

// Method để kiểm tra và mở khóa achievements
userProgressSchema.methods.checkAchievements = function () {
  const newAchievements = [];

  // Achievement: First Word
  if (this.totalWords >= 1 && !this.achievements.find(a => a.id === 'first_word')) {
    newAchievements.push({
      id: 'first_word',
      name: 'Từ đầu tiên',
      description: 'Học từ vựng đầu tiên',
      icon: '🌟',
      maxProgress: 1
    });
  }

  // Achievement: Word Master
  if (this.masteredWords >= 10 && !this.achievements.find(a => a.id === 'word_master')) {
    newAchievements.push({
      id: 'word_master',
      name: 'Bậc thầy từ vựng',
      description: 'Thuộc lòng 10 từ vựng',
      icon: '👑',
      maxProgress: 10
    });
  }

  // Achievement: Streak Master
  if (this.learningStreak >= 7 && !this.achievements.find(a => a.id === 'streak_master')) {
    newAchievements.push({
      id: 'streak_master',
      name: 'Kiên trì',
      description: 'Học liên tục 7 ngày',
      icon: '🔥',
      maxProgress: 7
    });
  }

  // Achievement: Level Up
  if (this.currentLevel >= 5 && !this.achievements.find(a => a.id === 'level_up')) {
    newAchievements.push({
      id: 'level_up',
      name: 'Thăng cấp',
      description: 'Đạt cấp độ 5',
      icon: '⭐',
      maxProgress: 5
    });
  }

  // Thêm achievements mới
  if (newAchievements.length > 0) {
    this.achievements.push(...newAchievements);
    return this.save();
  }

  return this;
};

// Static method để tìm hoặc tạo user progress
userProgressSchema.statics.findOrCreate = async function (userId) {
  let progress = await this.findOne({ userId });

  if (!progress) {
    progress = new this({
      userId,
      achievements: [
        {
          id: 'welcome',
          name: 'Chào mừng',
          description: 'Bắt đầu hành trình học tập',
          icon: '🎉',
          maxProgress: 1,
          progress: 1
        }
      ]
    });
    await progress.save();
  }

  return progress;
};

// Static method để lấy thống kê
userProgressSchema.statics.getStats = function (filters = {}) {
  const matchStage = {};

  if (filters.userId) matchStage.userId = filters.userId;
  if (filters.minLevel) matchStage.currentLevel = { $gte: filters.minLevel };
  if (filters.maxLevel) matchStage.currentLevel = { $lte: filters.maxLevel };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        avgLevel: { $avg: '$currentLevel' },
        avgExperience: { $avg: '$experiencePoints' },
        avgWords: { $avg: '$totalWords' },
        avgMasteredWords: { $avg: '$masteredWords' },
        avgStreak: { $avg: '$learningStreak' },
        totalAchievements: { $sum: { $size: '$achievements' } }
      }
    }
  ]);
};

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

module.exports = UserProgress;

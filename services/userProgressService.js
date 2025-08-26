const mongoose = require('mongoose');
const UserProgress = require('../models/UserProgress');
const PersonalVocabulary = require('../models/PersonalVocabulary');

class UserProgressService {
  // Lấy tiến độ học tập của người dùng
  async getUserProgress(userId) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        // Tạo tiến độ mới nếu chưa có
        userProgress = await UserProgress.findOrCreate(userId);
      }

      // Lấy thống kê từ vựng để cập nhật
      const vocabStats = await this.getVocabularyStats(userId);

      // Cập nhật thống kê nếu cần
      if (vocabStats && vocabStats.totalWords !== userProgress.totalWords ||
        vocabStats && vocabStats.masteredWords !== userProgress.masteredWords) {
        userProgress.totalWords = vocabStats ? vocabStats.totalWords : 0;
        userProgress.masteredWords = vocabStats ? vocabStats.masteredWords : 0;
        await userProgress.save();
      }

      return {
        success: true,
        data: userProgress
      };
    } catch (error) {
      console.error('Lỗi khi lấy tiến độ người dùng:', error);
      throw new Error('Lỗi server khi lấy tiến độ người dùng');
    }
  }

  // Cập nhật tiến độ học tập
  async updateUserProgress(userId, updateData) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      // Cập nhật các trường được phép
      const allowedFields = [
        'studySettings.dailyGoal',
        'studySettings.studyReminder',
        'studySettings.reminderTime',
        'studySettings.autoReview'
      ];

      allowedFields.forEach(field => {
        const value = this.getNestedValue(updateData, field);
        if (value !== undefined) {
          this.setNestedValue(userProgress, field, value);
        }
      });

      await userProgress.save();

      return {
        success: true,
        message: 'Cập nhật tiến độ thành công',
        data: userProgress
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật tiến độ người dùng:', error);
      throw error;
    }
  }

  // Thêm XP cho người dùng
  async addExperience(userId, amount, reason = '') {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      await userProgress.addExperience(amount, reason);

      return {
        success: true,
        message: `Đã thêm ${amount} XP`,
        data: {
          currentLevel: userProgress.currentLevel,
          experiencePoints: userProgress.experiencePoints,
          xpForNextLevel: userProgress.xpForNextLevel,
          levelProgress: userProgress.levelProgress
        }
      };
    } catch (error) {
      console.error('Lỗi khi thêm XP:', error);
      throw error;
    }
  }

  // Cập nhật streak học tập
  async updateStreak(userId) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      await userProgress.updateStreak();

      return {
        success: true,
        message: 'Cập nhật streak thành công',
        data: {
          learningStreak: userProgress.learningStreak,
          longestStreak: userProgress.longestStreak,
          lastStudyDate: userProgress.lastStudyDate
        }
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật streak:', error);
      throw error;
    }
  }

  // Lấy thống kê học tập theo tuần
  async getWeeklyProgress(userId, weeks = 12) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      // Lấy tiến độ tuần gần nhất
      const recentWeeks = userProgress.weeklyProgress
        .sort((a, b) => b.week.localeCompare(a.week))
        .slice(0, weeks);

      return {
        success: true,
        data: recentWeeks
      };
    } catch (error) {
      console.error('Lỗi khi lấy tiến độ tuần:', error);
      throw new Error('Lỗi server khi lấy tiến độ tuần');
    }
  }

  // Lấy thống kê học tập theo ngày
  async getDailyProgress(userId, days = 30) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      // Lấy tiến độ ngày gần nhất
      const recentDays = userProgress.dailyHistory
        .sort((a, b) => b.date - a.date)
        .slice(0, days);

      return {
        success: true,
        data: recentDays
      };
    } catch (error) {
      console.error('Lỗi khi lấy tiến độ ngày:', error);
      throw new Error('Lỗi server khi lấy tiến độ ngày');
    }
  }

  // Lấy danh sách achievements
  async getAchievements(userId) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      return {
        success: true,
        data: userProgress.achievements
      };
    } catch (error) {
      console.error('Lỗi khi lấy achievements:', error);
      throw new Error('Lỗi server khi lấy achievements');
    }
  }

  // Cập nhật tiến độ học tập trong ngày
  async updateDailyProgress(userId, dailyData) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      await userProgress.updateDailyProgress(dailyData);

      return {
        success: true,
        message: 'Cập nhật tiến độ ngày thành công'
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật tiến độ ngày:', error);
      throw error;
    }
  }

  // Cập nhật tiến độ học tập trong tuần
  async updateWeeklyProgress(userId, weekData) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      await userProgress.updateWeeklyProgress(weekData);

      return {
        success: true,
        message: 'Cập nhật tiến độ tuần thành công'
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật tiến độ tuần:', error);
      throw error;
    }
  }

  // Kiểm tra và mở khóa achievements
  async checkAchievements(userId) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      await userProgress.checkAchievements();

      return {
        success: true,
        message: 'Kiểm tra achievements thành công',
        data: userProgress.achievements
      };
    } catch (error) {
      console.error('Lỗi khi kiểm tra achievements:', error);
      throw error;
    }
  }

  // Lấy thống kê tổng quan
  async getOverallStats(userId) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      // Lấy thống kê từ vựng
      const vocabStats = await this.getVocabularyStats(userId);

      // Tính toán các chỉ số
      const stats = {
        totalWords: userProgress.totalWords,
        masteredWords: userProgress.masteredWords,
        learningStreak: userProgress.learningStreak,
        longestStreak: userProgress.longestStreak,
        currentLevel: userProgress.currentLevel,
        experiencePoints: userProgress.experiencePoints,
        completionRate: userProgress.completionRate,
        levelProgress: userProgress.levelProgress,
        xpForNextLevel: userProgress.xpForNextLevel,
        totalStudyTime: userProgress.studyStats.totalStudyTime,
        averageStudyTimePerDay: userProgress.studyStats.averageStudyTimePerDay,
        totalSessions: userProgress.studyStats.totalSessions,
        bestAccuracy: userProgress.studyStats.bestAccuracy,
        totalExercises: userProgress.studyStats.totalExercises,
        correctExercises: userProgress.studyStats.correctExercises,
        overallAccuracy: vocabStats.overallAccuracy,
        averageMasteryLevel: vocabStats.averageMasteryLevel
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Lỗi khi lấy thống kê tổng quan:', error);
      throw new Error('Lỗi server khi lấy thống kê tổng quan');
    }
  }

  // Lấy thống kê từ vựng
  async getVocabularyStats(userId) {
    try {
      // Kiểm tra userId hợp lệ
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        console.warn('UserId không hợp lệ:', userId);
        return {
          totalWords: 0,
          masteredWords: 0,
          averageMasteryLevel: 0,
          totalReviewCount: 0,
          totalCorrectAnswers: 0,
          totalAttempts: 0,
          overallAccuracy: 0
        };
      }

      const stats = await PersonalVocabulary.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalWords: { $sum: 1 },
            masteredWords: {
              $sum: { $cond: [{ $eq: ['$masteryLevel', 5] }, 1, 0] }
            },
            averageMasteryLevel: { $avg: '$masteryLevel' },
            totalReviewCount: { $sum: { $ifNull: ['$learningStats.reviewCount', 0] } },
            totalCorrectAnswers: { $sum: { $ifNull: ['$learningStats.correctAnswers', 0] } },
            totalAttempts: { $sum: { $ifNull: ['$learningStats.totalAttempts', 0] } }
          }
        }
      ]);

      const result = stats[0] || {
        totalWords: 0,
        masteredWords: 0,
        averageMasteryLevel: 0,
        totalReviewCount: 0,
        totalCorrectAnswers: 0,
        totalAttempts: 0
      };

      // Tính độ chính xác tổng thể
      result.overallAccuracy = result.totalAttempts > 0
        ? Math.round((result.totalCorrectAnswers / result.totalAttempts) * 100)
        : 0;

      return result;
    } catch (error) {
      console.error('Lỗi khi lấy thống kê từ vựng:', error);
      return {
        totalWords: 0,
        masteredWords: 0,
        averageMasteryLevel: 0,
        totalReviewCount: 0,
        totalCorrectAnswers: 0,
        totalAttempts: 0,
        overallAccuracy: 0
      };
    }
  }

  // Hàm tiện ích để lấy giá trị nested
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  // Hàm tiện ích để set giá trị nested
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Reset tiến độ người dùng (cho mục đích testing)
  async resetUserProgress(userId) {
    try {
      await UserProgress.findOneAndDelete({ userId });

      return {
        success: true,
        message: 'Reset tiến độ thành công'
      };
    } catch (error) {
      console.error('Lỗi khi reset tiến độ:', error);
      throw error;
    }
  }
}

module.exports = new UserProgressService();

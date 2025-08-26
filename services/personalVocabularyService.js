const mongoose = require('mongoose');
const PersonalVocabulary = require('../models/PersonalVocabulary');
const UserProgress = require('../models/UserProgress');
const Vocabulary = require('../models/Vocabulary');

class PersonalVocabularyService {
  // Lấy danh sách từ vựng cá nhân của người dùng
  async getPersonalVocabulary(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        masteryLevel,
        studyStatus,
        tags,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Xây dựng filter
      const filter = { userId };

      if (search) {
        filter.$or = [
          { hanzi: { $regex: search, $options: 'i' } },
          { pinyin: { $regex: search, $options: 'i' } },
          { meaning: { $regex: search, $options: 'i' } }
        ];
      }

      if (masteryLevel) filter.masteryLevel = parseInt(masteryLevel);
      if (studyStatus) filter.studyStatus = studyStatus;
      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      // Xây dựng sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Thực hiện query với phân trang
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [vocabularies, total] = await Promise.all([
        PersonalVocabulary.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('wordId', 'chinese pinyin meaning examples')
          .select('-__v'),
        PersonalVocabulary.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return {
        success: true,
        data: {
          vocabularies,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalItems: total,
            itemsPerPage: parseInt(limit)
          }
        }
      };
    } catch (error) {
      console.error('Lỗi khi lấy từ vựng cá nhân:', error);
      throw new Error('Lỗi server khi lấy từ vựng cá nhân');
    }
  }

  // Lấy từ vựng cá nhân theo ID
  async getPersonalVocabularyById(id, userId) {
    try {
      const vocabulary = await PersonalVocabulary.findOne({ _id: id, userId })
        .populate('wordId', 'chinese pinyin meaning examples')
        .select('-__v');

      if (!vocabulary) {
        throw new Error('Không tìm thấy từ vựng cá nhân');
      }

      return {
        success: true,
        data: vocabulary
      };
    } catch (error) {
      console.error('Lỗi khi lấy từ vựng cá nhân:', error);
      throw error;
    }
  }

  // Thêm từ vựng mới vào danh sách cá nhân
  async addPersonalWord(userId, wordData) {
    try {
      // Kiểm tra xem từ đã tồn tại trong danh sách cá nhân chưa
      const existingWord = await PersonalVocabulary.findOne({
        userId,
        wordId: wordData.wordId
      });

      if (existingWord) {
        throw new Error('Từ vựng đã tồn tại trong danh sách cá nhân');
      }

      // Lấy thông tin từ vựng gốc
      const originalWord = await Vocabulary.findById(wordData.wordId);
      if (!originalWord) {
        throw new Error('Không tìm thấy từ vựng gốc');
      }

      // Tạo từ vựng cá nhân mới
      const personalWord = new PersonalVocabulary({
        userId,
        wordId: wordData.wordId,
        hanzi: wordData.hanzi || originalWord.chinese,
        pinyin: wordData.pinyin || originalWord.pinyin,
        meaning: wordData.meaning || originalWord.meaning.primary,
        notes: wordData.notes || '',
        tags: wordData.tags || [],
        priority: wordData.priority || 'medium'
      });

      await personalWord.save();

      // Cập nhật tiến độ người dùng
      await this.updateUserProgressStats(userId, 'addWord');

      return {
        success: true,
        message: 'Thêm từ vựng thành công',
        data: personalWord
      };
    } catch (error) {
      console.error('Lỗi khi thêm từ vựng cá nhân:', error);
      throw error;
    }
  }

  // Cập nhật từ vựng cá nhân
  async updatePersonalWord(id, userId, updateData) {
    try {
      const vocabulary = await PersonalVocabulary.findOne({ _id: id, userId });

      if (!vocabulary) {
        throw new Error('Không tìm thấy từ vựng cá nhân');
      }

      // Cập nhật các trường được phép
      const allowedFields = ['hanzi', 'pinyin', 'meaning', 'notes', 'tags', 'priority'];
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          vocabulary[field] = updateData[field];
        }
      });

      // Thêm vào lịch sử học tập
      vocabulary.studyHistory.push({
        date: new Date(),
        action: 'updated',
        notes: 'Cập nhật thông tin từ vựng'
      });

      await vocabulary.save();

      return {
        success: true,
        message: 'Cập nhật từ vựng thành công',
        data: vocabulary
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật từ vựng cá nhân:', error);
      throw error;
    }
  }

  // Xóa từ vựng cá nhân
  async deletePersonalWord(id, userId) {
    try {
      const vocabulary = await PersonalVocabulary.findOneAndDelete({ _id: id, userId });

      if (!vocabulary) {
        throw new Error('Không tìm thấy từ vựng cá nhân');
      }

      // Cập nhật tiến độ người dùng
      await this.updateUserProgressStats(userId, 'removeWord');

      return {
        success: true,
        message: 'Xóa từ vựng thành công'
      };
    } catch (error) {
      console.error('Lỗi khi xóa từ vựng cá nhân:', error);
      throw error;
    }
  }

  // Lấy danh sách từ vựng cần ôn tập
  async getWordsForReview(userId, limit = 20) {
    try {
      const words = await PersonalVocabulary.findDueForReview(userId, limit);

      return {
        success: true,
        data: words
      };
    } catch (error) {
      console.error('Lỗi khi lấy từ vựng cần ôn tập:', error);
      throw new Error('Lỗi server khi lấy từ vựng cần ôn tập');
    }
  }

  // Lấy từ vựng mới để học
  async getNewWords(userId, limit = 10) {
    try {
      const words = await PersonalVocabulary.findNewWords(userId, limit);

      return {
        success: true,
        data: words
      };
    } catch (error) {
      console.error('Lỗi khi lấy từ vựng mới:', error);
      throw new Error('Lỗi server khi lấy từ vựng mới');
    }
  }

  // Cập nhật kết quả học tập
  async updateStudyResult(id, userId, studyData) {
    try {
      const { isCorrect, timeSpent = 0 } = studyData;

      const vocabulary = await PersonalVocabulary.findOne({ _id: id, userId });

      if (!vocabulary) {
        throw new Error('Không tìm thấy từ vựng cá nhân');
      }

      // Cập nhật thống kê học tập
      await vocabulary.updateLearningStats(isCorrect, timeSpent);

      // Cập nhật mức độ thành thạo
      await vocabulary.updateMasteryLevel();

      // Cập nhật tiến độ người dùng
      await this.updateUserProgressStats(userId, 'studyWord', {
        isCorrect,
        timeSpent,
        masteryLevel: vocabulary.masteryLevel
      });

      return {
        success: true,
        message: 'Cập nhật kết quả học tập thành công',
        data: vocabulary
      };
    } catch (error) {
      console.error('Lỗi khi cập nhật kết quả học tập:', error);
      throw error;
    }
  }

  // Tạo lịch ôn tập
  async generateReviewSchedule(userId, date = new Date()) {
    try {
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Lấy từ vựng cần ôn tập trong ngày
      const wordsToReview = await PersonalVocabulary.find({
        userId,
        nextReview: { $gte: startOfDay, $lte: endOfDay },
        studyStatus: { $ne: 'mastered' }
      }).populate('wordId', 'chinese pinyin meaning examples');

      // Lấy từ vựng mới
      const newWords = await PersonalVocabulary.find({
        userId,
        studyStatus: 'new'
      }).populate('wordId', 'chinese pinyin meaning examples');

      // Lấy từ vựng cần luyện tập để thành thạo
      const masteryWords = await PersonalVocabulary.find({
        userId,
        studyStatus: 'reviewing',
        masteryLevel: { $gte: 3, $lt: 5 }
      }).populate('wordId', 'chinese pinyin meaning examples');

      return {
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          wordsToReview: wordsToReview.slice(0, 20),
          newWords: newWords.slice(0, 10),
          masteryWords: masteryWords.slice(0, 15)
        }
      };
    } catch (error) {
      console.error('Lỗi khi tạo lịch ôn tập:', error);
      throw new Error('Lỗi server khi tạo lịch ôn tập');
    }
  }

  // Lấy thống kê từ vựng cá nhân
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

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Lỗi khi lấy thống kê từ vựng:', error);
      throw new Error('Lỗi server khi lấy thống kê từ vựng');
    }
  }

  // Cập nhật thống kê tiến độ người dùng
  async updateUserProgressStats(userId, action, additionalData = {}) {
    try {
      let userProgress = await UserProgress.findOne({ userId });

      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      switch (action) {
        case 'addWord':
          userProgress.totalWords += 1;
          break;
        case 'removeWord':
          userProgress.totalWords = Math.max(0, userProgress.totalWords - 1);
          break;
        case 'studyWord':
          const { isCorrect, timeSpent, masteryLevel } = additionalData;

          // Cập nhật thống kê học tập
          userProgress.studyStats.totalStudyTime += timeSpent;
          userProgress.studyStats.totalExercises += 1;
          if (isCorrect) {
            userProgress.studyStats.correctExercises += 1;
          }

          // Cập nhật mức độ thành thạo
          if (masteryLevel === 5) {
            userProgress.masteredWords += 1;
          }

          // Thêm XP
          const xpGained = isCorrect ? 10 : 2;
          await userProgress.addExperience(xpGained, 'study_word');

          // Cập nhật streak
          await userProgress.updateStreak();

          // Cập nhật tiến độ ngày
          const today = new Date();
          const weekNumber = this.getWeekNumber(today);

          await userProgress.updateDailyProgress({
            wordsLearned: 1,
            exercisesCompleted: 1,
            timeSpent: Math.round(timeSpent / 60), // Chuyển về phút
            accuracy: isCorrect ? 100 : 0
          });

          await userProgress.updateWeeklyProgress({
            week: weekNumber,
            wordsLearned: 1,
            exercisesCompleted: 1,
            timeSpent: Math.round(timeSpent / 60),
            accuracy: isCorrect ? 100 : 0
          });

          // Kiểm tra achievements
          await userProgress.checkAchievements();
          break;
      }

      await userProgress.save();
    } catch (error) {
      console.error('Lỗi khi cập nhật thống kê tiến độ:', error);
    }
  }

  // Hàm tiện ích để lấy số tuần trong năm
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }
}

module.exports = new PersonalVocabularyService();

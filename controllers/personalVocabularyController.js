const personalVocabularyService = require('../services/personalVocabularyService');

// Lấy danh sách từ vựng cá nhân của người dùng
exports.getPersonalVocabulary = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const options = {
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      masteryLevel: req.query.masteryLevel,
      studyStatus: req.query.studyStatus,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    const result = await personalVocabularyService.getPersonalVocabulary(userId, options);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getPersonalVocabulary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy từ vựng cá nhân'
    });
  }
};

// Lấy từ vựng cá nhân theo ID
exports.getPersonalVocabularyById = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { id } = req.params;
    const result = await personalVocabularyService.getPersonalVocabularyById(id, userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getPersonalVocabularyById:', error);
    
    if (error.message === 'Không tìm thấy từ vựng cá nhân') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy từ vựng cá nhân'
    });
  }
};

// Thêm từ vựng mới vào danh sách cá nhân
exports.addPersonalWord = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { wordId, hanzi, pinyin, meaning, notes, tags, priority } = req.body;

    if (!wordId) {
      return res.status(400).json({
        success: false,
        message: 'ID từ vựng gốc là bắt buộc'
      });
    }

    const wordData = {
      wordId,
      hanzi,
      pinyin,
      meaning,
      notes,
      tags,
      priority
    };

    const result = await personalVocabularyService.addPersonalWord(userId, wordData);

    res.status(201).json(result);
  } catch (error) {
    console.error('Lỗi controller addPersonalWord:', error);
    
    if (error.message === 'Từ vựng đã tồn tại trong danh sách cá nhân' ||
        error.message === 'Không tìm thấy từ vựng gốc') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi thêm từ vựng cá nhân'
    });
  }
};

// Cập nhật từ vựng cá nhân
exports.updatePersonalWord = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const result = await personalVocabularyService.updatePersonalWord(id, userId, updateData);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller updatePersonalWord:', error);
    
    if (error.message === 'Không tìm thấy từ vựng cá nhân') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật từ vựng cá nhân'
    });
  }
};

// Xóa từ vựng cá nhân
exports.deletePersonalWord = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { id } = req.params;
    const result = await personalVocabularyService.deletePersonalWord(id, userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller deletePersonalWord:', error);
    
    if (error.message === 'Không tìm thấy từ vựng cá nhân') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi xóa từ vựng cá nhân'
    });
  }
};

// Lấy danh sách từ vựng cần ôn tập
exports.getWordsForReview = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const result = await personalVocabularyService.getWordsForReview(userId, limit);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getWordsForReview:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy từ vựng cần ôn tập'
    });
  }
};

// Lấy từ vựng mới để học
exports.getNewWords = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const result = await personalVocabularyService.getNewWords(userId, limit);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getNewWords:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy từ vựng mới'
    });
  }
};

// Cập nhật kết quả học tập
exports.updateStudyResult = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { id } = req.params;
    const { isCorrect, timeSpent } = req.body;

    if (typeof isCorrect !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Trường isCorrect phải là boolean'
      });
    }

    const studyData = {
      isCorrect,
      timeSpent: timeSpent || 0
    };

    const result = await personalVocabularyService.updateStudyResult(id, userId, studyData);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller updateStudyResult:', error);
    
    if (error.message === 'Không tìm thấy từ vựng cá nhân') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật kết quả học tập'
    });
  }
};

// Tạo lịch ôn tập
exports.generateReviewSchedule = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const date = req.query.date ? new Date(req.query.date) : new Date();
    const result = await personalVocabularyService.generateReviewSchedule(userId, date);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller generateReviewSchedule:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tạo lịch ôn tập'
    });
  }
};

// Lấy thống kê từ vựng cá nhân
exports.getVocabularyStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await personalVocabularyService.getVocabularyStats(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getVocabularyStats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy thống kê từ vựng'
    });
  }
};

// Lấy từ vựng theo mức độ thành thạo
exports.getWordsByMasteryLevel = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { masteryLevel } = req.params;
    const level = parseInt(masteryLevel);

    if (isNaN(level) || level < 1 || level > 5) {
      return res.status(400).json({
        success: false,
        message: 'Mức độ thành thạo phải là số từ 1 đến 5'
      });
    }

    const words = await require('../models/PersonalVocabulary').findByMasteryLevel(userId, level);

    res.json({
      success: true,
      data: words
    });
  } catch (error) {
    console.error('Lỗi controller getWordsByMasteryLevel:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy từ vựng theo mức độ thành thạo'
    });
  }
};

// Tìm kiếm từ vựng cá nhân
exports.searchPersonalVocabulary = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { query, tags, masteryLevel } = req.query;

    if (!query && !tags && !masteryLevel) {
      return res.status(400).json({
        success: false,
        message: 'Phải cung cấp ít nhất một tiêu chí tìm kiếm'
      });
    }

    const options = {
      search: query,
      tags: tags ? tags.split(',') : undefined,
      masteryLevel: masteryLevel ? parseInt(masteryLevel) : undefined
    };

    const result = await personalVocabularyService.getPersonalVocabulary(userId, options);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller searchPersonalVocabulary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi tìm kiếm từ vựng cá nhân'
    });
  }
};

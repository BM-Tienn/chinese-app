const userProgressService = require('../services/userProgressService');

// Lấy tiến độ học tập của người dùng
exports.getUserProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await userProgressService.getUserProgress(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getUserProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy tiến độ người dùng'
    });
  }
};

// Cập nhật tiến độ học tập
exports.updateUserProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const updateData = req.body;
    const result = await userProgressService.updateUserProgress(userId, updateData);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller updateUserProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật tiến độ người dùng'
    });
  }
};

// Thêm XP cho người dùng
exports.addExperience = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { amount, reason } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Số lượng XP phải là số dương'
      });
    }

    const result = await userProgressService.addExperience(userId, amount, reason);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller addExperience:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi thêm XP'
    });
  }
};

// Cập nhật streak học tập
exports.updateStreak = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await userProgressService.updateStreak(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller updateStreak:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật streak'
    });
  }
};

// Lấy thống kê học tập theo tuần
exports.getWeeklyProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const weeks = req.query.weeks ? parseInt(req.query.weeks) : 12;
    const result = await userProgressService.getWeeklyProgress(userId, weeks);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getWeeklyProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy tiến độ tuần'
    });
  }
};

// Lấy thống kê học tập theo ngày
exports.getDailyProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const days = req.query.days ? parseInt(req.query.days) : 30;
    const result = await userProgressService.getDailyProgress(userId, days);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getDailyProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy tiến độ ngày'
    });
  }
};

// Lấy danh sách achievements
exports.getAchievements = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await userProgressService.getAchievements(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getAchievements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy achievements'
    });
  }
};

// Cập nhật tiến độ học tập trong ngày
exports.updateDailyProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const dailyData = req.body;
    const result = await userProgressService.updateDailyProgress(userId, dailyData);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller updateDailyProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật tiến độ ngày'
    });
  }
};

// Cập nhật tiến độ học tập trong tuần
exports.updateWeeklyProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const weekData = req.body;
    const result = await userProgressService.updateWeeklyProgress(userId, weekData);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller updateWeeklyProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi cập nhật tiến độ tuần'
    });
  }
};

// Kiểm tra và mở khóa achievements
exports.checkAchievements = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await userProgressService.checkAchievements(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller checkAchievements:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi kiểm tra achievements'
    });
  }
};

// Lấy thống kê tổng quan
exports.getOverallStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await userProgressService.getOverallStats(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller getOverallStats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy thống kê tổng quan'
    });
  }
};

// Lấy thống kê từ vựng
exports.getVocabularyStats = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const result = await userProgressService.getVocabularyStats(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Lỗi controller getVocabularyStats:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê từ vựng'
    });
  }
};

// Reset tiến độ người dùng (cho mục đích testing)
exports.resetUserProgress = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    // Chỉ cho phép reset trong môi trường development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Không được phép reset tiến độ trong môi trường production'
      });
    }

    const result = await userProgressService.resetUserProgress(userId);

    res.json(result);
  } catch (error) {
    console.error('Lỗi controller resetUserProgress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi reset tiến độ'
    });
  }
};

// Lấy thống kê học tập theo khoảng thời gian
exports.getProgressByDateRange = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên làm việc không hợp lệ'
      });
    }

    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Phải cung cấp startDate và endDate'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng ngày không hợp lệ'
      });
    }

    // Lấy tiến độ ngày trong khoảng thời gian
    let userProgress = await userProgressService.getUserProgress(userId);
    
    const filteredDays = userProgress.data.dailyHistory.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= start && dayDate <= end;
    });

    // Tính tổng thống kê trong khoảng thời gian
    const stats = filteredDays.reduce((acc, day) => {
      acc.wordsLearned += day.wordsLearned || 0;
      acc.exercisesCompleted += day.exercisesCompleted || 0;
      acc.timeSpent += day.timeSpent || 0;
      acc.totalAccuracy += day.accuracy || 0;
      acc.daysCount += 1;
      return acc;
    }, {
      wordsLearned: 0,
      exercisesCompleted: 0,
      timeSpent: 0,
      totalAccuracy: 0,
      daysCount: 0
    });

    // Tính trung bình
    if (stats.daysCount > 0) {
      stats.averageAccuracy = Math.round(stats.totalAccuracy / stats.daysCount);
      stats.averageTimePerDay = Math.round(stats.timeSpent / stats.daysCount);
    } else {
      stats.averageAccuracy = 0;
      stats.averageTimePerDay = 0;
    }

    delete stats.totalAccuracy;
    delete stats.daysCount;

    res.json({
      success: true,
      data: {
        dateRange: { startDate, endDate },
        stats,
        dailyData: filteredDays
      }
    });
  } catch (error) {
    console.error('Lỗi controller getProgressByDateRange:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi lấy tiến độ theo khoảng thời gian'
    });
  }
};

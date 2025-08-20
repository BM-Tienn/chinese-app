const Vocabulary = require('../models/Vocabulary');

// Lấy danh sách từ vựng với phân trang và lọc
exports.getVocabularies = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search,
            category,
            hskLevel,
            difficulty,
            sortBy = 'chinese',
            sortOrder = 'asc'
        } = req.query;

        // Xây dựng filter
        const filter = { isActive: true };

        if (search) {
            filter.$or = [
                { chinese: { $regex: search, $options: 'i' } },
                { pinyin: { $regex: search, $options: 'i' } },
                { 'meaning.primary': { $regex: search, $options: 'i' } },
                { vietnameseReading: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) filter.category = category;
        if (hskLevel) filter.hskLevel = parseInt(hskLevel);
        if (difficulty) filter.difficulty = difficulty;

        // Xây dựng sort
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        // Thực hiện query với phân trang
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [vocabularies, total] = await Promise.all([
            Vocabulary.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .select('-__v'),
            Vocabulary.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            message: 'Lấy danh sách từ vựng thành công',
            data: {
                vocabularies,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách từ vựng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy danh sách từ vựng',
            error: error.message
        });
    }
};

// Lấy từ vựng theo ID
exports.getVocabularyById = async (req, res) => {
    try {
        const { id } = req.params;

        const vocabulary = await Vocabulary.findById(id).select('-__v');

        if (!vocabulary) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy từ vựng'
            });
        }

        res.json({
            success: true,
            message: 'Lấy từ vựng thành công',
            data: vocabulary
        });
    } catch (error) {
        console.error('Lỗi khi lấy từ vựng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy từ vựng',
            error: error.message
        });
    }
};

// Tạo từ vựng mới
exports.createVocabulary = async (req, res) => {
    try {
        const vocabularyData = req.body;

        // Kiểm tra từ vựng đã tồn tại
        const existingVocabulary = await Vocabulary.findOne({
            chinese: vocabularyData.chinese
        });

        if (existingVocabulary) {
            return res.status(400).json({
                success: false,
                message: 'Từ vựng này đã tồn tại trong hệ thống'
            });
        }

        const vocabulary = new Vocabulary(vocabularyData);
        await vocabulary.save();

        res.status(201).json({
            success: true,
            message: 'Tạo từ vựng thành công',
            data: vocabulary
        });
    } catch (error) {
        console.error('Lỗi khi tạo từ vựng:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tạo từ vựng',
            error: error.message
        });
    }
};

// Cập nhật từ vựng
exports.updateVocabulary = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Kiểm tra từ vựng tồn tại
        const existingVocabulary = await Vocabulary.findById(id);
        if (!existingVocabulary) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy từ vựng để cập nhật'
            });
        }

        // Kiểm tra trùng lặp nếu thay đổi chinese
        if (updateData.chinese && updateData.chinese !== existingVocabulary.chinese) {
            const duplicateCheck = await Vocabulary.findOne({
                chinese: updateData.chinese,
                _id: { $ne: id }
            });

            if (duplicateCheck) {
                return res.status(400).json({
                    success: false,
                    message: 'Từ vựng này đã tồn tại trong hệ thống'
                });
            }
        }

        const updatedVocabulary = await Vocabulary.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-__v');

        res.json({
            success: true,
            message: 'Cập nhật từ vựng thành công',
            data: updatedVocabulary
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật từ vựng:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật từ vựng',
            error: error.message
        });
    }
};

// Xóa từ vựng (soft delete)
exports.deleteVocabulary = async (req, res) => {
    try {
        const { id } = req.params;

        const vocabulary = await Vocabulary.findById(id);
        if (!vocabulary) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy từ vựng để xóa'
            });
        }

        // Soft delete - chỉ đánh dấu không hoạt động
        vocabulary.isActive = false;
        await vocabulary.save();

        res.json({
            success: true,
            message: 'Xóa từ vựng thành công'
        });
    } catch (error) {
        console.error('Lỗi khi xóa từ vựng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi xóa từ vựng',
            error: error.message
        });
    }
};

// Tìm kiếm từ vựng nâng cao
exports.searchVocabularies = async (req, res) => {
    try {
        const {
            query,
            category,
            hskLevel,
            difficulty,
            partOfSpeech,
            formality,
            limit = 50
        } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Truy vấn tìm kiếm là bắt buộc'
            });
        }

        // Xây dựng filter
        const filter = { isActive: true };

        // Tìm kiếm theo nhiều trường
        filter.$or = [
            { chinese: { $regex: query, $options: 'i' } },
            { pinyin: { $regex: query, $options: 'i' } },
            { 'meaning.primary': { $regex: query, $options: 'i' } },
            { vietnameseReading: { $regex: query, $options: 'i' } },
            { 'meaning.secondary': { $regex: query, $options: 'i' } }
        ];

        // Thêm các filter bổ sung
        if (category) filter.category = category;
        if (hskLevel) filter.hskLevel = parseInt(hskLevel);
        if (difficulty) filter.difficulty = difficulty;
        if (partOfSpeech) filter['meaning.partOfSpeech'] = partOfSpeech;
        if (formality) filter['grammar.formality'] = formality;

        const vocabularies = await Vocabulary.find(filter)
            .limit(parseInt(limit))
            .select('chinese pinyin meaning.primary category hskLevel difficulty')
            .sort({ 'statistics.frequency': -1, chinese: 1 });

        res.json({
            success: true,
            message: 'Tìm kiếm từ vựng thành công',
            data: {
                query,
                results: vocabularies,
                total: vocabularies.length
            }
        });
    } catch (error) {
        console.error('Lỗi khi tìm kiếm từ vựng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi tìm kiếm từ vựng',
            error: error.message
        });
    }
};

// Lấy từ vựng theo cấp độ HSK
exports.getVocabulariesByHSKLevel = async (req, res) => {
    try {
        const { level } = req.params;
        const { page = 1, limit = 50 } = req.query;

        if (!level || level < 1 || level > 6) {
            return res.status(400).json({
                success: false,
                message: 'Cấp độ HSK phải từ 1-6'
            });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [vocabularies, total] = await Promise.all([
            Vocabulary.find({
                hskLevel: parseInt(level),
                isActive: true
            })
                .select('chinese pinyin meaning.primary category difficulty')
                .sort({ chinese: 1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Vocabulary.countDocuments({
                hskLevel: parseInt(level),
                isActive: true
            })
        ]);

        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            success: true,
            message: `Lấy từ vựng HSK${level} thành công`,
            data: {
                hskLevel: parseInt(level),
                vocabularies,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy từ vựng theo HSK level:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy từ vựng theo HSK level',
            error: error.message
        });
    }
};

// Cập nhật thống kê học tập
exports.updateLearningStatistics = async (req, res) => {
    try {
        const { id } = req.params;
        const { score, reviewType = 'practice' } = req.body;

        if (score === undefined || score < 0 || score > 100) {
            return res.status(400).json({
                success: false,
                message: 'Điểm số phải từ 0-100'
            });
        }

        const vocabulary = await Vocabulary.findById(id);
        if (!vocabulary) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy từ vựng'
            });
        }

        // Cập nhật thống kê
        vocabulary.statistics.totalReviews += 1;
        vocabulary.statistics.lastReviewed = new Date();

        // Tính điểm trung bình
        const currentTotal = vocabulary.statistics.averageScore * (vocabulary.statistics.totalReviews - 1);
        vocabulary.statistics.averageScore = (currentTotal + score) / vocabulary.statistics.totalReviews;

        // Cập nhật mức độ thành thạo
        if (score >= 80) {
            vocabulary.statistics.masteryLevel = Math.min(100, vocabulary.statistics.masteryLevel + 10);
        } else if (score < 60) {
            vocabulary.statistics.masteryLevel = Math.max(0, vocabulary.statistics.masteryLevel - 5);
        }

        await vocabulary.save();

        res.json({
            success: true,
            message: 'Cập nhật thống kê học tập thành công',
            data: {
                id: vocabulary._id,
                statistics: vocabulary.statistics
            }
        });
    } catch (error) {
        console.error('Lỗi khi cập nhật thống kê học tập:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi cập nhật thống kê học tập',
            error: error.message
        });
    }
};

// Lấy từ vựng ngẫu nhiên cho bài tập
exports.getRandomVocabularies = async (req, res) => {
    try {
        const {
            count = 10,
            category,
            hskLevel,
            difficulty,
            excludeIds = []
        } = req.query;

        const filter = { isActive: true };

        if (category) filter.category = category;
        if (hskLevel) filter.hskLevel = parseInt(hskLevel);
        if (difficulty) filter.difficulty = difficulty;
        if (excludeIds.length > 0) {
            filter._id = { $nin: excludeIds };
        }

        const vocabularies = await Vocabulary.aggregate([
            { $match: filter },
            { $sample: { size: parseInt(count) } },
            {
                $project: {
                    chinese: 1,
                    pinyin: 1,
                    meaning: 1,
                    category: 1,
                    hskLevel: 1,
                    difficulty: 1,
                    examples: 1
                }
            }
        ]);

        res.json({
            success: true,
            message: 'Lấy từ vựng ngẫu nhiên thành công',
            data: {
                count: vocabularies.length,
                vocabularies
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy từ vựng ngẫu nhiên:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy từ vựng ngẫu nhiên',
            error: error.message
        });
    }
};

// Lấy thống kê tổng quan về kho từ vựng
exports.getVocabularyStats = async (req, res) => {
    try {
        const stats = await Vocabulary.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: null,
                    totalVocabularies: { $sum: 1 },
                    totalByCategory: {
                        $push: {
                            category: '$category',
                            count: 1
                        }
                    },
                    totalByHSKLevel: {
                        $push: {
                            hskLevel: '$hskLevel',
                            count: 1
                        }
                    },
                    totalByDifficulty: {
                        $push: {
                            difficulty: '$difficulty',
                            count: 1
                        }
                    },
                    averageMasteryLevel: { $avg: '$statistics.masteryLevel' },
                    totalReviews: { $sum: '$statistics.totalReviews' }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.json({
                success: true,
                message: 'Chưa có từ vựng nào trong hệ thống',
                data: {
                    totalVocabularies: 0,
                    totalByCategory: [],
                    totalByHSKLevel: [],
                    totalByDifficulty: [],
                    averageMasteryLevel: 0,
                    totalReviews: 0
                }
            });
        }

        const stat = stats[0];

        // Xử lý dữ liệu thống kê
        const categoryStats = {};
        stat.totalByCategory.forEach(item => {
            categoryStats[item.category] = (categoryStats[item.category] || 0) + item.count;
        });

        const hskLevelStats = {};
        stat.totalByHSKLevel.forEach(item => {
            if (item.hskLevel) {
                hskLevelStats[`HSK${item.hskLevel}`] = (hskLevelStats[`HSK${item.hskLevel}`] || 0) + item.count;
            }
        });

        const difficultyStats = {};
        stat.totalByDifficulty.forEach(item => {
            difficultyStats[item.difficulty] = (difficultyStats[item.difficulty] || 0) + item.count;
        });

        res.json({
            success: true,
            message: 'Lấy thống kê từ vựng thành công',
            data: {
                totalVocabularies: stat.totalVocabularies,
                categoryBreakdown: categoryStats,
                hskLevelBreakdown: hskLevelStats,
                difficultyBreakdown: difficultyStats,
                averageMasteryLevel: Math.round(stat.averageMasteryLevel * 100) / 100,
                totalReviews: stat.totalReviews
            }
        });
    } catch (error) {
        console.error('Lỗi khi lấy thống kê từ vựng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server khi lấy thống kê từ vựng',
            error: error.message
        });
    }
};

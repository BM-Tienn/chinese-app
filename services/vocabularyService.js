const Vocabulary = require('../models/Vocabulary');

class VocabularyService {
    /**
     * Tạo từ vựng mới với validation
     */
    static async createVocabulary(vocabularyData) {
        try {
            // Kiểm tra từ vựng đã tồn tại
            const existingVocabulary = await Vocabulary.findOne({
                chinese: vocabularyData.chinese
            });

            if (existingVocabulary) {
                throw new Error('Từ vựng này đã tồn tại trong hệ thống');
            }

            // Tự động xác định HSK level nếu có grammar.level
            if (vocabularyData.grammar && vocabularyData.grammar.level) {
                const hskMatch = vocabularyData.grammar.level.match(/HSK(\d+)/i);
                if (hskMatch) {
                    vocabularyData.hskLevel = parseInt(hskMatch[1]);
                }
            }

            // Tự động xác định difficulty dựa trên HSK level
            if (vocabularyData.hskLevel) {
                if (vocabularyData.hskLevel <= 2) {
                    vocabularyData.difficulty = 'Easy';
                } else if (vocabularyData.hskLevel <= 4) {
                    vocabularyData.difficulty = 'Medium';
                } else {
                    vocabularyData.difficulty = 'Hard';
                }
            }

            const vocabulary = new Vocabulary(vocabularyData);
            await vocabulary.save();

            return vocabulary;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cập nhật từ vựng với validation
     */
    static async updateVocabulary(id, updateData) {
        try {
            const existingVocabulary = await Vocabulary.findById(id);
            if (!existingVocabulary) {
                throw new Error('Không tìm thấy từ vựng để cập nhật');
            }

            // Kiểm tra trùng lặp nếu thay đổi chinese
            if (updateData.chinese && updateData.chinese !== existingVocabulary.chinese) {
                const duplicateCheck = await Vocabulary.findOne({
                    chinese: updateData.chinese,
                    _id: { $ne: id }
                });

                if (duplicateCheck) {
                    throw new Error('Từ vựng này đã tồn tại trong hệ thống');
                }
            }

            // Cập nhật HSK level và difficulty nếu cần
            if (updateData.grammar && updateData.grammar.level) {
                const hskMatch = updateData.grammar.level.match(/HSK(\d+)/i);
                if (hskMatch) {
                    updateData.hskLevel = parseInt(hskMatch[1]);

                    // Cập nhật difficulty
                    if (updateData.hskLevel <= 2) {
                        updateData.difficulty = 'Easy';
                    } else if (updateData.hskLevel <= 4) {
                        updateData.difficulty = 'Medium';
                    } else {
                        updateData.difficulty = 'Hard';
                    }
                }
            }

            const updatedVocabulary = await Vocabulary.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            return updatedVocabulary;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Tìm kiếm từ vựng với filter nâng cao
     */
    static async searchVocabularies(searchParams) {
        try {
            const {
                query,
                category,
                hskLevel,
                difficulty,
                partOfSpeech,
                formality,
                limit = 50,
                sortBy = 'statistics.frequency',
                sortOrder = 'desc'
            } = searchParams;

            if (!query) {
                throw new Error('Truy vấn tìm kiếm là bắt buộc');
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

            // Xây dựng sort
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const vocabularies = await Vocabulary.find(filter)
                .limit(parseInt(limit))
                .select('chinese pinyin meaning.primary category hskLevel difficulty examples')
                .sort(sort);

            return vocabularies;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy từ vựng ngẫu nhiên cho bài tập
     */
    static async getRandomVocabularies(params) {
        try {
            const {
                count = 10,
                category,
                hskLevel,
                difficulty,
                excludeIds = [],
                includeExamples = true
            } = params;

            const filter = { isActive: true };

            if (category) filter.category = category;
            if (hskLevel) filter.hskLevel = parseInt(hskLevel);
            if (difficulty) filter.difficulty = difficulty;
            if (excludeIds.length > 0) {
                filter._id = { $nin: excludeIds };
            }

            const projectFields = {
                chinese: 1,
                pinyin: 1,
                meaning: 1,
                category: 1,
                hskLevel: 1,
                difficulty: 1
            };

            if (includeExamples) {
                projectFields.examples = 1;
            }

            const vocabularies = await Vocabulary.aggregate([
                { $match: filter },
                { $sample: { size: parseInt(count) } },
                { $project: projectFields }
            ]);

            return vocabularies;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Cập nhật thống kê học tập
     */
    static async updateLearningStatistics(id, score, reviewType = 'practice') {
        try {
            if (score === undefined || score < 0 || score > 100) {
                throw new Error('Điểm số phải từ 0-100');
            }

            const vocabulary = await Vocabulary.findById(id);
            if (!vocabulary) {
                throw new Error('Không tìm thấy từ vựng');
            }

            // Cập nhật thống kê
            vocabulary.statistics.totalReviews += 1;
            vocabulary.statistics.lastReviewed = new Date();

            // Tính điểm trung bình
            const currentTotal = vocabulary.statistics.averageScore * (vocabulary.statistics.totalReviews - 1);
            vocabulary.statistics.averageScore = (currentTotal + score) / vocabulary.statistics.totalReviews;

            // Cập nhật mức độ thành thạo dựa trên điểm số
            if (score >= 80) {
                vocabulary.statistics.masteryLevel = Math.min(100, vocabulary.statistics.masteryLevel + 10);
            } else if (score < 60) {
                vocabulary.statistics.masteryLevel = Math.max(0, vocabulary.statistics.masteryLevel - 5);
            }

            // Cập nhật tần suất sử dụng
            vocabulary.grammar.frequency = (vocabulary.grammar.frequency || 0) + 1;

            await vocabulary.save();

            return vocabulary.statistics;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy thống kê tổng quan về kho từ vựng
     */
    static async getVocabularyStats() {
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
                        totalReviews: { $sum: '$statistics.totalReviews' },
                        averageFrequency: { $avg: '$grammar.frequency' }
                    }
                }
            ]);

            if (stats.length === 0) {
                return {
                    totalVocabularies: 0,
                    totalByCategory: {},
                    totalByHSKLevel: {},
                    totalByDifficulty: {},
                    averageMasteryLevel: 0,
                    totalReviews: 0,
                    averageFrequency: 0
                };
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

            return {
                totalVocabularies: stat.totalVocabularies,
                categoryBreakdown: categoryStats,
                hskLevelBreakdown: hskLevelStats,
                difficultyBreakdown: difficultyStats,
                averageMasteryLevel: Math.round(stat.averageMasteryLevel * 100) / 100,
                totalReviews: stat.totalReviews,
                averageFrequency: Math.round(stat.averageFrequency * 100) / 100
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy từ vựng theo cấp độ HSK với phân trang
     */
    static async getVocabulariesByHSKLevel(level, page = 1, limit = 50) {
        try {
            if (!level || level < 1 || level > 6) {
                throw new Error('Cấp độ HSK phải từ 1-6');
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const [vocabularies, total] = await Promise.all([
                Vocabulary.find({
                    hskLevel: parseInt(level),
                    isActive: true
                })
                    .select('chinese pinyin meaning.primary category difficulty examples')
                    .sort({ chinese: 1 })
                    .skip(skip)
                    .limit(parseInt(limit)),
                Vocabulary.countDocuments({
                    hskLevel: parseInt(level),
                    isActive: true
                })
            ]);

            const totalPages = Math.ceil(total / parseInt(limit));

            return {
                hskLevel: parseInt(level),
                vocabularies,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Lấy từ vựng với phân trang và lọc
     */
    static async getVocabularies(params) {
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
            } = params;

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

            return {
                vocabularies,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Xóa từ vựng (soft delete)
     */
    static async deleteVocabulary(id) {
        try {
            const vocabulary = await Vocabulary.findById(id);
            if (!vocabulary) {
                throw new Error('Không tìm thấy từ vựng để xóa');
            }

            // Soft delete - chỉ đánh dấu không hoạt động
            vocabulary.isActive = false;
            await vocabulary.save();

            return true;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Khôi phục từ vựng đã xóa
     */
    static async restoreVocabulary(id) {
        try {
            const vocabulary = await Vocabulary.findById(id);
            if (!vocabulary) {
                throw new Error('Không tìm thấy từ vựng');
            }

            vocabulary.isActive = true;
            await vocabulary.save();

            return vocabulary;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = VocabularyService;

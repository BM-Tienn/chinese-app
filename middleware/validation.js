const { body, param, query, validationResult } = require('express-validator');

// Middleware xử lý lỗi validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đầu vào không hợp lệ',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Validation cho tạo từ vựng mới
const validateCreateVocabulary = [
    body('chinese')
        .trim()
        .notEmpty()
        .withMessage('Ký tự tiếng Trung là bắt buộc')
        .isLength({ min: 1 })
        .withMessage('Ký tự tiếng Trung phải có ít nhất 1 ký tự'),

    body('pinyin')
        .trim()
        .notEmpty()
        .withMessage('Pinyin là bắt buộc'),

    body('meaning.primary')
        .trim()
        .notEmpty()
        .withMessage('Nghĩa chính là bắt buộc'),

    body('meaning.partOfSpeech')
        .optional()
        .trim()
        .isIn(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'])
        .withMessage('Loại từ không hợp lệ'),

    body('hskLevel')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Cấp độ HSK phải từ 1-6'),

    body('category')
        .optional()
        .isIn(['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'Common', 'Idiom', 'Proverb', 'Advanced', 'Other', 'Place Name', 'Person Name', 'Technical', 'Literary', 'Informal'])
        .withMessage('Danh mục không hợp lệ'),

    body('difficulty')
        .optional()
        .isIn(['Easy', 'Medium', 'Hard'])
        .withMessage('Độ khó phải là Easy, Medium hoặc Hard'),

    body('grammar.formality')
        .optional()
        .isIn(['neutral', 'formal', 'informal', 'literary'])
        .withMessage('Mức độ trang trọng không hợp lệ'),

    body('examples')
        .optional()
        .isArray()
        .withMessage('Ví dụ phải là một mảng'),

    body('examples.*.chinese')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Ví dụ tiếng Trung không được để trống'),

    body('examples.*.pinyin')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Pinyin ví dụ không được để trống'),

    body('examples.*.vietnamese')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Nghĩa tiếng Việt ví dụ không được để trống'),

    handleValidationErrors
];

// Validation cho cập nhật từ vựng
const validateUpdateVocabulary = [
    param('id')
        .isMongoId()
        .withMessage('ID từ vựng không hợp lệ'),

    body('chinese')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Ký tự tiếng Trung không được để trống')
        .isLength({ min: 1 })
        .withMessage('Ký tự tiếng Trung phải có ít nhất 1 ký tự'),

    body('pinyin')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Pinyin không được để trống'),

    body('meaning.primary')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Nghĩa chính không được để trống'),

    body('hskLevel')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Cấp độ HSK phải từ 1-6'),

    body('category')
        .optional()
        .isIn(['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'Common', 'Idiom', 'Proverb', 'Advanced', 'Other', 'Place Name', 'Person Name', 'Technical', 'Literary', 'Informal'])
        .withMessage('Danh mục không hợp lệ'),

    body('difficulty')
        .optional()
        .isIn(['Easy', 'Medium', 'Hard'])
        .withMessage('Độ khó phải là Easy, Medium hoặc Hard'),

    handleValidationErrors
];

// Validation cho tìm kiếm từ vựng
const validateSearchVocabularies = [
    query('query')
        .trim()
        .notEmpty()
        .withMessage('Truy vấn tìm kiếm là bắt buộc')
        .isLength({ min: 1, max: 100 })
        .withMessage('Truy vấn tìm kiếm phải từ 1-100 ký tự'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Giới hạn kết quả phải từ 1-100'),

    query('category')
        .optional()
        .isIn(['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'Common', 'Idiom', 'Proverb', 'Advanced', 'Other', 'Place Name', 'Person Name', 'Technical', 'Literary', 'Informal'])
        .withMessage('Danh mục không hợp lệ'),

    query('hskLevel')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Cấp độ HSK phải từ 1-6'),

    query('difficulty')
        .optional()
        .isIn(['Easy', 'Medium', 'Hard'])
        .withMessage('Độ khó phải là Easy, Medium hoặc Hard'),

    handleValidationErrors
];

// Validation cho lấy từ vựng theo HSK level
const validateGetVocabulariesByHSKLevel = [
    param('level')
        .isInt({ min: 1, max: 6 })
        .withMessage('Cấp độ HSK phải từ 1-6'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Số trang phải lớn hơn 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Giới hạn kết quả phải từ 1-100'),

    handleValidationErrors
];

// Validation cho cập nhật thống kê học tập
const validateUpdateLearningStatistics = [
    param('id')
        .isMongoId()
        .withMessage('ID từ vựng không hợp lệ'),

    body('score')
        .isFloat({ min: 0, max: 100 })
        .withMessage('Điểm số phải từ 0-100'),

    body('reviewType')
        .optional()
        .isIn(['practice', 'quiz', 'test', 'review'])
        .withMessage('Loại ôn tập không hợp lệ'),

    handleValidationErrors
];

// Validation cho lấy từ vựng ngẫu nhiên
const validateGetRandomVocabularies = [
    query('count')
        .optional()
        .isInt({ min: 1, max: 50 })
        .withMessage('Số lượng từ vựng phải từ 1-50'),

    query('category')
        .optional()
        .isIn(['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'Common', 'Idiom', 'Proverb', 'Advanced', 'Other', 'Place Name', 'Person Name', 'Technical', 'Literary', 'Informal'])
        .withMessage('Danh mục không hợp lệ'),

    query('hskLevel')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Cấp độ HSK phải từ 1-6'),

    query('difficulty')
        .optional()
        .isIn(['Easy', 'Medium', 'Hard'])
        .withMessage('Độ khó phải là Easy, Medium hoặc Hard'),

    handleValidationErrors
];

// Validation cho lấy danh sách từ vựng
const validateGetVocabularies = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Số trang phải lớn hơn 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Giới hạn kết quả phải từ 1-100'),

    query('search')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Từ khóa tìm kiếm phải từ 1-100 ký tự'),

    query('sortBy')
        .optional()
        .isIn(['chinese', 'pinyin', 'meaning.primary', 'hskLevel', 'difficulty', 'createdAt', 'updatedAt'])
        .withMessage('Trường sắp xếp không hợp lệ'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Thứ tự sắp xếp phải là asc hoặc desc'),

    handleValidationErrors
];

// Validation cho ID MongoDB
const validateMongoId = [
    param('id')
        .isMongoId()
        .withMessage('ID không hợp lệ'),

    handleValidationErrors
];

module.exports = {
    validateCreateVocabulary,
    validateUpdateVocabulary,
    validateSearchVocabularies,
    validateGetVocabulariesByHSKLevel,
    validateUpdateLearningStatistics,
    validateGetRandomVocabularies,
    validateGetVocabularies,
    validateMongoId,
    handleValidationErrors
};

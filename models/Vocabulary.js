const mongoose = require('mongoose'); // Thư viện ODM cho MongoDB

// Định nghĩa Schema cho kho từ vựng chung của ứng dụng (từ điển toàn cầu)
const vocabularySchema = new mongoose.Schema({
  chinese: {
    type: String,
    required: [true, 'Vocabulary must have Chinese characters!'], // Trường bắt buộc
    unique: true, // Đảm bảo không có mục trùng lặp trong từ vựng toàn cầu
    trim: true, // Cắt bỏ khoảng trắng
    minlength: [1, 'Chinese characters cannot be empty.'] // Tối thiểu 1 ký tự
  },
  pinyin: {
    type: String,
    required: [true, 'Vocabulary must have Pinyin!'], // Trường bắt buộc
    trim: true // Cắt bỏ khoảng trắng
  },
  vietnameseReading: {
    type: String,
    trim: true // Đọc Hán Việt của từ (nếu có)
  },
  meaning: {
    primary: {
      type: String,
      required: [true, 'Vocabulary must have a primary definition!'],
      trim: true
    },
    secondary: [String], // Các nghĩa phụ (nếu có)
    partOfSpeech: {
      type: String, // Loại từ (ví dụ: danh từ, động từ, tính từ)
      trim: true
    }
  },
  grammar: {
    level: {
      type: String, // Cấp độ ngữ pháp (ví dụ: HSK1, Advanced)
      trim: true
    },
    frequency: Number, // Tần suất sử dụng
    formality: {
      type: String, // Mức độ trang trọng (ví dụ: neutral, formal, informal, literary)
      trim: true
    }
  },
  examples: [{
    chinese: String,
    pinyin: String,
    vietnamese: String
  }],
  related: {
    synonyms: [String], // Từ đồng nghĩa
    antonyms: [String], // Từ trái nghĩa
    compounds: [String] // Các từ ghép liên quan
  },
  hskLevel: {
    type: Number,
    min: 1,
    max: 6,
    default: null // Cấp độ HSK (nếu có thể ánh xạ từ grammar.level)
  },
  category: {
    type: String,
    enum: ['HSK1', 'HSK2', 'HSK3', 'HSK4', 'HSK5', 'HSK6', 'Common', 'Idiom', 'Proverb', 'Advanced', 'Other', 'Place Name', 'Person Name', 'Technical', 'Literary', 'Informal'],
    default: 'Common'
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    source: {
      type: String,
      trim: true
    }
  },
  statistics: {
    totalReviews: {
      type: Number,
      default: 0
    },
    masteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    lastReviewed: {
      type: Date,
      default: null
    },
    averageScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  }
  // Thêm các trường khác nếu cần cho từ điển toàn cầu, ví dụ: audio links, traditional characters
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Chỉ mục (index) để tra cứu hiệu quả theo ký tự tiếng Trung
// vocabularySchema.index({ chinese: 1 }); // Đã có unique: true trong schema
vocabularySchema.index({ "meaning.primary": 1 }); // Có thể tìm kiếm theo nghĩa chính
vocabularySchema.index({ hskLevel: 1 });
vocabularySchema.index({ category: 1 });

const Vocabulary = mongoose.model('Vocabulary', vocabularySchema);

module.exports = Vocabulary;

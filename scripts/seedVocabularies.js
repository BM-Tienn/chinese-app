const mongoose = require('mongoose');
const Vocabulary = require('../models/Vocabulary');
const sampleVocabularies = require('../data/sampleVocabularies');
require('dotenv').config();

// Kết nối MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chinese-ai');
        console.log('✅ Kết nối MongoDB thành công');
    } catch (error) {
        console.error('❌ Lỗi kết nối MongoDB:', error);
        process.exit(1);
    }
};

// Seed dữ liệu từ vựng
const seedVocabularies = async () => {
    try {
        console.log('🔄 Bắt đầu seed dữ liệu từ vựng...');

        // Xóa tất cả từ vựng cũ (nếu có)
        await Vocabulary.deleteMany({});
        console.log('🗑️ Đã xóa dữ liệu từ vựng cũ');

        // Thêm từ vựng mới
        const insertedVocabularies = await Vocabulary.insertMany(sampleVocabularies);
        console.log(`✅ Đã thêm ${insertedVocabularies.length} từ vựng vào database`);

        // Hiển thị thống kê
        const stats = await Vocabulary.aggregate([
            {
                $group: {
                    _id: null,
                    totalVocabularies: { $sum: 1 },
                    totalByHSKLevel: {
                        $push: {
                            hskLevel: '$hskLevel',
                            count: 1
                        }
                    },
                    totalByCategory: {
                        $push: {
                            category: '$category',
                            count: 1
                        }
                    },
                    totalByDifficulty: {
                        $push: {
                            difficulty: '$difficulty',
                            count: 1
                        }
                    }
                }
            }
        ]);

        if (stats.length > 0) {
            const stat = stats[0];
            console.log('\n📊 Thống kê từ vựng đã thêm:');
            console.log(`   Tổng số: ${stat.totalVocabularies}`);

            // Thống kê theo HSK level
            const hskStats = {};
            stat.totalByHSKLevel.forEach(item => {
                if (item.hskLevel) {
                    hskStats[`HSK${item.hskLevel}`] = (hskStats[`HSK${item.hskLevel}`] || 0) + item.count;
                }
            });
            console.log('   Theo HSK level:', hskStats);

            // Thống kê theo category
            const categoryStats = {};
            stat.totalByCategory.forEach(item => {
                categoryStats[item.category] = (categoryStats[item.category] || 0) + item.count;
            });
            console.log('   Theo danh mục:', categoryStats);

            // Thống kê theo difficulty
            const difficultyStats = {};
            stat.totalByDifficulty.forEach(item => {
                difficultyStats[item.difficulty] = (difficultyStats[item.difficulty] || 0) + item.count;
            });
            console.log('   Theo độ khó:', difficultyStats);
        }

        console.log('\n🎉 Seed dữ liệu từ vựng hoàn tất!');

    } catch (error) {
        console.error('❌ Lỗi khi seed dữ liệu:', error);
    } finally {
        // Đóng kết nối
        await mongoose.connection.close();
        console.log('🔌 Đã đóng kết nối MongoDB');
        process.exit(0);
    }
};

// Chạy script
const runSeed = async () => {
    try {
        await connectDB();
        await seedVocabularies();
    } catch (error) {
        console.error('❌ Lỗi chạy script seed:', error);
        process.exit(1);
    }
};

// Chạy nếu file được gọi trực tiếp
if (require.main === module) {
    runSeed();
}

module.exports = { runSeed };

const Vocabulary = require('../models/Vocabulary');
const Exercise = require('../models/Exercise');
const PersonalVocabulary = require('../models/PersonalVocabulary');
const UserProgress = require('../models/UserProgress');
const AIInteraction = require('../models/AIInteraction');

/**
 * Service để xử lý các task tự động sau khi AI phân tích xong
 */
class AutoTaskService {

    /**
     * Xử lý task tự động sau khi phân tích hình ảnh
     * @param {Object} aiResult - Kết quả từ AI
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async processImageAnalysisResult(aiResult, metadata = {}) {
        const startTime = Date.now();
        const results = {
            vocabulary: { created: 0, updated: 0, errors: 0 },
            exercises: { created: 0, updated: 0, errors: 0 },
            personalVocabulary: { created: 0, updated: 0, errors: 0 },
            userProgress: { updated: false, errors: 0 }
        };

        try {
            console.log('Bắt đầu xử lý task tự động cho kết quả phân tích hình ảnh...');

            // 1. Xử lý từ vựng
            if (aiResult.vocabulary && Array.isArray(aiResult.vocabulary)) {
                const vocabResults = await this.processVocabulary(aiResult.vocabulary, metadata);
                results.vocabulary = vocabResults;
            }

            // 2. Xử lý ngữ pháp (nếu có)
            if (aiResult.grammar && Array.isArray(aiResult.grammar)) {
                const grammarResults = await this.processGrammar(aiResult.grammar, metadata);
                results.exercises.created += grammarResults.created;
                results.exercises.errors += grammarResults.errors;
            }

            // 3. Tạo bài tập từ từ vựng và ngữ pháp
            if (aiResult.vocabulary || aiResult.grammar) {
                const exerciseResults = await this.generateExercisesFromContent(aiResult, metadata);
                results.exercises.created += exerciseResults.created;
                results.exercises.errors += exerciseResults.errors;
            }

            // 4. Cập nhật tiến độ người dùng
            if (metadata.userId) {
                const progressResults = await this.updateUserProgress(metadata.userId, results);
                results.userProgress = progressResults;
            }

            const processingTime = Date.now() - startTime;
            console.log(`Hoàn thành xử lý task tự động trong ${processingTime}ms:`, results);

            return {
                success: true,
                results,
                processingTime,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Lỗi khi xử lý task tự động:', error);
            return {
                success: false,
                error: error.message,
                results,
                timestamp: new Date()
            };
        }
    }

    /**
     * Xử lý từ vựng - lưu vào database chung và cá nhân
     * @param {Array} vocabularyList - Danh sách từ vựng
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async processVocabulary(vocabularyList, metadata = {}) {
        const results = { created: 0, updated: 0, errors: 0 };
        const processedWords = [];

        for (const vocab of vocabularyList) {
            try {
                if (!vocab.hanzi || !vocab.pinyin || !vocab.meaning) {
                    console.warn('Từ vựng thiếu thông tin bắt buộc:', vocab);
                    continue;
                }

                // 1. Lưu vào Vocabulary database chung
                const vocabResult = await this.saveOrUpdateVocabulary(vocab, metadata);
                if (vocabResult.success) {
                    processedWords.push(vocabResult.data);
                    if (vocabResult.isNew) {
                        results.created++;
                    } else {
                        results.updated++;
                    }
                }

                // 2. Lưu vào PersonalVocabulary nếu có userId
                if (metadata.userId) {
                    const personalResult = await this.saveOrUpdatePersonalVocabulary(
                        vocab,
                        metadata.userId,
                        metadata
                    );
                    if (personalResult.success) {
                        if (personalResult.isNew) {
                            results.created++;
                        } else {
                            results.updated++;
                        }
                    }
                }

            } catch (error) {
                console.error('Lỗi khi xử lý từ vựng:', vocab, error);
                results.errors++;
            }
        }

        return results;
    }

    /**
     * Lưu hoặc cập nhật từ vựng trong database chung
     * @param {Object} vocab - Thông tin từ vựng
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async saveOrUpdateVocabulary(vocab, metadata = {}) {
        try {
            // Tìm từ vựng đã tồn tại
            let existingVocab = await Vocabulary.findOne({ chinese: vocab.hanzi });

            if (existingVocab) {
                // Cập nhật thông tin nếu cần
                const updated = await Vocabulary.findByIdAndUpdate(
                    existingVocab._id,
                    {
                        $set: {
                            pinyin: vocab.pinyin,
                            'meaning.primary': vocab.meaning,
                            updatedAt: new Date()
                        },
                        $addToSet: {
                            tags: { $each: metadata.tags || [] }
                        }
                    },
                    { new: true }
                );

                return {
                    success: true,
                    data: updated,
                    isNew: false
                };
            } else {
                // Tạo từ vựng mới
                const newVocab = new Vocabulary({
                    chinese: vocab.hanzi,
                    pinyin: vocab.pinyin,
                    meaning: {
                        primary: vocab.meaning,
                        partOfSpeech: vocab.partOfSpeech || 'Unknown'
                    },
                    examples: vocab.examples || [],
                    category: metadata.category || 'Common',
                    difficulty: metadata.difficulty || 'Medium',
                    hskLevel: metadata.hskLevel || null,
                    tags: metadata.tags || ['AI Generated'],
                    metadata: {
                        source: 'AI Generated',
                        aiModel: metadata.aiModel || 'gemini-2.5-flash-preview-05-20',
                        sessionId: metadata.sessionId
                    }
                });

                const savedVocab = await newVocab.save();
                return {
                    success: true,
                    data: savedVocab,
                    isNew: true
                };
            }
        } catch (error) {
            console.error('Lỗi khi lưu/cập nhật từ vựng:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Lưu hoặc cập nhật từ vựng cá nhân
     * @param {Object} vocab - Thông tin từ vựng
     * @param {String} userId - ID người dùng
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async saveOrUpdatePersonalVocabulary(vocab, userId, metadata = {}) {
        try {
            // Tìm từ vựng cá nhân đã tồn tại
            let existingPersonal = await PersonalVocabulary.findOne({
                userId: userId,
                hanzi: vocab.hanzi
            });

            if (existingPersonal) {
                // Cập nhật thông tin
                const updated = await PersonalVocabulary.findByIdAndUpdate(
                    existingPersonal._id,
                    {
                        $set: {
                            pinyin: vocab.pinyin,
                            meaning: vocab.meaning,
                            updatedAt: new Date()
                        },
                        $addToSet: {
                            tags: { $each: metadata.tags || [] }
                        }
                    },
                    { new: true }
                );

                return {
                    success: true,
                    data: updated,
                    isNew: false
                };
            } else {
                // Tạo từ vựng cá nhân mới
                const newPersonal = new PersonalVocabulary({
                    userId: userId,
                    hanzi: vocab.hanzi,
                    pinyin: vocab.pinyin,
                    meaning: vocab.meaning,
                    masteryLevel: 1, // Bắt đầu từ level 1
                    studyStatus: 'new',
                    priority: 'medium',
                    tags: metadata.tags || ['AI Generated', 'Image Analysis'],
                    notes: `Tự động thêm từ phân tích hình ảnh - ${new Date().toLocaleDateString('vi-VN')}`,
                    studyHistory: [{
                        date: new Date(),
                        action: 'added',
                        notes: 'Tự động thêm từ phân tích hình ảnh'
                    }]
                });

                const savedPersonal = await newPersonal.save();
                return {
                    success: true,
                    data: savedPersonal,
                    isNew: true
                };
            }
        } catch (error) {
            console.error('Lỗi khi lưu/cập nhật từ vựng cá nhân:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Xử lý ngữ pháp - tạo bài tập ngữ pháp
     * @param {Array} grammarList - Danh sách điểm ngữ pháp
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async processGrammar(grammarList, metadata = {}) {
        const results = { created: 0, errors: 0 };

        for (const grammar of grammarList) {
            try {
                if (!grammar.point || !grammar.explanation) {
                    continue;
                }

                // Tạo bài tập ngữ pháp
                const exercise = new Exercise({
                    title: `Ngữ pháp: ${grammar.point}`,
                    type: 'grammar',
                    question: `Hãy giải thích về: ${grammar.point}`,
                    correctAnswer: grammar.explanation,
                    explanation: grammar.explanation,
                    grammar: [grammar],
                    difficulty: metadata.difficulty || 'Medium',
                    category: 'Grammar',
                    source: 'AI Generated',
                    aiModel: metadata.aiModel || 'gemini-2.5-flash-preview-05-20',
                    sessionId: metadata.sessionId,
                    userId: metadata.userId,
                    tags: ['grammar', 'AI Generated', 'Image Analysis']
                });

                await exercise.save();
                results.created++;

            } catch (error) {
                console.error('Lỗi khi tạo bài tập ngữ pháp:', error);
                results.errors++;
            }
        }

        return results;
    }

    /**
     * Tạo bài tập từ nội dung phân tích
     * @param {Object} aiResult - Kết quả từ AI
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async generateExercisesFromContent(aiResult, metadata = {}) {
        const results = { created: 0, errors: 0 };

        try {
            // Tạo bài tập trắc nghiệm từ vựng
            if (aiResult.vocabulary && aiResult.vocabulary.length > 0) {
                const vocabExercise = await this.createVocabularyExercise(aiResult.vocabulary, metadata);
                if (vocabExercise) {
                    results.created++;
                }
            }

            // Tạo bài tập điền từ vào chỗ trống
            if (aiResult.exampleParagraph) {
                const fillBlankExercise = await this.createFillBlankExercise(aiResult, metadata);
                if (fillBlankExercise) {
                    results.created++;
                }
            }

        } catch (error) {
            console.error('Lỗi khi tạo bài tập từ nội dung:', error);
            results.errors++;
        }

        return results;
    }

    /**
     * Tạo bài tập trắc nghiệm từ vựng
     * @param {Array} vocabulary - Danh sách từ vựng
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object|null} - Bài tập được tạo hoặc null
     */
    static async createVocabularyExercise(vocabulary, metadata = {}) {
        try {
            if (vocabulary.length < 2) return null;

            // Chọn từ vựng ngẫu nhiên làm câu hỏi
            const questionWord = vocabulary[Math.floor(Math.random() * vocabulary.length)];
            const otherWords = vocabulary.filter(v => v.hanzi !== questionWord.hanzi);

            // Tạo các lựa chọn
            const options = [questionWord.meaning];
            while (options.length < 4 && otherWords.length > 0) {
                const randomWord = otherWords.splice(Math.floor(Math.random() * otherWords.length), 1)[0];
                if (randomWord && !options.includes(randomWord.meaning)) {
                    options.push(randomWord.meaning);
                }
            }

            // Xáo trộn thứ tự các lựa chọn
            const shuffledOptions = options.sort(() => Math.random() - 0.5);

            const exercise = new Exercise({
                title: `Từ vựng: ${questionWord.hanzi}`,
                type: 'multipleChoice',
                question: `Nghĩa của từ "${questionWord.hanzi}" (${questionWord.pinyin}) là gì?`,
                options: shuffledOptions,
                correctAnswer: questionWord.meaning,
                explanation: `Từ "${questionWord.hanzi}" có nghĩa là "${questionWord.meaning}"`,
                vocabulary: [questionWord],
                difficulty: metadata.difficulty || 'Medium',
                category: 'Vocabulary',
                source: 'AI Generated',
                aiModel: metadata.aiModel || 'gemini-2.5-flash-preview-05-20',
                sessionId: metadata.sessionId,
                userId: metadata.userId,
                tags: ['vocabulary', 'multiple-choice', 'AI Generated', 'Image Analysis']
            });

            return await exercise.save();

        } catch (error) {
            console.error('Lỗi khi tạo bài tập từ vựng:', error);
            return null;
        }
    }

    /**
     * Tạo bài tập điền từ vào chỗ trống
     * @param {Object} aiResult - Kết quả từ AI
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object|null} - Bài tập được tạo hoặc null
     */
    static async createFillBlankExercise(aiResult, metadata = {}) {
        try {
            if (!aiResult.exampleParagraph || !aiResult.vocabulary || aiResult.vocabulary.length === 0) {
                return null;
            }

            // Chọn từ vựng để tạo bài tập điền từ
            const targetWord = aiResult.vocabulary[Math.floor(Math.random() * aiResult.vocabulary.length)];

            // Tạo câu hỏi bằng cách thay thế từ vựng bằng dấu gạch dưới
            const question = aiResult.exampleParagraph.replace(
                new RegExp(targetWord.hanzi, 'g'),
                '_____'
            );

            const exercise = new Exercise({
                title: `Điền từ vào chỗ trống: ${targetWord.hanzi}`,
                type: 'fillInTheBlank',
                question: `Điền từ thích hợp vào chỗ trống trong câu sau:\n\n${question}`,
                correctAnswer: targetWord.hanzi,
                explanation: `Từ cần điền là "${targetWord.hanzi}" có nghĩa là "${targetWord.meaning}"`,
                vocabulary: [targetWord],
                difficulty: metadata.difficulty || 'Medium',
                category: 'Reading',
                source: 'AI Generated',
                aiModel: metadata.aiModel || 'gemini-2.5-flash-preview-05-20',
                sessionId: metadata.sessionId,
                userId: metadata.userId,
                tags: ['fill-blank', 'reading', 'AI Generated', 'Image Analysis']
            });

            return await exercise.save();

        } catch (error) {
            console.error('Lỗi khi tạo bài tập điền từ:', error);
            return null;
        }
    }

    /**
     * Cập nhật tiến độ người dùng
     * @param {String} userId - ID người dùng
     * @param {Object} results - Kết quả xử lý
     * @returns {Object} - Kết quả cập nhật
     */
    static async updateUserProgress(userId, results) {
        try {
            const userProgress = await UserProgress.findOne({ userId });

            if (!userProgress) {
                // Tạo tiến độ mới nếu chưa có
                const newProgress = new UserProgress({
                    userId: userId,
                    totalWords: results.vocabulary.created + results.vocabulary.updated,
                    studyStats: {
                        totalStudyTime: 0,
                        totalSessions: 1
                    }
                });
                await newProgress.save();
                return { updated: true, errors: 0 };
            }

            // Cập nhật tiến độ hiện tại
            const updateData = {
                totalWords: userProgress.totalWords + results.vocabulary.created,
                lastStudyDate: new Date(),
                'studyStats.totalSessions': userProgress.studyStats.totalSessions + 1
            };

            // Cập nhật tiến độ tuần
            const currentWeek = this.getCurrentWeek();
            const weekIndex = userProgress.weeklyProgress.findIndex(w => w.week === currentWeek);

            if (weekIndex >= 0) {
                updateData[`weeklyProgress.${weekIndex}.wordsLearned`] =
                    userProgress.weeklyProgress[weekIndex].wordsLearned + results.vocabulary.created;
            } else {
                updateData.$push = {
                    weeklyProgress: {
                        week: currentWeek,
                        wordsLearned: results.vocabulary.created,
                        exercisesCompleted: results.exercises.created,
                        timeSpent: 0,
                        accuracy: 0,
                        streakDays: 1
                    }
                };
            }

            await UserProgress.findByIdAndUpdate(userId, updateData);
            return { updated: true, errors: 0 };

        } catch (error) {
            console.error('Lỗi khi cập nhật tiến độ người dùng:', error);
            return { updated: false, errors: 1 };
        }
    }

    /**
     * Lấy tuần hiện tại theo format YYYY-WW
     * @returns {String} - Tuần hiện tại
     */
    static getCurrentWeek() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil(days / 7);
        return `${now.getFullYear()}-${weekNumber.toString().padStart(2, '0')}`;
    }

    /**
     * Xử lý task tự động sau khi tạo bài tập
     * @param {Array} exerciseData - Dữ liệu bài tập được tạo
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async processGeneratedExercises(exerciseData, metadata = {}) {
        const results = { created: 0, updated: 0, errors: 0 };

        try {
            console.log('Bắt đầu xử lý task tự động cho bài tập được tạo...');

            if (!Array.isArray(exerciseData)) {
                console.warn('Dữ liệu bài tập không phải array:', exerciseData);
                return { success: false, error: 'Dữ liệu bài tập không hợp lệ' };
            }

            for (const exercise of exerciseData) {
                try {
                    if (!exercise.question || !exercise.answer) {
                        console.warn('Bài tập thiếu thông tin bắt buộc:', exercise);
                        continue;
                    }

                    // Tạo bài tập mới
                    const newExercise = new Exercise({
                        title: exercise.title || `Bài tập: ${exercise.question.substring(0, 50)}...`,
                        type: exercise.type || 'multipleChoice',
                        question: exercise.question,
                        options: exercise.options || [],
                        correctAnswer: exercise.answer,
                        explanation: exercise.explanation || exercise.suggestedAnswer || '',
                        vocabulary: exercise.vocabulary || [],
                        grammar: exercise.grammar || [],
                        difficulty: metadata.difficulty || 'Medium',
                        category: metadata.category || 'Mixed',
                        source: 'AI Generated',
                        aiModel: metadata.aiModel || 'gemini-2.5-flash-preview-05-20',
                        sessionId: metadata.sessionId,
                        userId: metadata.userId,
                        tags: [...(metadata.tags || []), 'AI Generated', 'Exercise Generation']
                    });

                    await newExercise.save();
                    results.created++;

                } catch (error) {
                    console.error('Lỗi khi tạo bài tập:', exercise, error);
                    results.errors++;
                }
            }

            return {
                success: true,
                results,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Lỗi khi xử lý task tự động cho bài tập:', error);
            return {
                success: false,
                error: error.message,
                results,
                timestamp: new Date()
            };
        }
    }

    /**
     * Xử lý task tự động sau khi phân tích chi tiết từ vựng
     * @param {Object} aiResult - Kết quả từ AI
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async processWordDetailsResult(aiResult, metadata = {}) {
        try {
            console.log('Bắt đầu xử lý task tự động cho kết quả phân tích chi tiết từ vựng...');

            const results = {
                vocabulary: { updated: 0, errors: 0 },
                exercises: { created: 0, errors: 0 }
            };

            // Cập nhật thông tin từ vựng nếu có
            if (aiResult.word && aiResult.details) {
                const vocabResult = await this.updateVocabularyWithDetails(aiResult.word, aiResult.details, metadata);
                if (vocabResult.success) {
                    results.vocabulary.updated++;
                } else {
                    results.vocabulary.errors++;
                }
            }

            // Tạo bài tập từ thông tin chi tiết
            if (aiResult.examples && aiResult.examples.length > 0) {
                const exerciseResult = await this.createExercisesFromWordDetails(aiResult, metadata);
                results.exercises.created += exerciseResult.created;
                results.exercises.errors += exerciseResult.errors;
            }

            return {
                success: true,
                results,
                timestamp: new Date()
            };

        } catch (error) {
            console.error('Lỗi khi xử lý task tự động cho từ vựng chi tiết:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }

    /**
     * Cập nhật từ vựng với thông tin chi tiết
     * @param {String} word - Từ vựng
     * @param {Object} details - Thông tin chi tiết
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async updateVocabularyWithDetails(word, details, metadata = {}) {
        try {
            const existingVocab = await Vocabulary.findOne({ chinese: word });

            if (!existingVocab) {
                return { success: false, error: 'Không tìm thấy từ vựng' };
            }

            const updateData = {};

            if (details.grammar) updateData.grammar = details.grammar;
            if (details.examples) updateData.examples = details.examples;
            if (details.related) updateData.related = details.related;
            if (details.hskLevel) updateData.hskLevel = details.hskLevel;
            if (details.difficulty) updateData.difficulty = details.difficulty;

            const updated = await Vocabulary.findByIdAndUpdate(
                existingVocab._id,
                { $set: updateData },
                { new: true }
            );

            return { success: true, data: updated };

        } catch (error) {
            console.error('Lỗi khi cập nhật từ vựng với thông tin chi tiết:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Tạo bài tập từ thông tin chi tiết từ vựng
     * @param {Object} aiResult - Kết quả từ AI
     * @param {Object} metadata - Thông tin bổ sung
     * @returns {Object} - Kết quả xử lý
     */
    static async createExercisesFromWordDetails(aiResult, metadata = {}) {
        const results = { created: 0, errors: 0 };

        try {
            if (aiResult.examples && aiResult.examples.length > 0) {
                for (const example of aiResult.examples) {
                    if (example.chinese && example.vietnamese) {
                        const exercise = new Exercise({
                            title: `Ví dụ sử dụng: ${aiResult.word}`,
                            type: 'sentenceBuilding',
                            question: `Hãy dịch câu sau sang tiếng Việt:\n\n${example.chinese}`,
                            correctAnswer: example.vietnamese,
                            explanation: `Câu này có nghĩa là: "${example.vietnamese}"`,
                            vocabulary: [{ hanzi: aiResult.word, pinyin: aiResult.pinyin || '', meaning: aiResult.meaning || '' }],
                            difficulty: metadata.difficulty || 'Medium',
                            category: 'Reading',
                            source: 'AI Generated',
                            aiModel: metadata.aiModel || 'gemini-2.5-flash-preview-05-20',
                            sessionId: metadata.sessionId,
                            userId: metadata.userId,
                            tags: ['sentence-building', 'reading', 'AI Generated', 'Word Details']
                        });

                        await exercise.save();
                        results.created++;
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi khi tạo bài tập từ thông tin chi tiết:', error);
            results.errors++;
        }

        return results;
    }
}

module.exports = AutoTaskService;

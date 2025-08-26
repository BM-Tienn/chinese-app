const dataPreviewService = {
    /**
     * Xử lý preview cho kết quả phân tích hình ảnh
     */
    formatImageAnalysisPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'image_analysis',
                title: 'Phân tích hình ảnh',
                sections: []
            };

            // Xử lý lesson request
            if (data.lessonRequest) {
                preview.sections.push({
                    title: 'Yêu cầu bài học',
                    content: data.lessonRequest,
                    type: 'text'
                });
            }

            // Xử lý từ vựng
            if (data.vocabulary && Array.isArray(data.vocabulary)) {
                const vocabContent = data.vocabulary.map(word =>
                    `${word.hanzi} (${word.pinyin}) - ${word.meaning}`
                ).join('\n');

                preview.sections.push({
                    title: `Từ vựng (${data.vocabulary.length} từ)`,
                    content: vocabContent,
                    type: 'vocabulary_list'
                });
            }

            // Xử lý ngữ pháp
            if (data.grammar && Array.isArray(data.grammar)) {
                const grammarContent = data.grammar.map(item =>
                    `${item.point}: ${item.explanation}\nVí dụ: ${item.example}`
                ).join('\n\n');

                preview.sections.push({
                    title: `Ngữ pháp (${data.grammar.length} điểm)`,
                    content: grammarContent,
                    type: 'grammar_list'
                });
            }

            // Xử lý đoạn văn mẫu
            if (data.exampleParagraph) {
                preview.sections.push({
                    title: 'Đoạn văn mẫu',
                    content: data.exampleParagraph,
                    type: 'paragraph'
                });
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu phân tích hình ảnh' };
        }
    },

    /**
     * Xử lý preview cho AI interaction tổng quát
     */
    formatAIInteractionPreview(interaction) {
        if (!interaction || typeof interaction !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const { endpoint, requestPayload, responseData } = interaction;

            // Xử lý theo từng loại endpoint
            switch (endpoint) {
                case 'analyzeImage':
                    return this.formatImageAnalysisPreview(responseData);
                case 'generateExercises':
                    return this.formatExercisesPreview(responseData);
                case 'analyzeWordDetails':
                    return this.formatWordAnalysisPreview(responseData);
                case 'analyzePronunciation':
                    return this.formatPronunciationPreview(responseData);
                default:
                    return this.formatGenericPreview(responseData);
            }
        } catch (error) {
            console.error('Error in formatAIInteractionPreview:', error);
            return { type: 'error', content: 'Lỗi xử lý preview dữ liệu' };
        }
    },

    /**
     * Xử lý preview cho bài tập được tạo
     */
    formatExercisesPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'exercises',
                title: 'Bài tập được tạo',
                sections: []
            };

            // Xử lý các loại bài tập khác nhau
            if (data.exercises && Array.isArray(data.exercises)) {
                const exerciseTypes = {};

                data.exercises.forEach(exercise => {
                    const type = exercise.type || 'unknown';
                    if (!exerciseTypes[type]) {
                        exerciseTypes[type] = [];
                    }
                    exerciseTypes[type].push(exercise);
                });

                Object.entries(exerciseTypes).forEach(([type, exercises]) => {
                    const typeLabel = this.getExerciseTypeLabel(type);
                    const content = exercises.map(ex =>
                        `Q: ${ex.question}\nA: ${ex.answer || ex.correctAnswer || 'N/A'}`
                    ).join('\n\n');

                    preview.sections.push({
                        title: `${typeLabel} (${exercises.length} bài)`,
                        content: content,
                        type: 'exercise_list'
                    });
                });
            }

            // Xử lý bài tập theo cấu trúc cũ
            if (data.multipleChoice && Array.isArray(data.multipleChoice)) {
                const content = data.multipleChoice.map(ex =>
                    `Q: ${ex.question}\nA: ${ex.answer}`
                ).join('\n\n');

                preview.sections.push({
                    title: `Trắc nghiệm (${data.multipleChoice.length} bài)`,
                    content: content,
                    type: 'exercise_list'
                });
            }

            if (data.fillInTheBlank && Array.isArray(data.fillInTheBlank)) {
                const content = data.fillInTheBlank.map(ex =>
                    `Q: ${ex.question}\nA: ${ex.answer}`
                ).join('\n\n');

                preview.sections.push({
                    title: `Điền từ (${data.fillInTheBlank.length} bài)`,
                    content: content,
                    type: 'exercise_list'
                });
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu bài tập' };
        }
    },

    /**
     * Xử lý preview cho phân tích từ vựng chi tiết
     */
    formatWordDetailsPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'word_details',
                title: 'Phân tích từ vựng chi tiết',
                sections: []
            };

            // Thông tin cơ bản
            if (data.word) {
                preview.sections.push({
                    title: 'Từ vựng',
                    content: data.word,
                    type: 'word'
                });
            }

            if (data.pinyin) {
                preview.sections.push({
                    title: 'Phiên âm',
                    content: data.pinyin,
                    type: 'pinyin'
                });
            }

            if (data.meaning) {
                preview.sections.push({
                    title: 'Nghĩa',
                    content: data.meaning,
                    type: 'meaning'
                });
            }

            // Thông tin chi tiết
            if (data.details) {
                if (data.details.grammar) {
                    preview.sections.push({
                        title: 'Ngữ pháp',
                        content: data.details.grammar,
                        type: 'grammar'
                    });
                }

                if (data.details.examples && Array.isArray(data.details.examples)) {
                    const examplesContent = data.details.examples.map(ex =>
                        `${ex.chinese} - ${ex.vietnamese}`
                    ).join('\n');

                    preview.sections.push({
                        title: 'Ví dụ',
                        content: examplesContent,
                        type: 'examples'
                    });
                }

                if (data.details.related) {
                    if (data.details.related.synonyms && data.details.related.synonyms.length > 0) {
                        preview.sections.push({
                            title: 'Từ đồng nghĩa',
                            content: data.details.related.synonyms.join(', '),
                            type: 'synonyms'
                        });
                    }

                    if (data.details.related.antonyms && data.details.related.antonyms.length > 0) {
                        preview.sections.push({
                            title: 'Từ trái nghĩa',
                            content: data.details.related.antonyms.join(', '),
                            type: 'antonyms'
                        });
                    }
                }
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu từ vựng chi tiết' };
        }
    },

    /**
     * Xử lý preview cho phân tích phát âm
     */
    formatPronunciationPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'pronunciation',
                title: 'Phân tích phát âm',
                sections: []
            };

            if (data.word) {
                preview.sections.push({
                    title: 'Từ vựng',
                    content: data.word,
                    type: 'word'
                });
            }

            if (data.pinyin) {
                preview.sections.push({
                    title: 'Phiên âm',
                    content: data.pinyin,
                    type: 'pinyin'
                });
            }

            if (data.tone) {
                preview.sections.push({
                    title: 'Thanh điệu',
                    content: data.tone,
                    type: 'tone'
                });
            }

            if (data.pronunciation) {
                preview.sections.push({
                    title: 'Hướng dẫn phát âm',
                    content: data.pronunciation,
                    type: 'pronunciation_guide'
                });
            }

            if (data.commonMistakes && Array.isArray(data.commonMistakes)) {
                preview.sections.push({
                    title: 'Lỗi thường gặp',
                    content: data.commonMistakes.join('\n'),
                    type: 'mistakes'
                });
            }

            if (data.practiceTips && Array.isArray(data.practiceTips)) {
                preview.sections.push({
                    title: 'Mẹo luyện tập',
                    content: data.practiceTips.join('\n'),
                    type: 'tips'
                });
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu phát âm' };
        }
    },

    /**
     * Xử lý preview cho request payload
     */
    formatRequestPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'request',
                title: 'Yêu cầu gửi đi',
                sections: []
            };

            // Xử lý contents array
            if (data.contents && Array.isArray(data.contents)) {
                data.contents.forEach((content, index) => {
                    if (content.parts && Array.isArray(content.parts)) {
                        content.parts.forEach((part, partIndex) => {
                            if (part.text) {
                                preview.sections.push({
                                    title: `Prompt ${index + 1}.${partIndex + 1}`,
                                    content: part.text,
                                    type: 'text'
                                });
                            } else if (part.inlineData) {
                                preview.sections.push({
                                    title: `Dữ liệu ${index + 1}.${partIndex + 1}`,
                                    content: `Loại: ${part.inlineData.mimeType || 'unknown'}\nKích thước: ${part.inlineData.data ? part.inlineData.data.length : 0} ký tự`,
                                    type: 'data_info'
                                });
                            }
                        });
                    }
                });
            }

            // Xử lý các trường khác
            if (data.topic) {
                preview.sections.push({
                    title: 'Chủ đề',
                    content: data.topic,
                    type: 'topic'
                });
            }

            if (data.difficulty) {
                preview.sections.push({
                    title: 'Độ khó',
                    content: data.difficulty,
                    type: 'difficulty'
                });
            }

            if (data.count) {
                preview.sections.push({
                    title: 'Số lượng',
                    content: data.count.toString(),
                    type: 'count'
                });
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu request' };
        }
    },

    /**
     * Xử lý preview tổng quát dựa trên endpoint
     */
    formatGeneralPreview(data, endpoint) {
        switch (endpoint) {
            case 'analyzeImage':
                return this.formatImageAnalysisPreview(data);
            case 'generateExercises':
                return this.formatExercisesPreview(data);
            case 'analyzeWordDetails':
                return this.formatWordDetailsPreview(data);
            case 'analyzePronunciation':
                return this.formatPronunciationPreview(data);
            default:
                return { type: 'unknown', content: 'Không hỗ trợ endpoint này' };
        }
    },

    /**
     * Lấy nhãn cho loại bài tập
     */
    getExerciseTypeLabel(type) {
        const labels = {
            'multipleChoice': 'Trắc nghiệm',
            'selectPinyin': 'Chọn phiên âm',
            'findTheMistake': 'Tìm lỗi',
            'fillInTheBlank': 'Điền từ',
            'sentenceBuilding': 'Xây dựng câu',
            'pronunciation': 'Phát âm',
            'grammar': 'Ngữ pháp',
            'translation': 'Dịch thuật'
        };
        return labels[type] || type;
    },

    /**
     * Xử lý preview cho phân tích từ vựng
     */
    formatWordDetailsPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'word_analysis',
                title: 'Phân tích từ vựng',
                sections: []
            };

            // Xử lý parsedResult nếu có
            if (data.parsedResult && typeof data.parsedResult === 'object') {
                const parsed = data.parsedResult;

                if (parsed.word) {
                    preview.sections.push({
                        title: 'Từ vựng',
                        content: `${parsed.word} (${parsed.pinyin || 'N/A'}) - ${parsed.meaning || 'N/A'}`,
                        type: 'word_info'
                    });
                }

                if (parsed.examples && Array.isArray(parsed.examples)) {
                    const examplesContent = parsed.examples.map(ex =>
                        `${ex.sentence || ex} - ${ex.translation || ex.pinyin || 'N/A'}`
                    ).join('\n');

                    preview.sections.push({
                        title: `Ví dụ (${parsed.examples.length} câu)`,
                        content: examplesContent,
                        type: 'examples_list'
                    });
                }

                if (parsed.synonyms && Array.isArray(parsed.synonyms)) {
                    preview.sections.push({
                        title: 'Từ đồng nghĩa',
                        content: parsed.synonyms.join(', '),
                        type: 'synonyms_list'
                    });
                }

                if (parsed.antonyms && Array.isArray(parsed.antonyms)) {
                    preview.sections.push({
                        title: 'Từ trái nghĩa',
                        content: parsed.antonyms.join(', '),
                        type: 'antonyms_list'
                    });
                }
            }

            // Fallback: xử lý dữ liệu gốc nếu parsedResult không có
            if (preview.sections.length === 0) {
                if (data.word) {
                    preview.sections.push({
                        title: 'Từ vựng',
                        content: data.word,
                        type: 'word_info'
                    });
                }

                if (data.meaning) {
                    preview.sections.push({
                        title: 'Nghĩa',
                        content: data.meaning,
                        type: 'meaning'
                    });
                }
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu phân tích từ vựng' };
        }
    },

    /**
     * Xử lý preview cho phân tích phát âm
     */
    formatPronunciationPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'pronunciation_analysis',
                title: 'Phân tích phát âm',
                sections: []
            };

            if (data.word) {
                preview.sections.push({
                    title: 'Từ vựng',
                    content: data.word,
                    type: 'word_info'
                });
            }

            if (data.pronunciation) {
                preview.sections.push({
                    title: 'Hướng dẫn phát âm',
                    content: data.pronunciation,
                    type: 'pronunciation_guide'
                });
            }

            if (data.practiceTips && Array.isArray(data.practiceTips)) {
                preview.sections.push({
                    title: 'Mẹo luyện tập',
                    content: data.practiceTips.join('\n'),
                    type: 'practice_tips'
                });
            }

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu phân tích phát âm' };
        }
    },

    /**
     * Xử lý preview tổng quát
     */
    formatGenericPreview(data) {
        if (!data || typeof data !== 'object') {
            return { type: 'unknown', content: 'Không có dữ liệu' };
        }

        try {
            const preview = {
                type: 'generic',
                title: 'Dữ liệu AI',
                sections: []
            };

            // Hiển thị các trường cơ bản
            Object.entries(data).forEach(([key, value]) => {
                if (value && typeof value !== 'function' && key !== '__v') {
                    let content = '';
                    if (Array.isArray(value)) {
                        content = `${value.length} mục`;
                    } else if (typeof value === 'object') {
                        content = 'Dữ liệu phức tạp';
                    } else {
                        content = String(value);
                    }

                    preview.sections.push({
                        title: key.charAt(0).toUpperCase() + key.slice(1),
                        content: content,
                        type: 'generic_field'
                    });
                }
            });

            return preview;
        } catch (error) {
            return { type: 'error', content: 'Lỗi xử lý dữ liệu tổng quát' };
        }
    },

    /**
     * Xử lý preview cho AI interaction
     */
    formatAIInteractionPreview(interaction) {
        try {
            const requestPreview = this.formatRequestPreview(interaction.requestPayload);
            const responsePreview = this.formatGeneralPreview(interaction.responseData, interaction.endpoint);

            return {
                request: requestPreview,
                response: responsePreview,
                metadata: {
                    endpoint: interaction.endpoint,
                    aiModel: interaction.aiModel,
                    responseTime: interaction.responseTime,
                    status: interaction.status,
                    timestamp: interaction.responseTimestamp
                }
            };
        } catch (error) {
            return {
                request: { type: 'error', content: 'Lỗi xử lý request' },
                response: { type: 'error', content: 'Lỗi xử lý response' },
                metadata: {}
            };
        }
    }
};

module.exports = dataPreviewService;

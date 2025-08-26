const axios = require('axios');
const AIInteraction = require('../models/AIInteraction');
const config = require('../config/config');
const AutoTaskService = require('./autoTaskService');

// Tạo instance axios cho Gemini API
const geminiClient = axios.create({
    baseURL: config.geminiApiBaseUrl,
    timeout: config.geminiApiTimeout,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor để thêm API key
geminiClient.interceptors.request.use(requestConfig => {
    // Kiểm tra và log API key để debug
    console.log('API Key check:', {
        hasKey: !!config.geminiApiKey,
        keyLength: config.geminiApiKey ? config.geminiApiKey.length : 0,
        keyPreview: config.geminiApiKey ? config.geminiApiKey.substring(0, 10) + '...' : 'undefined'
    });

    // Thêm API key vào params
    requestConfig.params = {
        ...requestConfig.params,
        key: config.geminiApiKey
    };

    // Log request config để debug
    console.log('Request config after adding API key:', {
        url: requestConfig.url,
        method: requestConfig.method,
        hasParams: !!requestConfig.params,
        paramsKeys: Object.keys(requestConfig.params || {}),
        hasApiKey: !!requestConfig.params?.key
    });

    return requestConfig;
});

// Interceptor để xử lý response
geminiClient.interceptors.response.use(
    response => response,
    error => {
        console.error('Gemini API Error:', error);
        throw error;
    }
);

// Hàm helper để xử lý error messages
const getErrorMessage = (error, context = '') => {
    const prefix = context ? `${context}: ` : '';

    if (error.code === 'ECONNREFUSED') {
        return `${prefix}Không thể kết nối đến Gemini API. Vui lòng kiểm tra kết nối mạng.`;
    } else if (error.code === 'ENOTFOUND') {
        return `${prefix}Không thể tìm thấy Gemini API server. Vui lòng kiểm tra cấu hình.`;
    } else if (error.code === 'ETIMEDOUT') {
        return `${prefix}Kết nối đến Gemini API bị timeout. Vui lòng thử lại sau.`;
    } else if (error.response?.status === 429) {
        return `${prefix}Quá nhiều yêu cầu đến Gemini API. Vui lòng thử lại sau.`;
    } else if (error.response?.status === 400) {
        return `${prefix}Yêu cầu không hợp lệ. Vui lòng kiểm tra dữ liệu đầu vào.`;
    } else if (error.response?.status === 401) {
        return `${prefix}API key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra cấu hình.`;
    } else if (error.response?.status === 403) {
        return `${prefix}Không có quyền truy cập Gemini API. Vui lòng kiểm tra cấu hình.`;
    } else if (error.response?.status >= 500) {
        return `${prefix}Lỗi server Gemini API. Vui lòng thử lại sau.`;
    } else if (error.message) {
        return `${prefix}${error.message}`;
    }

    return `${prefix}Lỗi không xác định khi gọi Gemini API.`;
};

// Hàm helper để tạo enhanced error
const createEnhancedError = (message, originalError) => {
    const enhancedError = new Error(message);
    enhancedError.originalError = originalError;
    enhancedError.code = originalError.code;
    enhancedError.response = originalError.response;
    return enhancedError;
};

// Hàm helper để validate Gemini API response
const validateGeminiResponse = (response, context = '') => {
    // Kiểm tra cấu trúc response mới của Gemini API
    if (!response?.data?.candidates?.[0]?.content) {
        console.error(`Invalid Gemini API response structure for ${context}:`, response.data);
        console.error('Response data keys:', Object.keys(response.data || {}));
        if (response.data?.candidates?.[0]) {
            console.error('First candidate keys:', Object.keys(response.data.candidates[0] || {}));
        }
        throw new Error(`Phản hồi từ AI service không hợp lệ hoặc rỗng ${context ? `khi ${context}` : ''}. Vui lòng thử lại.`);
    }

    const candidate = response.data.candidates[0];
    let responseText = '';

    // Kiểm tra cấu trúc cũ (có parts)
    if (candidate.content.parts && candidate.content.parts[0]?.text) {
        responseText = candidate.content.parts[0].text;
    }
    // Kiểm tra cấu trúc mới (content trực tiếp)
    else if (candidate.content.text) {
        responseText = candidate.content.text;
    }
    // Kiểm tra cấu trúc khác có thể có
    else if (typeof candidate.content === 'string') {
        responseText = candidate.content;
    }
    else {
        console.error(`No valid text content found in Gemini response for ${context}:`, candidate.content);
        throw new Error(`Không tìm thấy nội dung văn bản hợp lệ trong phản hồi từ AI service ${context ? `khi ${context}` : ''}. Vui lòng thử lại.`);
    }

    return responseText;
};

// Hàm helper để parse response text
const parseResponseText = (responseText, context = '') => {
    try {
        return JSON.parse(responseText);
    } catch (parseError) {
        console.log(`Direct JSON parse failed for ${context}, trying sanitizeAndParseJson`);
        try {
            return sanitizeAndParseJson(responseText);
        } catch (sanitizeError) {
            console.error(`Both JSON parsing methods failed for ${context}:`, sanitizeError);
            console.error('Raw response text:', responseText);
            throw new Error(`Không thể phân tích phản hồi từ AI service ${context ? `khi ${context}` : ''}. Vui lòng thử lại.`);
        }
    }
};

// Hàm helper để log response info
const logResponseInfo = (response, responseTime, context = '') => {
    console.log(`Gemini API Response received for ${context} in`, responseTime, 'ms');
    console.log('Response status:', response.status);
    console.log(`Gemini API Response data structure for ${context}:`, {
        hasData: !!response.data,
        hasCandidates: !!response.data?.candidates,
        candidatesLength: response.data?.candidates?.length,
        hasContent: !!response.data?.candidates?.[0]?.content,
        hasParts: !!response.data?.candidates?.[0]?.content?.parts,
        partsLength: response.data?.candidates?.[0]?.content?.parts?.length,
        hasText: !!response.data?.candidates?.[0]?.content?.parts?.[0]?.text
    });
};

// Hàm helper để log response text
const logResponseText = (responseText, context = '') => {
    console.log(`Raw response text length for ${context}:`, responseText.length);
    console.log(`Raw response text preview for ${context}:`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
    if (responseText.length > 500) {
        console.log(`Raw response text end for ${context}:`, responseText.substring(Math.max(0, responseText.length - 200)));
    }
};

// Hàm helper để đảm bảo generation config
const ensureGenerationConfig = (payload) => {
    const current = payload.generationConfig || {};
    payload.generationConfig = {
        ...current,
        responseMimeType: 'application/json',
        maxOutputTokens: config.geminiMaxOutputTokens,
        temperature: config.geminiTemperature,
        topP: config.geminiTopP
    };
};

// Hàm helper để chuẩn hóa schema
const normalizeResultSchema = (raw) => {
    const result = { ...raw };
    if (!Array.isArray(result.vocabulary)) {
        // Hỗ trợ fallback nếu model trả về "words"
        if (Array.isArray(result.words)) {
            result.vocabulary = result.words.map((w) => ({
                hanzi: w.hanzi || w.word || w.text || '',
                pinyin: w.pinyin || '',
                meaning: w.meaning || ''
            }));
            delete result.words;
        } else {
            result.vocabulary = [];
        }
    }
    if (!Array.isArray(result.grammar)) result.grammar = [];
    if (typeof result.exampleParagraph !== 'string') result.exampleParagraph = '';
    if (typeof result.lessonRequest !== 'string') result.lessonRequest = '';
    return result;
};

// Hàm helper để xử lý AI interaction
const handleAIInteraction = async (interactionData, updateCallback) => {
    let interactionId = null;

    try {
        const interaction = await saveAIInteraction(interactionData);
        if (interaction) {
            interactionId = interaction._id;
        }

        const result = await updateCallback();

        // Cập nhật response thành công
        if (interactionId) {
            await updateAIInteractionResponse(
                interactionId,
                result,
                'success'
            );
        }

        return { ...result, interactionId };

    } catch (error) {
        // Cập nhật lỗi
        if (interactionId) {
            await updateAIInteractionResponse(
                interactionId,
                { error: error.message, stack: error.stack },
                'error',
                error.message
            );
        }
        throw error;
    }
};

// Hàm helper để gọi Gemini API một lần duy nhất
const callGeminiAPI = async (payload, context = '') => {
    const startTime = Date.now();
    console.log(`Sending request to Gemini API for ${context}...`);

    // Tối ưu: Gọi API trực tiếp với timeout cao hơn
    const response = await geminiClient.post('', payload, {
        timeout: config.geminiApiTimeout,
        headers: {
            'Content-Type': 'application/json',
        }
    });

    const responseTime = Date.now() - startTime;

    // Log response structure để debug
    logResponseInfo(response, responseTime, context);

    // Log chi tiết cấu trúc content để debug
    if (response.data?.candidates?.[0]?.content) {
        console.log(`Content structure for ${context}:`, {
            hasParts: !!response.data.candidates[0].content.parts,
            hasText: !!response.data.candidates[0].content.text,
            isString: typeof response.data.candidates[0].content === 'string',
            contentKeys: Object.keys(response.data.candidates[0].content),
            contentType: typeof response.data.candidates[0].content
        });
    }

    const responseText = validateGeminiResponse(response, context);

    return { response, responseText, responseTime };
};

// ===== CORE FUNCTIONS =====

// Hàm tiện ích để làm sạch và parse JSON
const sanitizeAndParseJson = (text) => {
    console.log('Attempting to sanitize and parse text:', text.substring(0, 200) + '...');

    const jsonMatch = text.match(/```json\s*(\{[\s\S]*\})\s*```|(\{[\s\S]*\})/);
    if (jsonMatch) {
        let jsonString = jsonMatch[1] || jsonMatch[2];
        jsonString = jsonString.replace(/,(?=\s*?[}\]])/g, '');

        console.log('Extracted JSON string:', jsonString.substring(0, 200) + '...');

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Lỗi phân tích JSON sau khi đã làm sạch:', e);
            console.error('Chuỗi JSON lỗi:', jsonString);
            throw new Error('Không thể phân tích JSON từ AI service sau khi làm sạch. Vui lòng thử lại.');
        }
    }

    // Thử tìm JSON không có markdown
    const directJsonMatch = text.match(/\{[\s\S]*\}/);
    if (directJsonMatch) {
        try {
            return JSON.parse(directJsonMatch[0]);
        } catch (e) {
            console.error('Lỗi phân tích JSON trực tiếp:', e);
            console.error('Chuỗi JSON lỗi:', directJsonMatch[0]);
        }
    }

    throw new Error('Không thể tìm thấy JSON hợp lệ trong phản hồi từ AI service. Vui lòng thử lại.');
};

// Hàm helper để lưu lịch sử AI interaction
const saveAIInteraction = async (interactionData) => {
    try {
        const interaction = new AIInteraction({
            sessionId: interactionData.sessionId,
            userId: interactionData.userId,
            endpoint: interactionData.endpoint,
            aiModel: interactionData.aiModel,
            requestTimestamp: interactionData.requestTimestamp,
            responseTimestamp: interactionData.responseTimestamp,
            responseTime: interactionData.responseTime,
            status: interactionData.status,
            userAgent: interactionData.userAgent,
            ipAddress: interactionData.ipAddress,
            tags: interactionData.tags,
            notes: interactionData.notes
        });

        // Sử dụng method mới để xử lý dữ liệu lớn
        if (interactionData.requestPayload) {
            interaction.setLargeRequestPayload(interactionData.requestPayload);
        }

        if (interactionData.responseData) {
            interaction.setLargeResponseData(interactionData.responseData);
        }

        await interaction.save();
        return interaction;
    } catch (error) {
        console.error('Lỗi khi lưu lịch sử AI interaction:', error);
        // Không throw error để không ảnh hưởng đến flow chính
        return null;
    }
};

// Hàm helper để cập nhật response cho interaction
const updateAIInteractionResponse = async (interactionId, responseData, status = 'success', errorMessage = null) => {
    try {
        const interaction = await AIInteraction.findById(interactionId);
        if (interaction) {
            // Sử dụng method mới để xử lý dữ liệu lớn
            if (responseData) {
                interaction.setLargeResponseData(responseData);
            }

            interaction.responseTimestamp = new Date();
            interaction.status = status;
            if (errorMessage) {
                interaction.errorMessage = errorMessage;
            }

            // Tính responseTime nếu có requestTimestamp
            if (interaction.requestTimestamp) {
                interaction.responseTime = interaction.responseTimestamp.getTime() - interaction.requestTimestamp.getTime();
            }

            await interaction.save();
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật response cho AI interaction:', error);
    }
};

// Hàm helper để tối ưu prompt cho việc phân tích hình ảnh - TỐI ƯU TỐC ĐỘ
const optimizeImageAnalysisPrompt = (basePrompt, expectedWordCount = 40) => {
    // Tối ưu: Giảm độ dài prompt để tăng tốc độ xử lý
    const enhancedPrompt = `${basePrompt}

INSTRUCTIONS:
- Extract ALL Chinese words/phrases from image
- Target ${expectedWordCount}+ vocabulary items
- Output valid JSON only

SCHEMA:
{
  "lessonRequest": "string",
  "vocabulary": [{"hanzi": "...", "pinyin": "...", "meaning": "... (Vietnamese)"}],
  "grammar": [{"point": "...", "explanation": "... (Vietnamese)", "example": "..."}],
  "exampleParagraph": "string (Vietnamese)"
}

REQUIREMENTS:
- "vocabulary" must include ALL items found
- "meaning" and "explanation" in Vietnamese only
- No extra fields beyond schema`;

    return enhancedPrompt;
};

// Service để phân tích hình ảnh - CHỈ GỌI API 1 LẦN
const analyzeImage = async (payload, sessionId, userId = null, metadata = {}) => {
    const startTime = Date.now();

    try {
        // Tối ưu: Chỉ log cần thiết trong development
        if (config.nodeEnv === 'development') {
            console.log('AnalyzeImage payload structure:', {
                hasContents: !!payload.contents,
                contentsLength: payload.contents?.length,
                hasText: !!payload.contents?.[0]?.parts?.find(p => p.text),
                hasImageData: !!payload.contents?.[0]?.parts?.find(p => p.inlineData)
            });
        }

        // Tối ưu prompt nhanh chóng
        if (payload.contents?.[0]?.parts) {
            const textPart = payload.contents[0].parts.find(part => part.text);
            if (textPart) {
                textPart.text = optimizeImageAnalysisPrompt(textPart.text, metadata.expectedWordCount || 40);
            }
        }

        // Đảm bảo cấu hình generation
        ensureGenerationConfig(payload);

        // Gọi API trực tiếp - không có lớp trung gian
        const { response, responseText, responseTime } = await callGeminiAPI(payload, 'image analysis');

        // Parse kết quả nhanh chóng
        const result = parseResponseText(responseText, 'image analysis');
        const normalizedResult = normalizeResultSchema(result);

        // Lưu lịch sử bất đồng bộ (không block response)
        setImmediate(async () => {
            try {
                await saveAIInteraction({
                    sessionId,
                    userId,
                    endpoint: 'analyzeImage',
                    aiModel: 'gemini-2.5-flash-preview-05-20',
                    requestPayload: payload,
                    responseData: {
                        parsedResult: normalizedResult,
                        rawResponse: response.data,
                        responseTime
                    },
                    requestTimestamp: new Date(startTime),
                    responseTimestamp: new Date(),
                    responseTime,
                    status: 'success',
                    userAgent: metadata.userAgent,
                    ipAddress: metadata.ipAddress,
                    tags: ['image-analysis', 'chinese-learning'],
                    notes: metadata.notes || 'Phân tích hình ảnh tiếng Trung'
                });

                // Chạy task tự động để xử lý dữ liệu
                const autoTaskResult = await AutoTaskService.processImageAnalysisResult(
                    normalizedResult,
                    {
                        userId,
                        sessionId,
                        aiModel: 'gemini-2.5-flash-preview-05-20',
                        userAgent: metadata.userAgent,
                        ipAddress: metadata.ipAddress,
                        tags: ['AI Generated', 'Image Analysis'],
                        category: 'Common',
                        difficulty: 'Medium',
                        notes: metadata.notes || 'Phân tích hình ảnh tiếng Trung'
                    }
                );

                console.log('Kết quả task tự động:', autoTaskResult);
            } catch (saveError) {
                console.error('Lỗi khi lưu lịch sử hoặc chạy task tự động:', saveError);
            }
        });

        return {
            success: true,
            data: normalizedResult,
            responseTime,
            aiModel: 'gemini-2.5-flash-preview-05-20'
        };

    } catch (error) {
        console.error('Lỗi khi phân tích hình ảnh:', error.message);
        throw createEnhancedError(`Phân tích hình ảnh: ${error.message}`, error);
    }
};

// Service để tạo bài tập
const generateExercises = async (payload, sessionId, userId = null, metadata = {}) => {
    const startTime = Date.now();

    try {
        // Đảm bảo cấu hình generation
        ensureGenerationConfig(payload);

        const { response, responseText, responseTime } = await callGeminiAPI(payload, 'exercise generation');

        // Parse kết quả
        const result = parseResponseText(responseText, 'exercise generation');

        // Lưu lịch sử bất đồng bộ (không block response)
        setImmediate(async () => {
            try {
                await saveAIInteraction({
                    sessionId,
                    userId,
                    endpoint: 'generateExercises',
                    aiModel: 'gemini-2.5-flash-preview-05-20',
                    requestPayload: payload,
                    responseData: {
                        parsedResult: result,
                        rawResponse: response.data,
                        responseTime
                    },
                    requestTimestamp: new Date(startTime),
                    responseTimestamp: new Date(),
                    responseTime,
                    status: 'success',
                    userAgent: metadata.userAgent,
                    ipAddress: metadata.ipAddress,
                    tags: ['exercise-generation', 'chinese-learning'],
                    notes: metadata.notes || 'Tạo bài tập tiếng Trung'
                });

                // Chạy task tự động để xử lý bài tập được tạo
                if (result.exercises || result.questions) {
                    const exerciseData = result.exercises || result.questions;
                    const autoTaskResult = await AutoTaskService.processGeneratedExercises(
                        exerciseData,
                        {
                            userId,
                            sessionId,
                            aiModel: 'gemini-2.5-flash-preview-05-20',
                            userAgent: metadata.userAgent,
                            ipAddress: metadata.ipAddress,
                            tags: ['AI Generated', 'Exercise Generation'],
                            category: 'Mixed',
                            difficulty: 'Medium',
                            notes: metadata.notes || 'Tạo bài tập tiếng Trung'
                        }
                    );

                    console.log('Kết quả xử lý bài tập tự động:', autoTaskResult);
                }
            } catch (saveError) {
                console.error('Lỗi khi lưu lịch sử hoặc chạy task tự động:', saveError);
            }
        });

        return {
            success: true,
            data: result,
            responseTime,
            aiModel: 'gemini-2.5-flash-preview-05-20'
        };

    } catch (error) {
        console.error('Lỗi khi tạo bài tập:', error);
        console.error('Error stack:', error.stack);

        const errorMessage = getErrorMessage(error, 'Tạo bài tập');
        throw createEnhancedError(errorMessage, error);
    }
};

// Service để phân tích chi tiết từ vựng - TỐI ƯU TỐC ĐỘ
const analyzeWordDetails = async (payload, sessionId, userId = null, metadata = {}) => {
    const startTime = Date.now();

    try {
        // Đảm bảo cấu hình generation
        ensureGenerationConfig(payload);

        // Gọi API trực tiếp
        const { response, responseText, responseTime } = await callGeminiAPI(payload, 'word details analysis');

        // Parse kết quả nhanh chóng
        const result = parseResponseText(responseText, 'word details analysis');

        // Lưu lịch sử bất đồng bộ (không block response)
        setImmediate(async () => {
            try {
                await saveAIInteraction({
                    sessionId,
                    userId,
                    endpoint: 'analyzeWordDetails',
                    aiModel: 'gemini-2.5-flash-preview-05-20',
                    requestPayload: payload,
                    responseData: {
                        parsedResult: result,
                        rawResponse: response.data,
                        responseTime
                    },
                    requestTimestamp: new Date(startTime),
                    responseTimestamp: new Date(),
                    responseTime,
                    status: 'success',
                    userAgent: metadata.userAgent,
                    ipAddress: metadata.ipAddress,
                    tags: ['word-analysis', 'chinese-learning'],
                    notes: metadata.notes || 'Phân tích chi tiết từ vựng tiếng Trung'
                });

                // Chạy task tự động để xử lý thông tin chi tiết từ vựng
                const autoTaskResult = await AutoTaskService.processWordDetailsResult(
                    result,
                    {
                        userId,
                        sessionId,
                        aiModel: 'gemini-2.5-flash-preview-05-20',
                        userAgent: metadata.userAgent,
                        ipAddress: metadata.ipAddress,
                        tags: ['AI Generated', 'Word Details Analysis'],
                        category: 'Vocabulary',
                        difficulty: 'Medium',
                        notes: metadata.notes || 'Phân tích chi tiết từ vựng tiếng Trung'
                    }
                );

                console.log('Kết quả xử lý từ vựng chi tiết tự động:', autoTaskResult);
            } catch (saveError) {
                console.error('Lỗi khi lưu lịch sử hoặc chạy task tự động:', saveError);
            }
        });

        return {
            success: true,
            data: result,
            responseTime,
            aiModel: 'gemini-2.5-flash-preview-05-20'
        };

    } catch (error) {
        console.error('Lỗi khi phân tích chi tiết từ:', error.message);
        throw createEnhancedError(`Phân tích chi tiết từ: ${error.message}`, error);
    }
};

// Service để phân tích phát âm - TỐI ƯU TỐC ĐỘ
const analyzePronunciation = async (payload, sessionId, userId = null, metadata = {}) => {
    const startTime = Date.now();

    try {
        // Đảm bảo cấu hình generation
        ensureGenerationConfig(payload);

        // Gọi API trực tiếp
        const { response, responseText, responseTime } = await callGeminiAPI(payload, 'pronunciation analysis');

        // Parse kết quả nhanh chóng
        const result = parseResponseText(responseText, 'pronunciation analysis');

        // Lưu lịch sử bất đồng bộ (không block response)
        setImmediate(async () => {
            try {
                await saveAIInteraction({
                    sessionId,
                    userId,
                    endpoint: 'analyzePronunciation',
                    aiModel: 'gemini-2.5-flash-preview-05-20',
                    requestPayload: payload,
                    responseData: {
                        parsedResult: result,
                        rawResponse: response.data,
                        responseTime
                    },
                    requestTimestamp: new Date(startTime),
                    responseTimestamp: new Date(),
                    responseTime,
                    status: 'success',
                    userAgent: metadata.userAgent,
                    ipAddress: metadata.ipAddress,
                    tags: ['pronunciation-analysis', 'chinese-learning'],
                    notes: metadata.notes || 'Phân tích phát âm tiếng Trung'
                });
            } catch (saveError) {
                console.error('Lỗi khi lưu lịch sử (không ảnh hưởng response):', saveError);
            }
        });

        return {
            success: true,
            data: result,
            responseTime,
            aiModel: 'gemini-2.5-flash-preview-05-20'
        };

    } catch (error) {
        console.error('Lỗi khi phân tích phát âm:', error.message);
        throw createEnhancedError(`Phân tích phát âm: ${error.message}`, error);
    }
};

// Service để lấy lịch sử AI interactions
const getAIInteractionHistory = async (filters = {}, limit = 50, skip = 0) => {
    try {
        const query = {};

        if (filters.sessionId) query.sessionId = filters.sessionId;
        if (filters.userId) query.userId = filters.userId;
        if (filters.endpoint) query.endpoint = filters.endpoint;
        if (filters.status) query.status = filters.status;
        if (filters.dateFrom || filters.dateTo) {
            query.createdAt = {};
            if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
            if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
        }

        const interactions = await AIInteraction.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(); // Thêm .exec() để đảm bảo promise được resolve đúng cách

        // Debug logging để kiểm tra dữ liệu
        console.log('AI Service - Found interactions:', interactions.length);
        if (interactions.length > 0) {
            console.log('First interaction:', {
                _id: interactions[0]._id,
                hasId: !!interactions[0]._id,
                sessionId: interactions[0].sessionId,
                endpoint: interactions[0].endpoint
            });
        }

        const total = await AIInteraction.countDocuments(query);

        return {
            success: true,
            data: interactions,
            pagination: {
                total,
                limit,
                skip,
                hasMore: skip + limit < total
            }
        };
    } catch (error) {
        console.error('Lỗi khi lấy lịch sử AI interactions:', error);
        throw error;
    }
};

// Service để lấy thống kê AI interactions
const getAIInteractionStats = async (filters = {}) => {
    try {
        const stats = await AIInteraction.getStats(filters);
        return {
            success: true,
            data: stats[0] || {
                totalCalls: 0,
                successCalls: 0,
                errorCalls: 0,
                avgResponseTime: 0,
                totalResponseTime: 0
            }
        };
    } catch (error) {
        console.error('Lỗi khi lấy thống kê AI interactions:', error);
        throw error;
    }
};

module.exports = {
    analyzeImage,
    generateExercises,
    analyzeWordDetails,
    analyzePronunciation,
    sanitizeAndParseJson,
    optimizeImageAnalysisPrompt,
    getAIInteractionHistory,
    getAIInteractionStats
};

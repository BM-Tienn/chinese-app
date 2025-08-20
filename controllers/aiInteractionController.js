const AIInteraction = require('../models/AIInteraction');
const aiService = require('../services/aiService');

// Lưu tương tác AI mới
exports.saveAIInteraction = async (req, res) => {
  try {
    const {
      sessionId,
      userId = 'anonymous',
      userInput,
      aiResponse,
      aiModel = 'gpt-3.5-turbo',
      responseTime = 0,
      status = 'success',
      metadata = {}
    } = req.body;

    if (!sessionId || !userInput || !aiResponse) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: sessionId, userInput, aiResponse'
      });
    }

    const interaction = new AIInteraction({
      sessionId,
      userId,
      userInput,
      aiResponse,
      aiModel,
      responseTime,
      status,
      metadata
    });

    await interaction.save();

    res.status(201).json({
      success: true,
      message: 'Đã lưu tương tác AI thành công',
      data: interaction
    });
  } catch (error) {
    console.error('Lỗi khi lưu tương tác AI:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lưu tương tác AI',
      error: error.message
    });
  }
};

// Phân tích hình ảnh
exports.analyzeImage = async (req, res) => {
  try {
    const { payload, sessionId, userId, metadata } = req.body;

    // Lấy sessionId từ body hoặc headers
    const currentSessionId = sessionId || req.session?.id || req.headers['x-session-id'] || 'anonymous';
    const currentUserId = userId || req.user?.id || req.headers['x-user-id'] || null;

    // Lấy metadata từ request nếu không có
    const currentMetadata = metadata || {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      notes: 'Phân tích hình ảnh từ API'
    };

    // Log payload chỉ trong development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Received payload structure:', {
        hasContents: !!payload.contents,
        contentsLength: payload.contents?.length,
        hasParts: !!payload.contents?.[0]?.parts
      });
      console.log('SessionId:', currentSessionId);
      console.log('UserId:', currentUserId);
    }

    // Kiểm tra payload có đúng format không
    if (!payload || !payload.contents || !Array.isArray(payload.contents) || payload.contents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu hoặc sai format payload. Cần có contents array với parts'
      });
    }

    // Kiểm tra contents có parts không
    const firstContent = payload.contents[0];
    if (!firstContent.parts || !Array.isArray(firstContent.parts) || firstContent.parts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu hoặc sai format parts. Cần có ít nhất 1 part'
      });
    }

    // Tìm text và image data từ parts
    let prompt = '';
    let imageData = '';
    let mimeType = 'image/jpeg';

    for (const part of firstContent.parts) {
      if (part.text) {
        prompt = part.text;
      } else if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/jpeg';
      }
    }

    console.log('Extracted prompt:', prompt);
    console.log('Extracted imageData length:', imageData ? imageData.length : 0);
    console.log('MimeType:', mimeType);

    // Kiểm tra có ít nhất prompt
    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu prompt text trong payload'
      });
    }

    // Nếu không có hình ảnh, vẫn cho phép xử lý (có thể là text-only analysis)
    if (!imageData) {
      console.log('Warning: No image data provided, proceeding with text-only analysis');
    }

    const result = await aiService.analyzeImage(payload, currentSessionId, currentUserId, currentMetadata);

    res.json({
      success: true,
      data: result.data,
      responseTime: result.responseTime,
      aiModel: result.aiModel,
      interactionId: result.interactionId
    });
  } catch (error) {
    console.error('Lỗi khi phân tích hình ảnh:', error);
    console.error('Error stack:', error.stack);

    // Xác định status code phù hợp
    let statusCode = 500;
    let errorMessage = 'Lỗi khi phân tích hình ảnh';

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Không thể kết nối đến AI service';
    } else if (error.response?.status === 429) {
      statusCode = 429; // Too Many Requests
      errorMessage = 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    } else if (error.response?.status === 400) {
      statusCode = 400; // Bad Request
      errorMessage = 'Yêu cầu không hợp lệ';
    } else if (error.response?.status === 401) {
      statusCode = 401; // Unauthorized
      errorMessage = 'API key không hợp lệ';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
};

// Tạo bài tập
exports.generateExercises = async (req, res) => {
  try {
    const { topic, difficulty, count, type, payload, sessionId: reqSessionId, metadata: reqMetadata } = req.body;

    // Lấy sessionId từ body, session, hoặc headers
    const sessionId = reqSessionId || req.session?.id || req.headers['x-session-id'] || 'anonymous';
    const userId = req.user?.id || req.headers['x-user-id'] || null;

    // Lấy metadata từ request
    const metadata = reqMetadata || {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      notes: req.body.notes || 'Tạo bài tập từ API'
    };

    // Kiểm tra nếu có payload từ frontend
    if (payload) {
      // Sử dụng payload từ frontend nếu có
      const result = await aiService.generateExercises(payload, sessionId, userId, metadata);

      res.json({
        success: true,
        data: result.data,
        responseTime: result.responseTime,
        aiModel: result.aiModel,
        interactionId: result.interactionId
      });
      return;
    }

    // Fallback: xử lý theo cách cũ nếu không có payload
    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu chủ đề bài tập'
      });
    }

    const prompt = `Tạo ${count || 5} bài tập tiếng Trung về chủ đề "${topic}" với độ khó ${difficulty || 'trung bình'}. 
        Loại bài tập: ${type || 'trắc nghiệm'}. 
        Trả về kết quả dưới dạng JSON với cấu trúc:
        {
            "exercises": [
                {
                    "question": "Câu hỏi",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "A",
                    "explanation": "Giải thích"
                }
            ]
        }`;

    const fallbackPayload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const result = await aiService.generateExercises(fallbackPayload, sessionId, userId, metadata);

    res.json({
      success: true,
      data: result.data,
      responseTime: result.responseTime,
      aiModel: result.aiModel,
      interactionId: result.interactionId
    });
  } catch (error) {
    console.error('Lỗi khi tạo bài tập:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo bài tập',
      error: error.message
    });
  }
};

// Phân tích chi tiết từ vựng
exports.analyzeWordDetails = async (req, res) => {
  try {
    const { word, context, payload, sessionId: reqSessionId, metadata: reqMetadata } = req.body;

    // Lấy sessionId từ body, session, hoặc headers
    const sessionId = reqSessionId || req.session?.id || req.headers['x-session-id'] || 'anonymous';
    const userId = req.user?.id || req.headers['x-user-id'] || null;

    // Lấy metadata từ request
    const metadata = reqMetadata || {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      notes: req.body.notes || 'Phân tích từ vựng từ API'
    };

    // Kiểm tra nếu có payload từ frontend
    if (payload) {
      // Sử dụng payload từ frontend nếu có
      const result = await aiService.analyzeWordDetails(payload, sessionId, userId, metadata);

      res.json({
        success: true,
        data: result.data,
        responseTime: result.responseTime,
        aiModel: result.aiModel,
        interactionId: result.interactionId
      });
      return;
    }

    // Fallback: xử lý theo cách cũ nếu không có payload
    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu từ vựng cần phân tích'
      });
    }

    const prompt = `Phân tích chi tiết từ tiếng Trung "${word}"${context ? ` trong ngữ cảnh: "${context}"` : ''}. 
        Trả về kết quả dưới dạng JSON với cấu trúc:
        {
            "word": "từ gốc",
            "pinyin": "phiên âm",
            "meaning": "nghĩa tiếng Việt",
            "radicals": ["bộ thủ"],
            "strokeCount": "số nét",
            "examples": ["ví dụ sử dụng"],
            "synonyms": ["từ đồng nghĩa"],
            "antonyms": ["từ trái nghĩa"]
        }`;

    const fallbackPayload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const result = await aiService.analyzeWordDetails(fallbackPayload, sessionId, userId, metadata);

    res.json({
      success: true,
      data: result.data,
      responseTime: result.responseTime,
      aiModel: result.aiModel,
      interactionId: result.interactionId
    });
  } catch (error) {
    console.error('Lỗi khi phân tích từ vựng:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phân tích từ vựng',
      error: error.message
    });
  }
};

// Phân tích phát âm
exports.analyzePronunciation = async (req, res) => {
  try {
    const { word, audioData, payload, sessionId: reqSessionId, metadata: reqMetadata } = req.body;

    // Lấy sessionId từ body, session, hoặc headers
    const sessionId = reqSessionId || req.session?.id || req.headers['x-session-id'] || 'anonymous';
    const userId = req.user?.id || req.headers['x-user-id'] || null;

    // Lấy metadata từ request
    const metadata = reqMetadata || {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      notes: req.body.notes || 'Phân tích phát âm từ API'
    };

    // Kiểm tra nếu có payload từ frontend
    if (payload) {
      // Sử dụng payload từ frontend nếu có
      const result = await aiService.analyzePronunciation(payload, sessionId, userId, metadata);

      res.json({
        success: true,
        data: result.data,
        responseTime: result.responseTime,
        aiModel: result.aiModel,
        interactionId: result.interactionId
      });
      return;
    }

    // Fallback: xử lý theo cách cũ nếu không có payload
    if (!word) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu từ cần phân tích phát âm'
      });
    }

    let fallbackPayload;
    if (audioData) {
      // Nếu có audio data, sử dụng multimodal
      fallbackPayload = {
        contents: [{
          parts: [
            { text: `Phân tích phát âm của từ tiếng Trung "${word}" và so sánh với audio này. Trả về kết quả dưới dạng JSON.` },
            { inlineData: { mimeType: 'audio/wav', data: audioData } }
          ]
        }]
      };
    } else {
      // Chỉ phân tích text
      fallbackPayload = {
        contents: [{
          parts: [{
            text: `Phân tích phát âm của từ tiếng Trung "${word}". Trả về kết quả dưới dạng JSON với cấu trúc:
                    {
                        "word": "từ gốc",
                        "pinyin": "phiên âm",
                        "tone": "thanh điệu",
                        "pronunciation": "hướng dẫn phát âm",
                        "commonMistakes": ["lỗi thường gặp"],
                        "practiceTips": ["mẹo luyện tập"]
                    }` }]
        }]
      };
    }

    const result = await aiService.analyzePronunciation(fallbackPayload, sessionId, userId, metadata);

    res.json({
      success: true,
      data: result.data,
      responseTime: result.responseTime,
      aiModel: result.aiModel,
      interactionId: result.interactionId
    });
  } catch (error) {
    console.error('Lỗi khi phân tích phát âm:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi phân tích phát âm',
      error: error.message
    });
  }
};

// Lấy lịch sử AI interactions
exports.getInteractionHistory = async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      endpoint,
      status,
      dateFrom,
      dateTo,
      limit = 50,
      skip = 0
    } = req.query;

    const filters = {};
    if (sessionId) filters.sessionId = sessionId;
    if (userId) filters.userId = userId;
    if (endpoint) filters.endpoint = endpoint;
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await aiService.getAIInteractionHistory(filters, parseInt(limit), parseInt(skip));

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử AI interactions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử AI interactions',
      error: error.message
    });
  }
};

// Lấy thống kê AI interactions
exports.getInteractionStats = async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      endpoint,
      status,
      dateFrom,
      dateTo
    } = req.query;

    const filters = {};
    if (sessionId) filters.sessionId = sessionId;
    if (userId) filters.userId = userId;
    if (endpoint) filters.endpoint = endpoint;
    if (status) filters.status = status;
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const result = await aiService.getAIInteractionStats(filters);

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy thống kê AI interactions:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê AI interactions',
      error: error.message
    });
  }
};

// Lấy danh sách tương tác AI theo session
exports.getAIInteractionsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 20, sort = '-timestamp' } = req.query;

    const skip = (page - 1) * limit;

    const interactions = await AIInteraction.find({ sessionId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await AIInteraction.countDocuments({ sessionId });

    res.json({
      success: true,
      data: interactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy tương tác AI:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy tương tác AI',
      error: error.message
    });
  }
};

// Lấy dữ liệu AI interaction đầy đủ (bao gồm cả dữ liệu lớn từ buffer)
exports.getFullAIInteraction = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await AIInteraction.findById(id);
    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tương tác AI'
      });
    }

    // Sử dụng method mới để lấy dữ liệu đầy đủ
    const fullData = {
      ...interaction.toObject(),
      fullRequestPayload: interaction.getFullRequestPayload(),
      fullResponseData: interaction.getFullResponseData()
    };

    res.json({
      success: true,
      data: fullData
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu AI interaction đầy đủ:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu AI interaction',
      error: error.message
    });
  }
};

// Xóa tương tác AI
exports.deleteAIInteraction = async (req, res) => {
  try {
    const { id } = req.params;

    const interaction = await AIInteraction.findByIdAndDelete(id);

    if (!interaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tương tác AI'
      });
    }

    res.json({
      success: true,
      message: 'Đã xóa tương tác AI thành công'
    });
  } catch (error) {
    console.error('Lỗi khi xóa tương tác AI:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa tương tác AI',
      error: error.message
    });
  }
};



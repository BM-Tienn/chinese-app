require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/chinese_ai_db',
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiApiBaseUrl: process.env.GEMINI_API_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent',
  geminiApiTimeout: parseInt(process.env.GEMINI_API_TIMEOUT || '120000'), // Tăng từ 30s lên 120s
  geminiMaxOutputTokens: parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '16384'), // Tăng token limit
  geminiTemperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.3'), // Tăng creativity
  geminiTopP: parseFloat(process.env.GEMINI_TOP_P || '0.9'), // Tăng diversity
  // Cấu hình tối ưu cho performance
  enableStreaming: process.env.ENABLE_STREAMING === 'true',
  enableCaching: process.env.ENABLE_CACHING === 'true',
  maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5'),
  requestRetryCount: parseInt(process.env.REQUEST_RETRY_COUNT || '2')
};

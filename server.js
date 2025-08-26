const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const config = require('./config/config');
const corsMiddleware = require('./middleware/cors');
const { generalLimiter } = require('./middleware/rateLimit');

// Import routes
const aiInteractionRoutes = require('./routes/aiInteractionRoutes');
const frontendActivityRoutes = require('./routes/frontendActivityRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const userRoutes = require('./routes/userRoutes');
const vocabularyRoutes = require('./routes/vocabularyRoutes');
const personalVocabularyRoutes = require('./routes/personalVocabularyRoutes');
const userProgressRoutes = require('./routes/userProgressRoutes');
const autoTaskRoutes = require('./routes/autoTaskRoutes');

// Khởi tạo app
const app = express();

// SỬA LỖI: Bật 'trust proxy' để express-rate-limit hoạt động đúng sau Traefik
// Số 1 có nghĩa là tin tưởng vào 1 lớp proxy đứng trước (chính là Traefik)
app.set('trust proxy', 1);

// Kết nối MongoDB
connectDB();

// Middleware bảo mật
app.use(helmet());

// Middleware CORS
app.use(corsMiddleware);

// Middleware logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Middleware rate limiting
app.use(generalLimiter);

// Middleware parse JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/ai-interactions', aiInteractionRoutes);
app.use('/api/frontend-activities', frontendActivityRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vocabularies', vocabularyRoutes);
app.use('/api/personal-vocabulary', personalVocabularyRoutes);
app.use('/api/user-progress', userProgressRoutes);
app.use('/api/auto-task', autoTaskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server đang hoạt động bình thường',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Chinese AI Backend API',
    version: '1.0.0',
    endpoints: {
      aiInteractions: '/api/ai-interactions',
      frontendActivities: '/api/frontend-activities',
      sessions: '/api/sessions',
      users: '/api/users',
      vocabularies: '/api/vocabularies',
      personalVocabulary: '/api/personal-vocabulary',
      userProgress: '/api/user-progress',
      autoTask: '/api/auto-task',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint không tồn tại'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Lỗi server:', error);

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Lỗi server nội bộ',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Khởi động server
const PORT = config.port;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server đang chạy trên ${HOST}:${PORT}`);
  console.log(`📊 Môi trường: ${config.nodeEnv}`);
  console.log(`🔗 MongoDB: ${config.mongodbUri}`);
  console.log(`🌐 CORS Origin: ${config.corsOrigin}`);
  console.log(`🔒 Server is listening on all network interfaces.`);
});

// Xử lý graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Nhận tín hiệu SIGTERM, đang tắt server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Nhận tín hiệu SIGINT, đang tắt server...');
  process.exit(0);
});

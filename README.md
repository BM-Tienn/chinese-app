# Backend API - Hán Ngữ Trợ Thủ (Chinese AI Learning Assistant)

## 🎯 Tổng Quan

Backend API cho ứng dụng "Hán Ngữ Trợ Thủ" - một nền tảng học tiếng Trung thông minh tích hợp AI, cung cấp các tính năng:

- **AI-Powered Learning**: Phân tích hình ảnh, tạo bài tập, phân tích từ vựng với Gemini AI
- **Personalized Learning**: Quản lý từ vựng cá nhân, theo dõi tiến độ học tập
- **Smart Content Generation**: Tự động tạo nội dung học tập từ AI
- **Progress Tracking**: Hệ thống theo dõi tiến độ, achievements và spaced repetition
- **Session Management**: Quản lý phiên làm việc và hoạt động người dùng

## 🏗️ Kiến Trúc Hệ Thống

### Core Components

```
backend/
├── 📁 config/          # Cấu hình ứng dụng
├── 📁 controllers/     # Xử lý logic nghiệp vụ
├── 📁 middleware/      # Middleware xác thực, validation
├── 📁 models/          # Schema MongoDB và business logic
├── 📁 routes/          # Định tuyến API endpoints
├── 📁 services/        # Business logic và tích hợp AI
├── 📁 scripts/         # Scripts seeding và maintenance
└── 📄 server.js        # Entry point chính
```

### Technology Stack

- **Runtime**: Node.js 18.18.0+
- **Framework**: Express.js 4.18+
- **Database**: MongoDB với Mongoose ODM
- **AI Integration**: Google Gemini 2.5 Flash API
- **Authentication**: Session-based với UUID
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan + Winston
- **Validation**: Express-validator

## 🚀 Cài Đặt & Chạy

### Yêu Cầu Hệ Thống

- Node.js >= 18.18.0
- MongoDB >= 5.0
- RAM: >= 2GB
- Storage: >= 1GB

### Cài Đặt

```bash
# Clone repository
git clone <repository-url>
cd backend

# Cài đặt dependencies
npm install

# Tạo file .env từ template
cp .env.example .env

# Cấu hình biến môi trường
# Xem phần Environment Variables bên dưới

# Chạy ứng dụng
npm run dev      # Development mode
npm start        # Production mode
```

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/chinese_ai_db

# AI Service (Gemini)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent
GEMINI_API_TIMEOUT=120000
GEMINI_MAX_OUTPUT_TOKENS=16384

# CORS & Security
CORS_ORIGIN=http://localhost:3789

# Performance
MAX_CONCURRENT_REQUESTS=5
REQUEST_RETRY_COUNT=2
```

## 📚 API Endpoints

### 1. AI Interactions (`/api/ai-interactions`)

**Core AI functionality cho học tập**

- `POST /analyze-image` - Phân tích hình ảnh, trích xuất từ vựng
- `POST /generate-exercises` - Tạo bài tập tự động
- `POST /analyze-word-details` - Phân tích chi tiết từ vựng
- `POST /analyze-pronunciation` - Phân tích phát âm
- `GET /history` - Lịch sử tương tác AI
- `GET /stats` - Thống kê AI interactions

### 2. Personal Vocabulary (`/api/personal-vocabulary`)

**Quản lý từ vựng cá nhân của người dùng**

- `GET /` - Danh sách từ vựng cá nhân
- `POST /` - Thêm từ vựng mới
- `PUT /:id` - Cập nhật từ vựng
- `DELETE /:id` - Xóa từ vựng
- `GET /review/words` - Từ vựng cần ôn tập
- `GET /new/words` - Từ vựng mới để học
- `PUT /:id/study-result` - Cập nhật kết quả học tập
- `GET /stats` - Thống kê từ vựng cá nhân

### 3. User Progress (`/api/user-progress`)

**Theo dõi tiến độ học tập và achievements**

- `GET /` - Tiến độ tổng quan
- `PUT /` - Cập nhật tiến độ
- `POST /experience` - Thêm XP
- `POST /streak` - Cập nhật streak học tập
- `GET /weekly` - Tiến độ theo tuần
- `GET /daily` - Tiến độ theo ngày
- `GET /achievements` - Danh sách achievements
- `GET /overall-stats` - Thống kê tổng quan

### 4. Vocabulary Management (`/api/vocabularies`)

**Quản lý kho từ vựng chung (từ điển toàn cầu)**

- `GET /` - Danh sách từ vựng với phân trang
- `GET /:id` - Chi tiết từ vựng
- `POST /` - Tạo từ vựng mới
- `PUT /:id` - Cập nhật từ vựng
- `DELETE /:id` - Xóa từ vựng (soft delete)
- `GET /search` - Tìm kiếm nâng cao
- `GET /hsk/:level` - Từ vựng theo cấp độ HSK
- `GET /random` - Từ vựng ngẫu nhiên cho bài tập
- `GET /stats` - Thống kê kho từ vựng

### 5. Session Management (`/api/sessions`)

**Quản lý phiên làm việc và xác thực**

- `POST /` - Tạo phiên mới
- `GET /:sessionId` - Thông tin phiên
- `PUT /:sessionId/activity` - Cập nhật hoạt động
- `DELETE /:sessionId` - Kết thúc phiên
- `GET /` - Danh sách phiên
- `GET /stats` - Thống kê phiên
- `GET /:sessionId/validate` - Validate session nhanh

### 6. User Management (`/api/users`)

**Quản lý người dùng và đăng nhập**

- `POST /login` - Đăng nhập hoặc tạo user mới
- `GET /session/:sessionId` - Lấy thông tin user theo session
- `PUT /session/:sessionId` - Cập nhật thông tin user
- `GET /stats` - Thống kê người dùng
- `POST /verify` - Verify user theo email

### 7. Auto Task System (`/api/auto-task`)

**Hệ thống task tự động xử lý dữ liệu AI**

- `GET /status` - Trạng thái tổng quan
- `GET /history` - Lịch sử task tự động
- `GET /analytics` - Thống kê chi tiết
- `POST /rerun/:sessionId/:endpoint` - Chạy lại task
- `DELETE /cleanup/:sessionId/:endpoint` - Dọn dẹp dữ liệu

### 8. Frontend Activity Tracking (`/api/frontend-activities`)

**Theo dõi hoạt động người dùng trên frontend**

- `POST /` - Lưu hoạt động mới
- `GET /session/:sessionId` - Hoạt động theo session
- `GET /stats` - Thống kê hoạt động
- `GET /recent` - Hoạt động gần đây

## 🧠 AI Integration

### Gemini AI Features

- **Image Analysis**: Phân tích hình ảnh, trích xuất từ vựng tiếng Trung
- **Exercise Generation**: Tạo bài tập trắc nghiệm, điền từ, ngữ pháp
- **Word Analysis**: Phân tích chi tiết từ vựng, radicals, stroke count
- **Pronunciation Analysis**: Phân tích và hướng dẫn phát âm

### AI Response Processing

- **Content Type Detection**: Tự động phát hiện loại nội dung
- **Large Data Handling**: Sử dụng Buffer cho dữ liệu >16MB
- **Response Validation**: Kiểm tra và parse JSON response
- **Error Handling**: Xử lý lỗi AI service gracefully

## 🗄️ Database Schema

### Core Models

1. **AIInteraction** - Lưu trữ tương tác AI, request/response
2. **Vocabulary** - Kho từ vựng chung (từ điển toàn cầu)
3. **PersonalVocabulary** - Từ vựng cá nhân của người dùng
4. **UserProgress** - Tiến độ học tập, XP, achievements
5. **Exercise** - Bài tập được tạo bởi AI
6. **Session** - Quản lý phiên làm việc
7. **User** - Thông tin người dùng
8. **FrontendActivity** - Tracking hoạt động frontend

### Key Features

- **Spaced Repetition Algorithm**: Thuật toán ôn tập thông minh
- **XP & Level System**: Hệ thống kinh nghiệm và cấp độ
- **Achievement System**: Hệ thống thành tích tự động
- **Progress Analytics**: Thống kê học tập chi tiết

## 🔒 Bảo Mật & Performance

### Security Features

- **Helmet**: Bảo mật HTTP headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Giới hạn request rate
- **Input Validation**: Kiểm tra dữ liệu đầu vào
- **Session Management**: Quản lý phiên an toàn

### Performance Optimization

- **Connection Pooling**: MongoDB connection pooling
- **Indexing**: Tối ưu indexes cho truy vấn
- **Async Processing**: Xử lý bất đồng bộ
- **Buffer Management**: Xử lý dữ liệu lớn hiệu quả
- **Caching Strategy**: Cache dữ liệu thường xuyên truy cập

## 📊 Monitoring & Logging

### Logging System

- **Morgan**: HTTP request logging
- **Winston**: Application logging
- **Error Tracking**: Chi tiết lỗi và stack trace
- **Performance Metrics**: Response time, throughput

### Health Monitoring

- `GET /health` - Health check endpoint
- **Database Connection**: MongoDB connection status
- **AI Service Status**: Gemini API availability
- **System Resources**: Memory, CPU usage

## 🚀 Deployment

### Docker Deployment

```bash
# Build image
docker build -t chinese-ai-backend .

# Run container
docker run -p 3001:3001 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/chinese_ai_db \
  -e GEMINI_API_KEY=your_key \
  chinese-ai-backend
```

### Production Considerations

- **Environment Variables**: Sử dụng .env cho production
- **Process Management**: PM2 hoặc Docker
- **Load Balancing**: Nginx reverse proxy
- **Monitoring**: Application performance monitoring
- **Backup Strategy**: MongoDB backup và recovery

## 🧪 Testing & Development

### Development Scripts

```bash
npm run dev          # Development mode với nodemon
npm run seed         # Seed dữ liệu mẫu
npm start            # Production mode
```

### Testing Strategy

- **Unit Tests**: Kiểm tra logic nghiệp vụ
- **Integration Tests**: Kiểm tra API endpoints
- **Performance Tests**: Load testing và stress testing
- **AI Service Tests**: Mock Gemini API responses

## 📈 Scalability & Future Features

### Planned Enhancements

- **Real-time Updates**: WebSocket cho live progress
- **Advanced Analytics**: Machine learning insights
- **Multi-language Support**: Hỗ trợ nhiều ngôn ngữ
- **Mobile API**: Tối ưu cho mobile apps
- **Offline Support**: Service worker và caching

### Architecture Evolution

- **Microservices**: Tách thành các service riêng biệt
- **Message Queue**: Redis/RabbitMQ cho async processing
- **API Gateway**: Centralized API management
- **Container Orchestration**: Kubernetes deployment

## 🤝 Contributing

### Development Guidelines

1. **Code Style**: ESLint + Prettier
2. **Git Flow**: Feature branches + PR reviews
3. **Documentation**: JSDoc cho functions
4. **Testing**: Unit tests cho business logic
5. **Error Handling**: Consistent error responses

### API Standards

- **Response Format**: `{ success, data, message }`
- **HTTP Status Codes**: Proper status code usage
- **Error Messages**: Vietnamese language support
- **Pagination**: Consistent pagination structure

## 📞 Support & Contact

### Documentation

- **API Docs**: Chi tiết endpoints và parameters
- **Database Schema**: Model definitions và relationships
- **Deployment Guide**: Step-by-step deployment
- **Troubleshooting**: Common issues và solutions

### Team Contact

- **Development Team**: Backend development team
- **Technical Support**: Technical issues và questions
- **Feature Requests**: New feature suggestions
- **Bug Reports**: Issue reporting và tracking

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**License**: MIT  
**Maintainer**: Chinese AI Learning Team

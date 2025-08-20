# Chinese AI Backend

Backend quản lý dữ liệu kết nối giữa frontend và AI, tích hợp với Gemini API và MongoDB.

## Tính năng chính

### 🔐 User & Session Management

- Hệ thống đăng nhập với email (không cần mật khẩu)
- Tự động tạo user mới hoặc khôi phục user cũ
- Quản lý phiên người dùng với thông tin chi tiết
- Theo dõi hoạt động và thời gian sử dụng
- Lưu trữ thông tin thiết bị và user agent

### 🤖 AI Integration

- Tích hợp với Gemini AI API
- Phân tích hình ảnh tiếng Trung
- Tạo bài tập tự động
- Phân tích từ vựng chi tiết
- Phân tích phát âm

### 📊 Activity Tracking

- Theo dõi hoạt động frontend
- Lưu trữ tương tác AI
- Thống kê sử dụng và hiệu suất

### 🛡️ Security & Performance

- Rate limiting cho API
- CORS configuration
- Helmet security headers
- Morgan logging

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

**⚠️ QUAN TRỌNG: Bạn PHẢI cấu hình GEMINI_API_KEY để sử dụng AI features!**

Tạo file `.env` trong thư mục `backend/`:

```env
# Backend Configuration
PORT=3001
MONGODB_URI=mongodb://localhost:27017/chinese_ai_db
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent

# Performance Optimization
GEMINI_API_TIMEOUT=120000
GEMINI_MAX_OUTPUT_TOKENS=16384
GEMINI_TEMPERATURE=0.3
GEMINI_TOP_P=0.9

# Advanced Performance Features
ENABLE_STREAMING=true
ENABLE_CACHING=true
MAX_CONCURRENT_REQUESTS=5
REQUEST_RETRY_COUNT=2
```

#### 🔑 Lấy GEMINI_API_KEY:

1. Truy cập: https://makersuite.google.com/app/apikey
2. Đăng nhập bằng Google account
3. Click "Create API Key"
4. Copy API key và paste vào file `.env`

**📖 Xem hướng dẫn chi tiết:** [SETUP_API_KEY.md](./SETUP_API_KEY.md)

### 3. Khởi động MongoDB

```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

### 4. Chạy ứng dụng

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Users

```
POST   /api/users/login                 # Đăng nhập hoặc tạo user mới
GET    /api/users/session/:sessionId    # Lấy thông tin user theo session
PATCH  /api/users/session/:sessionId    # Cập nhật thông tin user
GET    /api/users/stats                 # Thống kê user
```

### Sessions

```
POST   /api/sessions                    # Tạo phiên mới
GET    /api/sessions/:sessionId         # Lấy thông tin phiên
PATCH  /api/sessions/:sessionId/activity # Cập nhật hoạt động
PATCH  /api/sessions/:sessionId/end     # Kết thúc phiên
GET    /api/sessions                    # Danh sách phiên
GET    /api/sessions/stats              # Thống kê phiên
DELETE /api/sessions/:sessionId         # Xóa phiên
```

### AI Interactions

```
POST   /api/ai-interactions                    # Lưu tương tác AI
POST   /api/ai-interactions/analyze-image     # Phân tích hình ảnh
POST   /api/ai-interactions/generate-exercises # Tạo bài tập
POST   /api/ai-interactions/analyze-word-details # Phân tích từ vựng
POST   /api/ai-interactions/analyze-pronunciation # Phân tích phát âm
GET    /api/ai-interactions/session/:sessionId # Tương tác theo phiên
GET    /api/ai-interactions/stats              # Thống kê tương tác
DELETE /api/ai-interactions/:id                # Xóa tương tác
```

### Frontend Activities

```
POST   /api/frontend-activities                    # Lưu hoạt động
GET    /api/frontend-activities/session/:sessionId # Hoạt động theo phiên
GET    /api/frontend-activities/stats              # Thống kê hoạt động
GET    /api/frontend-activities/recent             # Hoạt động gần đây
DELETE /api/frontend-activities/:id                # Xóa hoạt động
```

## Tích hợp với Frontend

### 1. Sử dụng backendService

```typescript
import {
  backendUtils,
  aiService,
  userService,
} from "../services/backendService";

// Đăng nhập user
const userData = await userService.loginOrCreateUser({
  email: "user@example.com",
  displayName: "Tên người dùng",
});

// Khởi tạo session (anonymous - giữ lại để tương thích)
const session = await backendUtils.initializeSession("/home", "HomePage");

// Phân tích hình ảnh
const result = await aiService.analyzeImage({
  sessionId: session.sessionId,
  payload: imagePayload,
  metadata: { source: "image_upload" },
});

// Lưu hoạt động
await backendUtils.trackActivity(
  session.sessionId,
  "button_click",
  "/home",
  "ImageUploadButton",
  { action: "upload_image" }
);
```

### 2. Sử dụng apiService (tương thích ngược)

```typescript
import { analyzeImage, backendUtils } from "../services/apiService";

// Khởi tạo session
const session = await backendUtils.initializeSession("/home");

// Phân tích hình ảnh (tự động tạo session nếu cần)
const result = await analyzeImage(imagePayload, session.sessionId);
```

## Cấu trúc dữ liệu

### Session

```json
{
  "sessionId": "uuid",
  "userId": "anonymous",
  "startTime": "2024-01-01T00:00:00.000Z",
  "lastActivity": "2024-01-01T01:00:00.000Z",
  "isActive": true,
  "userAgent": "Mozilla/5.0...",
  "deviceInfo": {
    "platform": "Win32",
    "language": "vi-VN"
  }
}
```

### AI Interaction

```json
{
  "sessionId": "uuid",
  "userId": "anonymous",
  "userInput": "JSON string của payload",
  "aiResponse": "JSON string của kết quả",
  "aiModel": "gemini-2.5-flash-preview-05-20",
  "responseTime": 1500,
  "status": "success",
  "metadata": {
    "type": "image_analysis",
    "source": "frontend"
  }
}
```

### Frontend Activity

```json
{
  "sessionId": "uuid",
  "userId": "anonymous",
  "action": "button_click",
  "page": "/home",
  "component": "ImageUploadButton",
  "details": {
    "action": "upload_image"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Monitoring và Analytics

### Health Check

```
GET /health
```

### Thống kê tổng quan

```
GET /api/ai-interactions/stats
GET /api/frontend-activities/stats
GET /api/sessions/stats
```

## Xử lý lỗi

Backend tự động lưu các lỗi AI vào database với:

- `status: "error"`
- `aiResponse`: thông báo lỗi
- `metadata.type`: loại tương tác
- `metadata.error`: chi tiết lỗi

## Best Practices

### 1. Luôn khởi tạo session trước khi sử dụng AI

```typescript
const session = await backendUtils.initializeSession(currentPage);
```

### 2. Theo dõi tất cả hoạt động quan trọng

```typescript
await backendUtils.trackActivity(
  sessionId,
  "form_submit",
  page,
  component,
  formData
);
```

### 3. Xử lý lỗi gracefully

```typescript
try {
  const result = await aiService.analyzeImage({ sessionId, payload });
  return result.data.result;
} catch (error) {
  console.error("AI analysis failed:", error);
  // Fallback hoặc retry logic
}
```

## Troubleshooting

### Lỗi kết nối MongoDB

- Kiểm tra MongoDB có đang chạy không
- Kiểm tra connection string trong `.env`

### Lỗi Gemini API

- Kiểm tra API key có hợp lệ không
- Kiểm tra quota và rate limits

### Lỗi CORS

- Kiểm tra `CORS_ORIGIN` trong `.env`
- Đảm bảo frontend URL đúng

## Development

### Chạy với nodemon

```bash
npm run dev
```

### Logs

- Morgan HTTP request logging
- Console logging cho errors
- MongoDB connection status

### Testing

```bash
npm test
```

## Deployment

### Production

```bash
NODE_ENV=production npm start
```

### Environment Variables

- `PORT`: Port server (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `NODE_ENV`: Environment (development/production)
- `CORS_ORIGIN`: Allowed frontend origin
- `GEMINI_API_KEY`: Gemini AI API key

## License

MIT

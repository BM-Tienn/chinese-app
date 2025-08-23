#!/bin/bash

# Chinese AI Backend Deployment Script
# Sử dụng: ./deploy.sh

set -e

echo "🚀 Bắt đầu deployment Chinese AI Backend..."

# Kiểm tra PM2 đã cài chưa
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 chưa được cài đặt. Vui lòng cài đặt PM2 trước:"
    echo "npm install -g pm2"
    exit 1
fi

# Kiểm tra file .env
if [ ! -f .env ]; then
    echo "⚠️  File .env không tồn tại. Vui lòng tạo file .env với cấu hình production."
    exit 1
fi

# Dừng app cũ nếu đang chạy
echo "🛑 Dừng app cũ (nếu có)..."
pm2 stop chinese-ai-backend 2>/dev/null || true
pm2 delete chinese-ai-backend 2>/dev/null || true

# Cài đặt dependencies production
echo "📦 Cài đặt dependencies production..."
npm ci --omit=dev

# Tạo thư mục logs nếu chưa có
mkdir -p logs

# Khởi động app với PM2
echo "▶️  Khởi động app với PM2..."
pm2 start ecosystem.config.js --env production

# Lưu PM2 configuration
echo "💾 Lưu PM2 configuration..."
pm2 save

# Kiểm tra status
echo "📊 Kiểm tra status app..."
pm2 status

# Kiểm tra health endpoint
echo "🏥 Kiểm tra health endpoint..."
sleep 3
if curl -f http://127.0.0.1:3001/health > /dev/null 2>&1; then
    echo "✅ Health check thành công!"
else
    echo "❌ Health check thất bại!"
    echo "📋 Logs:"
    pm2 logs chinese-ai-backend --lines 20
    exit 1
fi

echo "🎉 Deployment hoàn tất!"
echo ""
echo "📋 Các lệnh hữu ích:"
echo "  pm2 status                    - Xem status app"
echo "  pm2 logs chinese-ai-backend   - Xem logs"
echo "  pm2 restart chinese-ai-backend - Restart app"
echo "  pm2 stop chinese-ai-backend   - Dừng app"
echo ""
echo "🔗 Health check: http://127.0.0.1:3001/health"
echo "🌐 API root: http://127.0.0.1:3001/"

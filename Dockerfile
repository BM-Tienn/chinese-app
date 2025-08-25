# Sử dụng base image Node.js phiên bản 18, loại alpine để nhẹ hơn
FROM node:18-alpine

# Đặt thư mục làm việc bên trong container
WORKDIR /app

# Sao chép package.json và package-lock.json trước
COPY package*.json ./

# Cài đặt dependencies, dùng npm ci để nhanh và nhất quán hơn trong production
RUN npm ci --only=production

# Sao chép toàn bộ mã nguồn còn lại
COPY . .

# Mở cổng mà ứng dụng sẽ chạy
EXPOSE 3001

# Lệnh để khởi động ứng dụng
CMD [ "node", "server.js" ]

# Nhánh "main" là nhánh DEPLOY riêng: chỉ chứa backend (đã có sẵn bản build
# tĩnh của giao diện web trong public/), cố tình bỏ thư mục frontend/ để
# nền tảng deploy không tự tách thành 2 service (backend + frontend) như
# khi giữ cấu trúc thư mục gốc — đây là nguyên nhân gây lỗi 502 kéo dài.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
EXPOSE 80
CMD ["npm", "run", "start"]

# Build 1 ứng dụng DUY NHẤT: backend Express tự phục vụ luôn giao diện web
# tĩnh (đã build từ frontend) + API, chạy trong 1 container duy nhất.
# Đặt ở gốc repo để nền tảng deploy nhận diện là 1 app Docker, không tự
# tách thành 2 service (backend/frontend) như khi build theo từng thư mục.

# ---- Stage 1: build giao diện web (frontend) ----
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps && npm install --no-save @rollup/rollup-linux-x64-musl
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: backend, tự phục vụ luôn bản build ở trên ----
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY backend/ ./
COPY --from=frontend-build /frontend/dist ./public
EXPOSE 80
CMD ["npm", "run", "start"]

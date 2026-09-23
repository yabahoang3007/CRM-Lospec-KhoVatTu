FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
# 80: backend tự phục vụ luôn giao diện web tĩnh (thư mục public/, đã build
# sẵn từ frontend) + API trên cùng 1 process — không cần container nginx
# riêng proxy sang qua mạng nội bộ nữa (tránh hẳn lỗi DNS/network giữa 2
# container đã gặp phải). 80 khớp cổng mà Traefik của nền tảng tự chọn để
# route domain công khai vào (dựa theo EXPOSE trong Dockerfile).
EXPOSE 80
CMD ["npm", "run", "start"]

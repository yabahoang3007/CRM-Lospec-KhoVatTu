FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# @rollup/rollup-linux-x64-musl: Rollup không tự nhận optional dependency đúng
# trên Alpine/musl qua npm (npm/cli#4828) -> cài tay để tránh lỗi build.
RUN npm ci --legacy-peer-deps && npm install --no-save @rollup/rollup-linux-x64-musl
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

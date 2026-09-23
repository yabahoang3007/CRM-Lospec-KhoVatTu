import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// SSL bật qua DB_SSL=true (không suy ra từ NODE_ENV) vì không phải mọi
// database production đều hỗ trợ/bắt buộc SSL (VD: Postgres tự host trên VPS).
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// QUAN TRỌNG: pg.Pool phát ra sự kiện 'error' khi 1 client đang idle trong
// pool gặp sự cố (mất kết nối, DB restart, mạng chập chờn...). Nếu không
// lắng nghe, Node.js coi đây là uncaught exception và CRASH TOÀN BỘ tiến
// trình -> container bị khởi động lại liên tục (thấy rõ qua lỗi "Connection
// refused" đổi IP liên tục trên nginx). Chỉ log lại, không để sập server.
pool.on("error", (err) => {
  console.error("Lỗi không mong muốn từ PostgreSQL pool (đã bỏ qua):", err.message);
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Lỗi kết nối PostgreSQL:", err.stack);
  }
  console.log("Đã kết nối thành công tới PostgreSQL!");
  release();
});

export const query = (text, params) => pool.query(text, params);

export default pool;

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

pool.connect((err, client, release) => {
  if (err) {
    return console.error("Lỗi kết nối PostgreSQL:", err.stack);
  }
  console.log("Đã kết nối thành công tới PostgreSQL!");
  release();
});

export const query = (text, params) => pool.query(text, params);

export default pool;

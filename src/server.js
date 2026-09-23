import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import supplierRouter from "./routes/supplierRoute.js";
import warehouseRouter from "./routes/warehouseRoute.js";
import customerRouter from "./routes/customerRoute.js";
import orderRouter from "./routes/orderRoute.js";
import reportRouter from "./routes/reportRoute.js";
import financeRouter from "./routes/financeRoute.js";
import settingRouter from "./routes/settingRoute.js";
import promotionRouter from "./routes/promotionRoute.js";
import debtRouter from "./routes/debtRoute.js";

dotenv.config();
// 80: khớp EXPOSE 80 trong Dockerfile (backend giờ tự phục vụ luôn cả giao
// diện web tĩnh + API trên cùng 1 container/process)
const PORT = process.env.PORT || 80;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/users", userRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/customers", customerRouter);
app.use("/api/warehouse", warehouseRouter);
app.use("/api/suppliers", supplierRouter);
app.use("/api/promotions", promotionRouter);
app.use("/api/reports", reportRouter);
app.use("/api/finances", financeRouter);
app.use("/api/settings", settingRouter);
app.use("/api/debts", debtRouter);

// Phục vụ luôn giao diện web tĩnh (frontend/dist) nếu có mặt trong image —
// dùng cho deploy gộp 1 container (không cần container nginx riêng proxy
// sang backend qua mạng nội bộ nữa, tránh lỗi DNS/network giữa 2 container).
// Khi chạy `npm run dev` cục bộ (frontend là process Vite riêng) thư mục
// này không tồn tại -> bỏ qua, không ảnh hưởng gì tới dev.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, "..", "public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback: mọi route không phải /api -> trả về index.html để
  // React Router tự xử lý phía client (vd: /login, /pos, /debts...).
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Lưới an toàn cuối cùng: log lỗi thay vì để Node crash toàn bộ tiến trình
// (một promise reject không được catch ở đâu đó không nên làm sập cả server).
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

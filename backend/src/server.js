import express from "express";
import dotenv from "dotenv";
import cors from "cors";
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
// 3000: khớp với cổng mà Dockerfile do VibeHost tự sinh EXPOSE cho service backend
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is running...");
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

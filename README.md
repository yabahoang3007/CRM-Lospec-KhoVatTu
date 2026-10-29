# 🚀 Kingsheet CRM - Hệ Thống Quản Lý Bán Hàng & CRM Toàn Diện

Kingsheet CRM là giải pháp phần mềm quản lý bán hàng (POS) và quan hệ khách hàng (CRM) hiện đại, được thiết kế tối ưu cho các doanh nghiệp bán lẻ vừa và nhỏ. Hệ thống tập trung vào trải nghiệm người dùng mượt mà, tốc độ xử lý nhanh và báo cáo trực quan theo thời gian thực.

---

## 📷 Demo

#### Dashboard Tổng Quan

![Dashboard](frontend/public/Dashboard.png)

#### Giao diện Sản phẩm

![Products](frontend/public/Products.png)

#### Giao Diện Bán Hàng

![POS](frontend/public/POS.png)

---

## 🌟 Tech Highlights

- **Component-Driven Architecture:** React + kiến trúc component tái sử dụng cao.
- **Real-time UI Updates:** Optimistic UI + error/loading states xử lý triệt để.
- **Responsive Design:** TailwindCSS + Shadcn UI tối ưu mọi kích thước màn hình.
- **Clean Architecture Backend:** Controller – Routes – Config rõ ràng.
- **Secure Authentication:** JWT + Bcrypt.
- **Robust Transaction Handling:** Sử dụng PostgreSQL transaction.

---

## ⚡ Tính Năng Chính

### 1. 🛒 Bán Hàng

- Tìm kiếm sản phẩm theo Tên/SKU.
- Giỏ hàng thông minh: Thuế, chiết khấu (% hoặc tiền).
- Nhiều hình thức thanh toán: Tiền mặt, chuyển khoản, thẻ.
- In hóa đơn nhiệt K80/K57 ngay trên trình duyệt.

### 2. 📦 Quản Lý Kho

- Quy trình nhập/xuất kho: Pending → Approved → Update Stock.
- Cảnh báo tồn kho thấp theo thời gian thực.
- Lịch sử giao dịch kho đầy đủ.

### 3. 👥 Quản Lý Khách Hàng

- Hồ sơ khách hàng chi tiết.
- Phân hạng thành viên: Regular / Wholesale / VIP.
- Lịch sử mua hàng, tổng chi tiêu.

### 4. 👤 Quản lý Nhân viên

- Chấm công (Check In / Check Out).
- Theo dõi lịch sử chấm công.

### 5. 📊 Báo Cáo & Phân Tích

- Biểu đồ doanh thu.
- Top sản phẩm, lợi nhuận, doanh thu hôm nay.
- Bộ lọc thời gian linh hoạt.

### 6. ⚙️ Hệ Thống & Phân Quyền

- Cấu hình cửa hàng, thuế suất.
- Export/Import dữ liệu hệ thống.
- RBAC: Admin / Manager / Staff.

---

## 🛠 Công Nghệ Sử Dụng

### **Frontend**

| Công nghệ       | Mô tả                 |
| --------------- | --------------------- |
| React.js (Vite) | UI chính, build nhanh |
| Tailwind CSS    | Utility-first CSS     |
| Shadcn/ui       | Bộ UI hiện đại        |
| Lucide React    | Bộ icon               |
| Recharts        | Biểu đồ               |
| Axios           | HTTP client           |
| Sonner          | Toast notification    |

### **Backend**

| Công nghệ          | Mô tả                  |
| ------------------ | ---------------------- |
| Node.js            | Runtime                |
| Express.js         | Web framework          |
| PostgreSQL         | Database               |
| node-postgres (pg) | Driver PostgreSQL      |
| JWT                | Auth & role management |

---

## 🏗 Kiến Trúc Hệ Thống

```
CRM-LOSPEC
├── backend
│   ├── src
│   │   ├── config
│   │   ├── controllers
│   │   ├── middleware
│   │   ├── routes
│   │   └── server.js
│   ├── .gitignore
│   ├── package-lock.json
│   └── package.json
├── frontend
│   ├── public
│   ├── src
│   │   ├── assets
│   │   ├── components
│   │   │   ├── customer
│   │   │   ├── dashboard
│   │   │   ├── finance
│   │   │   ├── pos
│   │   │   ├── product
│   │   │   ├── promotion
│   │   │   ├── report
│   │   │   ├── setting
│   │   │   ├── staff
│   │   │   ├── supplier
│   │   │   ├── ui
│   │   │   ├── warehouse
│   │   │   ├── ConfirmActionDialog.jsx
│   │   │   ├── ConfirmDeleteDialog.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── config
│   │   ├── context
│   │   ├── layout
│   │   ├── lib
│   │   ├── pages
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── index.html
│   ├── jsconfig.json
│   ├── package-lock.json
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 💻 Yêu Cầu Hệ Thống

- **Node.js:** v18+
- **npm:** v9+
- **PostgreSQL:** v14+
- Trình duyệt mới nhất: Chrome/Edge/Firefox

## 📥 Cài Đặt & Thiết Lập

### **Bước 1: Clone dự án**

```bash
git clone https://github.com/quangthoIT/CRM-Lospec.git
cd CRM-Lospec
```

### **Bước 2: Cài Backend**

```bash
cd backend
npm install
```

### **Bước 3: Cài Frontend**

```bash
cd ../frontend
npm install
```

### **Bước 4: Tạo file .env**

#### **Backend**

```bash
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your_super_secret_key
```

#### **Frontend**

```bash
VITE_API_URL=http://localhost:3001/api
```

### **Bước 5: Chạy Dự Án**

#### **Backend**

```bash
cd backend
npm run dev
```

#### **Frontend**

```bash
cd frontend
npm run dev
```

import {
  LayoutDashboard,
  Package,
  Warehouse,
  Settings,
  ShoppingCart,
  Users,
  Truck,
  Wallet,
  HandCoins,
} from "lucide-react";

// Danh sách chức năng dùng chung cho Sidebar và thanh tra cứu nhanh.
// Thứ tự khớp ĐÚNG các sheet trong file Excel gốc "Sổ bán hàng" để người
// quen dùng Excel tìm thấy ngay. Mỗi mục ghi chú sheet tương ứng.
export const menuItems = [
  {
    // Sheet: Tổng_Quan
    icon: LayoutDashboard,
    name: "Tổng quan",
    path: "/dashboard",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: Khách_Hàng
    icon: Users,
    name: "Khách hàng",
    path: "/customers",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: Nhà_Cung_Cấp
    icon: Truck,
    name: "Nhà cung cấp",
    path: "/suppliers",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: Sản_Phẩm
    icon: Package,
    name: "Sản phẩm",
    path: "/products",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: DL_Đơn_Hàng
    icon: ShoppingCart,
    name: "Bán hàng",
    path: "/pos",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: Thanh_Toán + Trả_NCC + (trả hàng)
    icon: HandCoins,
    name: "Công nợ & Thu chi",
    path: "/debts",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: Nhập_Hàng
    icon: Warehouse,
    name: "Kho hàng",
    path: "/warehouses",
    roles: ["staff", "manager", "admin"],
  },
  {
    // Sheet: Chi_Phí
    icon: Wallet,
    name: "Chi phí",
    path: "/finances",
    roles: ["staff", "manager", "admin"],
  },
  {
    icon: Settings,
    name: "Cài đặt hệ thống",
    path: "/settings",
    roles: ["admin"],
  },
];

import React, { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Settings,
  ChevronRight,
  ShoppingCart,
  Users,
  Truck,
  Wallet,
  HandCoins,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

// Menu được sắp theo ĐÚNG thứ tự các sheet trong file Excel gốc "Sổ bán
// hàng" để người quen dùng Excel tìm thấy ngay — mỗi mục dưới đây tương
// ứng 1-1 với 1 sheet (ghi rõ trong comment). Các chức năng KHÔNG có
// trong Excel (khuyến mãi, chấm công, nhân viên, báo cáo biểu đồ...) tạm
// ẩn khỏi menu — trang/route vẫn còn nguyên, chỉ không hiện ở đây.
const menuItems = [
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

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile } = useAuth();

  const handleItemClick = (path) => {
    navigate(path);
  };

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userProfile?.role)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.name}
                onClick={() => handleItemClick(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors
                  ${
                    isActive
                      ? "bg-emerald-50 text-emerald-600 font-semibold"
                      : "text-emerald-100 hover:bg-emerald-500"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left text-sm">{item.name}</span>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-sm text-gray-100 text-center">Version 1.0.0</div>
      </div>
    </div>
  );
};

export default Sidebar;

import React from "react";
import { ChevronRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { menuItems } from "@/config/menu";

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

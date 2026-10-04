import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { menuItems } from "@/config/menu";
import api from "../../config/api";

// Lối tắt thao tác thường dùng — hiện khi chưa gõ gì
const quickActions = [
  { name: "Bán hàng mới", hint: "Tạo đơn hàng tại quầy", path: "/pos", roles: ["staff", "manager", "admin"] },
  { name: "Thu tiền khách", hint: "Mở công nợ để ghi phiếu thu", path: "/debts", roles: ["staff", "manager", "admin"] },
  { name: "Trả hàng", hint: "Mở công nợ khách để lập phiếu trả", path: "/debts", roles: ["staff", "manager", "admin"] },
  { name: "Tạo phiếu nhập kho", hint: "Nhập hàng từ nhà cung cấp", path: "/warehouses", roles: ["staff", "manager", "admin"] },
];

const norm = (s) => (s || "").toString().toLowerCase();

/**
 * Thanh tra cứu nhanh (Ctrl+K / Cmd+K): tìm chức năng, khách hàng, nhà cung
 * cấp, sản phẩm và đi thẳng tới trang tương ứng bằng bàn phím hoặc chuột.
 */
export function QuickSearch() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const role = userProfile?.role;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const inputRef = useRef(null);

  // Phím tắt toàn cục
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Mỗi lần mở: reset ô tìm và tải danh bạ (khách, NCC, sản phẩm)
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
    setLoadingData(true);
    Promise.all([
      api.get("/customers").then((r) => r.data || []).catch(() => []),
      api.get("/suppliers").then((r) => r.data || []).catch(() => []),
    ]).then(([c, s]) => {
      setCustomers(c);
      setSuppliers(s);
      setLoadingData(false);
    });
  }, [open]);

  // Tìm sản phẩm theo server khi gõ (debounce)
  useEffect(() => {
    if (!open || !query.trim()) {
      setProducts([]);
      return;
    }
    const t = setTimeout(() => {
      api
        .get(`/products?search=${encodeURIComponent(query)}&limit=6`)
        .then((r) => setProducts(r.data?.data || []))
        .catch(() => setProducts([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    const allowed = (roles) => roles.includes(role);

    const functions = menuItems
      .filter((m) => allowed(m.roles))
      .filter((m) => !q || norm(m.name).includes(q))
      .map((m) => ({ key: `fn-${m.path}`, group: "Chức năng", label: m.name, Icon: m.icon, path: m.path }));

    const actions = quickActions
      .filter((a) => allowed(a.roles))
      .filter((a) => !q || norm(a.name).includes(q) || norm(a.hint).includes(q))
      .map((a) => ({ key: `act-${a.name}`, group: "Thao tác nhanh", label: a.name, sub: a.hint, Icon: Zap, path: a.path }));

    const cust = q
      ? customers
          .filter((c) => norm(c.name).includes(q) || norm(c.phone).includes(q))
          .slice(0, 6)
          .map((c) => ({ key: `c-${c.id}`, group: "Khách hàng", label: c.name, sub: c.phone || "", path: "/customers" }))
      : [];

    const sup = q
      ? suppliers
          .filter((s) => norm(s.name).includes(q) || norm(s.phone).includes(q))
          .slice(0, 5)
          .map((s) => ({ key: `s-${s.id}`, group: "Nhà cung cấp", label: s.name, sub: s.phone || "", path: "/suppliers" }))
      : [];

    const prod = products.map((p) => ({
      key: `p-${p.id}`,
      group: "Sản phẩm",
      label: p.name,
      sub: `${p.sku || ""} · ${Number(p.stock_quantity) || 0} ${p.unit || ""} trong kho`,
      path: "/products",
    }));

    return [...actions, ...functions, ...cust, ...sup, ...prod];
  }, [query, role, customers, suppliers, products]);

  useEffect(() => setActiveIndex(0), [query]);

  const go = (item) => {
    if (!item) return;
    setOpen(false);
    navigate(item.path);
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex]);
    }
  };

  // Gom nhóm để hiển thị có tiêu đề
  let lastGroup = null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 bg-emerald-500/40 hover:bg-emerald-500 text-gray-50 rounded-lg px-3 h-10 min-w-[260px] transition-colors"
        title="Tra cứu nhanh (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm text-gray-100 flex-1 text-left">Tra cứu nhanh...</span>
        <kbd className="text-[10px] bg-emerald-700/60 px-1.5 py-0.5 rounded text-gray-100">Ctrl K</kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden top-[20%] translate-y-0">
          <DialogTitle className="sr-only">Tra cứu nhanh</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="h-5 w-5 text-gray-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKey}
              placeholder="Tìm chức năng, khách hàng, nhà cung cấp, sản phẩm..."
              className="flex-1 h-12 outline-none text-sm bg-transparent"
            />
          </div>

          <div className="max-h-[360px] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {loadingData ? "Đang tải dữ liệu..." : "Không tìm thấy kết quả phù hợp"}
              </div>
            ) : (
              results.map((item, i) => {
                const header =
                  item.group !== lastGroup ? (
                    <div key={`h-${item.key}`} className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                      {item.group}
                    </div>
                  ) : null;
                lastGroup = item.group;
                const Icon = item.Icon;
                return (
                  <div key={item.key}>
                    {header}
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => go(item)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm ${
                        i === activeIndex ? "bg-emerald-50 text-emerald-700" : "text-gray-800"
                      }`}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 min-w-0">
                        <span className="block truncate font-medium">{item.label}</span>
                        {item.sub && <span className="block truncate text-xs text-gray-500">{item.sub}</span>}
                      </span>
                      {i === activeIndex && <CornerDownLeft className="h-4 w-4 text-gray-400" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t px-4 py-2 text-[11px] text-gray-500 flex gap-4">
            <span>↑↓ để chọn</span>
            <span>Enter để mở</span>
            <span>Esc để đóng</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

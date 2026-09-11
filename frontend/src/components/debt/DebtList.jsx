import { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, Phone, Wallet2 } from "lucide-react";
import { toast } from "sonner";
import { DebtStatsCards } from "./DebtStatsCards";
import { DebtDetailDialog } from "./DebtDetailDialog";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

/**
 * Danh sách công nợ dùng chung cho khách hàng và nhà cung cấp.
 * @param {"customer"|"supplier"} type
 */
export function DebtList({ type }) {
  const isCustomer = type === "customer";
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await api.get(`/debts/${type}s`);
      setData(rows || []);
    } catch (error) {
      console.error("Fetch debts error:", error);
      toast.error(
        isCustomer
          ? "Không thể tải công nợ khách hàng"
          : "Không thể tải công nợ nhà cung cấp"
      );
    } finally {
      setLoading(false);
    }
  }, [type, isCustomer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter((d) => {
    const matchSearch =
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm);
    const balance = Number(d.balance) || 0;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "owing" && balance > 0) ||
      (statusFilter === "settled" && balance <= 0);
    return matchSearch && matchStatus;
  });

  const openDetail = (id) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <DebtStatsCards type={type} data={data} />

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <Input
          placeholder="Tìm theo tên, SĐT..."
          value={searchTerm}
          icon={<Search size={20} />}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="owing">Còn nợ</SelectItem>
              <SelectItem value="settled">Đã tất toán</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} title="Làm mới">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table className="bg-white border border-gray-200 shadow-lg">
        <TableHeader>
          <TableRow className="bg-gray-200">
            <TableHead>{isCustomer ? "Khách hàng" : "Nhà cung cấp"}</TableHead>
            <TableHead className="text-right">Nợ đầu kỳ</TableHead>
            <TableHead className="text-right">{isCustomer ? "Mua trong kỳ" : "Nhập trong kỳ"}</TableHead>
            <TableHead className="text-right">{isCustomer ? "Đã thu" : "Đã trả"}</TableHead>
            <TableHead className="text-right">{isCustomer ? "Còn phải thu" : "Còn phải trả"}</TableHead>
            <TableHead className="text-center">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                Đang tải công nợ...
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-gray-600">
                <Wallet2 className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                Không có dữ liệu công nợ
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((item) => {
              const balance = Number(item.balance) || 0;
              return (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => openDetail(item.id)}
                >
                  <TableCell>
                    <div className="font-semibold text-gray-900 text-sm">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {item.phone || "---"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(item.opening_balance)}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatCurrency(item.purchased_total)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-emerald-600">
                    {formatCurrency(item.paid_total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        balance > 0
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                    >
                      {formatCurrency(balance)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(item.id);
                      }}
                    >
                      Xem sổ
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <DebtDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        type={type}
        entityId={selectedId}
        onChanged={fetchData}
      />
    </div>
  );
}

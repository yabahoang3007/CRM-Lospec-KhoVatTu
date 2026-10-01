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
import { Search, RefreshCw, Printer, Trash2, PackageMinus } from "lucide-react";
import { toast } from "sonner";
import { printReturnReceipt } from "./ReturnReceiptPrinter";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );
const formatDate = (val) =>
  val ? new Date(val).toLocaleString("vi-VN") : "---";

/** Trang danh sách toàn bộ phiếu trả hàng (của mọi khách hàng). */
export function ReturnsList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rows } = await api.get("/debts/returns");
      setData(rows || []);
    } catch (error) {
      console.error("Fetch returns error:", error);
      toast.error("Không thể tải danh sách phiếu trả hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter(
    (r) =>
      r.return_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = async (row) => {
    try {
      const [{ data: full }, { data: settings }, { data: debt }] =
        await Promise.all([
          api.get(`/debts/customers/returns/${row.id}`),
          api.get("/settings"),
          api.get(`/debts/customers/${row.customer_id}`),
        ]);
      const currentBalance = Number(debt.balance) || 0;
      printReturnReceipt({
        returnDoc: full,
        items: full.items,
        customer: {
          name: full.customer_name,
          phone: full.customer_phone,
          address: full.customer_address,
        },
        settings,
        // In lại từ lịch sử: ước tính công nợ cũ bằng công nợ hiện tại + giá
        // trị phiếu này (giả định không có phát sinh nào khác sau đó)
        balanceBefore: currentBalance + Number(full.total),
        balanceAfter: currentBalance,
      });
    } catch (error) {
      toast.error("Không thể in lại phiếu này");
    }
  };

  const confirmDelete = async () => {
    if (!rowToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/debts/customers/returns/${rowToDelete.id}`);
      toast.success("Đã xóa phiếu trả hàng");
      setDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa phiếu");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <Input
          placeholder="Tìm theo số phiếu, tên khách hàng..."
          value={searchTerm}
          icon={<Search size={20} />}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="outline" size="icon" onClick={fetchData} title="Làm mới">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Table className="bg-white border border-gray-200 shadow-lg">
        <TableHeader>
          <TableRow className="bg-gray-200">
            <TableHead>Số phiếu</TableHead>
            <TableHead>Khách hàng</TableHead>
            <TableHead>Ngày</TableHead>
            <TableHead className="text-right">SL hàng trả</TableHead>
            <TableHead className="text-right">Giá trị</TableHead>
            <TableHead className="text-center">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                Đang tải...
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10 text-gray-600">
                <PackageMinus className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                Chưa có phiếu trả hàng nào
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((row) => (
              <TableRow key={row.id} className="hover:bg-gray-100">
                <TableCell className="font-medium text-sm">
                  {row.return_number}
                </TableCell>
                <TableCell className="text-sm">{row.customer_name}</TableCell>
                <TableCell className="text-sm">{formatDate(row.created_at)}</TableCell>
                <TableCell className="text-right text-sm">
                  {row.total_quantity}
                </TableCell>
                <TableCell className="text-right text-sm font-medium text-amber-600">
                  {formatCurrency(row.total)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-600 hover:bg-blue-100"
                    onClick={() => handlePrint(row)}
                    title="In lại phiếu"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-600 hover:bg-rose-100"
                    onClick={() => {
                      setRowToDelete(row);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Xóa phiếu trả hàng?"
        itemName={rowToDelete?.return_number}
        description="Tồn kho đã cộng lại sẽ bị trừ đi tương ứng. Công nợ khách hàng được tính lại. Hành động này không thể hoàn tác."
        loading={isDeleting}
      />
    </div>
  );
}

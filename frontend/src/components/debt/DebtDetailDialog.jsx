import { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Phone,
  MapPin,
  HandCoins,
  Trash2,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { PaymentFormDialog } from "./PaymentFormDialog";
import { ConfirmDeleteDialog } from "../ConfirmDeleteDialog";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

const formatDate = (val) =>
  val ? new Date(val).toLocaleDateString("vi-VN") : "---";

/**
 * Xem chi tiết công nợ + sổ chi tiết của 1 khách hàng / nhà cung cấp.
 * @param {"customer"|"supplier"} type
 * @param {string} entityId
 */
export function DebtDetailDialog({ open, onOpenChange, type, entityId, onChanged }) {
  const isCustomer = type === "customer";
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/debts/${type}s/${entityId}`);
      setDetail(data);
    } catch (error) {
      console.error("Fetch debt detail error:", error);
      toast.error("Không thể tải chi tiết công nợ");
    } finally {
      setLoading(false);
    }
  }, [type, entityId]);

  useEffect(() => {
    if (open) fetchDetail();
  }, [open, fetchDetail]);

  const handleChanged = () => {
    fetchDetail();
    if (onChanged) onChanged();
  };

  const confirmDeletePayment = async () => {
    if (!rowToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/debts/${type}s/payments/${rowToDelete.id}`);
      toast.success("Đã xóa phiếu");
      setDeleteOpen(false);
      handleChanged();
    } catch (error) {
      console.error("Delete payment error:", error);
      toast.error(error.response?.data?.message || "Lỗi khi xóa phiếu");
    } finally {
      setIsDeleting(false);
    }
  };

  // Sổ chi tiết: cộng dồn số dư chạy từ nợ đầu kỳ
  let running = Number(detail?.opening_balance) || 0;
  const ledgerRows = (detail?.ledger || []).map((row) => {
    running += row.type === "charge" ? Number(row.amount) : -Number(row.amount);
    return { ...row, runningBalance: running };
  });

  const linkableCharges = (detail?.ledger || [])
    .filter((r) => r.type === "charge")
    .map((r) => ({ id: r.id, code: r.code, amount: r.amount }));

  const balance = Number(detail?.balance) || 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Sổ công nợ {isCustomer ? "khách hàng" : "nhà cung cấp"}
            </DialogTitle>
            <DialogDescription>
              Chi tiết {isCustomer ? "hóa đơn" : "phiếu nhập"} và{" "}
              {isCustomer ? "phiếu thu" : "phiếu chi"}
            </DialogDescription>
          </DialogHeader>

          {loading || !detail ? (
            <div className="py-10 text-center text-gray-500">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Đang tải...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Thông tin */}
              <div className="bg-gray-50 border rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="font-semibold text-gray-900">{detail.name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {detail.phone || "---"}
                  </div>
                  {detail.address && (
                    <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {detail.address}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-500">Nợ đầu kỳ</div>
                    <div className="font-semibold">
                      {formatCurrency(detail.opening_balance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {isCustomer ? "Đã thu" : "Đã trả"}
                    </div>
                    <div className="font-semibold text-emerald-600">
                      {formatCurrency(detail.paid_total)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">
                      {isCustomer ? "Còn phải thu" : "Còn phải trả"}
                    </div>
                    <Badge
                      className={
                        balance > 0
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }
                      variant="outline"
                    >
                      {formatCurrency(balance)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="default"
                  className={isCustomer ? "" : "bg-blue-600 hover:bg-blue-700"}
                  onClick={() => setPaymentOpen(true)}
                >
                  <HandCoins className="h-4 w-4 mr-1" />
                  {isCustomer ? "Thu tiền" : "Trả tiền NCC"}
                </Button>
              </div>

              {/* Ledger */}
              <Table className="bg-white border border-gray-200">
                <TableHeader>
                  <TableRow className="bg-gray-200">
                    <TableHead>Ngày</TableHead>
                    <TableHead>Chứng từ</TableHead>
                    <TableHead className="text-right">Phát sinh</TableHead>
                    <TableHead className="text-right">Số dư</TableHead>
                    <TableHead className="text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        Chưa có phát sinh nào
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerRows.map((row) => (
                      <TableRow key={`${row.type}-${row.id}`} className="hover:bg-gray-50">
                        <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{row.code || "---"}</div>
                          <div className="text-xs text-gray-500">
                            {row.type === "charge"
                              ? isCustomer
                                ? "Hóa đơn bán hàng"
                                : "Phiếu nhập hàng"
                              : isCustomer
                              ? "Phiếu thu"
                              : "Phiếu chi"}
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            row.type === "charge" ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {row.type === "charge" ? "+" : "-"}
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.runningBalance)}
                        </TableCell>
                        <TableCell className="text-center">
                          {row.type === "payment" && (
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
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {detail && (
        <PaymentFormDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          type={type}
          entity={detail}
          linkableCharges={linkableCharges}
          onSuccess={handleChanged}
        />
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDeletePayment}
        title={isCustomer ? "Xóa phiếu thu?" : "Xóa phiếu chi?"}
        itemName={rowToDelete?.code}
        description="Công nợ sẽ được tính lại sau khi xóa phiếu này. Hành động này không thể hoàn tác."
        loading={isDeleting}
      />
    </>
  );
}

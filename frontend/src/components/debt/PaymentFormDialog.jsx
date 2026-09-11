import { useState, useEffect } from "react";
import api from "../../config/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { printDebtReceipt } from "./DebtReceiptPrinter";

/**
 * Form ghi phiếu thu (khách hàng) / phiếu chi (nhà cung cấp).
 * @param {"customer"|"supplier"} type
 * @param {Object} entity - Đối tượng { id, name, phone, balance } đang mở
 * @param {Array} linkableCharges - Danh sách hóa đơn/phiếu nhập còn có thể gắn phiếu vào (ledger charge rows)
 */
export function PaymentFormDialog({
  open,
  onOpenChange,
  type,
  entity,
  linkableCharges = [],
  onSuccess,
}) {
  const isCustomer = type === "customer";
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    ref_id: "none",
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        amount: "",
        payment_method: "cash",
        payment_date: new Date().toISOString().split("T")[0],
        ref_id: "none",
        notes: "",
      });
      api
        .get("/settings")
        .then(({ data }) => setSettings(data || {}))
        .catch(() => {});
    }
  }, [open, entity]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = Number(formData.amount);
    if (!amount || amount <= 0) return toast.error("Số tiền phải lớn hơn 0");

    setLoading(true);
    try {
      const payload = {
        amount,
        payment_method: formData.payment_method,
        payment_date: formData.payment_date,
        notes: formData.notes || null,
        ...(isCustomer
          ? { order_id: formData.ref_id !== "none" ? formData.ref_id : null }
          : {
              purchase_order_id:
                formData.ref_id !== "none" ? formData.ref_id : null,
            }),
      };

      const { data: payment } = await api.post(
        `/debts/${type}s/${entity.id}/payments`,
        payload
      );

      toast.success(isCustomer ? "Đã ghi phiếu thu" : "Đã ghi phiếu chi");

      const balanceAfter = (Number(entity.balance) || 0) - amount;

      printDebtReceipt({
        type,
        payment,
        entity,
        settings,
        balanceAfter,
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error(error.response?.data?.message || "Lỗi khi lưu phiếu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCustomer ? "Ghi phiếu thu tiền" : "Ghi phiếu chi trả NCC"}
          </DialogTitle>
          <DialogDescription>
            {isCustomer ? "Khách hàng" : "Nhà cung cấp"}:{" "}
            <strong>{entity?.name}</strong>
            {" — "}Còn {isCustomer ? "phải thu" : "phải trả"}:{" "}
            <strong>
              {new Intl.NumberFormat("vi-VN", {
                style: "currency",
                currency: "VND",
              }).format(entity?.balance || 0)}
            </strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Số tiền {isCustomer ? "thu" : "trả"}{" "}
              <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="1"
              placeholder="0"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hình thức</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  setFormData({ ...formData, payment_method: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Tiền mặt</SelectItem>
                  <SelectItem value="transfer">Chuyển khoản</SelectItem>
                  <SelectItem value="card">Thẻ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment_date">Ngày</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
              />
            </div>
          </div>

          {linkableCharges.length > 0 && (
            <div className="space-y-2">
              <Label>
                {isCustomer ? "Thu theo hóa đơn (nếu có)" : "Trả theo phiếu nhập (nếu có)"}
              </Label>
              <Select
                value={formData.ref_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, ref_id: value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Không gắn hóa đơn --</SelectItem>
                  {linkableCharges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} —{" "}
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(c.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Lý do thu/chi..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy bỏ
            </Button>
            <Button variant="default" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu & In phiếu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

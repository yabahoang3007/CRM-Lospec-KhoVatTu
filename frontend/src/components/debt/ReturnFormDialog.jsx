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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Trash2, PackageX } from "lucide-react";
import { toast } from "sonner";
import { printReturnReceipt } from "./ReturnReceiptPrinter";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

/**
 * Form ghi phiếu trả hàng (khách trả lại sản phẩm) — giảm công nợ + hoàn tồn kho.
 * @param {Object} entity - Khách hàng đang mở { id, name, phone, address, balance }
 */
export function ReturnFormDialog({ open, onOpenChange, entity, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setItems([]);
      setDiscount("0");
      setNotes("");
      setSearchTerm("");
      setSearchResults([]);
      api
        .get("/settings")
        .then(({ data }) => setSettings(data || {}))
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (!open || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api
        .get(`/products?search=${encodeURIComponent(searchTerm)}&limit=10`)
        .then(({ data }) => setSearchResults(data.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, open]);

  const addItem = (product) => {
    if (items.some((it) => it.product_id === product.id)) {
      toast.error("Sản phẩm này đã có trong danh sách trả hàng");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        unit: product.unit,
        unit_price: Number(product.price) || 0,
        quantity: 1,
      },
    ]);
    setSearchTerm("");
    setSearchResults([]);
  };

  const updateItem = (productId, field, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.product_id === productId ? { ...it, [field]: value } : it
      )
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((it) => it.product_id !== productId));
  };

  const subtotal = items.reduce(
    (s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return toast.error("Chưa chọn sản phẩm trả lại");
    if (items.some((it) => !it.quantity || Number(it.quantity) <= 0))
      return toast.error("Số lượng trả phải lớn hơn 0");

    setLoading(true);
    try {
      const payload = {
        items: items.map((it) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_sku: it.product_sku,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
        discount: Number(discount) || 0,
        notes: notes || null,
      };

      const { data: returnDoc } = await api.post(
        `/debts/customers/${entity.id}/returns`,
        payload
      );

      toast.success("Đã ghi phiếu trả hàng");

      const balanceBefore = Number(entity.balance) || 0;
      printReturnReceipt({
        returnDoc,
        items: payload.items.map((it) => ({
          ...it,
          total: it.quantity * it.unit_price,
        })),
        customer: entity,
        settings,
        balanceBefore,
        balanceAfter: balanceBefore - total,
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving return:", error);
      toast.error(error.response?.data?.message || "Lỗi khi lưu phiếu trả hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ghi phiếu trả hàng</DialogTitle>
          <DialogDescription>
            Khách hàng: <strong>{entity?.name}</strong> — Còn phải thu:{" "}
            <strong>{formatCurrency(entity?.balance)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2 relative">
            <Label>Tìm sản phẩm trả lại (theo tên hoặc mã)</Label>
            <Input
              placeholder="Nhập tên hoặc mã sản phẩm..."
              value={searchTerm}
              icon={<Search size={18} />}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-56 overflow-y-auto">
                {searching ? (
                  <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tìm...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">
                    Không tìm thấy sản phẩm
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between gap-2"
                      onClick={() => addItem(p)}
                    >
                      <span>
                        {p.name}{" "}
                        <span className="text-gray-400">[{p.sku}]</span>
                      </span>
                      <span className="text-gray-600 shrink-0">
                        {formatCurrency(p.price)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <Table className="border">
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="w-20">SL</TableHead>
                <TableHead className="w-28">Đơn giá</TableHead>
                <TableHead className="text-right w-28">Thành tiền</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    <PackageX className="h-6 w-6 mx-auto mb-1 text-gray-400" />
                    Chưa có sản phẩm nào — tìm và chọn ở trên
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.product_id}>
                    <TableCell className="text-sm">
                      {it.product_name}
                      <div className="text-xs text-gray-400">{it.product_sku}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        className="h-8"
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(it.product_id, "quantity", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        className="h-8"
                        value={it.unit_price}
                        onChange={(e) =>
                          updateItem(it.product_id, "unit_price", e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(it.quantity * it.unit_price)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-rose-600 hover:bg-rose-100 h-8 w-8"
                        onClick={() => removeItem(it.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Chiết khấu hoá đơn</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                rows={1}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lý do trả hàng..."
              />
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 border rounded-lg p-3">
            <span className="font-medium">Tổng giá trị trả hàng</span>
            <span className="text-lg font-bold text-rose-600">
              -{formatCurrency(total)}
            </span>
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

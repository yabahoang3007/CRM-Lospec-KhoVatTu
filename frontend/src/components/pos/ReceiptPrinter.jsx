import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  buildPrintHeader,
  docSoThanhChu,
} from "../debt/ReturnReceiptPrinter";

const formatCurrency = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value || 0
  );

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const formatDateLong = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `Ngày ${dd} tháng ${mm} năm ${d.getFullYear()}`;
};

const getPaymentMethodText = (method) =>
  ({ cash: "Tiền mặt", transfer: "Chuyển khoản", card: "Thẻ" }[method] ||
  "Tiền mặt");

/**
 * In hoá đơn bán hàng — cùng mẫu "HÓA ĐƠN BÁN HÀNG" (A4, có công nợ cũ/còn
 * lại, bằng chữ, chữ ký) như hoá đơn trả hàng/phiếu nhập, khớp đúng form
 * Excel gốc của cửa hàng.
 * @param {Object} order - { order_number, created_at, subtotal, discount, total, payment_method }
 * @param {Array} items - [{ product_name|productName, unit, quantity, unit_price|unitPrice }]
 * @param {Object} settings - cài đặt cửa hàng
 * @param {Object} customer - { name, phone, address } — bỏ qua nếu bán lẻ không ghi khách
 * @param {string} customerName - (tương thích cũ) dùng khi không truyền customer
 * @param {Object} paymentInfo - { method, receivedAmount, changeAmount }
 * @param {number} [balanceBefore] - công nợ cũ của khách (nếu có bán chịu)
 * @param {number} [balanceAfter] - công nợ còn lại sau đơn này
 */
export const printReceipt = ({
  order,
  items,
  settings = {},
  customer = null,
  customerName = "Khách lẻ",
  paymentInfo = {},
  balanceBefore = null,
  balanceAfter = null,
}) => {
  if (!order) {
    toast.error("Không có thông tin đơn hàng để in");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Vui lòng cho phép mở cửa sổ bật lên để in");
    return;
  }

  const custName = customer?.name || order.customer_name || customerName;
  const custPhone = customer?.phone || order.customer_phone || "";
  const custAddress = customer?.address || order.customer_address || "";
  const showDebtRows = balanceBefore !== null && balanceAfter !== null;
  // Số khách đã trả cho RIÊNG đơn này = tổng đơn - phần làm công nợ tăng thêm
  const paidAmount = showDebtRows
    ? Number(order.total) - (Number(balanceAfter) - Number(balanceBefore))
    : Number(order.total);

  const htmlContent = `
    <html>
      <head>
        <title>Hóa đơn bán hàng - ${order.order_number}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; max-width: 760px; margin: 0 auto; font-size: 13px; color: #111; }
          .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111; padding-bottom: 10px; }
          .header .col { flex: 1; font-size: 12px; line-height: 1.5; }
          .header .col b { font-size: 13px; }
          h1 { text-align: center; font-size: 20px; letter-spacing: 1px; margin: 16px 0 4px; }
          .meta { text-align: center; font-size: 12px; margin-bottom: 14px; }
          .meta b { font-size: 13px; }
          .info { margin-bottom: 12px; line-height: 1.7; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
          th, td { border: 1px solid #333; padding: 6px 8px; font-size: 12.5px; }
          th { background: #f0f0f0; text-align: center; }
          td.num { text-align: right; }
          td.center { text-align: center; }
          .totals td { border: none; padding: 4px 8px; }
          .totals tr.sum td { border-top: 1px solid #333; font-weight: bold; }
          .totals .label { text-align: right; width: 80%; }
          .totals .value { text-align: right; font-weight: 600; }
          .bang-chu { font-style: italic; margin: 8px 0 20px; }
          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 10px; }
          .signatures .col { flex: 1; }
          .signatures .hint { font-size: 11px; color: #555; }
          .signatures .space { height: 64px; }
          .policy { margin-top: 28px; font-size: 11px; color: #444; text-align: center; line-height: 1.6; }
          @media print { @page { margin: 14mm; } }
        </style>
      </head>
      <body>
        ${buildPrintHeader(settings)}

        <h1>HÓA ĐƠN BÁN HÀNG</h1>
        <div class="meta">
          Ngày ${formatDate(order.created_at)}<br/>
          <b>Số HĐ: ${order.order_number}</b>
        </div>

        <div class="info">
          <b>Khách hàng:</b> ${custName || "Khách lẻ"}<br/>
          ${custAddress ? `<b>Địa chỉ:</b> ${custAddress}<br/>` : ""}
          ${custPhone ? `<b>Liên hệ:</b> ${custPhone}` : ""}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:5%">STT</th>
              <th>Tên hàng và quy cách</th>
              <th style="width:8%">ĐVT</th>
              <th style="width:10%">Số lượng</th>
              <th style="width:14%">Đơn giá</th>
              <th style="width:10%">Chiết khấu</th>
              <th style="width:16%">Thanh toán</th>
            </tr>
          </thead>
          <tbody>
            ${(items || [])
              .map((it, i) => {
                const name = it.product_name || it.productName;
                const price = Number(it.unit_price ?? it.unitPrice ?? 0);
                const qty = Number(it.quantity) || 0;
                return `
              <tr>
                <td class="center">${i + 1}</td>
                <td>${name}</td>
                <td class="center">${it.unit || "cái"}</td>
                <td class="center">${qty}</td>
                <td class="num">${formatCurrency(price)}</td>
                <td class="num">0</td>
                <td class="num">${formatCurrency(price * qty)}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>

        <table class="totals">
          <tr><td class="label">Tổng tiền hàng</td><td class="value" style="width:20%">${formatCurrency(order.subtotal)}</td></tr>
          ${order.discount > 0 ? `<tr><td class="label">Chiết khấu hóa đơn</td><td class="value">${formatCurrency(order.discount)}</td></tr>` : ""}
          <tr class="sum"><td class="label">Tổng cộng</td><td class="value">${formatCurrency(order.total)}</td></tr>
          ${
            showDebtRows
              ? `
          <tr><td class="label">Công nợ cũ</td><td class="value">${formatCurrency(balanceBefore)}</td></tr>
          <tr><td class="label">Khách thanh toán</td><td class="value">${formatCurrency(paidAmount)}</td></tr>
          <tr class="sum"><td class="label">Công nợ còn lại</td><td class="value">${formatCurrency(balanceAfter)}</td></tr>
          `
              : `
          <tr><td class="label">Hình thức</td><td class="value">${getPaymentMethodText(paymentInfo.method || order.payment_method)}</td></tr>
          ${
            paymentInfo.method === "cash" && paymentInfo.receivedAmount
              ? `
          <tr><td class="label">Khách đưa</td><td class="value">${formatCurrency(paymentInfo.receivedAmount)}</td></tr>
          <tr><td class="label">Tiền thừa</td><td class="value">${formatCurrency(paymentInfo.changeAmount || 0)}</td></tr>
          `
              : ""
          }
          `
          }
        </table>

        <div class="bang-chu"><b>Bằng chữ:</b> ${docSoThanhChu(
          showDebtRows ? balanceAfter : order.total
        )}</div>

        <div class="signatures">
          <div class="col">
            <b>Người mua hàng</b><br/>
            <span class="hint">(Ký, họ tên)</span>
            <div class="space"></div>
          </div>
          <div class="col">
            ${formatDateLong(order.created_at)}<br/>
            <b>Người bán hàng</b>
            <div class="space"></div>
            ${settings.seller_name ? `<i>${settings.seller_name}</i>` : ""}
          </div>
        </div>

        <div class="policy">
          Vui lòng kiểm tra kỹ hàng hoá trước khi nhận.<br/>
          Hóa đơn trên chưa bao gồm VAT.
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 500);
};

export function PrintReceiptButton({
  order,
  items,
  settings,
  customer,
  customerName,
  paymentInfo,
  balanceBefore,
  balanceAfter,
  variant = "default",
  className = "",
  children,
}) {
  const handleClick = () => {
    printReceipt({
      order,
      items,
      settings,
      customer,
      customerName,
      paymentInfo,
      balanceBefore,
      balanceAfter,
    });
  };

  return (
    <Button variant={variant} onClick={handleClick} className={className}>
      {children || (
        <>
          <Printer className="h-4 w-4 mr-1" /> In hóa đơn
        </>
      )}
    </Button>
  );
}

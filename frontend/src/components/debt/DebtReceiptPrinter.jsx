import { toast } from "sonner";
import { buildPrintHeader, docSoThanhChu, formatDateLong } from "./ReturnReceiptPrinter";

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

const getPaymentMethodText = (method) => {
  const methods = { cash: "Tiền mặt", transfer: "Chuyển khoản", card: "Thẻ" };
  return methods[method] || "Tiền mặt";
};

/**
 * In phiếu thu tiền khách hàng / phiếu chi trả nhà cung cấp — cùng mẫu A4
 * trang trọng với hóa đơn bán hàng/trả hàng (dùng chung header + bằng chữ).
 * @param {"customer"|"supplier"} type
 * @param {Object} payment - Phiếu vừa tạo (payment_number, amount, payment_method, payment_date, notes)
 * @param {Object} entity - Khách hàng / nhà cung cấp (name, phone, address)
 * @param {Object} settings - Cài đặt cửa hàng
 * @param {number} balanceBefore - Công nợ trước khi ghi phiếu này
 * @param {number} balanceAfter - Số dư còn lại sau khi ghi phiếu này
 */
export const printDebtReceipt = ({
  type,
  payment,
  entity,
  settings = {},
  balanceBefore,
  balanceAfter,
}) => {
  if (!payment) {
    toast.error("Không có thông tin phiếu để in");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Vui lòng cho phép mở cửa sổ bật lên để in");
    return;
  }

  const isCustomer = type === "customer";
  const title = isCustomer ? "PHIẾU THU TIỀN" : "PHIẾU CHI TRẢ NHÀ CUNG CẤP";
  const partnerLabel = isCustomer ? "Khách hàng" : "Nhà cung cấp";
  const hasBalance = balanceAfter !== undefined && balanceAfter !== null;

  const htmlContent = `
    <html>
      <head>
        <title>${title} - ${payment.payment_number}</title>
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
          table.totals { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .totals td { border: none; padding: 5px 8px; font-size: 13px; }
          .totals tr.sum td { border-top: 1px solid #333; border-bottom: 1px solid #333; font-weight: bold; font-size: 14px; }
          .totals .label { text-align: right; width: 70%; }
          .totals .value { text-align: right; font-weight: 600; }
          .bang-chu { font-style: italic; margin: 8px 0 20px; }
          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 10px; }
          .signatures .col { flex: 1; }
          .signatures .hint { font-size: 11px; color: #555; }
          .signatures .space { height: 64px; }
          @media print { @page { margin: 14mm; } }
        </style>
      </head>
      <body>
        ${buildPrintHeader(settings)}

        <h1>${title}</h1>
        <div class="meta">
          Ngày ${formatDate(payment.payment_date || payment.created_at)}<br/>
          <b>Số phiếu: ${payment.payment_number}</b>
        </div>

        <div class="info">
          <b>${partnerLabel}:</b> ${entity?.name || "---"}<br/>
          ${entity?.address ? `<b>Địa chỉ:</b> ${entity.address}<br/>` : ""}
          <b>Liên hệ:</b> ${entity?.phone || "---"}
        </div>

        <table class="totals">
          <tr class="sum">
            <td class="label">${isCustomer ? "Số tiền thu" : "Số tiền trả"}</td>
            <td class="value">${formatCurrency(payment.amount)}</td>
          </tr>
          <tr><td class="label">Hình thức thanh toán</td><td class="value">${getPaymentMethodText(payment.payment_method)}</td></tr>
          ${
            balanceBefore !== undefined && balanceBefore !== null
              ? `<tr><td class="label">${isCustomer ? "Công nợ cũ" : "Còn phải trả cũ"}</td><td class="value">${formatCurrency(balanceBefore)}</td></tr>`
              : ""
          }
          ${
            hasBalance
              ? `<tr class="sum"><td class="label">${isCustomer ? "Công nợ còn lại" : "Còn phải trả"}</td><td class="value">${formatCurrency(balanceAfter)}</td></tr>`
              : ""
          }
        </table>

        <div class="bang-chu"><b>Bằng chữ:</b> ${docSoThanhChu(payment.amount)}</div>

        ${payment.notes ? `<div class="info"><b>Ghi chú:</b> ${payment.notes}</div>` : ""}

        <div class="signatures">
          <div class="col">
            <b>${isCustomer ? "Người nộp tiền" : "Người nhận tiền"}</b><br/>
            <span class="hint">(Ký, họ tên)</span>
            <div class="space"></div>
          </div>
          <div class="col">
            ${formatDateLong(payment.payment_date || payment.created_at)}<br/>
            <b>Người lập phiếu</b>
            <div class="space"></div>
            ${settings.seller_name ? `<i>${settings.seller_name}</i>` : ""}
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

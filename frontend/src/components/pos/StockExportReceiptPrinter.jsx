import { toast } from "sonner";
import { buildPrintHeader, formatDateLong } from "../debt/ReturnReceiptPrinter";

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

/**
 * In phiếu xuất kho (không hiển thị giá) — dùng khi giao hàng, chỉ gồm tên
 * hàng/ĐVT/số lượng cùng thông tin đơn vị cung cấp (cửa hàng) và khách hàng.
 * @param {Object} params
 * @param {Object} params.order - { order_number, created_at }
 * @param {Array} params.items - [{ product_name, unit, quantity }]
 * @param {Object} params.customer - { name, address, phone }
 * @param {Object} params.settings - cài đặt cửa hàng
 */
export const printStockExportSlip = ({
  order,
  items = [],
  customer = {},
  settings = {},
}) => {
  if (!order) {
    toast.error("Không có thông tin đơn hàng để in phiếu xuất kho");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Vui lòng cho phép mở cửa sổ bật lên để in");
    return;
  }

  const htmlContent = `
    <html>
      <head>
        <title>Phiếu xuất kho - ${order.order_number}</title>
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
          td.center { text-align: center; }
          .signatures { display: flex; justify-content: space-between; text-align: center; margin-top: 24px; }
          .signatures .col { flex: 1; }
          .signatures .hint { font-size: 11px; color: #555; }
          .signatures .space { height: 64px; }
          @media print { @page { margin: 14mm; } }
        </style>
      </head>
      <body>
        ${buildPrintHeader(settings)}

        <h1>PHIẾU XUẤT KHO</h1>
        <div class="meta">
          Ngày ${formatDate(order.created_at)}<br/>
          <b>Số phiếu: ${order.order_number}</b>
        </div>

        <div class="info">
          <b>Khách hàng:</b> ${customer.name || "---"}<br/>
          <b>Địa chỉ:</b> ${customer.address || "---"}<br/>
          <b>Liên hệ:</b> ${customer.phone || "---"}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:8%">STT</th>
              <th>Tên hàng và quy cách</th>
              <th style="width:15%">ĐVT</th>
              <th style="width:15%">Số lượng</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it, i) => `
              <tr>
                <td class="center">${i + 1}</td>
                <td>${it.product_name || it.productName}</td>
                <td class="center">${it.unit || "cái"}</td>
                <td class="center">${it.quantity}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="signatures">
          <div class="col">
            <b>Người nhận hàng</b><br/>
            <span class="hint">(Ký, họ tên)</span>
            <div class="space"></div>
          </div>
          <div class="col">
            ${formatDateLong(order.created_at)}<br/>
            <b>Người giao hàng</b>
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

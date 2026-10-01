import { toast } from "sonner";
import { docSoThanhChu, buildPrintHeader } from "../debt/ReturnReceiptPrinter";

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

/**
 * In phiếu nhập hàng — cùng phong cách với hoá đơn trả hàng, dùng cho
 * nhập hàng từ nhà cung cấp.
 * @param {Object} po - { po_number, created_at, total, status }
 * @param {Array} items - [{ product_name, sku, quantity, unit_price, total }]
 * @param {Object} supplier - { supplier_name, supplier_phone, supplier_address }
 * @param {Object} settings - cài đặt cửa hàng
 */
export const printImportReceipt = ({ po, items = [], settings = {} }) => {
  if (!po) {
    toast.error("Không có thông tin phiếu nhập để in");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Vui lòng cho phép mở cửa sổ bật lên để in");
    return;
  }

  // Công nợ NCC: nếu phiếu đã duyệt (received) thì supplier_balance hiện tại
  // đã CỘNG giá trị phiếu này rồi -> công nợ cũ = hiện tại - giá trị phiếu.
  // Nếu còn nháp (pending) thì công nợ hiện tại CHƯA tính phiếu này.
  const currentBalance = Number(po.supplier_balance) || 0;
  const isReceived = po.status === "received";
  const balanceBefore = isReceived ? currentBalance - Number(po.total) : currentBalance;
  const balanceAfter = isReceived ? currentBalance : currentBalance + Number(po.total);

  const htmlContent = `
    <html>
      <head>
        <title>Phiếu nhập hàng - ${po.po_number}</title>
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
          @media print { @page { margin: 14mm; } }
        </style>
      </head>
      <body>
        ${buildPrintHeader(settings)}

        <h1>PHIẾU NHẬP HÀNG</h1>
        <div class="meta">
          Ngày ${formatDate(po.actual_delivery || po.created_at)}<br/>
          <b>Số phiếu: ${po.po_number}</b>
        </div>

        <div class="info">
          <b>Nhà cung cấp:</b> ${po.supplier_name || "---"}<br/>
          <b>Địa chỉ:</b> ${po.supplier_address || "---"}<br/>
          <b>Liên hệ:</b> ${po.supplier_phone || "---"}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:5%">STT</th>
              <th>Tên hàng và quy cách</th>
              <th style="width:10%">Số lượng</th>
              <th style="width:16%">Đơn giá</th>
              <th style="width:18%">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (it, i) => `
              <tr>
                <td class="center">${i + 1}</td>
                <td>${it.product_name}${it.sku ? ` <span style="color:#777">[${it.sku}]</span>` : ""}</td>
                <td class="center">${it.quantity}</td>
                <td class="num">${formatCurrency(it.unit_price)}</td>
                <td class="num">${formatCurrency(it.total || it.quantity * it.unit_price)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <table class="totals">
          <tr class="sum"><td class="label">Tổng tiền hàng</td><td class="value" style="width:20%">${formatCurrency(po.total)}</td></tr>
          <tr><td class="label">Công nợ cũ</td><td class="value">${formatCurrency(balanceBefore)}</td></tr>
          <tr class="sum"><td class="label">Công nợ còn phải trả</td><td class="value">${formatCurrency(balanceAfter)}</td></tr>
        </table>

        <div class="bang-chu"><b>Bằng chữ:</b> ${docSoThanhChu(po.total)}</div>

        <div class="signatures">
          <div class="col">
            <b>Người giao hàng</b><br/>
            <span class="hint">(Ký, họ tên)</span>
            <div class="space"></div>
          </div>
          <div class="col">
            Ngày ${formatDate(po.actual_delivery || po.created_at)}<br/>
            <b>Người nhận hàng</b>
            <div class="space"></div>
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

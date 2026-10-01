import { toast } from "sonner";

// ==================== Đọc số tiền bằng chữ (tiếng Việt) ====================
const CHU_SO = [
  "không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín",
];

function docSo3ChuSo(number) {
  const tram = Math.floor(number / 100);
  const chuc = Math.floor((number % 100) / 10);
  const donvi = number % 10;
  const parts = [];
  if (tram === 0 && chuc === 0 && donvi === 0) return "";
  if (tram !== 0) {
    parts.push(`${CHU_SO[tram]} trăm`);
  }
  if (chuc === 0 && donvi !== 0 && tram !== 0) parts.push("linh");
  if (chuc >= 2) parts.push(`${CHU_SO[chuc]} mươi`);
  if (chuc === 1) parts.push("mười");
  if (donvi === 1 && chuc >= 2) parts.push("mốt");
  else if (donvi === 5 && chuc !== 0) parts.push("lăm");
  else if (donvi !== 0) parts.push(CHU_SO[donvi]);
  return parts.join(" ");
}

export function docSoThanhChu(soTien) {
  const n = Math.round(Math.abs(soTien || 0));
  if (n === 0) return "Không đồng";

  const DV_BLOCK = ["", "nghìn", "triệu", "tỷ"];
  let so = n;
  const blocks = [];
  while (so > 0) {
    blocks.push(so % 1000);
    so = Math.floor(so / 1000);
  }

  const parts = [];
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i] === 0) continue;
    const text = docSo3ChuSo(blocks[i]);
    if (text) parts.push(`${text}${DV_BLOCK[i] ? " " + DV_BLOCK[i] : ""}`);
  }

  let result = parts.join(" ");
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return `${result} đồng chẵn`;
}

// ==================== In phiếu trả hàng ====================
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

// "Ngày 17 tháng 08 năm 2026" — dùng cho dòng ký tên
const formatDateLong = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `Ngày ${dd} tháng ${mm} năm ${d.getFullYear()}`;
};

// Khối tiêu đề in 2 cột: trái = tên cửa hàng + địa chỉ/SĐT + tài khoản ngân
// hàng; phải = tên gian hàng phụ + mô tả mặt hàng. Dùng chung cho mọi phiếu in.
export const buildPrintHeader = (settings = {}) => `
  <div class="header">
    <div class="col">
      <b>${(settings.store_name || "CỬA HÀNG").toUpperCase()}</b><br/>
      ${settings.store_address ? `Địa chỉ: ${settings.store_address}<br/>` : ""}
      ${settings.store_phone ? `Điện thoại/Zalo: ${settings.store_phone}<br/>` : ""}
      ${
        settings.bank_account_no
          ? `STK: ${settings.bank_account_no}${
              settings.bank_name ? " - " + settings.bank_name : ""
            }${settings.bank_owner ? " - " + settings.bank_owner : ""}<br/>`
          : ""
      }
      ${
        settings.bank_account_no_2
          ? `STK: ${settings.bank_name_2 ? settings.bank_name_2 + " - " : ""}${
              settings.bank_account_no_2
            }${settings.bank_owner_2 ? " - " + settings.bank_owner_2 : ""}<br/>`
          : ""
      }
    </div>
    <div class="col" style="text-align:right">
      ${settings.store_subname ? `<b>${settings.store_subname}</b><br/>` : ""}
      ${(settings.store_tagline || "").split("\n").filter(Boolean).map((l) => `${l}<br/>`).join("")}
    </div>
  </div>
`;

/**
 * In hoá đơn trả hàng — đúng mẫu "HÓA ĐƠN TRẢ HÀNG" của cửa hàng.
 * @param {Object} params
 * @param {Object} params.returnDoc - { return_number, created_at, total, discount, subtotal }
 * @param {Array} params.items - [{ product_name, unit, quantity, unit_price, total }]
 * @param {Object} params.customer - { name, address, phone }
 * @param {Object} params.settings - cài đặt cửa hàng
 * @param {number} params.balanceBefore - công nợ cũ (trước khi trả hàng)
 * @param {number} params.balanceAfter - công nợ còn lại (sau khi trả hàng)
 */
export const printReturnReceipt = ({
  returnDoc,
  items = [],
  customer = {},
  settings = {},
  balanceBefore = 0,
  balanceAfter = 0,
}) => {
  if (!returnDoc) {
    toast.error("Không có thông tin phiếu trả hàng để in");
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
        <title>Hóa đơn trả hàng - ${returnDoc.return_number}</title>
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

        <h1>HÓA ĐƠN TRẢ HÀNG</h1>
        <div class="meta">
          Ngày ${formatDate(returnDoc.created_at)}<br/>
          <b>Số HĐ: ${returnDoc.return_number}</b>
        </div>

        <div class="info">
          <b>Khách hàng:</b> ${customer.name || "---"}<br/>
          <b>Địa chỉ:</b> ${customer.address || "---"}<br/>
          <b>Liên hệ:</b> ${customer.phone || "---"}
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
            ${items
              .map(
                (it, i) => `
              <tr>
                <td class="center">${i + 1}</td>
                <td>${it.product_name}</td>
                <td class="center">${it.unit || "cái"}</td>
                <td class="center">${it.quantity}</td>
                <td class="num">${formatCurrency(it.unit_price)}</td>
                <td class="num">0</td>
                <td class="num">${formatCurrency(it.total)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <table class="totals">
          <tr><td class="label">Tổng tiền hàng</td><td class="value" style="width:20%">${formatCurrency(returnDoc.subtotal)}</td></tr>
          <tr><td class="label">Chiết khấu hóa đơn</td><td class="value">${formatCurrency(returnDoc.discount)}</td></tr>
          <tr class="sum"><td class="label">Tổng cộng</td><td class="value">${formatCurrency(returnDoc.total)}</td></tr>
          <tr><td class="label">Công nợ cũ</td><td class="value">${formatCurrency(balanceBefore)}</td></tr>
          <tr><td class="label">Khách thanh toán</td><td class="value">${formatCurrency(0)}</td></tr>
          <tr class="sum"><td class="label">Công nợ còn lại</td><td class="value">${formatCurrency(balanceAfter)}</td></tr>
        </table>

        <div class="bang-chu"><b>Bằng chữ:</b> ${docSoThanhChu(returnDoc.total)}</div>

        <div class="signatures">
          <div class="col">
            <b>Người trả hàng</b><br/>
            <span class="hint">(Ký, họ tên)</span>
            <div class="space"></div>
          </div>
          <div class="col">
            ${formatDateLong(returnDoc.created_at)}<br/>
            <b>Người bán hàng</b>
            <div class="space"></div>
            ${settings.seller_name ? `<i>${settings.seller_name}</i>` : ""}
          </div>
        </div>

        <div class="policy">
          Vui lòng kiểm tra kỹ trước khi giao và nhận hàng.<br/>
          Hóa đơn trên chưa bao gồm VAT.<br/>
          Hàng hóa đổi trả phải còn nguyên vẹn không cháy xước, được đổi trả trong 03 ngày kể từ ngày xuất đơn. (Thu phí 5% đối với hàng trả lại)
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

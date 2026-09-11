import { toast } from "sonner";

/**
 * In phiếu thu tiền khách hàng / phiếu chi trả nhà cung cấp.
 * Dùng chung 1 hàm cho cả 2 loại (đổi nhãn theo `type`).
 *
 * @param {"customer"|"supplier"} type
 * @param {Object} payment - Phiếu vừa tạo (payment_number, amount, payment_method, payment_date, notes)
 * @param {Object} entity - Khách hàng / nhà cung cấp (name, phone, address)
 * @param {Object} settings - Cài đặt cửa hàng
 * @param {number} balanceAfter - Số dư còn lại sau khi ghi phiếu này (nếu có)
 */
export const printDebtReceipt = ({
  type,
  payment,
  entity,
  settings = {},
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

  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value || 0);

  const formatDate = (date) => {
    if (!date) return new Date().toLocaleString("vi-VN");
    return new Date(date).toLocaleString("vi-VN");
  };

  const getPaymentMethodText = (method) => {
    const methods = { cash: "Tiền mặt", transfer: "Chuyển khoản", card: "Thẻ" };
    return methods[method] || "Tiền mặt";
  };

  const title = isCustomer ? "PHIẾU THU TIỀN" : "PHIẾU CHI TRẢ NCC";
  const partnerLabel = isCustomer ? "Khách hàng" : "Nhà cung cấp";

  const htmlContent = `
    <html>
      <head>
        <title>${title} - ${payment.payment_number}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Courier New', monospace;
            padding: 10px;
            max-width: 300px;
            margin: 0 auto;
            font-size: 12px;
            color: #000;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-bottom: 1px dashed #000; margin: 8px 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .header { margin-bottom: 10px; }
          @media print {
            @page { margin: 0; }
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="text-center header">
          <h2 style="margin: 0; font-size: 16px; text-transform: uppercase;">
            ${settings.store_name || "LOSPEC"}
          </h2>
          ${
            settings.store_phone
              ? `<p style="margin: 2px 0; font-size: 10px;">ĐT: ${settings.store_phone}</p>`
              : ""
          }
          ${
            settings.store_address
              ? `<p style="margin: 0; font-size: 10px;">ĐC: ${settings.store_address}</p>`
              : ""
          }
          <p style="margin-top: 10px; font-weight: bold; font-size: 14px;">${title}</p>
        </div>

        <div class="line"></div>

        <div>
          Số phiếu: ${payment.payment_number}<br/>
          Ngày: ${formatDate(payment.payment_date || payment.created_at)}<br/>
          ${partnerLabel}: ${entity?.name || "---"}
          ${entity?.phone ? `<br/>SĐT: ${entity.phone}` : ""}
        </div>

        <div class="line"></div>

        <div class="item bold" style="font-size: 14px;">
          <span>${isCustomer ? "Số tiền thu:" : "Số tiền trả:"}</span>
          <span>${formatCurrency(payment.amount)}</span>
        </div>

        <div class="item" style="margin-top: 5px;">
          <span>Hình thức:</span>
          <span>${getPaymentMethodText(payment.payment_method)}</span>
        </div>

        ${
          payment.notes
            ? `<div class="item"><span>Ghi chú:</span><span>${payment.notes}</span></div>`
            : ""
        }

        ${
          balanceAfter !== undefined && balanceAfter !== null
            ? `
          <div class="line"></div>
          <div class="item bold">
            <span>${isCustomer ? "Còn phải thu:" : "Còn phải trả:"}</span>
            <span>${formatCurrency(balanceAfter)}</span>
          </div>
        `
            : ""
        }

        <div class="line"></div>

        <div class="text-center">
          <p style="font-style: italic; margin-top: 10px;">Cảm ơn quý khách!</p>
          <p style="font-size: 10px;">Powered by LOSPEC POS</p>
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

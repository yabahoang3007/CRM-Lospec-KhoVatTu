import { pool } from "../config/database.js";
import { csvRow } from "../utils/csv.js";

const LEDGER_TYPE_LABEL = {
  customer: {
    charge: "Hóa đơn bán hàng",
    payment: "Phiếu thu",
    return: "Phiếu trả hàng",
  },
  supplier: {
    charge: "Phiếu nhập hàng",
    payment: "Phiếu chi",
  },
};

const formatDateTimeCell = (date) => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}\n${hh}:${mi}`;
};

// Xuất sổ công nợ chi tiết (từng hóa đơn + từng dòng sản phẩm, giống mẫu
// "Công nợ chi tiết khách hàng" quen thuộc) của 1 khách hàng/NCC ra Excel
const exportLedger = (type) => async (req, res) => {
  try {
    const { id } = req.params;
    const isCustomer = type === "customer";
    const table = isCustomer ? "view_customer_debts" : "view_supplier_debts";

    const [debtRes, settingsRes] = await Promise.all([
      pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]),
      pool.query("SELECT store_name, store_address, store_phone FROM app_settings WHERE id = 1"),
    ]);
    if (debtRes.rows.length === 0)
      return res.status(404).json({
        message: isCustomer ? "Khách hàng không tồn tại" : "Nhà cung cấp không tồn tại",
      });
    const entity = debtRes.rows[0];
    const store = settingsRes.rows[0] || {};

    const ledgerQuery = isCustomer
      ? `
        SELECT id, 'charge' AS type, order_number AS code, created_at AS date, total AS amount, notes
        FROM orders WHERE customer_id = $1 AND status = 'completed'
        UNION ALL
        SELECT id, 'payment' AS type, payment_number AS code, created_at AS date, amount, notes
        FROM customer_payments WHERE customer_id = $1
        UNION ALL
        SELECT id, 'return' AS type, return_number AS code, created_at AS date, total AS amount, notes
        FROM customer_returns WHERE customer_id = $1
        ORDER BY date ASC
      `
      : `
        SELECT id, 'charge' AS type, po_number AS code, created_at AS date, total AS amount, notes
        FROM purchase_orders WHERE supplier_id = $1 AND status = 'received'
        UNION ALL
        SELECT id, 'payment' AS type, payment_number AS code, created_at AS date, amount, notes
        FROM supplier_payments WHERE supplier_id = $1
        ORDER BY date ASC
      `;
    const itemsQuery = isCustomer
      ? `
        SELECT oi.order_id AS parent_id, oi.product_sku AS sku, oi.product_name AS name,
               COALESCE(p.unit, '') AS unit, oi.quantity, oi.unit_price, oi.total
        FROM order_items oi
        LEFT JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.customer_id = $1 AND o.status = 'completed'
        UNION ALL
        SELECT cri.return_id AS parent_id, cri.product_sku, cri.product_name,
               COALESCE(p.unit, ''), cri.quantity, cri.unit_price, cri.total
        FROM customer_return_items cri
        LEFT JOIN products p ON p.id = cri.product_id
        JOIN customer_returns cr ON cr.id = cri.return_id
        WHERE cr.customer_id = $1
      `
      : `
        SELECT wt.reference_id AS parent_id, p.sku, p.name,
               COALESCE(p.unit, '') AS unit, wt.quantity, wt.unit_price, wt.total
        FROM warehouse_transactions wt
        JOIN products p ON p.id = wt.product_id
        JOIN purchase_orders po ON po.id = wt.reference_id
        WHERE po.supplier_id = $1 AND po.status = 'received'
          AND wt.transaction_type = 'import' AND wt.reference_type = 'purchase_order'
      `;

    const [ledgerRes, itemsRes] = await Promise.all([
      pool.query(ledgerQuery, [id]),
      pool.query(itemsQuery, [id]),
    ]);

    const itemsByParent = {};
    itemsRes.rows.forEach((row) => {
      (itemsByParent[row.parent_id] ??= []).push(row);
    });

    let debitTotal = 0;
    let creditTotal = 0;
    ledgerRes.rows.forEach((row) => {
      if (row.type === "charge") debitTotal += Number(row.amount) || 0;
      else creditTotal += Number(row.amount) || 0;
    });

    let csv = "﻿";
    csv += csvRow([(store.store_name || "CỬA HÀNG").toUpperCase()]);
    csv += csvRow(["Địa chỉ", store.store_address]);
    csv += csvRow(["Điện thoại", store.store_phone]);
    csv += "\n";
    csv += csvRow([`CÔNG NỢ CHI TIẾT ${isCustomer ? "KHÁCH HÀNG" : "NHÀ CUNG CẤP"} (toàn bộ lịch sử)`]);
    csv += csvRow([
      isCustomer ? "Khách hàng" : "Nhà cung cấp", entity.name, "", "",
      "Nợ đầu kỳ", entity.opening_balance,
    ]);
    csv += csvRow([
      "Điện thoại", entity.phone, "", "",
      "Phát sinh trong kỳ", debitTotal, creditTotal,
    ]);
    csv += csvRow([
      "Địa chỉ", entity.address, "", "",
      "Nợ cuối kỳ", entity.balance,
    ]);
    csv += "\n";

    csv += csvRow(["Thời gian", "Mã", "Diễn giải", "ĐVT", "SL", "Đơn giá", "Thành tiền", "Ghi nợ", "Ghi có"]);
    ledgerRes.rows.forEach((row) => {
      const amount = Number(row.amount) || 0;
      csv += csvRow([
        formatDateTimeCell(row.date),
        row.code,
        LEDGER_TYPE_LABEL[type][row.type],
        "", "", "", "",
        row.type === "charge" ? amount : "",
        row.type !== "charge" ? amount : "",
      ]);
      (itemsByParent[row.id] || []).forEach((it) => {
        csv += csvRow([
          "", it.sku, it.name, it.unit, it.quantity, it.unit_price, it.total, "", "",
        ]);
      });
    });

    csv += "\n";
    csv += csvRow(["", "", "", "", "", "", "", `Ngày xuất: ${new Date().toLocaleString("vi-VN")}`]);
    csv += "\n";
    csv += csvRow([isCustomer ? "Khách hàng" : "Nhà cung cấp", "", "", "", "Người lập biểu", "", "", "TM Công ty"]);
    csv += csvRow(["(Ký, họ tên)", "", "", "", "(Ký, họ tên)", "", "", "(Ký, họ tên)"]);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=CongNoChiTiet_${entity.name.replace(/[^\w]+/g, "_")}_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const exportCustomerLedger = exportLedger("customer");
export const exportSupplierLedger = exportLedger("supplier");

// Danh sách sản phẩm 1 khách hàng từng mua — dùng làm gợi ý khi lập phiếu trả hàng
export const getCustomerPurchasedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.name, p.sku, p.unit, p.price, MAX(o.created_at) AS last_purchased_at
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN products p ON p.id = oi.product_id
       WHERE o.customer_id = $1 AND o.status = 'completed'
       GROUP BY p.id, p.name, p.sku, p.unit, p.price
       ORDER BY last_purchased_at DESC`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== CÔNG NỢ KHÁCH HÀNG ====================

// Danh sách công nợ khách hàng
export const getCustomerDebts = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = `SELECT * FROM view_customer_debts WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (status === "owing") {
      query += ` AND balance > 0`;
    } else if (status === "settled") {
      query += ` AND balance <= 0`;
    }

    query += ` ORDER BY balance DESC`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Chi tiết công nợ + sổ chi tiết (hóa đơn + phiếu thu) của 1 khách hàng
export const getCustomerDebtDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const debtRes = await pool.query(
      "SELECT * FROM view_customer_debts WHERE id = $1",
      [id]
    );
    if (debtRes.rows.length === 0)
      return res.status(404).json({ message: "Khách hàng không tồn tại" });

    const ledgerQuery = `
      SELECT id, 'charge' AS type, order_number AS code, created_at AS date, total AS amount, notes
      FROM orders WHERE customer_id = $1 AND status = 'completed'
      UNION ALL
      SELECT id, 'payment' AS type, payment_number AS code, created_at AS date, amount, notes
      FROM customer_payments WHERE customer_id = $1
      UNION ALL
      SELECT id, 'return' AS type, return_number AS code, created_at AS date, total AS amount, notes
      FROM customer_returns WHERE customer_id = $1
      ORDER BY date ASC
    `;
    const ledgerRes = await pool.query(ledgerQuery, [id]);

    res.status(200).json({ ...debtRes.rows[0], ledger: ledgerRes.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo phiếu thu tiền khách hàng
export const createCustomerPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, order_id, payment_method, payment_date, notes } =
      req.body;
    const userId = req.user.id;

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: "Số tiền thu phải lớn hơn 0" });

    await client.query("BEGIN");

    const customerRes = await client.query(
      "SELECT id FROM customers WHERE id = $1",
      [id]
    );
    if (customerRes.rows.length === 0)
      throw new Error("Khách hàng không tồn tại");

    const paymentNumber = `PT-${Date.now().toString().slice(-8)}`;

    const insertQuery = `
      INSERT INTO customer_payments
      (payment_number, customer_id, order_id, amount, payment_method, payment_date, notes, user_id)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      paymentNumber,
      id,
      order_id || null,
      amount,
      payment_method || "cash",
      payment_date || null,
      notes || null,
      userId,
    ]);

    // Nếu thu theo hóa đơn cụ thể -> cập nhật lại trạng thái thanh toán của hóa đơn (chỉ để hiển thị badge)
    if (order_id) {
      const orderRes = await client.query(
        "SELECT total FROM orders WHERE id = $1",
        [order_id]
      );
      if (orderRes.rows.length > 0) {
        const paidRes = await client.query(
          "SELECT COALESCE(SUM(amount),0) AS paid FROM customer_payments WHERE order_id = $1",
          [order_id]
        );
        const total = Number(orderRes.rows[0].total);
        const paid = Number(paidRes.rows[0].paid);
        const newStatus =
          paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
        await client.query(
          "UPDATE orders SET payment_status = $1 WHERE id = $2",
          [newStatus, order_id]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Xóa (hủy) phiếu thu
export const deleteCustomerPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await pool.query(
      "DELETE FROM customer_payments WHERE id = $1 RETURNING id",
      [paymentId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Phiếu thu không tồn tại" });
    res.status(200).json({ message: "Đã xóa phiếu thu" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo phiếu trả hàng (khách trả lại sản phẩm) — giảm công nợ + hoàn tồn kho
export const createCustomerReturn = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { items, discount, order_id, notes } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0)
      return res.status(400).json({ message: "Chưa chọn sản phẩm trả lại" });

    await client.query("BEGIN");

    const customerRes = await client.query(
      "SELECT id, name, phone, address FROM customers WHERE id = $1",
      [id]
    );
    if (customerRes.rows.length === 0)
      throw new Error("Khách hàng không tồn tại");

    const subtotal = items.reduce(
      (s, it) => s + Number(it.quantity) * Number(it.unit_price),
      0
    );
    const finalDiscount = Number(discount) || 0;
    if (finalDiscount > subtotal)
      throw new Error(
        "Chiết khấu hoá đơn không được lớn hơn tổng tiền hàng trả lại"
      );
    const total = subtotal - finalDiscount;
    // Số phiếu dạng TH000001, TH000002... khớp quy ước đánh số của cửa hàng
    const countRes = await client.query(
      "SELECT COUNT(*) + 1 AS next FROM customer_returns"
    );
    const returnNumber = `TH${String(countRes.rows[0].next).padStart(6, "0")}`;

    const returnRes = await client.query(
      `INSERT INTO customer_returns
       (return_number, customer_id, order_id, subtotal, discount, total, notes, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        returnNumber,
        id,
        order_id || null,
        subtotal,
        finalDiscount,
        total,
        notes || null,
        userId,
      ]
    );
    const returnRow = returnRes.rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO customer_return_items
         (return_id, product_id, product_name, product_sku, quantity, unit_price, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          returnRow.id,
          it.product_id || null,
          it.product_name,
          it.product_sku || null,
          it.quantity,
          it.unit_price,
          Number(it.quantity) * Number(it.unit_price),
        ]
      );
      // Hàng trả lại -> cộng lại vào tồn kho
      if (it.product_id) {
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2",
          [it.quantity, it.product_id]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({
      ...returnRow,
      items,
      customer: customerRes.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Xóa (hủy) phiếu trả hàng — trừ lại tồn kho đã cộng nhầm
export const deleteCustomerReturn = async (req, res) => {
  const client = await pool.connect();
  try {
    const { returnId } = req.params;
    await client.query("BEGIN");

    const itemsRes = await client.query(
      "SELECT product_id, quantity FROM customer_return_items WHERE return_id = $1",
      [returnId]
    );
    for (const it of itemsRes.rows) {
      if (it.product_id) {
        await client.query(
          "UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2",
          [it.quantity, it.product_id]
        );
      }
    }

    const result = await client.query(
      "DELETE FROM customer_returns WHERE id = $1 RETURNING id",
      [returnId]
    );
    if (result.rowCount === 0) throw new Error("Phiếu trả hàng không tồn tại");

    await client.query("COMMIT");
    res.status(200).json({ message: "Đã xóa phiếu trả hàng" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Danh sách TOÀN BỘ phiếu trả hàng (của mọi khách hàng) — dùng cho trang
// lịch sử trả hàng, khác với sổ công nợ (xem theo từng khách)
export const getAllCustomerReturns = async (req, res) => {
  try {
    const { search } = req.query;

    let query = `
      SELECT r.*, c.name AS customer_name, c.phone AS customer_phone,
        (SELECT COALESCE(SUM(quantity), 0) FROM customer_return_items WHERE return_id = r.id) AS total_quantity
      FROM customer_returns r
      JOIN customers c ON r.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (c.name ILIKE $${idx} OR r.return_number ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy chi tiết 1 phiếu trả hàng (dùng để in lại)
export const getCustomerReturnDetail = async (req, res) => {
  try {
    const { returnId } = req.params;
    const returnRes = await pool.query(
      `SELECT r.*, c.name AS customer_name, c.phone AS customer_phone, c.address AS customer_address
       FROM customer_returns r JOIN customers c ON r.customer_id = c.id
       WHERE r.id = $1`,
      [returnId]
    );
    if (returnRes.rows.length === 0)
      return res.status(404).json({ message: "Phiếu trả hàng không tồn tại" });

    const itemsRes = await pool.query(
      "SELECT * FROM customer_return_items WHERE return_id = $1",
      [returnId]
    );

    res.status(200).json({ ...returnRes.rows[0], items: itemsRes.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== CÔNG NỢ NHÀ CUNG CẤP ====================

// Danh sách công nợ nhà cung cấp
export const getSupplierDebts = async (req, res) => {
  try {
    const { search, status } = req.query;

    let query = `SELECT * FROM view_supplier_debts WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (name ILIKE $${idx} OR phone ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (status === "owing") {
      query += ` AND balance > 0`;
    } else if (status === "settled") {
      query += ` AND balance <= 0`;
    }

    query += ` ORDER BY balance DESC`;

    const result = await pool.query(query, params);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Chi tiết công nợ + sổ chi tiết (phiếu nhập + phiếu chi) của 1 nhà cung cấp
export const getSupplierDebtDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const debtRes = await pool.query(
      "SELECT * FROM view_supplier_debts WHERE id = $1",
      [id]
    );
    if (debtRes.rows.length === 0)
      return res.status(404).json({ message: "Nhà cung cấp không tồn tại" });

    const ledgerQuery = `
      SELECT id, 'charge' AS type, po_number AS code, created_at AS date, total AS amount, notes
      FROM purchase_orders WHERE supplier_id = $1 AND status = 'received'
      UNION ALL
      SELECT id, 'payment' AS type, payment_number AS code, created_at AS date, amount, notes
      FROM supplier_payments WHERE supplier_id = $1
      ORDER BY date ASC
    `;
    const ledgerRes = await pool.query(ledgerQuery, [id]);

    res.status(200).json({ ...debtRes.rows[0], ledger: ledgerRes.rows });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo phiếu chi trả nhà cung cấp
export const createSupplierPayment = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, purchase_order_id, payment_method, payment_date, notes } =
      req.body;
    const userId = req.user.id;

    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ message: "Số tiền trả phải lớn hơn 0" });

    await client.query("BEGIN");

    const supplierRes = await client.query(
      "SELECT id FROM suppliers WHERE id = $1",
      [id]
    );
    if (supplierRes.rows.length === 0)
      throw new Error("Nhà cung cấp không tồn tại");

    const paymentNumber = `PC-${Date.now().toString().slice(-8)}`;

    const insertQuery = `
      INSERT INTO supplier_payments
      (payment_number, supplier_id, purchase_order_id, amount, payment_method, payment_date, notes, user_id)
      VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      paymentNumber,
      id,
      purchase_order_id || null,
      amount,
      payment_method || "cash",
      payment_date || null,
      notes || null,
      userId,
    ]);

    if (purchase_order_id) {
      const poRes = await client.query(
        "SELECT total FROM purchase_orders WHERE id = $1",
        [purchase_order_id]
      );
      if (poRes.rows.length > 0) {
        const paidRes = await client.query(
          "SELECT COALESCE(SUM(amount),0) AS paid FROM supplier_payments WHERE purchase_order_id = $1",
          [purchase_order_id]
        );
        const total = Number(poRes.rows[0].total);
        const paid = Number(paidRes.rows[0].paid);
        const newStatus =
          paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";
        await client.query(
          "UPDATE purchase_orders SET payment_status = $1 WHERE id = $2",
          [newStatus, purchase_order_id]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

// Xóa (hủy) phiếu chi
export const deleteSupplierPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await pool.query(
      "DELETE FROM supplier_payments WHERE id = $1 RETURNING id",
      [paymentId]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Phiếu chi không tồn tại" });
    res.status(200).json({ message: "Đã xóa phiếu chi" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

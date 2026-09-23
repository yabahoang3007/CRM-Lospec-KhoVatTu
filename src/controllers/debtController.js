import { pool } from "../config/database.js";

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

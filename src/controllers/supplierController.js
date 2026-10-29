import { pool } from "../config/database.js";
import { csvRow } from "../utils/csv.js";

// Xuất toàn bộ danh sách nhà cung cấp ra file Excel (CSV), kèm công nợ hiện tại
export const exportSuppliers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.name, v.phone, v.address, s.contact_person, s.tax_code, v.balance
       FROM view_supplier_debts v
       JOIN suppliers s ON s.id = v.id
       ORDER BY v.name`
    );

    let csv = "﻿";
    csv += csvRow([
      "Tên nhà cung cấp",
      "Số điện thoại",
      "Địa chỉ",
      "Người liên hệ",
      "Mã số thuế",
      "Công nợ hiện tại",
    ]);
    result.rows.forEach((s) => {
      csv += csvRow([
        s.name,
        s.phone,
        s.address,
        s.contact_person,
        s.tax_code,
        s.balance,
      ]);
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=DanhSachNhaCungCap_${new Date().toISOString().slice(0, 10)}.csv`
    );
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh sách nhà cung cấp
export const getAllSuppliers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM suppliers WHERE is_active = true ORDER BY created_at DESC"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tạo nhà cung cấp mới
export const createSupplier = async (req, res) => {
  try {
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      tax_code,
      opening_balance,
    } = req.body;

    const query = `
      INSERT INTO suppliers (name, contact_person, email, phone, address, tax_code, opening_balance)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      name,
      contact_person,
      email,
      phone,
      address,
      tax_code,
      opening_balance || 0,
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cập nhật nhà cung cấp
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      contact_person,
      email,
      phone,
      address,
      tax_code,
      opening_balance,
    } = req.body;

    const query = `
      UPDATE suppliers
      SET name=$1, contact_person=$2, email=$3, phone=$4, address=$5, tax_code=$6,
          opening_balance=COALESCE($7, opening_balance), updated_at=NOW()
      WHERE id=$8
      RETURNING *
    `;
    const values = [
      name,
      contact_person,
      email,
      phone,
      address,
      tax_code,
      opening_balance === undefined ? null : opening_balance,
      id,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa mềm nhà cung cấp
export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE suppliers SET is_active = false WHERE id = $1", [id]);
    res.status(200).json({ message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
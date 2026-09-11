-- ============================================================
-- MIGRATION: Module Công nợ & Thu chi (Debt & Payments)
-- Chạy file này 1 lần trên DB đang chạy (local hoặc Neon) để bổ
-- sung tính năng công nợ khách hàng / nhà cung cấp.
-- An toàn để chạy nhiều lần (idempotent).
-- ============================================================

-- 1. Nợ đầu kỳ (opening balance)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance numeric(15,2) NOT NULL DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance numeric(15,2) NOT NULL DEFAULT 0;

-- 2. Phiếu thu tiền khách hàng
CREATE TABLE IF NOT EXISTS customer_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_number character varying(50) UNIQUE,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
    amount numeric(15,2) NOT NULL CHECK (amount > 0),
    payment_method character varying(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card')),
    payment_date date DEFAULT CURRENT_DATE,
    notes text,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Phiếu chi trả nhà cung cấp
CREATE TABLE IF NOT EXISTS supplier_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_number character varying(50) UNIQUE,
    supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
    amount numeric(15,2) NOT NULL CHECK (amount > 0),
    payment_method character varying(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card')),
    payment_date date DEFAULT CURRENT_DATE,
    notes text,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_payments_customer ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payments_order ON customer_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_po ON supplier_payments(purchase_order_id);

-- 4. View: Công nợ khách hàng (còn phải thu)
CREATE OR REPLACE VIEW view_customer_debts AS
SELECT
  c.id, c.name, c.phone, c.address, c.customer_type, c.opening_balance,
  COALESCE(o.purchased, 0) AS purchased_total,
  COALESCE(p.paid, 0) AS paid_total,
  (c.opening_balance + COALESCE(o.purchased, 0) - COALESCE(p.paid, 0)) AS balance
FROM customers c
LEFT JOIN (
  SELECT customer_id, SUM(total) AS purchased
  FROM orders WHERE status = 'completed'
  GROUP BY customer_id
) o ON o.customer_id = c.id
LEFT JOIN (
  SELECT customer_id, SUM(amount) AS paid
  FROM customer_payments
  GROUP BY customer_id
) p ON p.customer_id = c.id
WHERE c.is_active = true;

-- 5. View: Công nợ nhà cung cấp (còn phải trả)
CREATE OR REPLACE VIEW view_supplier_debts AS
SELECT
  s.id, s.name, s.phone, s.address, s.opening_balance,
  COALESCE(po.purchased, 0) AS purchased_total,
  COALESCE(sp.paid, 0) AS paid_total,
  (s.opening_balance + COALESCE(po.purchased, 0) - COALESCE(sp.paid, 0)) AS balance
FROM suppliers s
LEFT JOIN (
  SELECT supplier_id, SUM(total) AS purchased
  FROM purchase_orders WHERE status = 'received'
  GROUP BY supplier_id
) po ON po.supplier_id = s.id
LEFT JOIN (
  SELECT supplier_id, SUM(amount) AS paid
  FROM supplier_payments
  GROUP BY supplier_id
) sp ON sp.supplier_id = s.id
WHERE s.is_active = true;

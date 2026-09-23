-- Cho phép tồn kho âm (phản ánh thực tế bán vượt tồn trước khi nhập bù,
-- khớp với dữ liệu gốc trong file Excel). An toàn chạy nhiều lần.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_quantity_check;

-- Mở rộng cột SĐT: một vài dòng dữ liệu gốc có 2 số điện thoại trong 1 ô.
-- Phải drop/recreate 2 view công nợ vì chúng phụ thuộc cột phone.
DROP VIEW IF EXISTS view_customer_debts;
DROP VIEW IF EXISTS view_supplier_debts;
ALTER TABLE customers ALTER COLUMN phone TYPE varchar(50);
ALTER TABLE suppliers ALTER COLUMN phone TYPE varchar(50);

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

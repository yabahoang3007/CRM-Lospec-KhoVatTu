-- Module: Phiếu trả hàng (khách trả lại sản phẩm) — giảm công nợ + hoàn
-- tồn kho. An toàn chạy nhiều lần.

CREATE TABLE IF NOT EXISTS customer_returns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number character varying(50) UNIQUE,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
    subtotal numeric(15,2) DEFAULT 0 CHECK (subtotal >= 0),
    discount numeric(15,2) DEFAULT 0 CHECK (discount >= 0),
    total numeric(15,2) NOT NULL CHECK (total >= 0),
    notes text,
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_return_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id uuid REFERENCES customer_returns(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    product_name character varying(255) NOT NULL,
    product_sku character varying(100),
    quantity integer NOT NULL CHECK (quantity > 0),
    unit_price numeric(15,2) NOT NULL DEFAULT 0,
    total numeric(15,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customer_returns_customer ON customer_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_return_items_return ON customer_return_items(return_id);

DROP VIEW IF EXISTS view_customer_debts;
CREATE OR REPLACE VIEW view_customer_debts AS
SELECT
  c.id, c.name, c.phone, c.address, c.customer_type, c.opening_balance,
  COALESCE(o.purchased, 0) AS purchased_total,
  COALESCE(p.paid, 0) AS paid_total,
  COALESCE(r.returned, 0) AS returned_total,
  (c.opening_balance + COALESCE(o.purchased, 0) - COALESCE(p.paid, 0) - COALESCE(r.returned, 0)) AS balance
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
LEFT JOIN (
  SELECT customer_id, SUM(total) AS returned
  FROM customer_returns
  GROUP BY customer_id
) r ON r.customer_id = c.id
WHERE c.is_active = true;

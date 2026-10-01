-- Đổi mã hoá đơn bán hàng tự sinh từ "ORD-YYYYMMDD-XXXXX" sang "HD000001"
-- (khớp đúng quy ước HDxxxxxx trong dữ liệu lịch sử nhập từ Excel). An
-- toàn chạy nhiều lần — tự nối tiếp từ số HD lớn nhất hiện có.
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_number BIGINT;
BEGIN
  SELECT COALESCE(MAX((substring(order_number from 3))::bigint), 0) + 1
    INTO next_number
    FROM orders
    WHERE order_number ~ '^HD[0-9]+$';
  NEW.order_number := 'HD' || LPAD(next_number::TEXT, 6, '0');
  RETURN NEW;
END;
$$;

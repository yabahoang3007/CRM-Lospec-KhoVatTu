-- Bổ sung các trường cần thiết để in phiếu đúng mẫu thật của cửa hàng
-- (2 cột tiêu đề, 2 số tài khoản, tên người bán). An toàn chạy nhiều lần.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS store_subname character varying(255);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS store_tagline text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS bank_account_no_2 character varying(50);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS bank_name_2 character varying(100);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS bank_owner_2 character varying(100);
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS seller_name character varying(100);

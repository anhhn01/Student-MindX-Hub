-- Migration 00009: Add token expiry settings for user session management
-- Ràng buộc: Mặc định 7 ngày, tối thiểu 1 ngày, tối đa 30 ngày.

-- 1. Thêm cột token_expiry_days vào bảng users nếu chưa có
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'token_expiry_days'
  ) THEN
    ALTER TABLE users ADD COLUMN token_expiry_days INT NOT NULL DEFAULT 7;
    ALTER TABLE users ADD CONSTRAINT chk_token_expiry_days CHECK (token_expiry_days >= 1 AND token_expiry_days <= 30);
  END IF;
END $$;

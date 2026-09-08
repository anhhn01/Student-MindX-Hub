-- Migration 00010: Create system_settings table for persistent multi-environment settings
-- Bảng system_settings dùng để lưu cấu hình toàn cục (như chế độ bảo trì hệ thống)
-- đảm bảo hoạt động bền vững trên môi trường Serverless (Vercel Production) và Local.

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Bật Row Level Security (RLS)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc công khai (SELECT) để Middleware và Client có thể kiểm tra trạng thái bảo trì tức thời
DROP POLICY IF EXISTS "Allow public read access to system_settings" ON system_settings;
CREATE POLICY "Allow public read access to system_settings"
ON system_settings FOR SELECT
USING (true);

-- Cho phép service role cập nhật / ghi dữ liệu cấu hình
DROP POLICY IF EXISTS "Allow service role full access to system_settings" ON system_settings;
CREATE POLICY "Allow service role full access to system_settings"
ON system_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Khởi tạo giá trị mặc định cho cấu hình bảo trì hệ thống
INSERT INTO system_settings (key, value, updated_by)
VALUES (
  'maintenance_status',
  '{"isEnabled": false, "expectedEndTime": null, "reason": "Hệ thống đang được nâng cấp và bảo trì định kỳ.", "updatedAt": "2026-09-08T00:00:00.000Z", "updatedBy": "system", "environment": "production"}'::jsonb,
  'system'
)
ON CONFLICT (key) DO NOTHING;

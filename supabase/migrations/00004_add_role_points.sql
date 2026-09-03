-- Migration: Thêm điểm phân cấp vai trò (role points)
-- Nguyên tắc: Điểm càng thấp, quyền hạn role càng cao
-- Admin = 1 (cao nhất)
-- Teacher Full-time = 2
-- Teacher Part-time = 3 (thấp nhất)

ALTER TABLE roles 
ADD COLUMN IF NOT EXISTS points INT DEFAULT 3;

-- Cập nhật điểm cho từng vai trò hiện tại
UPDATE roles SET points = 1 WHERE LOWER(name) LIKE '%admin%';
UPDATE roles SET points = 2 WHERE LOWER(name) LIKE '%full-time%' OR LOWER(name) LIKE '%fulltime%';
UPDATE roles SET points = 3 WHERE LOWER(name) LIKE '%part-time%' OR LOWER(name) LIKE '%parttime%';

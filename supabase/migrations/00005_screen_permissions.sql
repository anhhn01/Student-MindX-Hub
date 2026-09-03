-- Migration 00005: Screen Permissions by Role
-- Create menus table (Hỗ trợ cấu trúc phân cấp Menu chính - Menu phụ)
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  path TEXT,
  parent_id UUID REFERENCES menus(id) ON DELETE CASCADE,
  order_index INT DEFAULT 0,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create role_menu_permissions table (Phân quyền hiển thị màn hình theo từng vai trò)
CREATE TABLE IF NOT EXISTS role_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, menu_id)
);

-- Enable RLS
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_menu_permissions ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow public read access to menus"
ON menus FOR SELECT
USING (true);

CREATE POLICY "Allow public read access to role_menu_permissions"
ON role_menu_permissions FOR SELECT
USING (true);

-- Insert Default Menus (Menu chính: Quản lý hệ thống, Menu phụ: Quản lý tài khoản & Quản lý phân quyền màn hình)
DO $$
DECLARE
  v_system_menu_id UUID;
  v_user_menu_id UUID;
  v_perm_menu_id UUID;
  v_admin_role_id UUID;
  v_ft_role_id UUID;
  v_pt_role_id UUID;
BEGIN
  -- 1. Insert or get Menu chính "Quản lý hệ thống"
  INSERT INTO menus (code, name, path, parent_id, order_index, icon)
  VALUES ('system_management', 'Quản lý hệ thống', NULL, NULL, 1, 'Settings')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_system_menu_id;

  IF v_system_menu_id IS NULL THEN
    SELECT id INTO v_system_menu_id FROM menus WHERE code = 'system_management';
  END IF;

  -- 2. Insert Menu phụ "Quản lý tài khoản"
  INSERT INTO menus (code, name, path, parent_id, order_index, icon)
  VALUES ('user_management', 'Quản lý tài khoản', '/admin/dashboard', v_system_menu_id, 1, 'Users')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id
  RETURNING id INTO v_user_menu_id;

  IF v_user_menu_id IS NULL THEN
    SELECT id INTO v_user_menu_id FROM menus WHERE code = 'user_management';
  END IF;

  -- 3. Insert Menu phụ "Quản lý phân quyền màn hình"
  INSERT INTO menus (code, name, path, parent_id, order_index, icon)
  VALUES ('screen_permission_management', 'Quản lý phân quyền màn hình', '/admin/permissions', v_system_menu_id, 2, 'ShieldCheck')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id
  RETURNING id INTO v_perm_menu_id;

  IF v_perm_menu_id IS NULL THEN
    SELECT id INTO v_perm_menu_id FROM menus WHERE code = 'screen_permission_management';
  END IF;

  -- 4. Get Role IDs
  SELECT id INTO v_admin_role_id FROM roles WHERE LOWER(name) LIKE '%admin%' LIMIT 1;
  SELECT id INTO v_ft_role_id FROM roles WHERE LOWER(name) LIKE '%full-time%' OR LOWER(name) LIKE '%fulltime%' LIMIT 1;
  SELECT id INTO v_pt_role_id FROM roles WHERE LOWER(name) LIKE '%part-time%' OR LOWER(name) LIKE '%parttime%' LIMIT 1;

  -- 5. Seed Permissions:
  -- Admin role: Bật toàn bộ menu chính và menu phụ
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
    VALUES 
      (v_admin_role_id, v_system_menu_id, true),
      (v_admin_role_id, v_user_menu_id, true),
      (v_admin_role_id, v_perm_menu_id, true)
    ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- Teacher Full-time: Mặc định tắt các menu quản trị hệ thống
  IF v_ft_role_id IS NOT NULL THEN
    INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
    VALUES 
      (v_ft_role_id, v_system_menu_id, false),
      (v_ft_role_id, v_user_menu_id, false),
      (v_ft_role_id, v_perm_menu_id, false)
    ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

  -- Teacher Part-time: Mặc định tắt các menu quản trị hệ thống
  IF v_pt_role_id IS NOT NULL THEN
    INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
    VALUES 
      (v_pt_role_id, v_system_menu_id, false),
      (v_pt_role_id, v_user_menu_id, false),
      (v_pt_role_id, v_perm_menu_id, false)
    ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
  END IF;

END $$;

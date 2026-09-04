-- Migration 00007: User Affiliated Centres Management (Quản lý cơ sở trực thuộc của tài khoản)

-- 1. Create user_centres table
CREATE TABLE IF NOT EXISTS user_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  centre_id TEXT NOT NULL,
  centre_name TEXT NOT NULL,
  centre_short_name TEXT,
  centre_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, centre_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_centres_user_id ON user_centres(user_id);
CREATE INDEX IF NOT EXISTS idx_user_centres_centre_id ON user_centres(centre_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_centres ENABLE ROW LEVEL SECURITY;

-- Allow public read access to user_centres
CREATE POLICY "Allow public read access to user_centres"
ON user_centres FOR SELECT
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to user_centres"
ON user_centres FOR ALL
USING (true);

-- 2. Register new sub-menu in menus table if table exists
DO $$
DECLARE
  v_system_menu_id UUID;
  v_centre_menu_id UUID;
  v_admin_role_id UUID;
  v_ft_role_id UUID;
  v_pt_role_id UUID;
BEGIN
  -- Get Menu chính "Quản lý hệ thống"
  SELECT id INTO v_system_menu_id FROM menus WHERE code = 'system_management' LIMIT 1;

  IF v_system_menu_id IS NOT NULL THEN
    -- Insert Menu phụ "Quản lý cơ sở trực thuộc"
    INSERT INTO menus (code, name, path, parent_id, order_index, icon)
    VALUES (
      'user_centre_management',
      'Quản lý cơ sở trực thuộc',
      '/admin/system-management/user_centres',
      v_system_menu_id,
      3,
      'Building2'
    )
    ON CONFLICT (code) DO UPDATE SET 
      name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      order_index = EXCLUDED.order_index,
      icon = EXCLUDED.icon
    RETURNING id INTO v_centre_menu_id;

    IF v_centre_menu_id IS NULL THEN
      SELECT id INTO v_centre_menu_id FROM menus WHERE code = 'user_centre_management';
    END IF;

    -- Get Role IDs
    SELECT id INTO v_admin_role_id FROM roles WHERE LOWER(name) LIKE '%admin%' LIMIT 1;
    SELECT id INTO v_ft_role_id FROM roles WHERE LOWER(name) LIKE '%full-time%' OR LOWER(name) LIKE '%fulltime%' LIMIT 1;
    SELECT id INTO v_pt_role_id FROM roles WHERE LOWER(name) LIKE '%part-time%' OR LOWER(name) LIKE '%parttime%' LIMIT 1;

    -- Grant default permissions
    IF v_admin_role_id IS NOT NULL AND v_centre_menu_id IS NOT NULL THEN
      INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
      VALUES (v_admin_role_id, v_centre_menu_id, true)
      ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = true;
    END IF;

    IF v_ft_role_id IS NOT NULL AND v_centre_menu_id IS NOT NULL THEN
      INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
      VALUES (v_ft_role_id, v_centre_menu_id, true)
      ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = true;
    END IF;

    IF v_pt_role_id IS NOT NULL AND v_centre_menu_id IS NOT NULL THEN
      INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
      VALUES (v_pt_role_id, v_centre_menu_id, false)
      ON CONFLICT (role_id, menu_id) DO NOTHING;
    END IF;
  END IF;
END $$;

-- Migration 00008: Add Data Inspection & Trial Schedules Menu
-- (Menu chính: Kiểm tra dữ liệu, Menu phụ: Lịch trải nghiệm)

DO $$
DECLARE
  v_inspection_menu_id UUID;
  v_trial_menu_id UUID;
  v_admin_role_id UUID;
  v_ft_role_id UUID;
  v_pt_role_id UUID;
BEGIN
  -- 1. Insert or get Menu chính "Kiểm tra dữ liệu"
  INSERT INTO menus (code, name, path, parent_id, order_index, icon)
  VALUES ('data_inspection', 'Kiểm tra dữ liệu', NULL, NULL, 2, 'Database')
  ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    order_index = EXCLUDED.order_index,
    icon = EXCLUDED.icon
  RETURNING id INTO v_inspection_menu_id;

  IF v_inspection_menu_id IS NULL THEN
    SELECT id INTO v_inspection_menu_id FROM menus WHERE code = 'data_inspection';
  END IF;

  -- 2. Insert Menu phụ "Lịch trải nghiệm"
  INSERT INTO menus (code, name, path, parent_id, order_index, icon)
  VALUES (
    'trial_schedules',
    'Lịch trải nghiệm',
    '/admin/data-inspection/trial_schedules',
    v_inspection_menu_id,
    1,
    'CalendarCheck'
  )
  ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    order_index = EXCLUDED.order_index,
    icon = EXCLUDED.icon
  RETURNING id INTO v_trial_menu_id;

  IF v_trial_menu_id IS NULL THEN
    SELECT id INTO v_trial_menu_id FROM menus WHERE code = 'trial_schedules';
  END IF;

  -- 3. Get Role IDs
  SELECT id INTO v_admin_role_id FROM roles WHERE LOWER(name) LIKE '%admin%' LIMIT 1;
  SELECT id INTO v_ft_role_id FROM roles WHERE LOWER(name) LIKE '%full-time%' OR LOWER(name) LIKE '%fulltime%' LIMIT 1;
  SELECT id INTO v_pt_role_id FROM roles WHERE LOWER(name) LIKE '%part-time%' OR LOWER(name) LIKE '%parttime%' LIMIT 1;

  -- 4. Grant default permissions to roles:
  -- Admin: Luôn bật
  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
    VALUES 
      (v_admin_role_id, v_inspection_menu_id, true),
      (v_admin_role_id, v_trial_menu_id, true)
    ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = true;
  END IF;

  -- Teacher Full-time: Mặc định bật
  IF v_ft_role_id IS NOT NULL THEN
    INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
    VALUES 
      (v_ft_role_id, v_inspection_menu_id, true),
      (v_ft_role_id, v_trial_menu_id, true)
    ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = true;
  END IF;

  -- Teacher Part-time: Mặc định bật để xem lịch cơ sở của mình
  IF v_pt_role_id IS NOT NULL THEN
    INSERT INTO role_menu_permissions (role_id, menu_id, is_enabled)
    VALUES 
      (v_pt_role_id, v_inspection_menu_id, true),
      (v_pt_role_id, v_trial_menu_id, true)
    ON CONFLICT (role_id, menu_id) DO UPDATE SET is_enabled = true;
  END IF;

END $$;

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Default Fallback Roles Permissions
const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  Admin: {
    system_management: true,
    user_management: true,
    screen_permission_management: true,
    user_centre_management: true,
    data_inspection: true,
    trial_schedules: true,
  },
  "Teacher Full-time": {
    system_management: true,
    user_management: true,
    screen_permission_management: true,
    user_centre_management: true,
    data_inspection: true,
    trial_schedules: true,
  },
  "Teacher Part-time": {
    system_management: false,
    user_management: false,
    screen_permission_management: false,
    user_centre_management: false,
    data_inspection: true,
    trial_schedules: true,
  },
};

// In-memory cache for dynamic updates
let memoryPermissions: Record<string, Record<string, boolean>> = { ...DEFAULT_ROLE_PERMISSIONS };

export function getMemoryPermissions(): Record<string, Record<string, boolean>> {
  return memoryPermissions;
}

export function updateMemoryPermissions(perms: Record<string, Record<string, boolean>>): void {
  memoryPermissions = { ...perms };
}

export async function getRoleMenuPermissions(roleName: string): Promise<Record<string, boolean>> {
  if (!roleName) return {};

  const isRoleAdmin = roleName.toLowerCase().includes("admin");
  if (isRoleAdmin) {
    return {
      system_management: true,
      user_management: true,
      screen_permission_management: true,
      user_centre_management: true,
      data_inspection: true,
      trial_schedules: true,
    };
  }

  // 1. Ưu tiên lấy trực tiếp từ database Supabase (bảng role_menu_permissions & menus)
  try {
    const { data: roleRow } = await supabase
      .from("roles")
      .select("id")
      .ilike("name", `%${roleName}%`)
      .maybeSingle();

    if (roleRow) {
      const { data: perms, error } = await supabase
        .from("role_menu_permissions")
        .select("is_enabled, menus ( code )")
        .eq("role_id", roleRow.id);

      if (!error && perms && perms.length > 0) {
        const result: Record<string, boolean> = {
          system_management: false,
          user_management: false,
          screen_permission_management: false,
          user_centre_management: false,
          data_inspection: true,
          trial_schedules: true,
        };
        for (const p of perms as any[]) {
          const code = p.menus?.code;
          if (code) {
            result[code] = p.is_enabled;
          }
        }
        return result;
      }
    }
  } catch (err) {
    // Supabase table chưa tồn tại hoặc lỗi kết nối
  }

  // 2. Tra cứu trong bộ nhớ in-memory cache
  for (const [key, value] of Object.entries(memoryPermissions)) {
    if (
      key.toLowerCase() === roleName.toLowerCase() ||
      key.toLowerCase().includes(roleName.toLowerCase()) ||
      roleName.toLowerCase().includes(key.toLowerCase())
    ) {
      return value;
    }
  }

  return {
    system_management: false,
    user_management: false,
    screen_permission_management: false,
    user_centre_management: false,
    data_inspection: true,
    trial_schedules: true,
  };
}

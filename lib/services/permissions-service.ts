import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PERMISSIONS_FILE = path.join(process.cwd(), "data", "permissions.json");

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  Admin: {
    system_management: true,
    user_management: true,
    screen_permission_management: true,
  },
  "Teacher Full-time": {
    system_management: true,
    user_management: true,
    screen_permission_management: true,
  },
  "Teacher Part-time": {
    system_management: false,
    user_management: false,
    screen_permission_management: false,
  },
};

export function readStoredPermissions(): Record<string, Record<string, boolean>> {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const content = fs.readFileSync(PERMISSIONS_FILE, "utf8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Lỗi đọc file permissions.json:", err);
  }
  return DEFAULT_PERMISSIONS;
}

export function saveStoredPermissions(perms: Record<string, Record<string, boolean>>): void {
  try {
    const dir = path.dirname(PERMISSIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PERMISSIONS_FILE, JSON.stringify(perms, null, 2), "utf8");
  } catch (err) {
    console.error("Lỗi ghi file permissions.json:", err);
  }
}

export async function getRoleMenuPermissions(roleName: string): Promise<Record<string, boolean>> {
  if (!roleName) return {};

  const isRoleAdmin = roleName.toLowerCase().includes("admin");
  if (isRoleAdmin) {
    return {
      system_management: true,
      user_management: true,
      screen_permission_management: true,
    };
  }

  // 1. Thử lấy từ database Supabase nếu bảng đã có
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
    // Supabase table chưa tồn tại, dùng file storage vĩnh viễn
  }

  // 2. Fallback sang file data/permissions.json vĩnh viễn
  const allPerms = readStoredPermissions();

  for (const [key, value] of Object.entries(allPerms)) {
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
  };
}

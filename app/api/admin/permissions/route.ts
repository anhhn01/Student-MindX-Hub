import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRolePoints } from "@/lib/constants/roles";
import {
  getMemoryPermissions,
  updateMemoryPermissions,
} from "@/lib/services/permissions-service";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Default Menu Structure (Quản lý hệ thống: Quản lý tài khoản & Quản lý phân quyền màn hình)
const DEFAULT_MENU_TREE = [
  {
    id: "menu_system_management",
    code: "system_management",
    name: "Quản lý hệ thống",
    is_parent: true,
    children: [
      {
        id: "menu_user_management",
        code: "user_management",
        name: "Quản lý tài khoản",
        path: "/[role]/system-management/users",
        is_parent: false,
        parent_code: "system_management",
      },
      {
        id: "menu_screen_permission",
        code: "screen_permission_management",
        name: "Quản lý phân quyền màn hình",
        path: "/[role]/system-management/screen_permission",
        is_parent: false,
        parent_code: "system_management",
      },
      {
        id: "menu_user_centre",
        code: "user_centre_management",
        name: "Quản lý cơ sở trực thuộc",
        path: "/[role]/system-management/user_centres",
        is_parent: false,
        parent_code: "system_management",
      },
    ],
  },
  {
    id: "menu_data_inspection",
    code: "data_inspection",
    name: "Kiểm tra dữ liệu",
    is_parent: true,
    children: [
      {
        id: "menu_trial_schedules",
        code: "trial_schedules",
        name: "Lịch trải nghiệm",
        path: "/[role]/data-inspection/trial_schedules",
        is_parent: false,
        parent_code: "data_inspection",
      },
    ],
  },
];

export async function GET() {
  try {
    // 1. Lấy danh sách vai trò từ Supabase
    const { data: rolesData } = await supabase
      .from("roles")
      .select("id, name");

    const roles = (rolesData || [
      { id: "1", name: "Admin" },
      { id: "2", name: "Teacher Full-time" },
      { id: "3", name: "Teacher Part-time" },
    ]).map((r) => ({
      id: r.id,
      name: r.name,
      points: getRolePoints(r.name),
    })).sort((a, b) => a.points - b.points);

    // 2. Kiểm tra dữ liệu menu từ Supabase DB
    let menuTree = DEFAULT_MENU_TREE;
    const { data: dbMenus, error: menuError } = await supabase
      .from("menus")
      .select("id, code, name, path, parent_id, order_index")
      .order("order_index", { ascending: true });

    if (!menuError && dbMenus && dbMenus.length > 0) {
      const parents = dbMenus.filter((m) => !m.parent_id);
      menuTree = parents.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        is_parent: true,
        children: dbMenus
          .filter((c) => c.parent_id === p.id)
          .map((c) => ({
            id: c.id,
            code: c.code,
            name: c.name,
            path: c.path,
            is_parent: false,
            parent_code: p.code,
          })),
      }));
    }

    // 3. Khởi tạo phân quyền mặc định
    const cachedPerms = getMemoryPermissions();
    let permissionsResult: Record<string, Record<string, boolean>> = {};

    for (const r of roles) {
      permissionsResult[r.name] = cachedPerms[r.name] || {
        system_management: false,
        user_management: false,
        screen_permission_management: false,
      };
    }

    // 4. Ưu tiên truy vấn trực tiếp từ bảng role_menu_permissions trên Supabase
    const { data: dbPerms, error: permError } = await supabase
      .from("role_menu_permissions")
      .select("is_enabled, roles ( name ), menus ( code )");

    if (!permError && dbPerms && dbPerms.length > 0) {
      for (const row of dbPerms as any[]) {
        const roleName = row.roles?.name;
        const menuCode = row.menus?.code;
        if (roleName && menuCode) {
          if (!permissionsResult[roleName]) {
            permissionsResult[roleName] = {};
          }
          permissionsResult[roleName][menuCode] = row.is_enabled;
        }
      }
      // Cập nhật lại cache đồng bộ từ database
      updateMemoryPermissions(permissionsResult);
    }

    // Đảm bảo Admin luôn có full quyền truy cập
    if (permissionsResult["Admin"]) {
      permissionsResult["Admin"]["system_management"] = true;
      permissionsResult["Admin"]["user_management"] = true;
      permissionsResult["Admin"]["screen_permission_management"] = true;
    }

    return NextResponse.json({
      success: true,
      roles,
      menus: menuTree,
      permissions: permissionsResult,
    });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách phân quyền màn hình:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi lấy danh sách phân quyền" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { role_name, menu_code, is_enabled } = body;

    if (!role_name || !menu_code || is_enabled === undefined) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp role_name, menu_code và is_enabled" },
        { status: 400 }
      );
    }

    // 1. Lấy thông tin vai trò của người dùng hiện tại từ cookie
    const rawUserRole = request.cookies.get("user_role")?.value;
    const currentUserRole = rawUserRole ? decodeURIComponent(rawUserRole) : "Admin";
    const currentUserPoints = getRolePoints(currentUserRole);
    const targetRolePoints = getRolePoints(role_name);

    // 2. Ràng buộc: Không được tự update cho chính role hiện tại và những role cao hơn mình
    if (targetRolePoints <= currentUserPoints) {
      return NextResponse.json(
        {
          error: `Bạn không thể tự cập nhật phân quyền cho chính vai trò của mình hoặc các vai trò có cấp bậc cao hơn (Điểm: ${targetRolePoints} <= ${currentUserPoints}). Bạn chỉ được phép phân quyền cho các vai trò cấp dưới.`,
        },
        { status: 403 }
      );
    }

    // Lấy thông tin cây menu để xác định Parent hay Child
    const isParent = menu_code === "system_management";
    const childCodes = ["user_management", "screen_permission_management"];

    const allPerms = getMemoryPermissions();
    if (!allPerms[role_name]) {
      allPerms[role_name] = {
        system_management: false,
        user_management: false,
        screen_permission_management: false,
      };
    }

    // LOGIC CASCADE PHÂN QUYỀN MÀN HÌNH
    if (isParent) {
      if (is_enabled === false) {
        // Tắt menu chính -> Tắt tất cả các menu phụ
        allPerms[role_name]["system_management"] = false;
        for (const child of childCodes) {
          allPerms[role_name][child] = false;
        }
      } else {
        // Bật menu chính -> Bật sáng tất cả các menu phụ lên hết
        allPerms[role_name]["system_management"] = true;
        for (const child of childCodes) {
          allPerms[role_name][child] = true;
        }
      }
    } else {
      // Toggle menu phụ
      if (is_enabled === true) {
        // Bật menu phụ -> tự động bật menu chính nếu đang tắt
        allPerms[role_name]["system_management"] = true;
        allPerms[role_name][menu_code] = true;
      } else {
        // Tắt menu phụ riêng lẻ khi menu chính đang bật
        allPerms[role_name][menu_code] = false;
      }
    }

    // Cập nhật bộ nhớ cache
    updateMemoryPermissions(allPerms);

    // Lưu trực tiếp vào Supabase Database
    try {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("id")
        .eq("name", role_name)
        .maybeSingle();

      if (roleRow) {
        const { data: menusRows } = await supabase
          .from("menus")
          .select("id, code");

        if (menusRows && menusRows.length > 0) {
          const updates: { role_id: string; menu_id: string; is_enabled: boolean }[] = [];
          for (const [code, enabled] of Object.entries(allPerms[role_name])) {
            const menuObj = menusRows.find((m) => m.code === code);
            if (menuObj) {
              updates.push({
                role_id: roleRow.id,
                menu_id: menuObj.id,
                is_enabled: enabled,
              });
            }
          }

          if (updates.length > 0) {
            await (supabase.from("role_menu_permissions") as any).upsert(updates, {
              onConflict: "role_id,menu_id",
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("Không thể lưu trực tiếp vào Supabase (chưa có bảng trên Supabase):", dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật phân quyền cho vai trò "${role_name}"`,
      role: role_name,
      permissions: allPerms[role_name],
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật phân quyền màn hình:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi cập nhật phân quyền" },
      { status: 500 }
    );
  }
}

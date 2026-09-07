import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const body = await request.json();
    const { roleName } = body;

    const currentUserIdCookie = request.cookies.get("user_id")?.value;

    if (!roleName) {
      return NextResponse.json(
        { error: "roleName là bắt buộc" },
        { status: 400 }
      );
    }

    // Fetch all roles to find matching IDs safely
    const { data: rolesList, error: rolesFetchError } = await supabase
      .from("roles")
      .select("id, name");

    if (rolesFetchError || !rolesList) {
      console.error("Error fetching roles:", rolesFetchError);
      return NextResponse.json(
        { error: "Không thể kết nối danh mục vai trò" },
        { status: 500 }
      );
    }

    const targetRoleObj = rolesList.find(
      (r: any) =>
        r.name?.toLowerCase().includes(String(roleName).toLowerCase()) ||
        String(roleName).toLowerCase().includes(r.name?.toLowerCase())
    );

    if (!targetRoleObj) {
      return NextResponse.json(
        { error: `Không tìm thấy vai trò: ${roleName}` },
        { status: 400 }
      );
    }

    const adminRoleObj = rolesList.find((r: any) =>
      r.name?.toLowerCase().includes("admin")
    );
    // Cấp role thấp nhất: Teacher Part-time (điểm 3 - điểm càng thấp role càng cao)
    const lowestRoleObj = rolesList.find((r: any) =>
      r.name?.toLowerCase().includes("part-time") || r.name?.toLowerCase().includes("parttime")
    ) || rolesList[rolesList.length - 1];

    const isPromotingToAdmin = targetRoleObj.id === adminRoleObj?.id;
    let forceLogout = false;

    if (isPromotingToAdmin) {
      // Enforce SINGLE ADMIN policy:
      // Tự động giáng chức tất cả Admin hiện tại thành cấp role thấp nhất là Teacher Part-time
      if (adminRoleObj && lowestRoleObj) {
        const { data: existingAdmins } = await supabase
          .from("users")
          .select("id")
          .eq("role_id", adminRoleObj.id);

        if (existingAdmins && existingAdmins.length > 0) {
          for (const oldAdmin of existingAdmins) {
            if (oldAdmin.id !== targetUserId) {
              await supabase
                .from("users")
                .update({ role_id: lowestRoleObj.id })
                .eq("id", oldAdmin.id);

              // If current logged-in requester is the demoted admin
              if (currentUserIdCookie && oldAdmin.id === currentUserIdCookie) {
                forceLogout = true;
              }
            }
          }
        }
      }

      // Check if current user is transferring their own admin role
      if (currentUserIdCookie && currentUserIdCookie !== targetUserId) {
        forceLogout = true;
      }
    }

    // Update target user's role
    const { error: updateError } = await supabase
      .from("users")
      .update({ role_id: targetRoleObj.id })
      .eq("id", targetUserId);

    if (updateError) {
      console.error("Error updating user role:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      message: `Đã cập nhật vai trò người dùng thành ${roleName}`,
      forceLogout,
    });

    if (forceLogout) {
      const authCookies = [
        "smh_token",
        "id_token",
        "refresh_token",
        "user_id",
        "user_name",
        "user_role",
        "user_permissions",
      ];
      authCookies.forEach((c) => {
        response.cookies.delete(c);
        response.cookies.set(c, "", { maxAge: 0, path: "/", expires: new Date(0) });
      });
    }

    return response;
  } catch (err) {
    console.error("Server error updating role:", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

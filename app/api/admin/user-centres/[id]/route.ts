import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRolePoints } from "@/lib/constants/roles";
import { updateUserCentres } from "@/lib/services/user-centres-service";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;
    const body = await request.json();
    const { centres } = body;

    if (!Array.isArray(centres)) {
      return NextResponse.json(
        { error: "Dữ liệu danh sách cơ sở không hợp lệ (cần mảng)" },
        { status: 400 }
      );
    }

    // 1. Xác định vai trò của người thực hiện thao tác
    const currentRoleRaw = request.cookies.get("user_role")?.value;
    const currentUserId = request.cookies.get("user_id")?.value;
    const currentRoleName = currentRoleRaw ? decodeURIComponent(currentRoleRaw).trim() : "Admin";
    const currentRolePoints = getRolePoints(currentRoleName);

    // Không được sửa tài khoản của chính mình
    if (currentUserId && currentUserId === targetUserId) {
      return NextResponse.json(
        { error: "Bạn không thể tự chỉnh sửa cơ sở trực thuộc của chính mình." },
        { status: 403 }
      );
    }

    // 2. Lấy thông tin tài khoản đích từ Supabase
    const { data: targetUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, full_name, lms_code, roles(name)")
      .eq("id", targetUserId)
      .maybeSingle();

    if (fetchErr || !targetUser) {
      return NextResponse.json(
        { error: "Không tìm thấy tài khoản người dùng" },
        { status: 404 }
      );
    }

    const roleObj = Array.isArray(targetUser.roles) ? targetUser.roles[0] : targetUser.roles;
    const targetRoleName = roleObj?.name || "Teacher Part-time";
    const targetRolePoints = getRolePoints(targetRoleName);

    // 3. Quy tắc phân cấp vai trò: Role cao hơn mới được sửa role thấp hơn (points thấp hơn mới được sửa points cao hơn)
    if (currentRolePoints >= targetRolePoints) {
      return NextResponse.json(
        {
          error: `Bạn (${currentRoleName}) không có quyền chỉnh sửa cơ sở của tài khoản có vai trò "${targetRoleName}" (cấp bậc tương đương hoặc cao hơn).`,
        },
        { status: 403 }
      );
    }

    // 4. Cập nhật vào Supabase & Service cache
    const updateRes = await updateUserCentres(targetUserId, centres);

    if (!updateRes.success) {
      return NextResponse.json(
        { error: updateRes.error || "Cập nhật cơ sở thất bại" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cập nhật thành công ${centres.length} cơ sở trực thuộc cho tài khoản "${targetUser.full_name || targetUser.lms_code}".`,
      centres,
    });
  } catch (err: any) {
    console.error("Server error in update user centres API:", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Chưa xác thực người dùng" },
        { status: 401 }
      );
    }

    let { data: userData, error } = await supabase
      .from("users")
      .select(
        "id, full_name, email, lms_code, is_firebase, created_at, roles ( name ), user_statuses ( name )"
      )
      .eq("id", userId)
      .single();

    if (error && error.message?.includes("is_firebase")) {
      const fallback = await supabase
        .from("users")
        .select(
          "id, full_name, email, lms_code, created_at, roles ( name ), user_statuses ( name )"
        )
        .eq("id", userId)
        .single();
      userData = fallback.data ? { ...fallback.data, is_firebase: false } : null;
      error = fallback.error;
    }

    if (error || !userData) {
      return NextResponse.json(
        { error: "Không tìm thấy thông tin người dùng" },
        { status: 404 }
      );
    }

    const roleRelation = userData.roles;
    const roleObj = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation;
    const roleName = (roleObj as any)?.name || "Admin";

    const statusRelation = userData.user_statuses;
    const statusObj = Array.isArray(statusRelation) ? statusRelation[0] : statusRelation;
    const statusName = (statusObj as any)?.name || "Đã phê duyệt";

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        full_name: userData.full_name || "",
        email: userData.email || "",
        lms_code: userData.lms_code || "",
        is_firebase: !!userData.is_firebase,
        account_source: userData.is_firebase ? "Tài khoản LMS" : "Do website tạo",
        role: roleName,
        status: statusName,
        created_at: userData.created_at,
      },
    });
  } catch (err) {
    console.error("Lỗi khi lấy thông tin cá nhân:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi lấy thông tin cá nhân" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.cookies.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Chưa xác thực người dùng" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { full_name, password } = body;

    // Kiểm tra thông tin tài khoản hiện tại
    const { data: targetUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, is_firebase, full_name")
      .eq("id", userId)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};

    if (full_name !== undefined && full_name.trim().length > 0) {
      updateData.full_name = full_name.trim();
    }

    // Nếu là tài khoản LMS thì không cho đổi mật khẩu qua trang này
    if (password && password.trim().length > 0) {
      if (targetUser.is_firebase) {
        return NextResponse.json(
          {
            error:
              "Tài khoản từ hệ thống LMS xác thực bằng mật khẩu LMS, không thể đổi mật khẩu tại đây.",
          },
          { status: 400 }
        );
      }
      if (password.trim().length < 6) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có ít nhất 6 ký tự." },
          { status: 400 }
        );
      }
      updateData.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Không có thông tin nào được thay đổi" },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json(
        { error: `Lỗi cập nhật: ${updateErr.message}` },
        { status: 500 }
      );
    }

    const res = NextResponse.json({
      success: true,
      message: "Cập nhật thông tin cá nhân thành công",
    });

    // Cập nhật cookie user_name nếu đổi tên
    if (updateData.full_name) {
      res.cookies.set("user_name", encodeURIComponent(updateData.full_name), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return res;
  } catch (err) {
    console.error("Lỗi khi cập nhật thông tin cá nhân:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi cập nhật thông tin cá nhân" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { getUserTokenExpiryDays, setUserTokenExpiryDays } from "@/lib/auth/token-settings";
import { signSmhToken } from "@/lib/auth/jwt";

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

    // Lấy cấu hình thời hạn duy trì tài khoản (mặc định 7, tối đa 30 ngày)
    const tokenExpiryDays = getUserTokenExpiryDays(userData.id, userData.lms_code);

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
        token_expiry_days: tokenExpiryDays,
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
    const { full_name, password, token_expiry_days } = body;

    // Kiểm tra thông tin tài khoản hiện tại
    const { data: targetUser, error: fetchErr } = await supabase
      .from("users")
      .select("id, is_firebase, full_name, lms_code, roles(name), user_statuses(name)")
      .eq("id", userId)
      .single();

    if (fetchErr || !targetUser) {
      return NextResponse.json(
        { error: "Không tìm thấy người dùng" },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};

    // 1. Ràng buộc họ tên: bắt buộc 2 - 70 ký tự, không được chỉ chứa khoảng trắng
    if (full_name !== undefined) {
      const cleanName = full_name.trim();
      if (cleanName.length < 2 || cleanName.length > 70) {
        return NextResponse.json(
          { error: "Họ và tên phải có độ dài từ 2 đến 70 ký tự." },
          { status: 400 }
        );
      }
      updateData.full_name = cleanName;
    }

    // 2. Ràng buộc mật khẩu: Khóa với LMS; Tài khoản nội bộ 6 - 50 ký tự
    if (password !== undefined && password.trim().length > 0) {
      if (targetUser.is_firebase) {
        return NextResponse.json(
          {
            error:
              "Tài khoản từ hệ thống LMS xác thực bằng mật khẩu LMS, không thể đổi mật khẩu tại đây.",
          },
          { status: 400 }
        );
      }
      const cleanPass = password.trim();
      if (cleanPass.length < 6 || cleanPass.length > 50) {
        return NextResponse.json(
          { error: "Mật khẩu mới phải có độ dài từ 6 đến 50 ký tự." },
          { status: 400 }
        );
      }
      updateData.password_hash = await bcrypt.hash(cleanPass, 10);
    }

    // 3. Ràng buộc thời gian duy trì tài khoản: Số nguyên từ 1 đến 30 ngày
    let updatedExpiryDays: number | null = null;
    if (token_expiry_days !== undefined) {
      const parsedDays = Math.round(Number(token_expiry_days));
      if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 30) {
        return NextResponse.json(
          { error: "Thời gian duy trì tài khoản phải là số nguyên từ 1 đến 30 ngày." },
          { status: 400 }
        );
      }
      updatedExpiryDays = setUserTokenExpiryDays(
        parsedDays,
        userId,
        targetUser.lms_code
      );
    }

    if (Object.keys(updateData).length === 0 && updatedExpiryDays === null) {
      return NextResponse.json(
        { error: "Không có thông tin nào được thay đổi" },
        { status: 400 }
      );
    }

    if (Object.keys(updateData).length > 0) {
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
    }

    const currentExpiry = updatedExpiryDays ?? getUserTokenExpiryDays(userId, targetUser.lms_code);
    const roleRel = targetUser.roles;
    const roleObj = Array.isArray(roleRel) ? roleRel[0] : roleRel;
    const roleName = (roleObj as any)?.name || "Admin";

    const statusRel = targetUser.user_statuses;
    const statusObj = Array.isArray(statusRel) ? statusRel[0] : statusRel;
    const statusName = (statusObj as any)?.name || "Đã phê duyệt";

    // Ký lại token với thời hạn mới và cập nhật cookies
    const { token: newSmhToken, maxAgeSeconds } = await signSmhToken(
      {
        userId: targetUser.id,
        lmsCode: targetUser.lms_code || "",
        name: updateData.full_name || targetUser.full_name || "",
        role: roleName,
        status: statusName,
      },
      currentExpiry
    );

    const res = NextResponse.json({
      success: true,
      message: "Cập nhật thông tin cá nhân và thời gian duy trì tài khoản thành công",
      token_expiry_days: currentExpiry,
    });

    res.cookies.set("smh_token", newSmhToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSeconds,
      sameSite: "lax",
      path: "/",
    });

    res.cookies.set("user_id", targetUser.id, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSeconds,
      sameSite: "lax",
      path: "/",
    });

    // Cập nhật cookie user_name nếu đổi tên
    if (updateData.full_name) {
      res.cookies.set("user_name", encodeURIComponent(updateData.full_name), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAgeSeconds,
        sameSite: "lax",
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

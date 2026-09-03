import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkLmsAccount } from "@/lib/services/lms-service";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lms_code } = body;

    if (!lms_code || String(lms_code).trim().length === 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập mã lms_code cần kiểm tra" },
        { status: 400 }
      );
    }

    const cleanCode = String(lms_code).trim();

    // 1. Kiểm tra xem trong Supabase đã tồn tại tài khoản này chưa
    const { data: existingDbUser } = await supabase
      .from("users")
      .select("id, lms_code, full_name, is_firebase")
      .eq("lms_code", cleanCode)
      .maybeSingle();

    // 2. Kiểm tra toàn diện trên LMS (GraphQL Teacher & Firebase)
    const lmsResult = await checkLmsAccount(cleanCode);

    if (!lmsResult.exists) {
      return NextResponse.json(
        {
          exists: false,
          error: "Không có tài khoản với mã lms_code này trên hệ thống LMS. Vui lòng kiểm tra lại.",
        },
        { status: 404 }
      );
    }

    const lmsName = (lmsResult.fullName || existingDbUser?.full_name || "").trim();
    const hasFullName = lmsName.length > 0;

    return NextResponse.json({
      exists: true,
      lms_code: cleanCode,
      matched_email: lmsResult.email || `${cleanCode}@mindx.net.vn`,
      full_name: lmsName,
      has_full_name: hasFullName,
      already_in_db: !!existingDbUser,
      message: hasFullName
        ? `Tìm thấy tài khoản LMS: ${lmsName} (${lmsResult.email || cleanCode})`
        : `Tìm thấy tài khoản LMS (${lmsResult.email || cleanCode}) nhưng chưa có họ tên trên hệ thống. Admin có thể tự đặt họ tên.`,
    });
  } catch (err) {
    console.error("Lỗi server tại check-lms:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi kiểm tra tài khoản LMS" },
      { status: 500 }
    );
  }
}

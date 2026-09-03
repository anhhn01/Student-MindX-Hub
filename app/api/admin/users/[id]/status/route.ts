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
    const { id: userId } = await params;
    const body = await request.json();
    const { statusCode } = body;

    if (!statusCode) {
      return NextResponse.json(
        { error: "statusCode là bắt buộc" },
        { status: 400 }
      );
    }

    // Fetch user_statuses list to find matching status ID safely
    const { data: statusList, error: statusFetchError } = await supabase
      .from("user_statuses")
      .select("id, name");

    if (statusFetchError || !statusList) {
      console.error("Error fetching user_statuses:", statusFetchError);
      return NextResponse.json(
        { error: "Không thể kết nối danh mục trạng thái" },
        { status: 500 }
      );
    }

    const statusData = statusList.find(
      (s: any) =>
        (s.name || s.code)?.toLowerCase() === String(statusCode).toLowerCase()
    );

    if (!statusData) {
      return NextResponse.json(
        { error: `Không tìm thấy trạng thái với mã: ${statusCode}` },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ status_id: statusData.id })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating user status:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật trạng thái người dùng thành ${statusCode}`,
    });
  } catch (err) {
    console.error("Server error updating status:", err);
    return NextResponse.json({ error: "Lỗi máy chủ" }, { status: 500 });
  }
}

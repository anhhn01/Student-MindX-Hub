import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceStatus, setMaintenanceStatus } from "@/lib/services/maintenance-service";
import { verifySmhToken } from "@/lib/auth/jwt";

export async function GET() {
  try {
    const status = await getMaintenanceStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Lỗi khi lấy trạng thái bảo trì" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Xác thực quyền Admin
    const smhToken = request.cookies.get("smh_token")?.value;
    const rawRole = request.cookies.get("user_role")?.value;
    let isAdmin = false;
    let adminName = "admin";

    if (smhToken) {
      const tokenVerification = await verifySmhToken(smhToken);
      if (tokenVerification.valid && tokenVerification.payload) {
        const role = (tokenVerification.payload.role || "").toLowerCase();
        if (role.includes("admin")) {
          isAdmin = true;
          adminName = tokenVerification.payload.name || "admin";
        }
      }
    } else if (rawRole && decodeURIComponent(rawRole).toLowerCase().includes("admin")) {
      isAdmin = true;
    }

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Chỉ Quản trị viên (Admin) mới có quyền thiết lập bảo trì hệ thống" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isEnabled, expectedEndTime, reason } = body;

    const updatedConfig = await setMaintenanceStatus(
      Boolean(isEnabled),
      expectedEndTime || null,
      reason,
      adminName
    );

    return NextResponse.json({
      success: true,
      message: updatedConfig.isEnabled
        ? "Đã kích hoạt chế độ bảo trì hệ thống thành công"
        : "Đã tắt chế độ bảo trì hệ thống",
      data: updatedConfig,
    });
  } catch (error: any) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Lỗi khi lưu cấu hình bảo trì" },
      { status: 500 }
    );
  }
}

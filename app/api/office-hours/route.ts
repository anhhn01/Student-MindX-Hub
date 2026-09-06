import { NextRequest, NextResponse } from "next/server";
import { getUserCentres } from "@/lib/services/user-centres-service";
import { fetchOfficeHours } from "@/lib/services/lms-service";
import { getRolePoints } from "@/lib/constants/roles";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date"); // Format: YYYY-MM-DD
    const centreFilter = searchParams.get("centreId"); // Lọc theo 1 cơ sở cụ thể (tuỳ chọn)

    // 1. Xác định ngày truy vấn (Mặc định là ngày mai theo múi giờ Việt Nam UTC+7)
    let targetDateStr = dateParam;
    if (!targetDateStr) {
      const now = new Date();
      // Chuyển sang giờ VN (UTC+7)
      const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
      // Ngày mai
      vnNow.setDate(vnNow.getDate() + 1);
      targetDateStr = vnNow.toISOString().split("T")[0];
    }

    // Tính toán timeFrom và timeTo theo ngày (00:00:00 -> 23:59:59 giờ Việt Nam)
    const [year, month, day] = targetDateStr.split("-").map(Number);
    // 00:00:00 VN = (date - 7 hours) UTC
    const timeFrom = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0, 0)).toISOString();
    // 23:59:59.999 VN
    const timeTo = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999)).toISOString();

    // 2. Lấy thông tin user hiện tại và token từ Cookie
    const currentUserId = request.cookies.get("user_id")?.value;
    const cookieToken = request.cookies.get("id_token")?.value;
    const currentRoleRaw = request.cookies.get("user_role")?.value;
    const currentRoleName = currentRoleRaw ? decodeURIComponent(currentRoleRaw).trim() : "Admin";
    const currentRolePoints = getRolePoints(currentRoleName);

    // 3. Lấy danh sách cơ sở trực thuộc của tài khoản từ Supabase (ràng buộc theo tài khoản đang đăng nhập)
    let userCentres: Array<{ id: string; name: string; shortName?: string }> = [];
    if (currentUserId) {
      userCentres = await getUserCentres(currentUserId);
    }

    // Nếu tài khoản chưa có cơ sở trực thuộc nào
    if (userCentres.length === 0) {
      return NextResponse.json({
        success: true,
        date: targetDateStr,
        userCentres: [],
        totalCount: 0,
        officeHours: [],
        message: "Tài khoản của bạn chưa được phân bổ cơ sở trực thuộc trong hệ thống.",
      });
    }

    const userCentreIds = new Set(userCentres.map((c) => c.id));
    let targetCentreIds: string[] = [];

    if (centreFilter && centreFilter !== "ALL" && centreFilter !== "all") {
      // Nếu lọc theo 1 cơ sở, chỉ truy vấn nếu cơ sở đó thuộc danh sách cơ sở trực thuộc của tài khoản
      if (userCentreIds.has(centreFilter)) {
        targetCentreIds = [centreFilter];
      } else {
        return NextResponse.json({
          success: true,
          date: targetDateStr,
          userCentres,
          totalCount: 0,
          officeHours: [],
        });
      }
    } else {
      // Mặc định truy vấn tất cả các cơ sở trực thuộc của tài khoản
      targetCentreIds = userCentres.map((c) => c.id);
    }

    // 4. Gọi LMS GraphQL lấy lịch trải nghiệm theo đúng danh sách cơ sở trực thuộc (tự động loại bỏ Makeup)
    const officeHours = await fetchOfficeHours({
      centreIds: targetCentreIds.length > 0 ? targetCentreIds : undefined,
      timeFrom,
      timeTo,
      token: cookieToken,
    });

    return NextResponse.json({
      success: true,
      date: targetDateStr,
      userCentres,
      totalCount: officeHours.length,
      officeHours,
    });
  } catch (err: any) {
    console.error("Lỗi khi xử lý API office-hours:", err);
    return NextResponse.json({ error: "Lỗi máy chủ khi lấy lịch trải nghiệm" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUserCentres } from "@/lib/services/user-centres-service";
import { fetchClassesFromLms } from "@/lib/services/lms-service";
import { jwtVerify } from "jose";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centreFilter = searchParams.get("centreId");
    const statusFilter = searchParams.get("status"); // "ALL", "OPEN", "RUNNING", "FINISHED"
    const search = searchParams.get("search")?.trim().toLowerCase();

    // 1. Xác định User ID & Cookie Token
    let currentUserId = request.cookies.get("user_id")?.value;
    const cookieToken = request.cookies.get("id_token")?.value;

    if (!currentUserId) {
      const smhToken = request.cookies.get("smh_token")?.value;
      if (smhToken) {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || "student-mindx-hub");
          const { payload } = await jwtVerify(smhToken, secret);
          currentUserId = (payload.userId || payload.sub || payload.id) as string;
        } catch (e) {
          // Token invalid or expired
        }
      }
    }

    if (!currentUserId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    // 2. Lấy danh sách cơ sở trực thuộc của tài khoản từ Supabase
    const userCentres = await getUserCentres(currentUserId);

    if (userCentres.length === 0) {
      return NextResponse.json({
        success: true,
        userCentres: [],
        totalCount: 0,
        classes: [],
        message: "Tài khoản của bạn chưa được phân bổ cơ sở trực thuộc trong hệ thống.",
      });
    }

    const userCentreIds = new Set(userCentres.map((c) => c.id));
    let targetCentreIds: string[] = [];

    if (centreFilter && centreFilter !== "ALL" && centreFilter !== "all") {
      if (userCentreIds.has(centreFilter)) {
        targetCentreIds = [centreFilter];
      } else {
        return NextResponse.json({
          success: true,
          userCentres,
          totalCount: 0,
          classes: [],
        });
      }
    } else {
      targetCentreIds = userCentres.map((c) => c.id);
    }

    // 3. Trạng thái cần lọc
    let statuses = ["OPEN", "RUNNING", "FINISHED"];
    if (statusFilter && statusFilter !== "ALL" && statusFilter !== "all") {
      statuses = [statusFilter.toUpperCase()];
    }

    // 4. Lấy danh sách lớp học từ LMS GraphQL
    const classes = await fetchClassesFromLms({
      centreIds: targetCentreIds.length > 0 ? targetCentreIds : undefined,
      statuses,
      token: cookieToken,
    });

    // 5. Lọc thêm theo tìm kiếm nếu có
    let filteredClasses = classes;
    if (search) {
      filteredClasses = classes.filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(search);
        const centreMatch = c.centre?.name.toLowerCase().includes(search);
        const courseMatch = c.course?.name?.toLowerCase().includes(search);
        return nameMatch || centreMatch || courseMatch;
      });
    }

    return NextResponse.json({
      success: true,
      userCentres,
      totalCount: filteredClasses.length,
      classes: filteredClasses,
    });
  } catch (err: any) {
    console.error("Lỗi khi xử lý API classes:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi lấy danh sách lớp học" },
      { status: 500 }
    );
  }
}

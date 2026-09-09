import { NextRequest, NextResponse } from "next/server";
import { getUserCentres } from "@/lib/services/user-centres-service";
import { fetchClassesFromLms, searchClassByCodeFromLms } from "@/lib/services/lms-service";
import {
  getManagedClasses,
  addManagedClass,
  getAllManagedClassesMap,
  calculateDefaultDeadlines,
  ManagedClass,
} from "@/lib/services/managed-classes-service";
import { createClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getAuthenticatedUser(request: NextRequest): Promise<{ id: string; role: string } | null> {
  let currentUserId = request.cookies.get("user_id")?.value;
  let userRole = "";

  const smhToken = request.cookies.get("smh_token")?.value;
  if (smhToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "student-mindx-hub");
      const { payload } = await jwtVerify(smhToken, secret);
      if (!currentUserId) {
        currentUserId = (payload.userId || payload.sub || payload.id) as string;
      }
      userRole = (payload.role || "") as string;
    } catch (e) {
      // Token invalid
    }
  }

  if (!currentUserId) return null;

  // Nếu token chưa có role, tra cứu Supabase
  if (!userRole) {
    const { data: userRow } = await supabase
      .from("users")
      .select("id, roles ( name )")
      .eq("id", currentUserId)
      .maybeSingle();
    userRole = (userRow?.roles as any)?.name || "";
  }

  return { id: currentUserId, role: userRole };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "managed"; // "managed" | "find" | "eligible"
    const classCode = searchParams.get("code")?.trim();
    const centreFilter = searchParams.get("centreId");
    const statusFilter = searchParams.get("status"); // "ALL", "OPEN", "RUNNING", "FINISHED"
    const search = searchParams.get("search")?.trim().toLowerCase();

    // 1. Xác định User ID, Role & Cookie Token
    const authUser = await getAuthenticatedUser(request);
    const cookieToken = request.cookies.get("id_token")?.value;

    if (!authUser) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: currentUserId, role: currentUserRole } = authUser;

    // 2. Lấy danh sách cơ sở trực thuộc của tài khoản
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

    // 3. Phân quyền vai trò: Nếu là Teacher Full-time, chỉ xem các lớp có GV chính là Teacher Part-time trong hệ thống
    const isTeacherFullTime = currentUserRole === "Teacher Full-time";
    const partTimeTeacherSet = new Set<string>();

    if (isTeacherFullTime) {
      const { data: partTimeUsers } = await supabase
        .from("users")
        .select("id, full_name, lms_code, roles!inner(name)")
        .eq("roles.name", "Teacher Part-time");

      (partTimeUsers || []).forEach((u: any) => {
        if (u.full_name) partTimeTeacherSet.add(u.full_name.trim().toLowerCase());
        if (u.lms_code) partTimeTeacherSet.add(u.lms_code.trim().toLowerCase());
      });
    }

    const isClassTaughtByPartTime = (cls: { teacherName?: string | null; teacherCodes?: string[] }): boolean => {
      if (!isTeacherFullTime) return true; // Admin được xem tất cả
      if (partTimeTeacherSet.size === 0) return false;

      if (Array.isArray(cls.teacherCodes) && cls.teacherCodes.length > 0) {
        for (const code of cls.teacherCodes) {
          if (partTimeTeacherSet.has(code.toLowerCase().trim())) return true;
        }
      }

      if (cls.teacherName) {
        const names = cls.teacherName.split(",").map((n) => n.trim().toLowerCase());
        for (const n of names) {
          if (partTimeTeacherSet.has(n)) return true;
        }
      }

      return false;
    };

    // A0. Chức năng REAL-TIME SEARCH DROPDOWN theo tên/mã lớp từ LMS (Có phân quyền vai trò)
    if (type === "search") {
      const q = (searchParams.get("q") || searchParams.get("code") || "").trim();
      if (!q || q.length < 2) {
        return NextResponse.json({ success: true, classes: [] });
      }

      // Tra cứu từ LMS với filter_textSearch theo cơ sở trực thuộc của tài khoản
      const lmsList = await fetchClassesFromLms({
        centreIds: targetCentreIds.length > 0 ? targetCentreIds : undefined,
        searchQuery: q,
        statuses: ["OPEN", "RUNNING", "FINISHED"],
        token: cookieToken,
      });

      // Lọc theo quyền vai trò Teacher Full-time (chỉ hiển thị lớp do Teacher Part-time trong SMH phụ trách)
      const filteredLmsList = isTeacherFullTime ? lmsList.filter(isClassTaughtByPartTime) : lmsList;

      // Đánh dấu lớp nào đã được lưu vào Supabase managed_classes
      const managedMap = await getAllManagedClassesMap();
      const results = filteredLmsList.slice(0, 25).map((c) => ({
        ...c,
        alreadyManaged: !!managedMap[c.id],
      }));

      return NextResponse.json({
        success: true,
        classes: results,
      });
    }

    // A. Chức năng TÌM KIẾM THEO MÃ LỚP để thêm mới
    if (type === "find") {
      if (!classCode) {
        return NextResponse.json({ error: "Vui lòng nhập mã lớp cần tìm" }, { status: 400 });
      }

      // Tìm lớp từ LMS GraphQL
      const foundClass = await searchClassByCodeFromLms({
        classCode,
        centreIds: targetCentreIds.length > 0 ? targetCentreIds : undefined,
        token: cookieToken,
      });

      if (!foundClass) {
        return NextResponse.json(
          { error: `Không tìm thấy lớp "${classCode}" (hoặc lớp không thuộc các cơ sở trực thuộc của bạn).` },
          { status: 404 }
        );
      }

      // Ràng buộc Teacher Full-time: Chỉ cho phép thêm lớp do Teacher Part-time trong hệ thống phụ trách
      if (isTeacherFullTime && !isClassTaughtByPartTime(foundClass)) {
        return NextResponse.json(
          {
            error: `Lớp "${foundClass.name}" do giáo viên "${foundClass.teacherName || "Chưa rõ"}" phụ trách, không thuộc danh sách Giáo viên Part-time trong hệ thống SMH của bạn.`,
          },
          { status: 403 }
        );
      }

      // Kiểm tra lớp đã có trong danh sách quản lý Supabase chưa
      const managedMap = await getAllManagedClassesMap();
      const alreadyManaged = !!managedMap[foundClass.id];

      // Tính toán hạn nộp bài mặc định
      const defaultSlots = calculateDefaultDeadlines(foundClass);

      return NextResponse.json({
        success: true,
        alreadyManaged,
        class: alreadyManaged ? managedMap[foundClass.id] : foundClass,
        defaultSlots,
      });
    }

    // B. Mặc định: Trả về danh sách lớp ĐANG ĐƯỢC QUẢN LÝ (Lưu trong Supabase)
    const managedList = await getManagedClasses(targetCentreIds);

    // Lọc theo quyền vai trò Teacher Full-time nếu áp dụng
    let filtered = isTeacherFullTime ? managedList.filter(isClassTaughtByPartTime) : managedList;

    if (statusFilter && statusFilter !== "ALL" && statusFilter !== "all") {
      filtered = filtered.filter(
        (c) => (c.status || "").toUpperCase() === statusFilter.toUpperCase()
      );
    }

    if (search) {
      filtered = filtered.filter((c) => {
        const nameMatch = c.name?.toLowerCase().includes(search);
        const centreMatch = c.centreName?.toLowerCase().includes(search);
        const courseMatch = c.courseName?.toLowerCase().includes(search);
        const teacherMatch = c.teacherName?.toLowerCase().includes(search);
        return nameMatch || centreMatch || courseMatch || teacherMatch;
      });
    }

    return NextResponse.json({
      success: true,
      userCentres,
      userRole: currentUserRole,
      totalCount: filtered.length,
      classes: filtered,
    });
  } catch (err: any) {
    console.error("Lỗi khi xử lý API classes:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi lấy danh sách lớp học" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id: currentUserId, role: currentUserRole } = authUser;

    const body = await request.json();
    const classData = body.classData as ManagedClass;

    if (!classData || !classData.id || !classData.name) {
      return NextResponse.json({ error: "Thông tin lớp học không hợp lệ" }, { status: 400 });
    }

    // Kiểm tra ràng buộc Teacher Full-time khi thêm lớp
    if (currentUserRole === "Teacher Full-time") {
      const { data: partTimeUsers } = await supabase
        .from("users")
        .select("id, full_name, lms_code, roles!inner(name)")
        .eq("roles.name", "Teacher Part-time");

      const partTimeTeacherSet = new Set<string>();
      (partTimeUsers || []).forEach((u: any) => {
        if (u.full_name) partTimeTeacherSet.add(u.full_name.trim().toLowerCase());
        if (u.lms_code) partTimeTeacherSet.add(u.lms_code.trim().toLowerCase());
      });

      let isAllowed = false;
      if (Array.isArray(classData.teacherCodes)) {
        for (const code of classData.teacherCodes) {
          if (partTimeTeacherSet.has(code.toLowerCase().trim())) isAllowed = true;
        }
      }
      if (!isAllowed && classData.teacherName) {
        const names = classData.teacherName.split(",").map((n) => n.trim().toLowerCase());
        for (const n of names) {
          if (partTimeTeacherSet.has(n)) isAllowed = true;
        }
      }

      if (!isAllowed) {
        return NextResponse.json(
          { error: "Chỉ được phép thêm các lớp do Teacher Part-time trong hệ thống phụ trách." },
          { status: 403 }
        );
      }
    }

    const result = await addManagedClass(classData, currentUserId);
    if (!result.success) {
      return NextResponse.json({ error: result.message || "Không thể thêm lớp học" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Thêm lớp học vào danh sách quản lý thành công",
    });
  } catch (err: any) {
    console.error("Lỗi khi thêm lớp học quản lý:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi thêm lớp học" },
      { status: 500 }
    );
  }
}

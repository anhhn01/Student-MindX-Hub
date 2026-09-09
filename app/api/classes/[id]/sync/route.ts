import { NextRequest, NextResponse } from "next/server";
import { fetchClassByIdFromLms } from "@/lib/services/lms-service";
import {
  getAllManagedClassesMap,
  saveAllManagedClassesMap,
  compareClassWithLms,
  calculateDefaultDeadlines,
  ManagedClass,
} from "@/lib/services/managed-classes-service";
import { jwtVerify } from "jose";

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  let currentUserId = request.cookies.get("user_id")?.value;
  if (!currentUserId) {
    const smhToken = request.cookies.get("smh_token")?.value;
    if (smhToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "student-mindx-hub");
        const { payload } = await jwtVerify(smhToken, secret);
        currentUserId = (payload.userId || payload.sub || payload.id) as string;
      } catch (e) {
        // Token invalid
      }
    }
  }
  return currentUserId || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await getAuthenticatedUserId(request);
    if (!currentUserId) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }

    const { id } = await params;
    const cookieToken = request.cookies.get("id_token")?.value;

    const map = await getAllManagedClassesMap();
    const currentClass = map[id];
    if (!currentClass) {
      return NextResponse.json({ error: "Lớp học không tồn tại trong danh sách quản lý" }, { status: 404 });
    }

    // 1. Lấy dữ liệu mới nhất từ LMS (READ-ONLY)
    const freshLms = await fetchClassByIdFromLms(id, cookieToken);
    if (!freshLms) {
      return NextResponse.json(
        { error: "Không thể lấy thông tin lớp học từ LMS" },
        { status: 502 }
      );
    }

    // 2. So sánh đối chiếu dữ liệu
    const comparison = compareClassWithLms(currentClass, freshLms);

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body empty
    }

    // 3. Nếu người dùng xác nhận cập nhật
    if (body.confirm === true) {
      // Giữ lại hạn nộp bài đã cấu hình theo từng slot index
      const existingDeadlines = new Map<number, string>();
      currentClass.slots?.forEach((s) => {
        if (s.submissionDeadline) {
          existingDeadlines.set(s.index, s.submissionDeadline);
        }
      });

      // Tạo lại danh sách slots mới từ LMS và khôi phục hạn nộp cũ nếu có
      const defaultSlots = calculateDefaultDeadlines(freshLms);
      const mergedSlots = defaultSlots.map((s) => ({
        ...s,
        submissionDeadline: existingDeadlines.get(s.index) || s.submissionDeadline,
      }));

      const updatedClass: ManagedClass = {
        ...currentClass,
        status: freshLms.status,
        teacherName: freshLms.teacherName || currentClass.teacherName,
        classTime: freshLms.classTime || currentClass.classTime,
        startDate: freshLms.startDate || currentClass.startDate,
        endDate: freshLms.endDate || currentClass.endDate,
        numberOfSessions: freshLms.numberOfSessions,
        completedSessions: freshLms.completedSessions,
        progressPercent: freshLms.progressPercent,
        checkpoint1Session: freshLms.courseProcess?.checkpoint1Session || currentClass.checkpoint1Session,
        checkpoint1Date: freshLms.courseProcess?.checkpoint1Date || currentClass.checkpoint1Date,
        checkpoint2Session: freshLms.courseProcess?.checkpoint2Session || currentClass.checkpoint2Session,
        checkpoint2Date: freshLms.courseProcess?.checkpoint2Date || currentClass.checkpoint2Date,
        finalProjectSession: freshLms.courseProcess?.finalProjectSession || currentClass.finalProjectSession,
        finalProjectDate: freshLms.courseProcess?.finalProjectDate || currentClass.finalProjectDate,
        slots: mergedSlots,
        updatedAt: new Date().toISOString(),
      };

      map[id] = updatedClass;
      await saveAllManagedClassesMap(map, currentUserId);

      return NextResponse.json({
        success: true,
        message: "Cập nhật dữ liệu từ LMS thành công",
        hasChanges: false,
        updatedClass,
      });
    }

    // 4. Nếu chưa xác nhận, trả về diff để Client hiển thị bảng Side-by-Side
    return NextResponse.json({
      success: true,
      hasChanges: comparison.hasChanges,
      diffs: comparison.diffs,
      currentClass,
      lmsClass: freshLms,
    });
  } catch (err: any) {
    console.error("Lỗi khi đồng bộ lớp học từ LMS:", err);
    return NextResponse.json(
      { error: "Lỗi máy chủ khi đồng bộ lớp học từ LMS" },
      { status: 500 }
    );
  }
}

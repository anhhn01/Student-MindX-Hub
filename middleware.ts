import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("id_token")?.value;
  const rawRole = request.cookies.get("user_role")?.value;
  const userRole = rawRole ? decodeURIComponent(rawRole).trim().toLowerCase() : "";
  const { pathname } = request.nextUrl;

  const isAuthenticated = !!token;

  // Xác định dashboard chuẩn dựa theo vai trò của người dùng
  const getRoleDashboard = (role: string) => {
    if (role.includes("admin")) return "/admin/dashboard";
    if (role.includes("full-time") || role.includes("fulltime")) return "/teacher-fulltime/dashboard";
    if (role.includes("part-time") || role.includes("parttime")) return "/teacher-parttime/dashboard";
    return "/dashboard";
  };

  // 1. Đã đăng nhập nhưng lại truy cập trang /login -> tự điều hướng về dashboard của vai trò đó
  if (isAuthenticated && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
  }

  // Danh sách các route cần xác thực đăng nhập
  const isProtectedPath =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/teacher-fulltime") ||
    pathname.startsWith("/teacher-parttime") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/dashboard");

  // 2. Chưa đăng nhập nhưng cố truy cập các route được bảo vệ -> Chuyển hướng về /login
  if (!isAuthenticated && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Chặn route và phân quyền theo vai trò (Strict Role & Permissions Guarding)
  if (isAuthenticated) {
    const isAdmin = userRole.includes("admin");
    const isTeacherFullTime = userRole.includes("full-time") || userRole.includes("fulltime");
    const isTeacherPartTime = userRole.includes("part-time") || userRole.includes("parttime");

    // Đọc phân quyền màn hình từ cookie user_permissions
    const rawPerms = request.cookies.get("user_permissions")?.value;
    let userPerms: Record<string, boolean> = {};
    if (rawPerms) {
      try {
        userPerms = JSON.parse(decodeURIComponent(rawPerms));
      } catch (_) {}
    }

    // --- QUY TẮC 1: CHẶN TRUY CẬP CHÉO VAI TRÒ -> TRẢ VỀ NOT-FOUND (404) ---
    // Role nào chỉ được phép đi vào route mang tiền tố của chính role đó!
    if (pathname.startsWith("/admin")) {
      if (!isAdmin) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    } else if (pathname.startsWith("/teacher-fulltime")) {
      if (!isTeacherFullTime) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    } else if (pathname.startsWith("/teacher-parttime")) {
      if (!isTeacherPartTime) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    }

    // --- QUY TẮC 2: CHẶN THEO PHÂN QUYỀN MÀN HÌNH -> TRẢ VỀ NOT-FOUND (404) ---
    // 2.1 Màn hình Quản lý tài khoản: /[role]/system-management/users hoặc /admin/users
    if (pathname.includes("/system-management/users") || pathname === "/admin/users") {
      const canAccessUsers = isAdmin || userPerms["user_management"] === true;
      if (!canAccessUsers) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    }

    // 2.2 Màn hình Phân quyền màn hình: /[role]/system-management/screen_permission hoặc /admin/permissions
    if (
      pathname.includes("/system-management/screen_permission") ||
      pathname === "/admin/permissions"
    ) {
      const canAccessPerms = isAdmin || userPerms["screen_permission_management"] === true;
      if (!canAccessPerms) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    }

    // 2.3 Màn hình Quản lý cơ sở trực thuộc: /[role]/system-management/user_centres
    if (pathname.includes("/system-management/user_centres")) {
      const canAccessCentres = isAdmin || userPerms["user_centre_management"] === true;
      if (!canAccessCentres) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    }

    // 2.4 Màn hình Lịch trải nghiệm: /[role]/data-inspection/trial_schedules
    if (pathname.includes("/data-inspection/trial_schedules")) {
      const canAccessTrial = isAdmin || userPerms["trial_schedules"] === true;
      if (!canAccessTrial) {
        return NextResponse.rewrite(new URL("/not-found", request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher-fulltime/:path*",
    "/teacher-parttime/:path*",
    "/profile/:path*",
    "/dashboard/:path*",
    "/login",
  ],
};
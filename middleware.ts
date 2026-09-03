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

  // 2. Chưa đăng nhập nhưng cố truy cập các route được bảo vệ -> Chặn và chuyển hướng về /login
  if (!isAuthenticated && isProtectedPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Chặn route phân quyền theo vai trò (Role-Based Route Guarding)
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

    // 3.1 Kiểm soát các route /admin/*
    if (pathname.startsWith("/admin")) {
      // a) /admin/dashboard: Chỉ Admin thực thụ mới được vào Dashboard của Admin
      if (pathname === "/admin/dashboard") {
        if (!isAdmin) {
          return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
        }
      }
      // b) /admin/users (Quản lý tài khoản): Cho phép Admin HOẶC vai trò có quyền user_management
      else if (pathname.startsWith("/admin/users")) {
        const canAccessUsers = isAdmin || userPerms["user_management"] === true;
        if (!canAccessUsers) {
          return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
        }
      }
      // c) /admin/permissions (Phân quyền màn hình): Cho phép Admin HOẶC vai trò có quyền screen_permission_management
      else if (pathname.startsWith("/admin/permissions")) {
        const canAccessPerms = isAdmin || userPerms["screen_permission_management"] === true;
        if (!canAccessPerms) {
          return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
        }
      }
      // d) Các route /admin khác: Chỉ Admin
      else if (!isAdmin) {
        return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
      }
    }

    // 3.2 Chặn route /teacher-fulltime/*: Chỉ Teacher Full-time (hoặc Admin) mới được vào
    if (pathname.startsWith("/teacher-fulltime")) {
      if (!isTeacherFullTime && !isAdmin) {
        return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
      }
    }

    // 3.3 Chặn route /teacher-parttime/*: Chỉ Teacher Part-time (hoặc Admin) mới được vào
    if (pathname.startsWith("/teacher-parttime")) {
      if (!isTeacherPartTime && !isAdmin) {
        return NextResponse.redirect(new URL(getRoleDashboard(userRole), request.url));
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
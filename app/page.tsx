import { cookies } from "next/headers";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { ShieldCheck, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("id_token")?.value;
  const rawUserName = cookieStore.get("user_name")?.value;
  const rawUserRole = cookieStore.get("user_role")?.value;

  const userName = rawUserName ? decodeURIComponent(rawUserName) : "Người dùng";
  const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : "Admin";
  const isAuthenticated = !!token;

  // Determine dashboard link according to role
  let dashboardHref: string = API_ROUTES.ADMIN.DASHBOARD;
  if (userRole.toLowerCase().includes("full-time")) {
    dashboardHref = "/teacher-fulltime/dashboard";
  } else if (userRole.toLowerCase().includes("part-time")) {
    dashboardHref = "/teacher-parttime/dashboard";
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-white relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-slate-800/80 px-6 py-4 backdrop-blur-xl bg-[#0B0F17]/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight whitespace-nowrap">
              SMH Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm text-slate-300 whitespace-nowrap">
                  Xin chào, <span className="font-bold text-rose-400">{userName}</span>
                </span>
                <Link
                  href={dashboardHref}
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 text-white hover:from-rose-500 hover:to-red-500 shadow-md shadow-rose-600/30 transition-all whitespace-nowrap"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span>Vào Dashboard</span>
                </Link>
                <LogoutButton />
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2.5 text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-lg shadow-rose-600/30 hover:scale-105 transition-all whitespace-nowrap"
              >
                Đăng Nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center relative z-10">
        <div className="max-w-3xl w-full mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold tracking-wider uppercase shadow-sm whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Hệ Thống Đào Tạo & Quản Trị Trực Tuyến</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-tight">
            Student MindX Hub
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Nền tảng quản lý tài khoản, điều hướng phân quyền ma trận vai trò và theo dõi tiến độ đào tạo toàn diện.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Link
                href={dashboardHref}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-2xl shadow-xl shadow-rose-600/30 hover:scale-105 transition-all whitespace-nowrap"
              >
                <span>Mở Bảng Điều Khiển Của Bạn</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-2xl shadow-xl shadow-rose-600/30 hover:scale-105 transition-all whitespace-nowrap"
              >
                <span>Đăng Nhập Ngay</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/80 text-center text-xs text-slate-500 relative z-10 whitespace-nowrap">
        © {new Date().getFullYear()} SMH - Student MindX Hub. All rights reserved.
      </footer>
    </div>
  );
}
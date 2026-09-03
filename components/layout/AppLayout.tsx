"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  Settings,
  Users,
  KeyRound,
  Sun,
  Moon,
  ChevronDown,
  UserCheck,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { API_ROUTES } from "@/lib/constants/api-routes";

interface UserProfile {
  id?: string;
  name: string;
  role: string;
  role_points?: number;
  lms_code?: string;
  permissions?: Record<string, boolean>;
}

export default function AppLayout({
  children,
  pageTitle,
  breadcrumbs,
}: {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<UserProfile>({
    name: "Quản trị viên",
    role: "Admin",
    role_points: 1,
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch current user from API with real-time polling & window focus
  const fetchUser = () => {
    fetch(API_ROUTES.AUTH.ME, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser({
            id: data.user.id,
            name: data.user.name || "Người dùng",
            role: data.user.role || "Admin",
            role_points: data.user.role_points || 1,
            lms_code: data.user.lms_code,
            permissions: data.user.permissions || {},
          });
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUser();
    // Lắng nghe sự kiện cập nhật hồ sơ & phân quyền để đồng bộ menu mới
    const handleProfileUpdate = () => fetchUser();
    window.addEventListener("smh:profile_updated", handleProfileUpdate);
    window.addEventListener("smh:permissions_updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("smh:profile_updated", handleProfileUpdate);
      window.removeEventListener("smh:permissions_updated", handleProfileUpdate);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch(API_ROUTES.AUTH.LOGOUT, { method: "POST" });
    } catch (_) {}
    router.push("/login");
    router.refresh();
  };

  // Resolve Role Badge Styling (Ruby / Purple / Emerald)
  const getRoleBadgeStyle = (roleName: string) => {
    const lower = roleName.toLowerCase();
    if (lower.includes("admin")) {
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    }
    if (lower.includes("full-time") || lower.includes("fulltime")) {
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
    }
    return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30";
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "TỔNG QUAN": true,
    "QUẢN LÝ HỆ THỐNG": true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: prev[groupName] === false ? true : false,
    }));
  };

  // Xác định đường dẫn Dashboard tương ứng theo vai trò
  const getDashboardHref = () => {
    const roleLower = user?.role?.toLowerCase() || "";
    if (roleLower.includes("admin")) return API_ROUTES.ADMIN.DASHBOARD;
    if (roleLower.includes("full-time") || roleLower.includes("fulltime"))
      return API_ROUTES.TEACHER_FULLTIME.DASHBOARD;
    if (roleLower.includes("part-time") || roleLower.includes("parttime"))
      return API_ROUTES.TEACHER_PARTTIME.DASHBOARD;
    return API_ROUTES.ADMIN.DASHBOARD;
  };

  // Lọc danh sách menu hiển thị dựa trên vai trò và quyền hạn được cấp
  const isAdmin = user.role.toLowerCase().includes("admin");

  // Đọc quyền từ user.permissions hoặc đồng bộ từ cookie user_permissions
  const getEffectivePermissions = (): Record<string, boolean> => {
    if (user.permissions && Object.keys(user.permissions).length > 0) {
      return user.permissions;
    }
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/(?:^|; )user_permissions=([^;]*)/);
      if (match && match[1]) {
        try {
          return JSON.parse(decodeURIComponent(match[1]));
        } catch (_) {}
      }
    }
    // Mặc định cho phép hiển thị nếu chưa load xong để tránh giật lag menu
    return {
      system_management: true,
      user_management: true,
      screen_permission_management: true,
    };
  };

  const userPerms = getEffectivePermissions();

  const canSeeSystemManagement = isAdmin || userPerms["system_management"] === true;
  const canSeeUserManagement = isAdmin || userPerms["user_management"] === true;
  const canSeeScreenPermissions = isAdmin || userPerms["screen_permission_management"] === true;

  const systemSubItems = [];
  if (canSeeUserManagement) {
    systemSubItems.push({
      name: "Quản lý tài khoản",
      href: API_ROUTES.ADMIN.USERS_SCREEN,
      icon: Users,
    });
  }
  if (canSeeScreenPermissions) {
    systemSubItems.push({
      name: "Phân quyền màn hình",
      href: API_ROUTES.ADMIN.PERMISSIONS_SCREEN,
      icon: KeyRound,
    });
  }

  // Nav menu items
  const menuItems = [
    {
      group: "TỔNG QUAN",
      icon: LayoutDashboard,
      items: [
        {
          name: "Bảng điều khiển",
          href: getDashboardHref(),
          icon: LayoutDashboard,
        },
      ],
    },
    ...(canSeeSystemManagement && systemSubItems.length > 0
      ? [
          {
            group: "QUẢN LÝ HỆ THỐNG",
            icon: Settings,
            items: systemSubItems,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-white dark:bg-[#0B0F17] border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-600/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-rose-600 via-red-500 to-rose-500 bg-clip-text text-transparent">
                  SMH Portal
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                Student MindX Hub
              </p>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {menuItems.map((group, idx) => {
            const isExpanded = expandedGroups[group.group] !== false;
            return (
              <div key={idx} className="space-y-1">
                {/* Menu Chính / Group Header tương tác bấm mở/đóng */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.group)}
                  className="w-full px-3 py-2 flex items-center justify-between rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
                    <span>{group.group}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? "" : "-rotate-90"
                    }`}
                  />
                </button>

                {/* Danh sách Menu Con */}
                {isExpanded && (
                  <div className="space-y-1 pl-2 border-l border-slate-100 dark:border-slate-800/60 ml-3">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                            isActive
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 shadow-sm"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon
                              className={`w-4 h-4 ${
                                isActive
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-slate-400 dark:text-slate-500"
                              }`}
                            />
                            <span>{item.name}</span>
                          </div>
                          {isActive && (
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-500/5 to-slate-100 dark:from-rose-950/20 dark:to-slate-900/50 border border-rose-500/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-600 dark:text-slate-400 font-medium">Hệ thống sẵn sàng</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          </div>
        </div>
      </aside>

      {/* MAIN WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP HEADER */}
        <header className="sticky top-0 z-30 h-20 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">
          {/* Left: Mobile Menu Toggle & Breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                      {bc.href ? (
                        <Link
                          href={bc.href}
                          className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          {bc.label}
                        </Link>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {bc.label}
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 dark:text-slate-500">Hệ Thống SMH</div>
              )}
              {pageTitle && (
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {pageTitle}
                </h1>
              )}
            </div>
          </div>

          {/* Right: Theme Toggle & User Profile Dropdown */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/50 transition-all shadow-sm group"
              title={`Bấm để chuyển sang giao diện ${theme === "dark" ? "Sáng" : "Tối"}`}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                  <span className="hidden sm:inline text-xs font-semibold">Giao diện Tối</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-700 group-hover:-rotate-12 transition-transform" />
                  <span className="hidden sm:inline text-xs font-semibold">Giao diện Sáng</span>
                </>
              )}
            </button>

            {/* User Profile Dropdown Trigger */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-1.5 sm:px-3 sm:py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-rose-300 dark:hover:border-rose-900/50 transition-all shadow-sm group"
              >
                {/* Avatar Icon */}
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-rose-600/20">
                  {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>

                {/* Name & Role Badge */}
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-md border ${getRoleBadgeStyle(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* DROPDOWN MENU */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800/80">
                  {/* User Meta */}
                  <div className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      Tài khoản đang đăng nhập
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                      {user.name}
                    </p>
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${getRoleBadgeStyle(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>

                  {/* Links */}
                  <div className="py-1.5 px-1.5">
                    <Link
                      href={API_ROUTES.USER.PROFILE}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-rose-500" />
                      <span>Chỉnh sửa thông tin cá nhân</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất khỏi hệ thống</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

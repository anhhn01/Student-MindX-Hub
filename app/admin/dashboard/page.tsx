"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  Users,
  Activity,
  ShieldCheck,
  ArrowUpRight,
  RefreshCw,
  KeyRound,
} from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";

interface AdminStats {
  total_accounts: number;
  total_visits_admin: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    total_accounts: 0,
    total_visits_admin: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.DASHBOARD_STATS);
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats({
          total_accounts: data.stats.total_accounts || 0,
          total_visits_admin: data.stats.total_visits_admin || 0,
        });
      }
    } catch (err) {
      console.error("Lỗi tải stats admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <AppLayout
      pageTitle="Bảng Điều Khiển Quản Trị Viên"
      breadcrumbs={[
        { label: "Tổng quan", href: API_ROUTES.ADMIN.DASHBOARD },
        { label: "Dashboard Quản trị viên" },
      ]}
    >
      <div className="space-y-6">
        {/* HERO BANNER RUBY-OBSIDIAN */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 text-white p-8 sm:p-10 shadow-xl shadow-rose-900/20">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-black/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold mb-4 text-white whitespace-nowrap">
              <ShieldCheck className="w-4 h-4 text-rose-200" />
              <span>Quản Trị Viên (Admin)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Không Gian Điều Hành & Quản Trị Hệ Thống
            </h1>
            <p className="text-sm sm:text-base text-rose-100/90 leading-relaxed">
              Theo dõi tổng quan tài nguyên người dùng, lưu lượng truy cập và tình trạng vận hành nền tảng SMH toàn hệ thống.
            </p>
          </div>
        </div>

        {/* 2 STAT CARDS (Theo yêu cầu: Tổng số tài khoản & Tổng lượt truy cập) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Card 1: Tổng Số Tài Khoản */}
          <div className="bg-white dark:bg-[#0B0F17] rounded-3xl p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-rose-500/30 transition-all flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Tổng Số Tài Khoản
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 whitespace-nowrap">
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-rose-500 mt-1" />
                ) : (
                  `${stats.total_accounts} tài khoản`
                )}
              </h3>
            </div>
          </div>

          {/* Card 2: Tổng Lượt Truy Cập */}
          <div className="bg-white dark:bg-[#0B0F17] rounded-3xl p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm hover:border-teal-500/30 transition-all flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50 flex items-center justify-center shrink-0">
              <Activity className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Tổng Lượt Truy Cập
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 whitespace-nowrap">
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-teal-500 mt-1" />
                ) : (
                  `${stats.total_visits_admin.toLocaleString()} lượt`
                )}
              </h3>
            </div>
          </div>
        </div>

        {/* PHÍM TẮT HÀNH ĐỘNG NHANH (Dẫn đến route chuẩn /[role]/[main_menu]/[menu]) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={API_ROUTES.ADMIN.USERS_SCREEN}
            className="p-5 rounded-2xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors whitespace-nowrap">
                  Quản lý tài khoản
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phê duyệt, phân vai trò và xét duyệt tài khoản
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
          </Link>

          <Link
            href={API_ROUTES.ADMIN.PERMISSIONS_SCREEN}
            className="p-5 rounded-2xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 hover:border-rose-500/40 transition-all flex items-center justify-between group shadow-sm"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors whitespace-nowrap">
                  Phân quyền màn hình
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cấu hình ma trận phân quyền màn hình cho các vai trò
                </p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-rose-500 transition-colors shrink-0" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

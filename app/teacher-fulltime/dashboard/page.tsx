"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Activity, Award, RefreshCw } from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function TeacherFullTimeDashboardPage() {
  const [visits, setVisits] = useState<number>(346);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ROUTES.DASHBOARD_STATS)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.stats) {
          setVisits(data.stats.total_visits_fulltime || 346);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppLayout
      pageTitle="Bảng Điều Khiển Giáo Viên Cơ Hữu"
      breadcrumbs={[
        { label: "Giảng dạy", href: "/teacher-fulltime/dashboard" },
        { label: "Dashboard Full-time" },
      ]}
    >
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 rounded-3xl p-8 sm:p-10 text-white shadow-2xl shadow-rose-600/20">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20 whitespace-nowrap">
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>Giáo Viên Cơ Hữu (Full-time)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 whitespace-nowrap">
              Không Gian Quản Lý Đào Tạo & Giảng Dạy
            </h2>
            <p className="text-rose-100 text-xs sm:text-sm leading-relaxed">
              Theo dõi lịch lớp, tiến độ đào tạo và quản lý chất lượng giảng dạy học viên trong toàn bộ khóa học.
            </p>
          </div>
        </div>

        {/* Stats Grid - Card Tổng lượt truy cập */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-[#0B0F17] p-6 rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center gap-4 hover:border-teal-500/30 transition-all">
            <div className="p-3.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block whitespace-nowrap">
                Tổng Lượt Truy Cập
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 whitespace-nowrap">
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-teal-500 mt-1" />
                ) : (
                  `${visits.toLocaleString()} lượt`
                )}
              </h3>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

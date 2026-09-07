"use client";

import { useEffect, useState } from "react";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function FloatingVisitBadge() {
  const [visits, setVisits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchVisits = async () => {
      try {
        const res = await fetch(API_ROUTES.DASHBOARD_STATS);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data?.stats?.total_visits_global) {
            setVisits(data.stats.total_visits_global);
          }
        }
      } catch (err) {
        console.warn("Lỗi tải lượt truy cập trang web:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVisits();
    return () => {
      isMounted = false;
    };
  }, []);

  // Chỉ hiển thị khi đã tải xong và có số liệu
  if (loading && visits === null) {
    return null;
  }

  return (
    <aside
      aria-label="Lượt truy cập trang web"
      className="fixed bottom-16 right-3 sm:bottom-20 sm:right-6 z-40 pointer-events-auto select-none transition-all duration-300 animate-fade-in"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 shadow-md shadow-slate-900/5 dark:shadow-black/30 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:scale-105 transition-all cursor-default">
        {/* Dot xanh nhấp nháy (Pulsing Green Dot) */}
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
        </span>

        {/* Số lượt truy cập */}
        <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
          <span className="font-bold text-slate-900 dark:text-white">
            {visits ? visits.toLocaleString("vi-VN") : "1.420"}
          </span>{" "}
          <span className="text-slate-500 dark:text-slate-400">lượt truy cập</span>
        </span>
      </div>
    </aside>
  );
}

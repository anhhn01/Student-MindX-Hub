import React from "react";
import { ShieldCheck } from "lucide-react";

export default function SystemFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-[#0B0F17]/70 backdrop-blur-md px-4 sm:px-8 py-5 mt-auto transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        {/* Cột 1: Thông tin thương hiệu & Ghi nhận người xây dựng */}
        <div className="flex items-center gap-3 text-center md:text-left">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-600/20 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white tracking-tight">
              Student MindX Hub (SMH)
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] font-medium">
              Website nội bộ được xây dựng bởi{" "}
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Huỳnh Nhật Anh - TF Coding HCM4
              </span>
            </p>
          </div>
        </div>

        {/* Cột 2: Tình Trạng Vận Hành Hệ Thống (Supabase DB Connected & RBAC) */}
        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 font-medium text-[11px] whitespace-nowrap shadow-sm">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Hệ thống hoạt động ổn định 100% • Supabase DB Connected • Bảo Mật RBAC</span>
        </div>

        {/* Cột 3: Bản quyền & Phiên bản */}
        <div className="text-slate-500 dark:text-slate-500 text-center md:text-right text-[11px] space-y-0.5">
          <p className="whitespace-nowrap">© {new Date().getFullYear()} Student MindX Hub. All rights reserved.</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Phiên bản v1.0.0-production
          </p>
        </div>
      </div>
    </footer>
  );
}

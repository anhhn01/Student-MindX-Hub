"use client";

import React from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SMHLogo } from "@/components/brand/SMHLogo";

interface PublicHeaderProps {
  rightElement?: React.ReactNode;
}

export default function PublicHeader({ rightElement }: PublicHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-20 border-b border-slate-200 dark:border-slate-800/80 relative z-20 backdrop-blur-xl bg-white/70 dark:bg-[#0B0F17]/70 transition-colors duration-300">
      <div className="max-w-7xl w-full mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <SMHLogo size="md" href="/" />

        <div className="flex items-center gap-3">
          {rightElement}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/50 transition-all shadow-sm"
            title={`Chuyển đổi giao diện sang ${theme === "dark" ? "Sáng" : "Tối"}`}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">Giao diện Tối</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-semibold whitespace-nowrap hidden sm:inline">Giao diện Sáng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

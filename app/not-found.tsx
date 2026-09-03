"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ShieldAlert,
  Home,
  LogIn,
  Sparkles,
  Compass,
} from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [redirectUrl, setRedirectUrl] = useState<string>("/");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [roleName, setRoleName] = useState<string>("Khách vãng lai");

  useEffect(() => {
    // 1. Kiểm tra trạng thái đăng nhập: nếu đã đăng nhập thì về dashboard của role đó, chưa đăng nhập thì về trang chủ (/)
    fetch(API_ROUTES.AUTH.ME)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.role) {
          setIsLoggedIn(true);
          const role = data.user.role;
          setRoleName(role);
          const lower = role.toLowerCase();
          if (lower.includes("admin")) {
            setRedirectUrl(API_ROUTES.ADMIN.DASHBOARD);
          } else if (lower.includes("full-time") || lower.includes("fulltime")) {
            setRedirectUrl(API_ROUTES.TEACHER_FULLTIME.DASHBOARD);
          } else if (lower.includes("part-time") || lower.includes("parttime")) {
            setRedirectUrl(API_ROUTES.TEACHER_PARTTIME.DASHBOARD);
          } else {
            setRedirectUrl("/dashboard");
          }
        } else {
          // Chưa đăng nhập -> Điều hướng về Trang chủ (/)
          setIsLoggedIn(false);
          setRedirectUrl("/");
          setRoleName("Chưa đăng nhập");
        }
      })
      .catch(() => {
        setIsLoggedIn(false);
        setRedirectUrl("/");
        setRoleName("Chưa đăng nhập");
      });
  }, []);

  // 2. Countdown timer 5 giây tự động điều hướng
  useEffect(() => {
    if (countdown <= 0) {
      router.push(redirectUrl);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, redirectUrl, router]);

  return (
    <div className="min-h-screen bg-[#090D16] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-rose-500 selection:text-white">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-red-800/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full text-center relative z-10 animate-fade-in">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold mb-6 shadow-sm whitespace-nowrap">
          <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
          <span>Lỗi 404: Không Tìm Thấy Trang</span>
        </div>

        {/* 404 Headline */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-b from-white via-slate-200 to-slate-600 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 tracking-tight">
          Trang bạn tìm kiếm không tồn tại hoặc đã bị di dời
        </h2>

        <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
          Đường dẫn không hợp lệ. Hệ thống sẽ tự động đưa bạn về {isLoggedIn ? `Bảng điều khiển (${roleName})` : "Trang chủ"}.
        </p>

        {/* Countdown Box */}
        <div className="mt-8 p-5 bg-[#0B0F17]/90 border border-slate-800 rounded-3xl backdrop-blur-xl shadow-2xl max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span className="whitespace-nowrap">
              {isLoggedIn ? `Tự động về Dashboard (${roleName})` : "Tự động về Trang chủ"}
            </span>
            <span className="text-rose-400 font-bold font-mono text-sm whitespace-nowrap">{countdown}s</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-red-500 transition-all duration-1000 ease-linear rounded-full shadow-sm shadow-rose-500/50"
              style={{ width: `${(countdown / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={redirectUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all hover:scale-105 whitespace-nowrap"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>{isLoggedIn ? "Về Dashboard ngay" : "Về Trang chủ ngay"}</span>
            <ArrowRight className="w-4 h-4 ml-1 shrink-0" />
          </Link>

          {!isLoggedIn ? (
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-all whitespace-nowrap"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Đăng nhập</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-all whitespace-nowrap"
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>Về Trang chủ</span>
            </Link>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-12 text-xs text-slate-500 flex items-center justify-center gap-1.5 whitespace-nowrap">
          <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span>Student MindX Hub (SMH) Platform</span>
        </div>
      </div>
    </div>
  );
}

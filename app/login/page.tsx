"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldAlert, Mail, ShieldCheck } from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function LoginPage() {
  const router = useRouter();
  const [lmsCode, setLmsCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAccessDenied(false);
    setLoading(true);

    try {
      const res = await fetch(API_ROUTES.AUTH.LOGIN, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ lms_code: lmsCode.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 || data.error?.includes("quyền truy cập")) {
          setIsAccessDenied(true);
        }
        setError(data.error || "Xin lỗi thông tin đăng nhập chưa chính xác");
        return;
      }

      // Redirect to specific role dashboard route (Admin -> /admin/dashboard, etc.)
      router.push(data.redirect_url || "/");
      router.refresh();
    } catch (err) {
      setError("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
    setIsAccessDenied(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090D16] relative overflow-hidden px-4 py-12">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 bg-white/95 dark:bg-[#0B0F17]/90 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-md p-8 sm:p-10 border border-slate-200 dark:border-slate-800/80 transition-all">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-xl shadow-rose-600/30 mb-4 transform hover:scale-105 transition-transform">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
            Student MindX Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
            Hệ thống quản lý học thuật & đào tạo
          </p>
        </div>

        {/* Error Notification Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border-l-4 border-rose-500 rounded-r-2xl text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex flex-col gap-2 shadow-sm animate-fade-in">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
            {isAccessDenied && (
              <div className="mt-2 pt-2 border-t border-rose-500/20 flex justify-end">
                <a
                  href="mailto:admin@mindx.edu.vn?subject=Y%EA%C0u%20c%E1%BA%A7u%20c%E1%BA%A5p%20quy%E1%BB%81n%20truy%20c%E1%BA%ADp%20SMH"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-semibold text-xs rounded-xl transition-all shadow-md whitespace-nowrap"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Liên hệ Admin</span>
                </a>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {/* LMS Code Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 whitespace-nowrap">
              Mã tài khoản LMS
            </label>
            <input
              type="text"
              name="login_lms_code"
              id="login_lms_code"
              autoComplete="off"
              value={lmsCode}
              onChange={(e) => {
                setLmsCode(e.target.value);
                clearError();
              }}
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white text-sm"
              placeholder="Ví dụ: mindx_admin"
            />
          </div>

          {/* Password Input with Eye Icon */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 whitespace-nowrap">
              Mật khẩu đăng nhập
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="login_password_field"
                id="login_password_field"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                required
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white text-sm pr-12"
                placeholder="Nhập mật khẩu của bạn"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-rose-600/30 hover:shadow-rose-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-3 whitespace-nowrap"
          >
            {loading ? "Đang xác thực bảo mật..." : "Đăng Nhập Vào Hệ Thống"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 whitespace-nowrap">
          © {new Date().getFullYear()} SMH System. Bảo mật cấp doanh nghiệp.
        </div>
      </div>
    </div>
  );
}

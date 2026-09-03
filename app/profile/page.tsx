"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  UserPlus,
  Save,
  Lock,
  Mail,
  Calendar,
  Sparkles,
} from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";

interface UserProfileData {
  id: string;
  full_name: string;
  email: string;
  lms_code: string;
  is_firebase: boolean;
  account_source: string;
  role: string;
  status: string;
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.USER.API_PROFILE);
      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        setFullName(data.user.full_name || "");
      } else {
        setFeedback({ type: "error", message: data.error || "Không thể tải hồ sơ cá nhân" });
      }
    } catch (_) {
      setFeedback({ type: "error", message: "Lỗi kết nối khi lấy thông tin hồ sơ" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (password && password.length > 0) {
      if (password.length < 6) {
        setFeedback({ type: "error", message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
        return;
      }
      if (password !== confirmPassword) {
        setFeedback({ type: "error", message: "Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại." });
        return;
      }
    }

    setSaveLoading(true);
    try {
      const res = await fetch(API_ROUTES.USER.API_PROFILE, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          password: password.trim().length > 0 ? password : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: "success", message: "Đã cập nhật thông tin cá nhân thành công!" });
        setPassword("");
        setConfirmPassword("");
        fetchProfile();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("smh:profile_updated"));
        }
      } else {
        setFeedback({ type: "error", message: data.error || "Không thể cập nhật hồ sơ" });
      }
    } catch (_) {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ khi lưu hồ sơ" });
    } finally {
      setSaveLoading(false);
    }
  };

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

  return (
    <AppLayout
      pageTitle="Hồ Sơ Cá Nhân"
      breadcrumbs={[
        { label: "Hệ thống", href: "/" },
        { label: "Hồ sơ cá nhân" },
      ]}
    >
      <div className="space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 animate-fade-in ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm font-semibold">{feedback.message}</span>
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải thông tin hồ sơ...
          </div>
        ) : profile ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CỘT TRÁI: THẺ ĐỊNH DANH (IDENTITY CARD) */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/80 shadow-xl relative overflow-hidden">
                {/* Decorative background ambient */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col items-center text-center relative z-10">
                  {/* Large Avatar */}
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-red-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-xl shadow-rose-600/30 ring-4 ring-rose-500/20 mb-4">
                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : "U"}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {profile.full_name || "Chưa cập nhật tên"}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Mã LMS: <span className="font-bold text-rose-500">{profile.lms_code || "—"}</span>
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-xl border ${getRoleBadgeStyle(
                        profile.role
                      )}`}
                    >
                      {profile.role}
                    </span>
                    <span className="px-3 py-1 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {profile.status}
                    </span>
                  </div>
                </div>

                {/* Identity Details List */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" /> Email
                    </span>
                    <span className="text-slate-900 dark:text-white font-medium line-clamp-1">
                      {profile.email || "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-500" /> Nguồn tài khoản
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      {profile.is_firebase ? (
                        <>
                          <Flame className="w-3.5 h-3.5 text-purple-500" />
                          <span>Tài khoản LMS</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Do website tạo</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" /> Ngày tạo
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">
                      {profile.created_at
                        ? new Date(profile.created_at).toLocaleDateString("vi-VN")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: FORM CHỈNH SỬA THÔNG TIN */}
            <div className="lg:col-span-2">
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/80 shadow-xl">
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800/80">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Cập Nhật Thông Tin Cá Nhân
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Chỉnh sửa thông tin hiển thị và mật khẩu đăng nhập của bạn
                    </p>
                  </div>
                  <Sparkles className="w-5 h-5 text-rose-500" />
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5" autoComplete="off">
                  {/* Dummy inputs for browser autofill suppression */}
                  <input type="text" name="fake_u" style={{ display: "none" }} tabIndex={-1} autoComplete="username" />
                  <input type="password" name="fake_p" style={{ display: "none" }} tabIndex={-1} autoComplete="current-password" />

                  {/* Họ và tên */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nhập họ và tên..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                    />
                  </div>

                  {/* Readonly info grid: Email & LMS Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Mã LMS</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Cố định)</span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={profile.lms_code || ""}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/30 text-slate-500 text-sm cursor-not-allowed font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Email</span>
                        <span className="text-[10px] text-slate-400 font-normal">(Cố định)</span>
                      </label>
                      <input
                        type="email"
                        disabled
                        value={profile.email || ""}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/30 text-slate-500 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phần Đổi Mật Khẩu */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-rose-500" />
                      <span>Đổi Mật Khẩu</span>
                    </h4>
                    <p className="text-xs text-slate-400 mb-4">
                      {profile.is_firebase
                        ? "Tài khoản LMS xác thực trực tiếp qua hệ thống LMS MindX nên không thay đổi mật khẩu tại đây."
                        : "Để trống nếu bạn không có nhu cầu thay đổi mật khẩu hiện tại."}
                    </p>

                    {!profile.is_firebase ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Mật khẩu mới
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              autoComplete="new-password"
                              placeholder="Tối thiểu 6 ký tự..."
                              className="w-full pl-4 pr-10 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex={-1}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            Xác nhận mật khẩu mới
                          </label>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            placeholder="Nhập lại mật khẩu mới..."
                            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-rose-500 transition-all"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs flex items-center gap-2">
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>Chức năng đổi mật khẩu bị khóa cho tài khoản LMS có sẵn.</span>
                      </div>
                    )}
                  </div>

                  {/* Nút Submit */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saveLoading ? "Đang lưu thay đổi..." : "Lưu Thông Tin"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}

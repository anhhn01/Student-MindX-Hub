"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  Building2,
  Search,
  RefreshCw,
  Check,
  X,
  Shield,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronRight,
  Filter,
} from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";
import { CentreItem } from "@/lib/constants/centres";

interface UserCentresData {
  id: string;
  lms_code: string;
  full_name: string;
  is_firebase: boolean;
  role: string;
  role_points: number;
  status: string;
  status_display_name: string;
  can_edit: boolean;
  centres: CentreItem[];
}

export default function UserCentresManagementScreen() {
  const [users, setUsers] = useState<UserCentresData[]>([]);
  const [officialCentres, setOfficialCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // State modal chỉnh sửa
  const [selectedUser, setSelectedUser] = useState<UserCentresData | null>(null);
  const [editingCentres, setEditingCentres] = useState<string[]>([]); // Danh sách ID cơ sở đã chọn
  const [modalSearch, setModalSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Hiển thị thông báo Toast
  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Tải danh sách người dùng và cơ sở
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [resUsers, resCentres] = await Promise.all([
        fetch(API_ROUTES.ADMIN.USER_CENTRES, { cache: "no-store" }),
        fetch(API_ROUTES.ADMIN.CENTRES, { cache: "no-store" }),
      ]);

      const dataUsers = await resUsers.json();
      const dataCentres = await resCentres.json();

      if (dataUsers.success && Array.isArray(dataUsers.users)) {
        setUsers(dataUsers.users);
      }
      if (dataCentres.success && Array.isArray(dataCentres.centres)) {
        setOfficialCentres(dataCentres.centres);
      }
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu cơ sở trực thuộc:", err);
      showToast("error", "Không thể tải danh sách dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (user: UserCentresData) => {
    if (!user.can_edit) return;
    setSelectedUser(user);
    setEditingCentres(user.centres.map((c) => c.id));
    setModalSearch("");
  };

  // Toggle chọn cơ sở trong modal
  const handleToggleCentre = (centreId: string) => {
    setEditingCentres((prev) =>
      prev.includes(centreId) ? prev.filter((id) => id !== centreId) : [...prev, centreId]
    );
  };

  // Chọn tất cả cơ sở
  const handleSelectAll = () => {
    setEditingCentres(officialCentres.map((c) => c.id));
  };

  // Bỏ chọn tất cả cơ sở
  const handleDeselectAll = () => {
    setEditingCentres([]);
  };

  // Lưu cơ sở trực thuộc
  const handleSaveCentres = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      const selectedCentreObjects: CentreItem[] = officialCentres.filter((c) =>
        editingCentres.includes(c.id)
      );

      const res = await fetch(API_ROUTES.ADMIN.USER_CENTRES_DETAIL(selectedUser.id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centres: selectedCentreObjects }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        showToast("error", resData.error || "Cập nhật cơ sở thất bại");
        return;
      }

      showToast("success", resData.message || "Cập nhật cơ sở trực thuộc thành công!");

      // Cập nhật lại state danh sách users
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, centres: selectedCentreObjects } : u))
      );
      setSelectedUser(null);
    } catch (err: any) {
      console.error("Lỗi khi lưu cơ sở:", err);
      showToast("error", "Đã xảy ra lỗi khi lưu cơ sở. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // Lọc danh sách người dùng
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.lms_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRole =
        roleFilter === "all" || u.role?.toLowerCase().includes(roleFilter.toLowerCase());

      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Lọc danh sách cơ sở trong modal
  const filteredModalCentres = useMemo(() => {
    if (!modalSearch.trim()) return officialCentres;
    const term = modalSearch.toLowerCase().trim();
    return officialCentres.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.shortName && c.shortName.toLowerCase().includes(term))
    );
  }, [officialCentres, modalSearch]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = users.length;
    const assigned = users.filter((u) => u.centres && u.centres.length > 0).length;
    const totalCentresCount = officialCentres.length;
    return { total, assigned, totalCentresCount };
  }, [users, officialCentres]);

  return (
    <AppLayout
      pageTitle="Quản lý cơ sở trực thuộc"
      breadcrumbs={[
        { label: "Bảng điều khiển", href: "/admin/dashboard" },
        { label: "Quản lý hệ thống" },
        { label: "Quản lý cơ sở trực thuộc" },
      ]}
    >
      <div className="space-y-6 pb-12">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
              toastMessage.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
                : "bg-rose-950/90 text-rose-200 border-rose-500/30"
            }`}
          >
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium whitespace-nowrap">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Title & Intro Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-950 border border-rose-500/20 p-6 md:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold whitespace-nowrap">
                <Building2 className="w-3.5 h-3.5" />
                Quản lý cơ sở trực thuộc • Supabase DB Connected
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Danh Sách Cơ Sở Trực Thuộc Theo Tài Khoản
              </h1>
              <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">
                Đồng bộ tự động từ hệ thống LMS MindX và cho phép các vai trò cấp bậc cao hơn quản lý,
                gán thêm cơ sở trực thuộc cho các tài khoản cấp dưới. Dữ liệu chỉnh sửa được lưu độc lập
                trên Supabase.
              </p>
            </div>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white text-sm font-medium border border-slate-700/60 shadow-lg transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap self-start md:self-auto"
            >
              <RefreshCw className={`w-4 h-4 text-rose-400 ${refreshing ? "animate-spin" : ""}`} />
              Làm mới dữ liệu
            </button>
          </div>
        </div>

        {/* Thẻ thống kê */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Tổng số tài khoản
                </p>
                <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Shield className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Đã gán cơ sở
                </p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.assigned}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  Cơ sở LMS chính thống
                </p>
                <p className="text-2xl font-bold text-rose-400 mt-1">{stats.totalCentresCount}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Thanh công cụ tìm kiếm và lọc */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mã LMS, họ tên..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-rose-500/60 transition-colors cursor-pointer w-full sm:w-auto"
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="full-time">Teacher Full-time</option>
                <option value="part-time">Teacher Part-time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bảng danh sách tài khoản & cơ sở */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-4 text-center whitespace-nowrap w-16">STT</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap w-32">Mã LMS</th>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[200px]">Họ và tên</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap w-36">Loại tài khoản</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap w-40">Vai trò</th>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[280px]">Cơ sở trực thuộc</th>
                  <th className="py-4 px-4 text-center whitespace-nowrap w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-3">
                        <RefreshCw className="w-5 h-5 text-rose-500 animate-spin" />
                        <span>Đang tải danh sách cơ sở trực thuộc...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Không tìm thấy tài khoản nào phù hợp với điều kiện tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const isLms = user.is_firebase;
                    const centresList = user.centres || [];

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        {/* 1. STT */}
                        <td className="py-4 px-4 text-center text-slate-400 font-mono text-xs whitespace-nowrap">
                          {idx + 1}
                        </td>

                        {/* 2. Mã LMS */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800/80 text-rose-400 border border-slate-700/60">
                            {user.lms_code || "—"}
                          </span>
                        </td>

                        {/* 3. Họ và tên */}
                        <td className="py-4 px-6 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-600 to-rose-400 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                              {(user.full_name || user.lms_code || "U")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-white group-hover:text-rose-300 transition-colors">
                                {user.full_name || "Chưa cập nhật"}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 4. Loại tài khoản */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              isLms
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {isLms ? "LMS MindX" : "Nội bộ website"}
                          </span>
                        </td>

                        {/* 5. Vai trò */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                              user.role.toLowerCase().includes("admin")
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : user.role.toLowerCase().includes("full-time") ||
                                  user.role.toLowerCase().includes("fulltime")
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                                : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>

                        {/* 6. Danh sách cơ sở trực thuộc */}
                        <td className="py-4 px-6">
                          {centresList.length === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 italic px-2.5 py-1 rounded bg-slate-950/60 border border-slate-800 whitespace-nowrap">
                              Chưa gán cơ sở
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {centresList.map((c) => (
                                <span
                                  key={c.id}
                                  title={c.name}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/90 text-slate-200 border border-slate-700/80 whitespace-nowrap hover:border-rose-500/40 transition-colors"
                                >
                                  <Building2 className="w-3 h-3 text-rose-400 shrink-0" />
                                  <span className="font-semibold text-rose-300">
                                    {c.shortName || c.code || "CS"}:
                                  </span>
                                  <span className="max-w-[140px] truncate">{c.name.replace(/^HCM\s*-\s*|^HN\s*-\s*/i, "")}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 7. Thao tác */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          {user.can_edit ? (
                            <button
                              onClick={() => handleOpenEditModal(user)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all active:scale-95 shadow-sm whitespace-nowrap"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              Sửa cơ sở
                            </button>
                          ) : (
                            <span
                              title="Bạn không có quyền sửa tài khoản cấp bậc tương đương hoặc cao hơn"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed whitespace-nowrap"
                            >
                              <Lock className="w-3 h-3" />
                              Đã khóa
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Chỉnh sửa cơ sở trực thuộc */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-rose-400" />
                    Cập Nhật Cơ Sở Trực Thuộc
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tài khoản: <span className="font-semibold text-rose-400">{selectedUser.full_name || selectedUser.lms_code}</span> (Vai trò: {selectedUser.role})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  disabled={saving}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {/* Search & Actions toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Tìm kiếm cơ sở..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60"
                    />
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Chọn tất cả
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>

                {/* Counter status */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>
                    Đã chọn: <strong className="text-rose-400 font-semibold">{editingCentres.length}</strong> / {officialCentres.length} cơ sở
                  </span>
                  <span className="text-slate-500 italic">Dữ liệu lưu độc lập trên Supabase</span>
                </div>

                {/* Centres List Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {filteredModalCentres.map((centre) => {
                    const isChecked = editingCentres.includes(centre.id);
                    return (
                      <div
                        key={centre.id}
                        onClick={() => handleToggleCentre(centre.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                          isChecked
                            ? "bg-rose-500/10 border-rose-500/50 shadow-sm"
                            : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/20"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {centre.shortName && (
                              <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 border border-slate-700/60 shrink-0">
                                {centre.shortName}
                              </span>
                            )}
                            <p className="text-xs font-semibold text-white truncate">
                              {centre.name}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: {centre.id.slice(0, 8)}...
                          </p>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked
                              ? "bg-rose-600 border-rose-600 text-white"
                              : "border-slate-700 bg-slate-900"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveCentres}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

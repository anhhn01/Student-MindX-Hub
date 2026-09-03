"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import {
  ShieldCheck,
  Settings,
  Users,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";
import { getRolePoints } from "@/lib/constants/roles";

interface RoleItem {
  id: string;
  name: string;
  points: number;
}

interface MenuItem {
  id: string;
  code: string;
  name: string;
  path?: string;
  is_parent: boolean;
  parent_code?: string;
  children?: MenuItem[];
}

export default function ScreenPermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>("Admin");
  const [currentUserRolePoints, setCurrentUserRolePoints] = useState<number>(1);

  // Fetch Permissions data
  const fetchPermissionsData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_ROUTES.ADMIN.PERMISSIONS);
      const data = await res.json();
      if (res.ok && data.success) {
        setRoles(data.roles || []);
        setMenus(data.menus || []);
        setPermissions(data.permissions || {});
      } else {
        setFeedbackMsg({ type: "error", text: data.error || "Không thể tải dữ liệu phân quyền" });
      }
    } catch (err) {
      setFeedbackMsg({ type: "error", text: "Lỗi kết nối khi tải danh sách phân quyền" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissionsData();
    // Lấy thông tin vai trò của người dùng hiện tại
    fetch(API_ROUTES.AUTH.ME)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.role) {
          setCurrentUserRole(data.user.role);
          setCurrentUserRolePoints(getRolePoints(data.user.role));
        }
      })
      .catch(() => {});
  }, []);

  // Handle Toggle Permission
  const handleToggle = async (roleName: string, menuCode: string, isParent: boolean, currentValue: boolean) => {
    const targetPoints = getRolePoints(roleName);

    // Ràng buộc: Không được tự update cho chính role hiện tại và những role cao hơn mình, chỉ được nhỏ hơn mình thôi (targetPoints > currentUserRolePoints)
    if (targetPoints <= currentUserRolePoints) {
      setFeedbackMsg({
        type: "error",
        text: `Bạn không thể tự cập nhật phân quyền cho chính vai trò của mình hoặc vai trò có cấp bậc cao hơn (${roleName}). Bạn chỉ được phép phân quyền cho các vai trò cấp dưới mình.`,
      });
      return;
    }

    const newValue = !currentValue;
    const actionKey = `${roleName}_${menuCode}`;
    setUpdatingKey(actionKey);
    setFeedbackMsg(null);

    // Optimistic UI Update with Cascade rules
    setPermissions((prev) => {
      const rolePerms = { ...(prev[roleName] || {}) };

      if (isParent) {
        // Tắt menu chính -> Tắt toàn bộ menu phụ
        if (!newValue) {
          rolePerms["system_management"] = false;
          rolePerms["user_management"] = false;
          rolePerms["screen_permission_management"] = false;
        } else {
          // Bật menu chính -> Bật sáng tất cả menu phụ lên hết
          rolePerms["system_management"] = true;
          rolePerms["user_management"] = true;
          rolePerms["screen_permission_management"] = true;
        }
      } else {
        // Toggle menu phụ
        rolePerms[menuCode] = newValue;
        if (newValue) {
          // Bật menu phụ -> tự động bật menu chính
          rolePerms["system_management"] = true;
        }
      }

      return {
        ...prev,
        [roleName]: rolePerms,
      };
    });

    try {
      const res = await fetch(API_ROUTES.ADMIN.PERMISSIONS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_name: roleName,
          menu_code: menuCode,
          is_enabled: newValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedbackMsg({ type: "error", text: data.error || "Không thể cập nhật phân quyền" });
        await fetchPermissionsData();
      } else {
        setFeedbackMsg({
          type: "success",
          text: `Đã cập nhật phân quyền cho vai trò "${roleName}"`,
        });
        window.dispatchEvent(new Event("smh:permissions_updated"));
      }
    } catch (err) {
      setFeedbackMsg({ type: "error", text: "Lỗi kết nối máy chủ" });
      await fetchPermissionsData();
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <AppLayout
      pageTitle="Phân Quyền Màn Hình"
      breadcrumbs={[
        { label: "Quản lý hệ thống", href: API_ROUTES.ADMIN.DASHBOARD },
        { label: "Phân quyền màn hình" },
      ]}
    >
      <div className="space-y-6">
        {/* Page Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Ma Trận Phân Quyền Theo Vai Trò
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Bật hoặc tắt quyền hiển thị các Menu chính và các Tab menu phụ tương ứng cho từng vai trò. Bạn chỉ được phân quyền cho các vai trò cấp dưới mình.
            </p>
          </div>

          <button
            onClick={fetchPermissionsData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-500" : ""}`} />
            <span>Làm mới dữ liệu</span>
          </button>
        </div>

        {/* Feedback Message Banner */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm animate-fade-in ${
              feedbackMsg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedbackMsg.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              )}
              <span className="font-medium">{feedbackMsg.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-xs font-semibold opacity-60 hover:opacity-100 hover:underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Permissions Rule Note */}
        <div className="p-4 bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-200">
              Quy tắc phân cấp vai trò:
            </span>{" "}
            Người dùng hiện tại mang vai trò <span className="font-bold text-rose-600 dark:text-rose-400">{currentUserRole} (Điểm: {currentUserRolePoints})</span>. Theo quy định bảo mật, bạn chỉ được phép thay đổi phân quyền cho các vai trò có cấp bậc thấp hơn mình (Điểm role &gt; {currentUserRolePoints}). Các cột có biểu tượng khóa <Lock className="w-3 h-3 inline text-amber-500" /> biểu thị vai trò bằng hoặc cao hơn bạn nên không thể tự thay đổi.
          </div>
        </div>

        {/* Matrix Table Container */}
        <div className="bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <colgroup>
                <col className="w-2/5 min-w-[260px]" />
                {roles.map((r) => (
                  <col key={r.id} className="w-1/5 min-w-[140px]" />
                ))}
              </colgroup>

              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-4 text-left whitespace-nowrap">Menu / Màn Hình Chức Năng</th>
                  {roles.map((r) => {
                    const isSelfOrHigher = r.points <= currentUserRolePoints;
                    return (
                      <th key={r.id} className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center justify-center whitespace-nowrap">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-slate-900 dark:text-white font-bold text-sm tracking-normal whitespace-nowrap">
                              {r.name}
                            </span>
                            {isSelfOrHigher && (
                              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <span className={`text-[10px] font-medium lowercase mt-0.5 whitespace-nowrap ${
                            isSelfOrHigher ? "text-amber-500 dark:text-amber-400" : "text-slate-400"
                          }`}>
                            (Điểm: {r.points} {isSelfOrHigher ? "- Khóa sửa" : ""})
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={roles.length + 1} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                      Đang tải dữ liệu phân quyền...
                    </td>
                  </tr>
                ) : menus.length === 0 ? (
                  <tr>
                    <td colSpan={roles.length + 1} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap">
                      Chưa có cấu hình menu nào
                    </td>
                  </tr>
                ) : (
                  menus.map((parentMenu) => {
                    return (
                      <React.Fragment key={parentMenu.id}>
                        {/* Hàng Menu Chính */}
                        <tr className="bg-slate-100/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors font-semibold">
                          <td className="px-6 py-4 text-slate-900 dark:text-white whitespace-nowrap">
                            <div className="flex items-center gap-3 whitespace-nowrap">
                              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                                <Settings className="w-4 h-4" />
                              </div>
                              <div className="whitespace-nowrap">
                                <div className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                                  <span>{parentMenu.name}</span>
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/20 whitespace-nowrap shrink-0">
                                    Menu chính
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400 font-normal font-mono whitespace-nowrap">
                                  {parentMenu.code}
                                </span>
                              </div>
                            </div>
                          </td>

                          {roles.map((role) => {
                            const isSelfOrHigher = role.points <= currentUserRolePoints;
                            const isParentEnabled = permissions[role.name]?.[parentMenu.code] ?? (role.name.toLowerCase() === "admin" ? true : false);
                            const isUpdating = updatingKey === `${role.name}_${parentMenu.code}`;

                            return (
                              <td key={role.id} className="px-6 py-4 text-center align-middle">
                                <div className="flex items-center justify-center">
                                  <button
                                    type="button"
                                    disabled={isSelfOrHigher || isUpdating}
                                    onClick={() => handleToggle(role.name, parentMenu.code, true, isParentEnabled)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                                      isParentEnabled
                                        ? "bg-rose-600 shadow-md shadow-rose-600/30"
                                        : "bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600"
                                    } ${isSelfOrHigher ? "cursor-not-allowed opacity-40 filter grayscale" : "cursor-pointer"}`}
                                    title={
                                      isSelfOrHigher
                                        ? `Không thể tự thay đổi phân quyền cho chính vai trò của mình hoặc vai trò cao hơn (${role.name})`
                                        : isParentEnabled
                                        ? "Bấm để tắt menu chính (sẽ tắt và làm mờ các menu phụ bên dưới)"
                                        : "Bấm để bật menu chính (sẽ bật toàn bộ menu phụ bên dưới)"
                                    }
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        isParentEnabled ? "translate-x-5" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>

                        {/* Các Hàng Menu Phụ Thuộc Menu Chính Này */}
                        {parentMenu.children?.map((childMenu) => {
                          return (
                            <tr
                              key={childMenu.id}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                              <td className="px-6 py-3.5 pl-14 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                <div className="flex items-center gap-3 whitespace-nowrap">
                                  {/* Cây phân nhánh */}
                                  <div className="w-3.5 h-3.5 border-l-2 border-b-2 border-slate-300 dark:border-slate-700 rounded-bl-lg -mt-2 shrink-0" />
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center shrink-0">
                                    {childMenu.code === "user_management" ? (
                                      <Users className="w-3.5 h-3.5 text-rose-500" />
                                    ) : (
                                      <KeyRound className="w-3.5 h-3.5 text-red-500" />
                                    )}
                                  </div>
                                  <div className="whitespace-nowrap">
                                    <Link
                                      href={childMenu.path || "/admin/dashboard"}
                                      className="font-semibold text-slate-900 dark:text-slate-200 text-xs block whitespace-nowrap hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                      title={`Nhấp để chuyển đến màn hình "${childMenu.name}"`}
                                    >
                                      {childMenu.name}
                                    </Link>
                                    <Link
                                      href={childMenu.path || "/admin/dashboard"}
                                      className="text-[11px] text-slate-400 hover:text-rose-500 font-mono whitespace-nowrap transition-colors cursor-pointer"
                                    >
                                      {childMenu.path || childMenu.code}
                                    </Link>
                                  </div>
                                </div>
                              </td>

                              {roles.map((role) => {
                                const isSelfOrHigher = role.points <= currentUserRolePoints;
                                const isParentEnabled = permissions[role.name]?.[parentMenu.code] ?? (role.name.toLowerCase() === "admin" ? true : false);
                                const isChildEnabled = permissions[role.name]?.[childMenu.code] ?? (role.name.toLowerCase() === "admin" ? true : false);
                                const isUpdating = updatingKey === `${role.name}_${childMenu.code}`;
                                const isDisabledDueToParent = !isParentEnabled;

                                return (
                                  <td key={role.id} className="px-6 py-3.5 text-center align-middle whitespace-nowrap">
                                    <div className="flex items-center justify-center whitespace-nowrap">
                                      <button
                                        type="button"
                                        disabled={isSelfOrHigher || isDisabledDueToParent || isUpdating}
                                        onClick={() => handleToggle(role.name, childMenu.code, false, isChildEnabled)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                                          isChildEnabled && !isDisabledDueToParent
                                            ? "bg-rose-600 shadow-md shadow-rose-600/30"
                                            : "bg-slate-300 dark:bg-slate-700"
                                        } ${
                                          isSelfOrHigher
                                            ? "cursor-not-allowed opacity-40 filter grayscale"
                                            : isDisabledDueToParent
                                            ? "opacity-25 cursor-not-allowed filter grayscale"
                                            : "hover:bg-slate-400 dark:hover:bg-slate-600 cursor-pointer"
                                        }`}
                                        title={
                                          isSelfOrHigher
                                            ? `Không thể tự thay đổi phân quyền cho chính vai trò của mình hoặc vai trò cao hơn (${role.name})`
                                            : isDisabledDueToParent
                                            ? "Bị vô hiệu hóa và làm mờ vì Menu chính đang tắt"
                                            : isChildEnabled
                                            ? "Bấm để tắt menu phụ này"
                                            : "Bấm để bật menu phụ này"
                                        }
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            isChildEnabled && !isDisabledDueToParent ? "translate-x-4" : "translate-x-0"
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

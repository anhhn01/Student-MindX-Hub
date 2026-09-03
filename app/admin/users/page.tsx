"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import AppLayout from "@/components/layout/AppLayout";
import {
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Pencil,
  Eye,
  Lock,
  X,
  AlertTriangle,
  Flame,
  UserPlus,
  Search,
  CheckCircle2,
  Trash2,
  EyeOff,
  KeyRound,
  Users,
} from "lucide-react";
import { API_ROUTES } from "@/lib/constants/api-routes";
import { getRolePoints } from "@/lib/constants/roles";

interface User {
  id: string;
  lms_code: string | null;
  full_name: string | null;
  created_at: string;
  is_firebase: boolean;
  status: string; // Joined text string ("approved", "pending", "rejected")
  status_display_name?: string;
  role: string; // Joined text string ("Admin", "Teacher Full-time", "Teacher Part-time")
  role_points?: number; // 1: Admin (cao nhất), 2: Teacher Full-time, 3: Teacher Part-time (thấp nhất)
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminName, setCurrentAdminName] = useState<string>("Admin");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRolePoints, setCurrentUserRolePoints] = useState<number>(1);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [pendingAdminTarget, setPendingAdminTarget] = useState<{
    type: "create" | "update";
    userId?: string;
    newRoleName?: string;
  } | null>(null);

  // Add User Form State
  const [addForm, setAddForm] = useState({
    lms_code: "",
    full_name: "",
    password: "",
    is_firebase: false, // Default to website-created account
    role_name: "Teacher Part-time",
    status_code: "approved",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [checkLmsLoading, setCheckLmsLoading] = useState(false);
  const [checkLmsSuccess, setCheckLmsSuccess] = useState<string | null>(null);
  const [lmsHasFullName, setLmsHasFullName] = useState<boolean>(false);

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    full_name: "",
    lms_code: "",
    password: "",
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Transfer Admin State
  const [transferLoading, setTransferLoading] = useState(false);

  // Delete User State
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch current logged-in Admin info for Header greeting
  useEffect(() => {
    fetch(API_ROUTES.AUTH.ME)
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          if (data.user.name) setCurrentAdminName(data.user.name);
          if (data.user.id) setCurrentUserId(data.user.id);
          if (data.user.role) {
            setCurrentUserRolePoints(getRolePoints(data.user.role));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Đảm bảo form thêm tài khoản luôn trống sạch khi mở modal, ngăn trình duyệt tự động điền
  useEffect(() => {
    if (showAddModal) {
      setAddForm({
        lms_code: "",
        full_name: "",
        password: "",
        is_firebase: false,
        role_name: "Teacher Part-time",
        status_code: "approved",
      });
      setAddError(null);
      setCheckLmsSuccess(null);
      setLmsHasFullName(false);
    }
  }, [showAddModal]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS);
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        setError(data.error || "Không thể tải danh sách tài khoản");
      }
    } catch (err) {
      setError("Lỗi kết nối khi lấy dữ liệu tài khoản");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatusCode: "approved" | "pending" | "rejected") => {
    setUpdatingId(userId);
    try {
      const res = await fetch(API_ROUTES.ADMIN.USER_STATUS(userId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusCode: newStatusCode }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchUsers();
      } else {
        alert(data.error || "Cập nhật trạng thái thất bại");
      }
    } catch (err) {
      alert("Lỗi khi kết nối đến máy chủ");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRoleName: string) => {
    // If role requested is Admin, ask for confirmation first
    if (newRoleName.toLowerCase().includes("admin")) {
      setPendingAdminTarget({ type: "update", userId, newRoleName });
      return;
    }

    await executeRoleUpdate(userId, newRoleName);
  };

  const executeRoleUpdate = async (userId: string, newRoleName: string) => {
    setUpdatingId(userId);
    try {
      const res = await fetch(API_ROUTES.ADMIN.USER_ROLE(userId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName: newRoleName }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.forceLogout) {
          alert("Bạn đã chuyển giao quyền Admin thành công. Hệ thống sẽ đăng xuất bạn.");
          router.push("/login");
          router.refresh();
          return;
        }
        await fetchUsers();
      } else {
        alert(data.error || "Cập nhật vai trò thất bại");
      }
    } catch (err) {
      alert("Lỗi khi kết nối đến máy chủ");
    } finally {
      setUpdatingId(null);
    }
  };

  // Check LMS Code Handler
  const handleCheckLms = async () => {
    if (!addForm.lms_code.trim()) {
      setAddError("Vui lòng nhập mã LMS cần kiểm tra");
      return;
    }

    setCheckLmsLoading(true);
    setAddError(null);
    setCheckLmsSuccess(null);

    try {
      const res = await fetch(API_ROUTES.ADMIN.CHECK_LMS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lms_code: addForm.lms_code.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.exists) {
        if (addForm.is_firebase) {
          const lmsName = (data.full_name || "").trim();
          setAddForm((prev) => ({
            ...prev,
            full_name: lmsName || prev.full_name,
          }));
          if (data.has_full_name && lmsName.length > 0) {
            setLmsHasFullName(true);
            setCheckLmsSuccess(`✓ Tìm thấy tài khoản LMS: ${lmsName} (${data.matched_email || addForm.lms_code})`);
          } else {
            setLmsHasFullName(false);
            setCheckLmsSuccess(`✓ Tìm thấy mã LMS (${data.matched_email || addForm.lms_code}) nhưng chưa có họ tên trên hệ thống. Admin có thể tự đặt họ tên bên dưới.`);
          }
          setAddError(null);
        } else {
          // Tài khoản do website tạo: KHÔNG ĐƯỢC trùng với tài khoản LMS!
          setAddError(
            `⚠️ Mã LMS "${data.lms_code}" đã tồn tại trên LMS MindX (${data.full_name}). Tài khoản do website tạo không được trùng với LMS có sẵn. Vui lòng chọn "Tài khoản LMS có sẵn" hoặc chọn mã khác.`
          );
          setCheckLmsSuccess(null);
        }
      } else {
        if (addForm.is_firebase) {
          setAddForm((prev) => ({ ...prev, full_name: "" }));
          setLmsHasFullName(false);
          setAddError(data.error || "Không có tài khoản với mã lms_code này trên hệ thống LMS. Vui lòng kiểm tra lại.");
          setCheckLmsSuccess(null);
        } else {
          // Tài khoản do website tạo: Nếu KHÔNG tồn tại trên LMS thì hoàn toàn hợp lệ
          setCheckLmsSuccess("✓ Mã LMS hợp lệ (Chưa tồn tại trên LMS, có thể tạo tài khoản website)");
          setAddError(null);
        }
      }
    } catch (err) {
      setAddError("Lỗi kết nối khi kiểm tra tài khoản LMS");
    } finally {
      setCheckLmsLoading(false);
    }
  };

  // Add New User Form Submit Handler
  const handleAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAddError(null);

    // Validation chặt chẽ theo từng loại tài khoản
    if (addForm.is_firebase) {
      if (!addForm.lms_code.trim()) {
        setAddError("Vui lòng nhập mã LMS.");
        return;
      }
      if (!addForm.full_name.trim()) {
        setAddError("Vui lòng nhập Họ và tên cho tài khoản này.");
        return;
      }
    } else {
      if (!addForm.lms_code.trim() || !addForm.full_name.trim() || !addForm.password.trim()) {
        setAddError("Đối với tài khoản do website tạo, bắt buộc phải nhập đầy đủ: Mã LMS, Họ và tên, và Mật khẩu.");
        return;
      }
    }

    // If role is Admin, trigger confirmation popup if not confirmed yet
    if (addForm.role_name.toLowerCase().includes("admin") && !pendingAdminTarget) {
      setPendingAdminTarget({ type: "create" });
      return;
    }

    setAddLoading(true);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Không thể tạo tài khoản");
        return;
      }

      setShowAddModal(false);
      setCheckLmsSuccess(null);
      setAddForm({
        lms_code: "",
        full_name: "",
        password: "",
        is_firebase: false,
        role_name: "Teacher Part-time",
        status_code: "approved",
      });

      // If created user was assigned Admin role, update their role explicitly to demote existing admin
      if (data.user && data.user.id && addForm.role_name.toLowerCase().includes("admin")) {
        await executeRoleUpdate(data.user.id, "Admin");
      } else {
        await fetchUsers();
      }
    } catch (err) {
      setAddError("Lỗi kết nối máy chủ");
    } finally {
      setAddLoading(false);
      setPendingAdminTarget(null);
    }
  };

  const handleConfirmTransferAdmin = async () => {
    if (!pendingAdminTarget) return;
    setTransferLoading(true);
    try {
      if (pendingAdminTarget.type === "update" && pendingAdminTarget.userId && pendingAdminTarget.newRoleName) {
        await executeRoleUpdate(pendingAdminTarget.userId, pendingAdminTarget.newRoleName);
      } else if (pendingAdminTarget.type === "create") {
        await handleAddSubmit();
      }
    } finally {
      setTransferLoading(false);
      setPendingAdminTarget(null);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: User) => {
    if (user.is_firebase) return;
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      lms_code: user.lms_code || "",
      password: "",
    });
    setShowEditPassword(false);
    setEditError(null);
  };

  // Edit User Form Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditLoading(true);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USER_DETAIL(editingUser.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Không thể cập nhật thông tin");
        return;
      }

      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      setEditError("Lỗi kết nối máy chủ");
    } finally {
      setEditLoading(false);
    }
  };

  // Delete User Handler
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(API_ROUTES.ADMIN.USER_DETAIL(deletingUser.id), {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Không thể xóa tài khoản");
        return;
      }

      setDeletingUser(null);
      await fetchUsers();
    } catch (err) {
      setDeleteError("Lỗi kết nối máy chủ khi xóa người dùng");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Render combined interactive badge dropdown for Status
  const renderStatusSelectPill = (user: User) => {
    const statusCode = (user.status || "pending").toLowerCase();
    
    let bgClasses = "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-400";
    if (statusCode === "approved") {
      bgClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-400";
    } else if (statusCode === "rejected") {
      bgClasses = "bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-400";
    }

    return (
      <div className="relative inline-flex items-center">
        <select
          value={statusCode}
          onChange={(e) =>
            handleUpdateStatus(
              user.id,
              e.target.value as "approved" | "pending" | "rejected"
            )
          }
          disabled={updatingId === user.id}
          className={`appearance-none px-3 py-1.5 pr-7 rounded-full text-xs font-semibold border cursor-pointer outline-none transition-all focus:ring-2 ${bgClasses}`}
        >
          <option value="approved" className="bg-white text-gray-800">
            ✓ Đã phê duyệt
          </option>
          <option value="pending" className="bg-white text-gray-800">
            ⏳ Chờ phê duyệt
          </option>
          <option value="rejected" className="bg-white text-gray-800">
            ✕ Từ chối
          </option>
        </select>
        <span className="absolute right-2.5 pointer-events-none text-current opacity-70 text-[10px]">
          ▼
        </span>
      </div>
    );
  };

  // Render combined interactive badge dropdown for Role
  const renderRoleSelectPill = (user: User) => {
    const roleName = user.role || "Teacher Part-time";
    const rawRole = roleName.toLowerCase();
    const points = user.role_points || getRolePoints(roleName);

    let bgClasses = "bg-teal-50 text-teal-700 border-teal-200 focus:ring-teal-400";
    if (rawRole.includes("admin")) {
      bgClasses = "bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-400 font-bold";
    } else if (rawRole.includes("full-time") || rawRole.includes("fulltime")) {
      bgClasses = "bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-400";
    }

    return (
      <div className="relative inline-flex items-center">
        <select
          value={roleName}
          onChange={(e) => handleUpdateRole(user.id, e.target.value)}
          disabled={updatingId === user.id}
          className={`appearance-none px-3 py-1.5 pr-7 rounded-full text-xs font-semibold border cursor-pointer outline-none transition-all focus:ring-2 ${bgClasses}`}
        >
          <option value="Admin" className="bg-white text-gray-800">
            🛡️ Admin (Điểm: 1)
          </option>
          <option value="Teacher Full-time" className="bg-white text-gray-800">
            👨‍🏫 Teacher Full-time (Điểm: 2)
          </option>
          <option value="Teacher Part-time" className="bg-white text-gray-800">
            🧑‍🏫 Teacher Part-time (Điểm: 3)
          </option>
        </select>
        <span className="absolute right-2.5 pointer-events-none text-current opacity-70 text-[10px]">
          ▼
        </span>
      </div>
    );
  };

  const getAccountSourceBadge = (isFirebase: boolean) => {
    if (isFirebase) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 shadow-sm whitespace-nowrap" title="Tài khoản hệ thống Firebase LMS (Chỉ xem)">
          <Flame className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" /> Tài khoản LMS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-sm whitespace-nowrap" title="Tài khoản tạo trực tiếp từ Website">
        <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> Do website tạo
      </span>
    );
  };

  return (
    <AppLayout
      pageTitle="Quản Lý Tài Khoản"
      breadcrumbs={[
        { label: "Quản lý hệ thống", href: API_ROUTES.ADMIN.USERS_SCREEN },
        { label: "Quản lý tài khoản" },
      ]}
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#0B0F17] rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800/80 overflow-hidden">
          {/* Header Action Bar */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Danh Sách Tài Khoản & Vai Trò
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quản lý phê duyệt, phân quyền vai trò và thông tin người dùng trong toàn hệ thống
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-2xl shadow-lg shadow-rose-600/30 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" /> Thêm tài khoản mới
              </button>
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-50 border border-slate-200 dark:border-slate-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-500" : ""}`} /> Cập nhật
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border-b border-rose-100 text-rose-700 text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              {error}
            </div>
          )}

          {/* Account Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 table-fixed min-w-[960px]">
              <colgroup>
                <col className="w-14 text-center" />
                <col className="w-28 text-center" />
                <col className="w-44 text-left" />
                <col className="w-36 text-center" />
                <col className="w-40 text-center" />
                <col className="w-52 text-center" />
                <col className="w-56 text-center" />
              </colgroup>
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider border-b border-slate-100 dark:border-slate-800/80 font-semibold">
                <tr>
                  <th className="px-4 py-4 text-center whitespace-nowrap">STT</th>
                  <th className="px-4 py-4 text-center whitespace-nowrap">Mã LMS</th>
                  <th className="px-4 py-4 text-left whitespace-nowrap">Họ và tên</th>
                  <th className="px-4 py-4 text-center whitespace-nowrap">Loại tài khoản</th>
                  <th className="px-4 py-4 text-center whitespace-nowrap">Trạng thái</th>
                  <th className="px-4 py-4 text-center whitespace-nowrap">Vai trò</th>
                  <th className="px-4 py-4 text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap">
                      Đang tải danh sách tài khoản...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap">
                      Chưa có dữ liệu người dùng
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => {
                    const isFirebase = user.is_firebase;
                    const isSelf = !!currentUserId && user.id === currentUserId;
                    const targetRolePoints = user.role_points || getRolePoints(user.role);
                    const isUnderMyRole = targetRolePoints > currentUserRolePoints;
                    const canEdit = !isFirebase && (isSelf || isUnderMyRole);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-4 text-center font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="px-4 py-4 text-center font-bold text-slate-900 dark:text-white font-mono whitespace-nowrap">
                          {user.lms_code || "—"}
                        </td>
                        <td className="px-4 py-4 text-left text-slate-900 dark:text-white font-medium whitespace-nowrap">
                          {user.full_name || "—"}
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">{getAccountSourceBadge(isFirebase)}</td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">{renderStatusSelectPill(user)}</td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">{renderRoleSelectPill(user)}</td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            {/* Action 1: View User Details */}
                            <button
                              onClick={() => setViewingUser(user)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all whitespace-nowrap"
                              title="Xem chi tiết tài khoản"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" /> Xem
                            </button>

                            {/* Action 2: Edit User */}
                            {isFirebase ? (
                              <button
                                disabled
                                title="Tài khoản từ hệ thống LMS có sẵn chỉ được xem, không được sửa"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed opacity-60 whitespace-nowrap"
                              >
                                <Lock className="w-3.5 h-3.5" /> Khóa sửa
                              </button>
                            ) : canEdit ? (
                              <button
                                onClick={() => openEditModal(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg border border-rose-200 dark:border-rose-900/50 transition-all whitespace-nowrap"
                                title={isSelf ? "Chỉnh sửa tài khoản của bản thân" : "Chỉnh sửa tài khoản dưới cấp vai trò"}
                              >
                                <Pencil className="w-3.5 h-3.5" /> Sửa
                              </button>
                            ) : (
                              <button
                                disabled
                                title="Chỉ được sửa tài khoản của bản thân hoặc tài khoản dưới cấp vai trò của bạn"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed opacity-60 whitespace-nowrap"
                              >
                                <Lock className="w-3.5 h-3.5" /> Khóa sửa
                              </button>
                            )}

                            {/* Action 3: Delete User */}
                            {(user.role_points || getRolePoints(user.role)) === 1 ? (
                              <button
                                disabled
                                title="Không thể xóa tài khoản Admin duy nhất của hệ thống"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed opacity-60 whitespace-nowrap"
                              >
                                <Lock className="w-3.5 h-3.5" /> Xóa
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setDeletingUser(user);
                                  setDeleteError(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg border border-red-200 dark:border-red-900/50 transition-all whitespace-nowrap"
                                title="Xóa tài khoản này khỏi hệ thống"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal 1: View User Details */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Eye className="w-5 h-5 text-rose-400" /> Chi tiết tài khoản
              </div>
              <button
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Mã LMS (Tên đăng nhập):</span>
                <span className="font-bold text-slate-900 dark:text-white whitespace-nowrap">{viewingUser.lms_code || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Họ và tên:</span>
                <span className="font-semibold text-slate-900 dark:text-white whitespace-nowrap">{viewingUser.full_name || "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Loại tài khoản:</span>
                <span className="whitespace-nowrap">{getAccountSourceBadge(viewingUser.is_firebase)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Trạng thái:</span>
                <span className="font-semibold capitalize text-rose-600 dark:text-rose-400 whitespace-nowrap">{viewingUser.status_display_name || viewingUser.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Vai trò:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">{viewingUser.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Ngày tạo:</span>
                <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(viewingUser.created_at).toLocaleString("vi-VN")}</span>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-xl transition-all shadow whitespace-nowrap"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add New User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Plus className="w-5 h-5 text-rose-400" /> Thêm tài khoản mới
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4" autoComplete="off">
              {/* Dummy hidden inputs to prevent browser from autofilling saved credentials into fullname and password */}
              <input type="text" name="fake_username_add" style={{ display: "none" }} tabIndex={-1} autoComplete="username" />
              <input type="password" name="fake_password_add" style={{ display: "none" }} tabIndex={-1} autoComplete="current-password" />

              {addError && (
                <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 text-rose-700 dark:text-rose-300 text-sm rounded-r-xl flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>{addError}</div>
                </div>
              )}

              {/* Account Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                  Loại tài khoản *
                </label>
                <select
                  value={addForm.is_firebase ? "true" : "false"}
                  onChange={(e) => {
                    const isFirebase = e.target.value === "true";
                    setAddForm({
                      ...addForm,
                      is_firebase: isFirebase,
                      full_name: isFirebase ? "" : addForm.full_name,
                      password: isFirebase ? "" : addForm.password,
                    });
                    setAddError(null);
                    setCheckLmsSuccess(null);
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                >
                  <option value="false" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">
                    Do website tạo (Cần nhập đầy đủ & lưu mật khẩu)
                  </option>
                  <option value="true" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">
                    Tài khoản LMS có sẵn (Họ tên & Mật khẩu chỉ đọc, kiểm tra qua LMS)
                  </option>
                </select>
              </div>

              {/* LMS Code with Check button when LMS account */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                  Mã LMS (Tên đăng nhập) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    name="add_modal_lms_code_input"
                    id="add_modal_lms_code_input"
                    autoComplete="off"
                    value={addForm.lms_code}
                    onChange={(e) => {
                      setAddForm({ ...addForm, lms_code: e.target.value });
                      setCheckLmsSuccess(null);
                    }}
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="VD: baotc"
                  />
                  <button
                    type="button"
                    onClick={handleCheckLms}
                    disabled={checkLmsLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl transition-all disabled:opacity-50 shrink-0 shadow-sm whitespace-nowrap"
                  >
                    {checkLmsLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    {addForm.is_firebase ? "Kiểm tra LMS" : "Kiểm tra mã"}
                  </button>
                </div>
                {checkLmsSuccess && (
                  <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 animate-fade-in whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {checkLmsSuccess}
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="whitespace-nowrap">Họ và tên *</span>
                  {addForm.is_firebase && (
                    <span className="text-[11px] font-normal text-rose-500 whitespace-nowrap">
                      {lmsHasFullName
                        ? "(Chỉ đọc - Tự động điền từ LMS)"
                        : "(Không tìm thấy trên LMS - Admin tự đặt)"}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  name="add_modal_fullname_input"
                  id="add_modal_fullname_input"
                  autoComplete="off"
                  readOnly={addForm.is_firebase && lmsHasFullName}
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white ${
                    addForm.is_firebase && lmsHasFullName
                      ? "bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
                      : "bg-white dark:bg-slate-900"
                  }`}
                  placeholder={
                    addForm.is_firebase
                      ? lmsHasFullName
                        ? "Họ và tên lấy từ LMS..."
                        : "LMS chưa có họ tên, Admin hãy tự nhập tại đây..."
                      : "VD: Trần Chí Bảo"
                  }
                />
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="whitespace-nowrap">Mật khẩu *</span>
                  {addForm.is_firebase && (
                    <span className="text-[11px] font-normal text-rose-500 whitespace-nowrap">(Chỉ đọc - Xác thực trực tiếp qua LMS)</span>
                  )}
                </label>
                <input
                  type="password"
                  name="add_modal_new_password_field"
                  id="add_modal_new_password_field"
                  autoComplete="new-password"
                  disabled={addForm.is_firebase}
                  readOnly={addForm.is_firebase}
                  required={!addForm.is_firebase}
                  value={addForm.is_firebase ? "••••••••••••" : addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className={`w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white ${
                    addForm.is_firebase ? "bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-not-allowed" : "bg-white dark:bg-slate-900"
                  }`}
                  placeholder={
                    addForm.is_firebase
                      ? "Tài khoản LMS không cần nhập mật khẩu"
                      : "Nhập mật khẩu cho tài khoản website..."
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                    Vai trò
                  </label>
                  <select
                    value={addForm.role_name}
                    onChange={(e) => setAddForm({ ...addForm, role_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Teacher Part-time" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">Teacher Part-time</option>
                    <option value="Teacher Full-time" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">Teacher Full-time</option>
                    <option value="Admin" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                    Trạng thái
                  </label>
                  <select
                    value={addForm.status_code}
                    onChange={(e) => setAddForm({ ...addForm, status_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="approved" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">Đã phê duyệt</option>
                    <option value="pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">Chờ phê duyệt</option>
                    <option value="rejected" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white py-1.5">Từ chối</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all whitespace-nowrap"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {addLoading ? "Đang xử lý..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit User Details (Only for website-created accounts) */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Pencil className="w-5 h-5 text-rose-400" /> Sửa thông tin tài khoản
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4" autoComplete="off">
              {/* Dummy hidden inputs to prevent browser from autofilling saved credentials */}
              <input type="text" name="fake_user" style={{ display: "none" }} tabIndex={-1} autoComplete="username" />
              <input type="password" name="fake_pass" style={{ display: "none" }} tabIndex={-1} autoComplete="current-password" />

              {editError && (
                <div className="p-4 bg-rose-500/10 border-l-4 border-rose-500 text-rose-700 dark:text-rose-300 text-sm rounded-r-xl flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>{editError}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 whitespace-nowrap">
                  Mã LMS
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={editForm.lms_code}
                  onChange={(e) => setEditForm({ ...editForm, lms_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="whitespace-nowrap">Mật khẩu mới</span>
                  <span className="text-[11px] font-normal text-slate-400 whitespace-nowrap">(Để trống nếu giữ nguyên mật khẩu cũ)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    name="edit_user_new_password"
                    id="edit_user_new_password"
                    autoComplete="new-password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="Nhập mật khẩu mới..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all whitespace-nowrap"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {editLoading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Transfer Admin Role Confirmation */}
      {pendingAdminTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 whitespace-nowrap">
              Xác nhận chuyển giao quyền Admin
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Hệ thống chỉ duy trì <span className="font-bold text-rose-600 dark:text-rose-400">1 Admin duy nhất (Điểm vai trò: 1 - cao nhất)</span>. Khi trao quyền Admin cho tài khoản khác, tài khoản của bạn sẽ <span className="font-bold text-amber-600 dark:text-amber-400">tự động bị gián chức thành cấp role thấp nhất là Teacher Part-time (Điểm vai trò: 3)</span> và bạn sẽ bị <span className="font-bold text-rose-600 dark:text-rose-400">đăng xuất ngay lập tức</span>. Bạn có chắc chắn muốn thực hiện?
            </p>

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setPendingAdminTarget(null)}
                disabled={transferLoading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all whitespace-nowrap"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmTransferAdmin}
                disabled={transferLoading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {transferLoading ? "Đang xử lý..." : "Xác nhận chuyển giao"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Delete User Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 whitespace-nowrap">
              Xác nhận xóa tài khoản
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Bạn có chắc chắn muốn xóa tài khoản{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                &ldquo;{deletingUser.full_name || deletingUser.lms_code}&rdquo;
              </span>{" "}
              (Mã: <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">{deletingUser.lms_code}</span>, Vai trò: <span className="font-semibold text-slate-800 dark:text-slate-200">{deletingUser.role}</span>) khỏi hệ thống SMH không?
            </p>

            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-xs text-rose-700 dark:text-rose-300 text-left mb-6">
              ⚠️ <strong>Lưu ý:</strong> Hành động này sẽ xóa người dùng khỏi hệ thống dữ liệu SMH và không thể hoàn tác.
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium text-left">
                {deleteError}
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingUser(null);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all whitespace-nowrap"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

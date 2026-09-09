"use client";

import { useEffect, useState, useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import {
  GraduationCap,
  RefreshCw,
  Search,
  Eye,
  X,
  Calendar,
  Building2,
  BookOpen,
  CheckCircle2,
  Clock,
  Flag,
  Award,
  AlertCircle,
  PlusCircle,
  Trash2,
  Save,
  UserCheck,
  ArrowRight,
  Check,
} from "lucide-react";
import {
  ManagedClass,
  ManagedClassSlot,
  ClassDiffItem,
  calculateDefaultDeadlines,
  formatVnDate,
  formatVnTime,
} from "@/lib/types/managed-class";
import { CentreItem } from "@/lib/constants/centres";

export default function ClassManagementScreen() {
  // State danh sách lớp học quản lý (lưu trên Supabase)
  const [managedClasses, setManagedClasses] = useState<ManagedClass[]>([]);
  const [userCentres, setUserCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State tìm kiếm mã lớp & Dropdown Real-time từ LMS
  const [searchCodeInput, setSearchCodeInput] = useState("");
  const [searchingCode, setSearchingCode] = useState(false);
  const [dropdownClasses, setDropdownClasses] = useState<any[]>([]);
  const [searchingDropdown, setSearchingDropdown] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Bộ lọc cho danh sách quản lý
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCentre, setSelectedCentre] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal Chi Tiết Lớp Học (Hỗ trợ mode: "add" khi thêm mới, hoặc "view" khi xem/sửa)
  const [modalMode, setModalMode] = useState<"add" | "view">("view");
  const [activeClass, setActiveClass] = useState<ManagedClass | null>(null);
  const [editedSlots, setEditedSlots] = useState<ManagedClassSlot[]>([]);
  const [savingClass, setSavingClass] = useState(false);

  // Modal Đối Chiếu Thay Đổi LMS (Side-by-Side Diff Modal)
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [syncingClassId, setSyncingClassId] = useState<string | null>(null);
  const [currentDiffs, setCurrentDiffs] = useState<ClassDiffItem[]>([]);
  const [syncingTargetClass, setSyncingTargetClass] = useState<ManagedClass | null>(null);
  const [confirmingSync, setConfirmingSync] = useState(false);

  // Thông báo / Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Tải danh sách lớp đang quản lý từ Supabase
  const fetchManagedClasses = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("type", "managed");
      if (selectedCentre !== "all") params.set("centreId", selectedCentre);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      const res = await fetch(`/api/classes?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setManagedClasses(data.classes || []);
        if (data.userCentres) setUserCentres(data.userCentres);
      } else {
        console.error("Lỗi tải lớp quản lý:", data.error);
      }
    } catch (err) {
      console.error("Lỗi gọi API managed classes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchManagedClasses();
  }, [selectedCentre, selectedStatus]);

  // Lọc danh sách quản lý theo tìm kiếm
  const filteredManagedClasses = managedClasses.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const centreMatch = c.centreName?.toLowerCase().includes(q);
    const courseMatch = c.courseName?.toLowerCase().includes(q);
    const teacherMatch = c.teacherName?.toLowerCase().includes(q);
    return nameMatch || centreMatch || courseMatch || teacherMatch;
  });

  // Real-time tra cứu lớp từ LMS khi người dùng nhập tên/mã lớp
  useEffect(() => {
    const trimmed = searchCodeInput.trim();
    if (trimmed.length < 2) {
      setDropdownClasses([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingDropdown(true);
      try {
        const res = await fetch(`/api/classes?type=search&q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data.success) {
          setDropdownClasses(data.classes || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Lỗi tìm kiếm real-time lớp LMS:", err);
      } finally {
        setSearchingDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchCodeInput]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Chọn lớp từ Dropdown gợi ý real-time
  const handleSelectClassFromDropdown = (item: any) => {
    setShowDropdown(false);
    setSearchCodeInput(item.name);

    if (item.alreadyManaged) {
      showToast(`Lớp ${item.name} đã tồn tại trong danh sách quản lý`, "info");
      const existing = managedClasses.find((m) => m.id === item.id);
      if (existing) {
        setActiveClass(existing);
        setEditedSlots(existing.slots || []);
        setModalMode("view");
      }
      return;
    }

    // Tính toán hạn nộp bài mặc định
    const defaultSlots = calculateDefaultDeadlines(item);

    const newManagedClass: ManagedClass = {
      id: item.id,
      name: item.name,
      status: item.status,
      courseName: item.course?.name || "Khóa học MindX",
      centreId: item.centre?.id || "",
      centreName: item.centre?.name || "Cơ sở MindX",
      teacherName: item.teacherName || "Chưa phân công",
      teacherCodes: item.teacherCodes || [],
      classTime: item.classTime || "Chưa có khung giờ",
      startDate: item.startDate,
      endDate: item.endDate,
      numberOfSessions: item.numberOfSessions,
      completedSessions: item.completedSessions,
      progressPercent: item.progressPercent,
      checkpoint1Session: item.courseProcess?.checkpoint1Session || null,
      checkpoint1Date: item.courseProcess?.checkpoint1Date || null,
      checkpoint2Session: item.courseProcess?.checkpoint2Session || null,
      checkpoint2Date: item.courseProcess?.checkpoint2Date || null,
      finalProjectSession: item.courseProcess?.finalProjectSession || null,
      finalProjectDate: item.courseProcess?.finalProjectDate || null,
      slots: defaultSlots,
    };

    setActiveClass(newManagedClass);
    setEditedSlots(defaultSlots);
    setModalMode("add");
  };

  // 3. Xử lý tìm kiếm mã lớp từ LMS và mở modal thêm vào Supabase
  const handleSearchAndAdd = async () => {
    setShowDropdown(false);
    const trimmedCode = searchCodeInput.trim();
    if (!trimmedCode) {
      showToast("Vui lòng nhập mã lớp học cần tìm", "error");
      return;
    }

    setSearchingCode(true);
    try {
      const res = await fetch(`/api/classes?type=find&code=${encodeURIComponent(trimmedCode)}`);
      const data = await res.json();

      if (!data.success) {
        showToast(data.error || "Không tìm thấy lớp học phù hợp", "error");
        return;
      }

      if (data.alreadyManaged) {
        showToast(`Lớp ${data.class.name} đã có trong danh sách quản lý`, "info");
        setActiveClass(data.class);
        setEditedSlots(data.class.slots || []);
        setModalMode("view");
        return;
      }

      // Tìm thấy lớp từ LMS -> Mở modal xem trước để xác nhận thêm vào Supabase
      setActiveClass(data.class);
      setEditedSlots(data.defaultSlots || data.class.slots || []);
      setModalMode("add");
    } catch (err) {
      console.error("Lỗi tìm kiếm lớp học:", err);
      showToast("Lỗi kết nối khi tìm kiếm lớp học từ LMS", "error");
    } finally {
      setSearchingCode(false);
    }
  };

  // 4. Xử lý xác nhận Thêm lớp học (Lưu Supabase)
  const handleConfirmAdd = async () => {
    if (!activeClass) return;
    setSavingClass(true);

    try {
      const payload: ManagedClass = {
        ...activeClass,
        slots: editedSlots,
      };

      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classData: payload }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã thêm lớp ${activeClass.name} vào danh sách quản lý`);
        setActiveClass(null);
        setSearchCodeInput("");
        fetchManagedClasses();
      } else {
        showToast(data.error || "Không thể thêm lớp học", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi thêm lớp học", "error");
    } finally {
      setSavingClass(false);
    }
  };

  // 5. Xem chi tiết lớp học đã quản lý
  const handleOpenViewModal = (cls: ManagedClass) => {
    setActiveClass(cls);
    setEditedSlots(cls.slots || []);
    setModalMode("view");
  };

  // 6. Lưu thay đổi hạn nộp bài (mode: "view")
  const handleSaveDeadlineChanges = async () => {
    if (!activeClass) return;
    setSavingClass(true);

    try {
      const res = await fetch(`/api/classes/${activeClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: editedSlots }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Đã lưu các thay đổi hạn nộp bài thành công");
        setActiveClass((prev) => (prev ? { ...prev, slots: editedSlots } : null));
        fetchManagedClasses();
      } else {
        showToast(data.error || "Không thể lưu thay đổi", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi lưu hạn nộp bài", "error");
    } finally {
      setSavingClass(false);
    }
  };

  // 7. Gỡ bỏ lớp học khỏi danh sách quản lý
  const handleDeleteManagedClass = async (cls: ManagedClass) => {
    if (!confirm(`Bạn có chắc chắn muốn gỡ lớp ${cls.name} khỏi danh sách quản lý không?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/classes/${cls.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã gỡ lớp ${cls.name} khỏi danh sách quản lý`);
        if (activeClass?.id === cls.id) setActiveClass(null);
        fetchManagedClasses();
      } else {
        showToast(data.error || "Không thể xóa lớp học", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi xóa lớp", "error");
    }
  };

  // 8. Tải dữ liệu từ LMS & Kiểm tra thay đổi Side-by-Side
  const handleCheckSyncLms = async (targetClass: ManagedClass) => {
    setSyncingClassId(targetClass.id);
    setSyncingTargetClass(targetClass);

    try {
      const res = await fetch(`/api/classes/${targetClass.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: false }),
      });

      const data = await res.json();
      if (!data.success) {
        showToast(data.error || "Không thể kiểm tra dữ liệu LMS", "error");
        return;
      }

      if (data.hasChanges && Array.isArray(data.diffs) && data.diffs.length > 0) {
        setCurrentDiffs(data.diffs);
        setDiffModalOpen(true);
      } else {
        showToast(`Dữ liệu lớp ${targetClass.name} đã hoàn toàn đồng bộ với LMS`, "info");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi kiểm tra LMS", "error");
    } finally {
      setSyncingClassId(null);
    }
  };

  // 9. Xác nhận đồng bộ dữ liệu thay đổi từ LMS vào Supabase
  const handleConfirmSyncLms = async () => {
    if (!syncingTargetClass) return;
    setConfirmingSync(true);

    try {
      const res = await fetch(`/api/classes/${syncingTargetClass.id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã đồng bộ dữ liệu mới nhất từ LMS cho lớp ${syncingTargetClass.name}`);
        setDiffModalOpen(false);
        setSyncingTargetClass(null);
        if (activeClass?.id === syncingTargetClass.id && data.updatedClass) {
          setActiveClass(data.updatedClass);
          setEditedSlots(data.updatedClass.slots || []);
        }
        fetchManagedClasses();
      } else {
        showToast(data.error || "Lỗi khi cập nhật từ LMS", "error");
      }
    } catch (err) {
      showToast("Lỗi kết nối khi xác nhận cập nhật LMS", "error");
    } finally {
      setConfirmingSync(false);
    }
  };

  // Cập nhật hạn nộp bài của một slot trong modal
  const handleSlotDeadlineChange = (index: number, newDeadline: string) => {
    setEditedSlots((prev) =>
      prev.map((s) => (s.index === index ? { ...s, submissionDeadline: newDeadline } : s))
    );
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "RUNNING") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Đang học
        </span>
      );
    }
    if (s === "OPEN") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          Sắp mở
        </span>
      );
    }
    if (s === "FINISHED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30 whitespace-nowrap">
          <CheckCircle2 className="w-3 h-3" />
          Đã kết thúc
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
        {status}
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
        {/* Toast Feedback */}
        {toastMessage && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold transition-all duration-300 ${
              toastMessage.type === "success"
                ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                : toastMessage.type === "error"
                ? "bg-rose-500 text-white border-rose-600 shadow-rose-500/20"
                : "bg-slate-900 text-white border-slate-700 shadow-black/30"
            }`}
          >
            {toastMessage.type === "success" && <Check className="w-4 h-4 shrink-0" />}
            {toastMessage.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
            {toastMessage.type === "info" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Unified Page Header Bar */}
        <div className="bg-white dark:bg-[#0B0F17] rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800/80 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white truncate uppercase">
                Quản Lý Lớp Học
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Theo dõi tiến độ, lịch học, giờ học, giáo viên phụ trách và cấu hình hạn nộp bài
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                fetchManagedClasses(true);
              }}
              disabled={refreshing || loading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-rose-500" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Section Tìm Kiếm & Thêm Lớp Học Vào Quản Lý */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-rose-500" />
              Tìm Kiếm & Thêm Lớp Học Vào Quản Lý
            </label>
            <span className="text-[11px] font-medium text-slate-400">
              Tra cứu trực tiếp từ LMS & Lưu vào Supabase DB
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full" ref={dropdownRef}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCodeInput}
                onChange={(e) => setSearchCodeInput(e.target.value)}
                onFocus={() => {
                  if (dropdownClasses.length > 0) setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearchAndAdd();
                  }
                  if (e.key === "Escape") {
                    setShowDropdown(false);
                  }
                }}
                placeholder="Nhập mã lớp học (Ví dụ: LBB-ROB-ARMA12)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />

              {/* Dropdown Gợi Ý Real-time Từ LMS (Tuân thủ phân quyền vai trò) */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-[#0F1420] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-2 space-y-1">
                  <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800/60 uppercase tracking-wider">
                    <span>Gợi ý lớp học ({dropdownClasses.length})</span>
                    {searchingDropdown && (
                      <span className="flex items-center gap-1.5 text-rose-500 font-semibold normal-case">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Đang tra cứu LMS...
                      </span>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 no-scrollbar">
                    {searchingDropdown && dropdownClasses.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-rose-500" />
                        Đang tìm kiếm lớp học từ LMS...
                      </div>
                    ) : dropdownClasses.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Không tìm thấy lớp học nào khớp với từ khóa (theo quyền hạn cơ sở & vai trò của bạn)
                      </div>
                    ) : (
                      dropdownClasses.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectClassFromDropdown(item)}
                          className="p-3 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors flex items-center justify-between gap-3 text-left group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-rose-500 transition-colors">
                                {item.name}
                              </span>
                              {item.course?.name && (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                  {item.course.name}
                                </span>
                              )}
                              {item.alreadyManaged && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold whitespace-nowrap">
                                  Đã trong quản lý
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                {item.centre?.name || "N/A"}
                              </span>
                              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
                                <UserCheck className="w-3 h-3 text-rose-500 shrink-0" />
                                {item.teacherName || "Chưa phân công"}
                              </span>
                              {item.classTime && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  {item.classTime}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {getStatusBadge(item.status)}
                            <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSearchAndAdd}
              disabled={searchingCode || !searchCodeInput.trim()}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shadow-sm ${
                searchCodeInput.trim() && !searchingCode
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20 active:scale-95"
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
            >
              {searchingCode ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>{searchingCode ? "Đang tìm..." : "Tìm & Thêm"}</span>
            </button>
          </div>
        </div>

        {/* Toolbar Lọc & Tìm Kiếm Danh Sách Quản Lý */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã lớp, giáo viên, cơ sở..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Lọc theo cơ sở */}
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả cơ sở trực thuộc ({userCentres.length})</option>
              {userCentres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Lọc theo trạng thái */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="RUNNING">Đang học (Running)</option>
              <option value="OPEN">Sắp mở (Open)</option>
              <option value="FINISHED">Đã kết thúc (Finished)</option>
            </select>
          </div>
        </div>

        {/* Bảng Danh Sách Lớp Đang Quản Lý */}
        <div className="bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">STT</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mã Lớp & Khóa Học</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Cơ Sở</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Giáo Viên Phụ Trách</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Giờ Học</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Ngày Bắt Đầu</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Ngày Kết Thúc</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Tiến Độ</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Trạng Thái</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                      <span className="text-xs">Đang tải danh sách lớp học quản lý...</span>
                    </td>
                  </tr>
                ) : filteredManagedClasses.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <GraduationCap className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <span className="text-xs">Chưa có lớp học nào trong danh sách quản lý</span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Nhập mã lớp học ở ô tìm kiếm phía trên và bấm "Tìm & Thêm" để đưa lớp vào quản lý
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredManagedClasses.map((cls, idx) => (
                    <tr
                      key={cls.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                    >
                      <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400 text-center whitespace-nowrap font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-slate-900 dark:text-white whitespace-nowrap">
                          {cls.name}
                        </div>
                        {cls.courseName && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                            {cls.courseName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {cls.centreName || "N/A"}
                        </span>
                      </td>
                      {/* Giáo viên phụ trách */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <UserCheck className="w-3 h-3 text-rose-500" />
                          {cls.teacherName || "Chưa phân công"}
                        </span>
                      </td>
                      {/* Giờ học */}
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cls.classTime || "N/A"}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                        {formatVnDate(cls.startDate)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                        {formatVnDate(cls.endDate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center min-w-[120px]">
                          <div className="flex items-center justify-between w-full text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span>
                              {cls.completedSessions}/{cls.numberOfSessions} buổi
                            </span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">
                              {cls.progressPercent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-red-500 rounded-full transition-all duration-300"
                              style={{ width: `${cls.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(cls.status)}
                      </td>
                      {/* Thao tác */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenViewModal(cls)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Xem chi tiết & Hạn nộp bài"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCheckSyncLms(cls)}
                            disabled={syncingClassId === cls.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Tải dữ liệu từ LMS"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingClassId === cls.id ? "animate-spin text-rose-500" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteManagedClass(cls)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Gỡ khỏi danh sách quản lý"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Chi Tiết Lớp Học (Thêm Mới hoặc Xem/Sửa) */}
        {activeClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl p-5 sm:p-6 space-y-5 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeClass.name}</span>
                      {modalMode === "add" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500 text-white">
                          Xác nhận thêm
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Đang quản lý
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeClass.courseName || "Khóa học MindX"} • {activeClass.centreName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveClass(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thông Tin Tổng Quan (Hàng ngang tinh gọn) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Trạng thái</div>
                  <div className="mt-1 flex justify-center">{getStatusBadge(activeClass.status)}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Giáo viên phụ trách</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate">
                    {activeClass.teacherName || "Chưa phân công"}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Giờ học</div>
                  <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {activeClass.classTime || "N/A"}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-center">
                  <div className="text-[11px] text-slate-400 font-medium">Tổng số buổi</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {activeClass.numberOfSessions} buổi
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-center col-span-2 sm:col-span-1">
                  <div className="text-[11px] text-slate-400 font-medium">Thời gian học</div>
                  <div className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 mt-1">
                    {formatVnDate(activeClass.startDate)} - {formatVnDate(activeClass.endDate)}
                  </div>
                </div>
              </div>

              {/* Bảng Lịch Trình Chi Tiết Các Buổi Học & Hạn Nộp Bài (ĐÃ BỎ CỘT TÓM TẮT VÀ 3 CARD MỐC) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    Lịch Trình Chi Tiết & Hạn Nộp Bài ({editedSlots.length} buổi)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    * Bạn có thể chỉnh sửa trực tiếp ô "Hạn nộp bài" cho từng buổi
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-14">Buổi</th>
                        <th className="py-2.5 px-3 text-center w-28">Ngày học</th>
                        <th className="py-2.5 px-3 text-center w-28">Giờ học</th>
                        <th className="py-2.5 px-3 text-center w-32">Ghi chú mốc</th>
                        <th className="py-2.5 px-4">Hạn nộp bài (Có thể chỉnh sửa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {editedSlots.map((slot) => {
                        const sessionNum = slot.index + 1;
                        const isCp1 = activeClass.checkpoint1Session === sessionNum;
                        const isCp2 = activeClass.checkpoint2Session === sessionNum;
                        const isFinal =
                          activeClass.finalProjectSession === sessionNum ||
                          sessionNum === activeClass.numberOfSessions;

                        const slotTime =
                          slot.startTime && slot.endTime
                            ? `${formatVnTime(slot.startTime)} - ${formatVnTime(slot.endTime)}`
                            : activeClass.classTime || "N/A";

                        return (
                          <tr
                            key={slot.index}
                            className={`transition-colors ${
                              isCp1
                                ? "bg-amber-500/5 dark:bg-amber-500/10"
                                : isCp2
                                ? "bg-indigo-500/5 dark:bg-indigo-500/10"
                                : isFinal
                                ? "bg-rose-500/5 dark:bg-rose-500/10"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                            }`}
                          >
                            <td className="py-2 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                              {sessionNum}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {formatVnDate(slot.date)}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {slotTime}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isCp1 && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 whitespace-nowrap">
                                  Checkpoint 1
                                </span>
                              )}
                              {isCp2 && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                                  Checkpoint 2
                                </span>
                              )}
                              {isFinal && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300 whitespace-nowrap">
                                  SP Cuối Khóa
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="text"
                                value={slot.submissionDeadline || ""}
                                onChange={(e) => handleSlotDeadlineChange(slot.index, e.target.value)}
                                placeholder="Nhập hạn nộp bài..."
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                {modalMode === "add" ? (
                  <>
                    <span className="text-xs text-slate-500">
                      * Dữ liệu chỉ lưu trên hệ thống SMH (Supabase), không ghi ngược lên LMS
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveClass(null)}
                        disabled={savingClass}
                        className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleConfirmAdd}
                        disabled={savingClass}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
                      >
                        {savingClass ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Thêm</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCheckSyncLms(activeClass)}
                        disabled={syncingClassId === activeClass.id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingClassId === activeClass.id ? "animate-spin text-rose-500" : ""}`} />
                        <span>Tải dữ liệu từ LMS</span>
                      </button>
                      <button
                        onClick={() => handleDeleteManagedClass(activeClass)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Gỡ lớp</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveClass(null)}
                        className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>
                      <button
                        onClick={handleSaveDeadlineChanges}
                        disabled={savingClass}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
                      >
                        {savingClass ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>Lưu thay đổi</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal So Sánh Thay Đổi LMS Side-by-Side (Cần xác nhận từ người dùng) */}
        {diffModalOpen && syncingTargetClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Phát Hiện Dữ Liệu LMS Có Thay Đổi
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Lớp: <span className="font-bold text-slate-800 dark:text-slate-200">{syncingTargetClass.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDiffModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Hệ thống nhận thấy có một số dữ liệu trên LMS đã thay đổi so với dữ liệu hiện tại. Bạn có muốn cập nhật đồng bộ các thay đổi dưới đây vào hệ thống không?
              </p>

              {/* Bảng So Sánh Kế Bên (Side-by-Side Table) */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 w-1/3">Thuộc tính</th>
                      <th className="py-2.5 px-3 w-1/3 text-rose-600 dark:text-rose-400">Dữ liệu hiện tại</th>
                      <th className="py-2.5 px-3 w-1/3 text-emerald-600 dark:text-emerald-400">Dữ liệu mới từ LMS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {currentDiffs.map((diff, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {diff.label}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 bg-rose-500/5">
                          {diff.oldValue}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                          {diff.newValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                * Việc đồng bộ từ LMS sẽ tự động bảo lưu toàn bộ các mốc hạn nộp bài mà bạn đã tùy chỉnh trước đó.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setDiffModalOpen(false)}
                  disabled={confirmingSync}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleConfirmSyncLms}
                  disabled={confirmingSync}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                >
                  {confirmingSync ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Xác nhận cập nhật</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

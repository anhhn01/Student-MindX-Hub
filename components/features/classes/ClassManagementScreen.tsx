"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { LmsClassItem, LmsClassSlot } from "@/lib/services/lms-service";
import { CentreItem } from "@/lib/constants/centres";

export default function ClassManagementScreen() {
  const [classes, setClasses] = useState<LmsClassItem[]>([]);
  const [userCentres, setUserCentres] = useState<CentreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCentre, setSelectedCentre] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal
  const [viewingClass, setViewingClass] = useState<LmsClassItem | null>(null);

  const fetchClasses = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (selectedCentre !== "all") params.set("centreId", selectedCentre);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      const res = await fetch(`/api/classes?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setClasses(data.classes || []);
        if (data.userCentres) setUserCentres(data.userCentres);
      } else {
        console.error("Lỗi tải danh sách lớp học:", data.error);
      }
    } catch (err) {
      console.error("Lỗi khi gọi API classes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [selectedCentre, selectedStatus]);

  // Client-side search filtering
  const filteredClasses = classes.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const centreMatch = c.centre?.name?.toLowerCase().includes(q);
    const courseMatch = c.course?.name?.toLowerCase().includes(q);
    return nameMatch || centreMatch || courseMatch;
  });

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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-6">
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
                Theo dõi tiến độ, lịch học và mốc đánh giá các lớp trực thuộc
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => fetchClasses(true)}
              disabled={refreshing || loading}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-rose-500" : ""}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm mã lớp, khóa học..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Cơ sở filter */}
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

            {/* Trạng thái filter */}
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

        {/* Data Table */}
        <div className="bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">STT</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mã Lớp</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Cơ Sở</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Ngày Bắt Đầu</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Ngày Kết Thúc</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Tiến Độ Buổi Học</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Trạng Thái</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                      <span className="text-xs">Đang tải danh sách lớp học...</span>
                    </td>
                  </tr>
                ) : filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <GraduationCap className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                      <span className="text-xs">Không tìm thấy lớp học nào phù hợp</span>
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map((cls, idx) => (
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
                        {cls.course?.name && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                            {cls.course.name}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {cls.centre?.name || "N/A"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(cls.startDate)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-400">
                        {formatDate(cls.endDate)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center min-w-[130px]">
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
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setViewingClass(cls)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Xem chi tiết lớp học"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Xem Chi Tiết Lớp Học */}
        {viewingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#0B0F17] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Chi Tiết Lớp Học: {viewingClass.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {viewingClass.course?.name || "Khóa học MindX"} • {viewingClass.centre?.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingClass(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Class Info Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Trạng thái</div>
                  <div className="mt-1">{getStatusBadge(viewingClass.status)}</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Tổng số buổi</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                    {viewingClass.numberOfSessions} buổi
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Ngày bắt đầu</div>
                  <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {formatDate(viewingClass.startDate)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                  <div className="text-[11px] text-slate-400 font-medium">Ngày kết thúc</div>
                  <div className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {formatDate(viewingClass.endDate)}
                  </div>
                </div>
              </div>

              {/* Checkpoints & Final Project Highlight Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Các Mốc Đánh Giá & Sản Phẩm Cuối Khóa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Checkpoint 1 */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" />
                        Checkpoint 1
                      </span>
                      {viewingClass.courseProcess?.checkpoint1Session ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                          Buổi {viewingClass.courseProcess.checkpoint1Session}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Không có</span>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {viewingClass.courseProcess?.checkpoint1Date
                        ? formatDate(viewingClass.courseProcess.checkpoint1Date)
                        : "Theo tiến trình"}
                    </div>
                  </div>

                  {/* Checkpoint 2 */}
                  <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                        <Flag className="w-3.5 h-3.5" />
                        Checkpoint 2
                      </span>
                      {viewingClass.courseProcess?.checkpoint2Session ? (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold">
                          Buổi {viewingClass.courseProcess.checkpoint2Session}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Không có</span>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {viewingClass.courseProcess?.checkpoint2Date
                        ? formatDate(viewingClass.courseProcess.checkpoint2Date)
                        : "Theo tiến trình"}
                    </div>
                  </div>

                  {/* Final Project / Demo Day */}
                  <div className="p-3.5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5" />
                        Sản Phẩm Cuối Khóa
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                        Buổi {viewingClass.courseProcess?.finalProjectSession || viewingClass.numberOfSessions}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                      {viewingClass.courseProcess?.finalProjectDate
                        ? formatDate(viewingClass.courseProcess.finalProjectDate)
                        : "Buổi bế giảng"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Session Timeline Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Lịch Trình Chi Tiết Các Buổi Học ({viewingClass.slots?.length || 0} buổi)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Tiến trình: {viewingClass.courseProcess?.name || "Tiến trình chuẩn"}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-16">Buổi</th>
                        <th className="py-2.5 px-3 w-28 text-center">Ngày học</th>
                        <th className="py-2.5 px-4">Tóm tắt nội dung</th>
                        <th className="py-2.5 px-3 text-center w-28">Ghi chú mốc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(viewingClass.slots || []).map((slot) => {
                        const sessionNum = slot.index + 1;
                        const isCp1 = viewingClass.courseProcess?.checkpoint1Session === sessionNum;
                        const isCp2 = viewingClass.courseProcess?.checkpoint2Session === sessionNum;
                        const isFinal =
                          viewingClass.courseProcess?.finalProjectSession === sessionNum ||
                          sessionNum === viewingClass.numberOfSessions;

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
                              {formatDate(slot.date)}
                            </td>
                            <td className="py-2 px-4 text-slate-700 dark:text-slate-300">
                              {slot.summary || <span className="text-slate-400 italic">Theo giáo trình</span>}
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
                                  Demo Cuối Khóa
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setViewingClass(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

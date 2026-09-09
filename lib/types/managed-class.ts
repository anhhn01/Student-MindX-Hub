import { LmsClassItem } from "@/lib/services/lms-service";

export interface ManagedClassSlot {
  index: number;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  submissionDeadline?: string | null;
}

export interface ManagedClass {
  id: string; // LMS class ID
  name: string; // Mã lớp
  status: string; // OPEN | RUNNING | FINISHED
  courseName?: string;
  centreId: string;
  centreName: string;
  teacherName?: string;
  teacherCodes?: string[];
  classTime?: string;
  startDate?: string | null;
  endDate?: string | null;
  numberOfSessions: number;
  completedSessions: number;
  progressPercent: number;
  checkpoint1Session?: number | null;
  checkpoint1Date?: string | null;
  checkpoint2Session?: number | null;
  checkpoint2Date?: string | null;
  finalProjectSession?: number | null;
  finalProjectDate?: string | null;
  slots: ManagedClassSlot[];
  addedBy?: string;
  addedAt?: string;
  updatedAt?: string;
}

export interface ClassDiffItem {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

/**
 * Định dạng ngày giờ VN cho hạn nộp bài
 */
export function formatVnDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return dateStr || "";
  }
}

export function formatVnTime(timeStr?: string | null): string {
  if (!timeStr) return "";
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return timeStr || "";
  }
}

/**
 * Tự động tính toán hạn nộp bài mặc định:
 * - Buổi 1 -> Checkpoint 2: [Giờ bắt đầu] - [Giờ kết thúc, Ngày học]
 * - Sản phẩm cuối khóa: [Sau thời điểm kết thúc Checkpoint 2] -> [Thời điểm kết thúc buổi cuối]
 */
export function calculateDefaultDeadlines(classItem: LmsClassItem): ManagedClassSlot[] {
  const slots = classItem.slots || [];
  const cp2Num = classItem.courseProcess?.checkpoint2Session || null;
  const cp1Num = classItem.courseProcess?.checkpoint1Session || null;
  const totalSessions = classItem.numberOfSessions || slots.length;

  // Tìm slot của Checkpoint 2
  let cp2Slot = cp2Num && slots[cp2Num - 1] ? slots[cp2Num - 1] : null;
  if (!cp2Slot && cp1Num && slots[cp1Num - 1]) {
    cp2Slot = slots[cp1Num - 1]; // Fallback CP1 nếu không có CP2
  }

  return slots.map((s, idx) => {
    const sessionNumber = s.index !== undefined ? s.index + 1 : idx + 1;
    const isFinalSession = sessionNumber === totalSessions || idx === slots.length - 1;

    const dateStr = formatVnDate(s.date);
    const tStart = formatVnTime(s.startTime);
    const tEnd = formatVnTime(s.endTime);

    let defaultDeadline = "";

    if (isFinalSession && cp2Slot) {
      // Sản phẩm cuối khóa: sau thời điểm kết thúc CP2 -> kết thúc buổi cuối
      const cp2End = formatVnTime(cp2Slot.endTime) || "21:00";
      const cp2DateStr = formatVnDate(cp2Slot.date);
      const finalEnd = tEnd || "21:00";
      defaultDeadline = `${cp2End}, ${cp2DateStr} - ${finalEnd}, ${dateStr}`;
    } else {
      // Các buổi thường và Checkpoint: Bắt đầu - Kết thúc của buổi học đó
      if (tStart && tEnd) {
        defaultDeadline = `${tStart} - ${tEnd}, ${dateStr}`;
      } else if (dateStr) {
        defaultDeadline = `Khung giờ học ngày ${dateStr}`;
      }
    }

    return {
      index: s.index !== undefined ? s.index : idx,
      date: s.date,
      startTime: s.startTime || null,
      endTime: s.endTime || null,
      submissionDeadline: defaultDeadline,
    };
  });
}

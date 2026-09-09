import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { LmsClassItem } from "@/lib/services/lms-service";
import {
  ManagedClass,
  ManagedClassSlot,
  ClassDiffItem,
  formatVnDate,
  formatVnTime,
  calculateDefaultDeadlines,
} from "@/lib/types/managed-class";

export type { ManagedClass, ManagedClassSlot, ClassDiffItem };
export { formatVnDate, formatVnTime, calculateDefaultDeadlines };


const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "managed_classes_store.json");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cache in-memory
let memoryStore: Record<string, ManagedClass> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 2000;

function readLocalFile(): Record<string, ManagedClass> {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, "utf-8");
      return JSON.parse(content) || {};
    }
  } catch (err) {
    console.warn("Lỗi đọc file managed_classes_store.json:", err);
  }
  return {};
}

function writeLocalFile(data: Record<string, ManagedClass>): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Lỗi ghi file managed_classes_store.json:", err);
  }
}

/**
 * Đọc danh sách lớp quản lý từ Supabase (system_settings) kèm cache local
 */
export async function getAllManagedClassesMap(): Promise<Record<string, ManagedClass>> {
  const now = Date.now();
  if (memoryStore && now - lastFetchTime < CACHE_TTL_MS) {
    return memoryStore;
  }

  // 1. Thử lấy từ Supabase system_settings
  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "managed_classes")
      .maybeSingle();

    if (!error && data && data.value && typeof data.value === "object") {
      memoryStore = data.value as Record<string, ManagedClass>;
      lastFetchTime = now;
      writeLocalFile(memoryStore);
      return memoryStore;
    }
  } catch (err) {
    // Supabase query error, fallback to local file
  }

  // 2. Fallback sang file local
  const localData = readLocalFile();
  memoryStore = localData;
  lastFetchTime = now;
  return localData;
}

/**
 * Lưu toàn bộ danh sách lớp vào Supabase & file local
 */
export async function saveAllManagedClassesMap(
  data: Record<string, ManagedClass>,
  updatedBy: string = "system"
): Promise<boolean> {
  memoryStore = data;
  lastFetchTime = Date.now();
  writeLocalFile(data);

  try {
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key: "managed_classes",
        value: data,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      });

    if (error) {
      console.warn("Lỗi lưu managed_classes lên Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Lỗi kết nối Supabase khi lưu managed_classes:", err);
    return false;
  }
}


/**
 * Lấy danh sách các lớp học đang được quản lý (lọc theo cơ sở nếu có)
 */
export async function getManagedClasses(targetCentreIds?: string[]): Promise<ManagedClass[]> {
  const map = await getAllManagedClassesMap();
  const list = Object.values(map);

  if (!targetCentreIds || targetCentreIds.length === 0) {
    return list;
  }

  const centreSet = new Set(targetCentreIds);
  return list.filter((item) => centreSet.has(item.centreId));
}

/**
 * Thêm một lớp học vào danh sách quản lý
 */
export async function addManagedClass(
  classData: ManagedClass,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  const map = await getAllManagedClassesMap();
  if (map[classData.id]) {
    return { success: false, message: "Lớp học này đã tồn tại trong danh sách quản lý." };
  }

  classData.addedBy = userId;
  classData.addedAt = new Date().toISOString();
  classData.updatedAt = new Date().toISOString();

  map[classData.id] = classData;
  await saveAllManagedClassesMap(map, userId);

  return { success: true };
}

/**
 * Cập nhật thông tin / hạn nộp bài của lớp học đang quản lý
 */
export async function updateManagedClass(
  classId: string,
  updateData: Partial<ManagedClass>,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  const map = await getAllManagedClassesMap();
  const existing = map[classId];
  if (!existing) {
    return { success: false, message: "Không tìm thấy lớp học trong danh sách quản lý." };
  }

  const updated: ManagedClass = {
    ...existing,
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  map[classId] = updated;
  await saveAllManagedClassesMap(map, userId);

  return { success: true };
}

/**
 * Gỡ bỏ một lớp học khỏi danh sách quản lý
 */
export async function deleteManagedClass(
  classId: string,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  const map = await getAllManagedClassesMap();
  if (!map[classId]) {
    return { success: false, message: "Lớp học không tồn tại trong danh sách quản lý." };
  }

  delete map[classId];
  await saveAllManagedClassesMap(map, userId);

  return { success: true };
}

/**
 * So sánh đối chiếu dữ liệu lớp hiện tại với LMS thời gian thực
 */
export function compareClassWithLms(
  current: ManagedClass,
  lms: LmsClassItem
): { hasChanges: boolean; diffs: ClassDiffItem[] } {
  const diffs: ClassDiffItem[] = [];

  // 1. Giáo viên phụ trách
  const oldTeacher = current.teacherName?.trim() || "Chưa phân công";
  const newTeacher = lms.teacherName?.trim() || "Chưa phân công";
  if (oldTeacher !== newTeacher) {
    diffs.push({
      field: "teacherName",
      label: "Giáo viên phụ trách",
      oldValue: oldTeacher,
      newValue: newTeacher,
    });
  }

  // 2. Khung giờ học
  const oldTime = current.classTime?.trim() || "Chưa có khung giờ";
  const newTime = lms.classTime?.trim() || "Chưa có khung giờ";
  if (oldTime !== newTime) {
    diffs.push({
      field: "classTime",
      label: "Khung giờ học",
      oldValue: oldTime,
      newValue: newTime,
    });
  }

  // 3. Trạng thái lớp học
  const oldStatus = current.status || "";
  const newStatus = lms.status || "";
  if (oldStatus !== newStatus) {
    diffs.push({
      field: "status",
      label: "Trạng thái lớp",
      oldValue: oldStatus,
      newValue: newStatus,
    });
  }

  // 4. Số buổi học
  if (current.numberOfSessions !== lms.numberOfSessions) {
    diffs.push({
      field: "numberOfSessions",
      label: "Tổng số buổi học",
      oldValue: `${current.numberOfSessions} buổi`,
      newValue: `${lms.numberOfSessions} buổi`,
    });
  }

  // 5. Ngày bắt đầu / kết thúc
  const oldStart = formatVnDate(current.startDate);
  const newStart = formatVnDate(lms.startDate);
  if (oldStart !== newStart) {
    diffs.push({
      field: "startDate",
      label: "Ngày bắt đầu",
      oldValue: oldStart || "N/A",
      newValue: newStart || "N/A",
    });
  }

  const oldEnd = formatVnDate(current.endDate);
  const newEnd = formatVnDate(lms.endDate);
  if (oldEnd !== newEnd) {
    diffs.push({
      field: "endDate",
      label: "Ngày kết thúc",
      oldValue: oldEnd || "N/A",
      newValue: newEnd || "N/A",
    });
  }

  return {
    hasChanges: diffs.length > 0,
    diffs,
  };
}

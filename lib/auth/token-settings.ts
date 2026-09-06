import fs from "fs";
import path from "path";

// Đường dẫn file lưu cấu hình phiên làm việc của user (bền vững)
const SETTINGS_FILE = path.join(process.cwd(), "data", "user_settings_store.json");

interface UserSettings {
  tokenExpiryDays?: number;
}

function readSettingsStore(): Record<string, UserSettings> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, "utf8");
      return JSON.parse(content) || {};
    }
  } catch (err) {
    console.warn("Lỗi đọc file user_settings_store.json:", err);
  }
  return {};
}

function writeSettingsStore(store: Record<string, UserSettings>) {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.warn("Lỗi ghi file user_settings_store.json:", err);
  }
}

/**
 * Lấy số ngày hết hạn token của tài khoản:
 * - Mặc định: 7 ngày
 * - Tối thiểu: 1 ngày
 * - Tối đa: 30 ngày
 */
export function getUserTokenExpiryDays(
  userId?: string | null,
  lmsCode?: string | null
): number {
  const store = readSettingsStore();

  if (userId && store[userId]?.tokenExpiryDays) {
    const val = store[userId].tokenExpiryDays;
    if (typeof val === "number" && val >= 1 && val <= 30) {
      return Math.round(val);
    }
  }

  if (lmsCode && store[lmsCode]?.tokenExpiryDays) {
    const val = store[lmsCode].tokenExpiryDays;
    if (typeof val === "number" && val >= 1 && val <= 30) {
      return Math.round(val);
    }
  }

  return 7;
}

/**
 * Cập nhật số ngày hết hạn token của tài khoản (ràng buộc cứng từ 1 đến 30 ngày)
 */
export function setUserTokenExpiryDays(
  days: number,
  userId?: string | null,
  lmsCode?: string | null
): number {
  const parsed = Math.round(Number(days));
  const safeDays = Math.min(30, Math.max(1, isNaN(parsed) ? 7 : parsed));
  const store = readSettingsStore();

  if (userId) {
    if (!store[userId]) {
      store[userId] = {};
    }
    store[userId].tokenExpiryDays = safeDays;
  }

  if (lmsCode) {
    if (!store[lmsCode]) {
      store[lmsCode] = {};
    }
    store[lmsCode].tokenExpiryDays = safeDays;
  }

  writeSettingsStore(store);
  return safeDays;
}

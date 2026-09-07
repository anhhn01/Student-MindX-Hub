import fs from "fs";
import path from "path";

export interface MaintenanceConfig {
  isEnabled: boolean;
  expectedEndTime: string | null; // ISO string
  reason?: string;
  updatedAt: string;
  updatedBy?: string;
  environment: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STATUS_FILE = path.join(DATA_DIR, "maintenance_status.json");

const DEFAULT_CONFIG: MaintenanceConfig = {
  isEnabled: false,
  expectedEndTime: null,
  reason: "Hệ thống đang được nâng cấp và bảo trì định kỳ.",
  updatedAt: new Date().toISOString(),
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
};

/**
 * Đọc trạng thái bảo trì hiện tại.
 * Tự động kiểm tra nếu đã quá giờ dự kiến thì tự động tắt bảo trì.
 */
export function getMaintenanceStatus(): MaintenanceConfig {
  try {
    if (!fs.existsSync(STATUS_FILE)) {
      return { ...DEFAULT_CONFIG };
    }

    const fileContent = fs.readFileSync(STATUS_FILE, "utf-8");
    const config: MaintenanceConfig = JSON.parse(fileContent);

    // Kiểm tra hết hạn bảo trì tự động
    if (config.isEnabled && config.expectedEndTime) {
      const endTimestamp = new Date(config.expectedEndTime).getTime();
      if (!isNaN(endTimestamp) && Date.now() >= endTimestamp) {
        // Đã hết giờ bảo trì, tự động đánh dấu tắt
        const expiredConfig: MaintenanceConfig = {
          ...config,
          isEnabled: false,
          updatedAt: new Date().toISOString(),
        };
        try {
          fs.writeFileSync(STATUS_FILE, JSON.stringify(expiredConfig, null, 2), "utf-8");
        } catch {
          // Bỏ qua lỗi ghi nếu chạy trên môi trường read-only
        }
        return expiredConfig;
      }
    }

    return config;
  } catch (error) {
    console.error("[MaintenanceService] Lỗi khi đọc file trạng thái:", error);
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Cập nhật trạng thái bảo trì.
 * Nếu không cung cấp expectedEndTime, mặc định là 3 tiếng sau thời điểm kích hoạt.
 */
export function setMaintenanceStatus(
  isEnabled: boolean,
  expectedEndTime?: string | null,
  reason?: string,
  updatedBy?: string
): MaintenanceConfig {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    let finalEndTime = expectedEndTime;

    // Nếu bật bảo trì mà không điền ngày giờ, mặc định là 3 tiếng sau
    if (isEnabled) {
      if (!finalEndTime || finalEndTime.trim() === "") {
        const threeHoursLater = new Date(Date.now() + 3 * 60 * 60 * 1000);
        finalEndTime = threeHoursLater.toISOString();
      } else {
        // Chuẩn hóa sang ISO string
        const parsed = new Date(finalEndTime);
        finalEndTime = isNaN(parsed.getTime())
          ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
          : parsed.toISOString();
      }
    } else {
      finalEndTime = null;
    }

    const newConfig: MaintenanceConfig = {
      isEnabled,
      expectedEndTime: finalEndTime,
      reason: reason || "Hệ thống đang được nâng cấp và bảo trì định kỳ.",
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || "admin",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
    };

    fs.writeFileSync(STATUS_FILE, JSON.stringify(newConfig, null, 2), "utf-8");
    return newConfig;
  } catch (error) {
    console.error("[MaintenanceService] Lỗi khi cập nhật trạng thái bảo trì:", error);
    throw error;
  }
}

/**
 * Quản lý phiên bản hệ thống tập trung cho Student MindX Hub (SMH)
 * BẮT BUỘC: Mỗi khi đẩy chức năng mới lên Git (theo Quy tắc 23),
 * tăng số hiệu phiên bản đúng chuẩn (vx.x) và cập nhật tóm tắt các chức năng chính tại đây.
 */

export interface VersionFeature {
  title: string;
  description: string;
  category: "Tính Năng Mới" | "Cải Tiến" | "Bảo Mật & Ổn Định";
}

export interface ReleaseVersion {
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  features: VersionFeature[];
}

// Phiên bản hiện tại mới nhất của hệ thống
export const CURRENT_VERSION: ReleaseVersion = {
  version: "v1.8",
  releaseDate: "09/09/2026",
  title:
    "Quản Lý Lớp Học & Mốc Đánh Giá Checkpoint, Hủy Liên Kết Google Drive & Lọc Cơ Sở Đang Hoạt Động",
  summary:
    "Bổ sung màn hình Quản lý lớp học theo cơ sở trực thuộc với modal xem chi tiết Checkpoint 1, Checkpoint 2 và Demo cuối khóa; bổ sung tính năng Hủy liên kết Google Drive theo phân cấp vai trò và tại Hồ sơ cá nhân; tinh lọc danh mục 71 cơ sở LMS đang hoạt động.",
  features: [
    {
      title: "Quản Lý Lớp Học & Mốc Đánh Giá Checkpoint",
      description:
        "Bổ sung màn hình Quản lý lớp học tại /[role]/system-management/classes, theo dõi tiến độ buổi học, trạng thái lớp (Open, Running, Finished) và modal xem chi tiết Checkpoint 1, Checkpoint 2, Sản phẩm cuối khóa cùng lịch trình buổi học.",
      category: "Tính Năng Mới",
    },
    {
      title: "Hủy Liên Kết Google Drive Theo Phân Cấp Quyền Hạn",
      description:
        "Hỗ trợ tính năng Hủy liên kết Google Drive cho chính mình tại trang Hồ sơ cá nhân, đồng thời cho phép tài khoản có vai trò cấp bậc cao hơn hủy liên kết cho tài khoản cấp dưới trong Quản lý tài khoản.",
      category: "Bảo Mật & Ổn Định",
    },
    {
      title: "Lọc Danh Mục 71 Cơ Sở LMS Đang Hoạt Động",
      description:
        "Tự động loại bỏ 32 cơ sở đã ngưng hoạt động trên hệ thống LMS MindX, đảm bảo toàn bộ bộ lọc và ma trận chỉ làm việc với 71 cơ sở thực tế đang vận hành.",
      category: "Cải Tiến",
    },
  ],
};

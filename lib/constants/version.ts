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
  version: "v1.6",
  releaseDate: "07/09/2026",
  title: "Bắt Buộc OAuth Google Drive Cho Teacher Part-Time & Nâng Cấp Giao Diện Sidebar Thống Nhất",
  summary:
    "Tích hợp luồng xác thực bắt buộc Google Drive cho Giảng viên Part-time, tái cấu trúc nút điều hướng chân Sidebar, đồng bộ hoàn hảo căn chỉnh giao diện và bổ sung bộ tài nguyên ảnh logo SMH chất lượng cao.",
  features: [
    {
      title: "Bắt Buộc Liên Kết Google Drive (Teacher Part-time)",
      description:
        "Tự động phát hiện tài khoản Giảng viên Part-time chưa có email và bắt buộc liên kết Google Drive qua OAuth để kích hoạt email hồ sơ và đồng bộ tài liệu trước khi truy cập hệ thống.",
      category: "Tính Năng Mới",
    },
    {
      title: "Tái Cấu Trúc Nút Chuyển Trang Chủ / Dashboard Tại Chân Sidebar",
      description:
        "Chuyển nút điều hướng xuống đáy Sidebar với kiểu dáng Action Button nổi bật riêng biệt, đồng thời tự động ẩn các menu quản trị phức tạp khi người dùng đang ở Trang chủ.",
      category: "Cải Tiến",
    },
    {
      title: "Đồng Bộ Căn Chỉnh Khung Lề Header & Footer",
      description:
        "Chuẩn hóa khung lề đồng nhất trên toàn bộ các giao diện, loại bỏ hoàn toàn hiện tượng lệch lề trái phải trên màn hình rộng, tối ưu hiển thị responsive trên thiết bị di động.",
      category: "Cải Tiến",
    },
    {
      title: "Bộ Tài Nguyên Ảnh Logo SMH & Thanh Cuộn Hiện Đại",
      description:
        "Lưu trữ sẵn các định dạng ảnh PNG độ phân giải cao và Vector SVG của logo SMH trong dự án, tích hợp favicon tab trình duyệt và áp dụng thanh cuộn mỏng nhẹ (7px) sang trọng.",
      category: "Cải Tiến",
    },
  ],
};

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
  version: "v1.9",
  releaseDate: "09/09/2026",
  title:
    "Tìm Kiếm Lớp Học Thời Gian Thực, Tối Ưu Hóa Google OAuth & Trang Chính Sách Quyền Riêng Tư",
  summary:
    "Tích hợp tìm kiếm lớp học theo thời gian thực với dropdown gợi ý thông minh, tối ưu hóa toàn diện luồng xác thực Google OAuth & Supabase, và bổ sung trang Chính sách quyền riêng tư (/privacy) đạt chuẩn xác minh Google Cloud.",
  features: [
    {
      title: "Tìm Kiếm Lớp Học Thông Minh & Tùy Chỉnh Hạn Nộp Bài",
      description:
        "Tự động gợi ý danh sách lớp khi gõ tìm kiếm theo thời gian thực, lọc theo phân quyền vai trò và cơ sở trực thuộc, phân công giáo viên có số buổi dạy nhiều nhất, bảo lưu tùy chỉnh hạn nộp bài và lưu trữ độc quyền trên cơ sở dữ liệu hệ thống.",
      category: "Tính Năng Mới",
    },
    {
      title: "Trang Chính Sách Quyền Riêng Tư (/privacy)",
      description:
        "Xây dựng trang Chính sách quyền riêng tư đáp ứng đầy đủ tiêu chuẩn xác minh Google OAuth Consent Screen, công khai minh bạch phạm vi quyền hạn drive.file và cam kết tuân thủ chính sách Google Limited Use.",
      category: "Tính Năng Mới",
    },
    {
      title: "Tối Ưu Hóa Xác Thực Google OAuth & Đa Kênh Liên Kết",
      description:
        "Nâng cấp luồng xử lý phiên Supabase Auth khi chuyển hướng từ Google, bổ sung tùy chọn liên kết Google OAuth trực tiếp dự phòng và hiển thị thông báo lỗi trực quan.",
      category: "Bảo Mật & Ổn Định",
    },
  ],
};

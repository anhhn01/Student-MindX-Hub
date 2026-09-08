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
  version: "v1.7",
  releaseDate: "08/09/2026",
  title:
    "Bảo Trì Bền Vững Đa Môi Trường, Đồng Bộ Bố Cục Thống Nhất & Hoàn Thiện OAuth Cho Giảng Viên",
  summary:
    "Lưu trữ trạng thái bảo trì trên Supabase Database ngăn chặn triệt để truy cập trên môi trường Production, thống nhất thiết kế thẻ tiêu đề tinh gọn loại bỏ mọi văn bản giải thích thừa, và hoàn thiện luồng Google OAuth cho Giảng viên Full-time.",
  features: [
    {
      title: "Chế Độ Bảo Trì Bền Vững Đa Môi Trường (Production Persistence)",
      description:
        "Lưu trữ trạng thái bảo trì trực tiếp trên Supabase Database với bộ đệm in-memory 3s, đảm bảo Middleware chặn 100% tài khoản non-admin trên serverless Production và tự động hết hạn khi đến hạn kết thúc.",
      category: "Bảo Mật & Ổn Định",
    },
    {
      title: "Bố Cục Giao Diện Thống Nhất & Tinh Gọn (Zero Explanatory Text)",
      description:
        "Đồng bộ thẻ tiêu đề chuẩn (Unified Page Header Card) trên toàn bộ các màn hình, loại bỏ toàn bộ ghi chú và hướng dẫn rườm rà, giữ giao diện sạch sẽ và tập trung vào dữ liệu nghiệp vụ.",
      category: "Cải Tiến",
    },
    {
      title: "Hoàn Thiện OAuth Google Drive Cho Giảng Viên Full-Time & Supabase Auth",
      description:
        "Khắc phục sự cố phân quyền và điều hướng cho Teacher Full-time, hỗ trợ linh hoạt cả Google OAuth trực tiếp và Supabase Auth OAuth kèm cơ chế điều hướng động về đúng Dashboard theo vai trò.",
      category: "Tính Năng Mới",
    },
  ],
};

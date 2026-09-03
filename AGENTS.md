# Dự Án SMH (Student MindX Hub) - Quyết Định & Quy Tắc Thiết Kế

## Ràng Buộc Sử Dụng MCP Server & Skills

Agent khi thực hiện phát triển tính năng (Features), sửa lỗi (Debugging), hay thiết kế UI/UX trên dự án này **bắt buộc tuân thủ quy tắc**:
1. **MCP Servers**: Tận dụng tối đa các công cụ MCP sẵn có (`supabase`, `firebase`, `postman`, `chrome-devtools`) để tương tác cơ sở dữ liệu, kiểm thử API tự động, và kiểm tra giao diện trình duyệt.
2. **Skills Ecosystem**: Luôn đọc và kích hoạt các skills phù hợp như `supabase` (quản lý RLS & auth), `frontend-design` & `anti-ui-slop` (thiết kế giao diện hiện đại), `tdd` (phát triển hướng kiểm thử), và `web-design-guidelines` (kiểm tra chuẩn UX/a11y).
3. **Cấu trúc đường dẫn API**: Quản lý tập trung tại `lib/constants/api-routes.ts`.
4. **Xử lý trạng thái người dùng**: Quản lý trạng thái thông qua bảng `user_statuses` liên kết động (`status_id`), tuyệt đối không hardcode static UUID ID.
5. **Bắt buộc đọc và tuân thủ Luồng Hoạt Động (Feature Flows)**: Toàn bộ luồng hoạt động của từng chức năng trong dự án được lưu trữ chi tiết tại [docs/FEATURE_FLOWS.md](file:///d:/Documents/Practice/Self%20Project/SMH/docs/FEATURE_FLOWS.md). Mỗi khi làm việc (phát triển tính năng, sửa lỗi, refactor, thiết kế UI hay viết API), Agent **BẮT BUỘC PHẢI ĐỌC TÀI LIỆU NÀY TRƯỚC** để nắm vững logic nghiệp vụ và làm cho đúng. Đồng thời, khi có chức năng mới hoặc thay đổi luồng hoạt động, Agent **BẮT BUỘC CẬP NHẬT** tài liệu này ngay lập tức.
6. **Tra cứu & Sử dụng Schema GraphQL LMS Firebase**: Mọi lệnh/query lấy dữ liệu từ hệ thống Firebase / LMS MindX phải được tra cứu từ tài liệu schema lưu trữ tại [docs/LMS_GRAPHQL_SCHEMA.md](file:///d:/Documents/Practice/Self%20Project/SMH/docs/LMS_GRAPHQL_SCHEMA.md) và file [docs/lms_graphql_schema.json](file:///d:/Documents/Practice/Self%20Project/SMH/docs/lms_graphql_schema.json) để tìm đúng bộ lệnh và dữ liệu cần tìm.
7. **Quy chuẩn dữ liệu trả về từ API (Chỉ trả về Dạng Chữ, Không Trả Về Khóa Ngoại ID)**: Tất cả API xây dựng trong dự án khi phản hồi về Client bắt buộc phải trả về dữ liệu dưới dạng **CHỮ (Text / Display Name)** cho các trường tham chiếu/khóa ngoại (`role`, `status`, `centre`, `department`, v.v.), **tuyệt đối không trả về ID khóa ngoại thô**. Ngoại lệ duy nhất được phép là **ID khóa chính (Primary Key)** của bản ghi đó.
8. **Quy chuẩn Giao diện Tổng thể (Layout Sidebar, Header Dropdown, Theme Sáng/Tối & Lucide Icons)**:
   - **Kiến trúc Layout**: Sử dụng `AppLayout` thống nhất toàn hệ thống. Menu chức năng đặt ở **Sidebar bên trái** (phân nhóm Menu chính & Menu phụ), hỗ trợ co giãn và Drawer cảm ứng trên Mobile. **Header** chỉ chứa nút Theme Toggle (Sáng/Tối) và cụm User Profile (Avatar, Họ tên, Badge Role) với Dropdown gồm *Chỉnh sửa thông tin cá nhân* (`/profile`) và *Đăng xuất*.
   - **Bảng Màu Chủ Đạo**: Kết hợp hài hòa giữa Đỏ Ruby/Crimson (`#E11D48`, `#F43F5E`), Đen Obsidian (`#090D16`) và Trắng tuyết (`#FFFFFF`, `#F8FAFC`), tuyệt đối không dùng màu thô cứng thuần `#FF0000`/`#000000`.
   - **Chuẩn Icon**: Bắt buộc **100% sử dụng icon từ thư viện chính thống `lucide-react`**, tuyệt đối cấm dùng icon tự chế do AI sinh ra.
9. **Trang Not-Found (404) Tự Điều Hướng Thông Minh**:
   - Khi truy cập đường dẫn không tồn tại (`app/not-found.tsx`), hệ thống hiển thị đếm ngược 5 giây và **tự động điều hướng về đúng Dashboard theo vai trò của người dùng nếu đã đăng nhập** (`Admin`, `Teacher Full-time`, `Teacher Part-time`) hoặc **tự động điều hướng về Trang chủ (`/`) nếu chưa đăng nhập**.
10. **Quy chuẩn Căn Giữa Dữ Liệu & Chống Từ Mồ Côi (Anti-Orphan & Alignment Rule)**:
    - Tất cả các cột dữ liệu định danh và trạng thái (STT, Mã LMS, Loại tài khoản, Trạng thái, Vai trò, Thao tác hành động, Switch toggle) bắt buộc phải **căn giữa (`text-center`, `justify-center`)**.
    - Bắt buộc áp dụng **`whitespace-nowrap`** cho các huy hiệu (badges), nhãn (labels), tiêu đề cột, nút bấm thao tác và các nhóm dữ liệu để chống triệt để hiện tượng **từ mồ côi** (xuống dòng chỉ rớt lại 1 từ). Các thông tin cùng một khối dữ liệu phải giữ trên **1 hàng**, bảng dữ liệu hỗ trợ cuộn ngang linh hoạt (`overflow-x-auto`) để đạt chuẩn responsive cao nhất.
11. **Cơ Chế Cập Nhật Dữ Liệu Real-Time & Nút Làm Mới**:
    - Dữ liệu người dùng (Họ tên, Vai trò) luôn lấy trực tiếp từ Supabase Database theo thời gian thực (Real-time).
    - Đối với bất kỳ màn hình nào **đã có nút "Làm mới" / "Cập nhật"** (như Quản lý tài khoản, Phân quyền màn hình): **Tuyệt đối không bật polling ngầm (`setInterval`)**, dữ liệu chỉ được tải lại khi người dùng chủ động bấm nút làm mới hoặc sau khi hoàn tất hành động thêm / sửa / xóa / toggle.
12. **Quy Tắc Quản Lý Biến Môi Trường (Duy Nhất 1 File `.env`, Không Tạo File Khác)**:
    - Toàn bộ cấu hình biến môi trường của hệ thống được đặt tập trung trong **DUY NHẤT một file `.env`**.
    - Tuyệt đối **KHÔNG tạo bất kỳ file nào khác liên quan đến env** (như `.env.example`, `.env.local`, `.env.development`, `.env.production`, v.v.).
    - File `.env` phải được bảo vệ nghiêm ngặt trong `.gitignore`, tuyệt đối không bao giờ được commit hay đẩy lên GitHub.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
13. **Quy Chuẩn Định Tuyến Phân Quyền Theo Vai Trò (`/[role]/[main_menu]/[menu]`)**:
    - Tất cả các tuyến đường (routes) có khả năng phân quyền theo vai trò bắt buộc phải tuân theo cấu trúc: `/[role]/[main_menu]/[menu]` (Ví dụ: `/admin/system-management/users`, `/teacher-fulltime/system-management/users`).
    - Tuyến phân quyền màn hình bắt buộc có tên chứa `screen_permission`: `/[role]/system-management/screen_permission`.
    - **Chặn Truy Cập Chéo Vai Trò & Chặn Không Có Quyền**: Bất kỳ người dùng nào cố tình truy cập vào route mang tiền tố của vai trò khác (hoặc route chưa được phân quyền) đều bị Middleware chặn và **trả về trực tiếp trang 404 (`not-found`)**.
14. **Quy Chuẩn Layout Thống Nhất Toàn Hệ Thống (Header, Footer & Collapsible Sidebar)**:
    - **Đồng bộ Header & Footer**: Bất kỳ giao diện nào (Dashboard, Quản lý, Phân quyền, Đăng nhập, 404 Not Found) đều phải có Header và Footer đồng nhất với nhận diện thương hiệu *Student MindX Hub (SMH)*.
    - **Vị Trí Tình Trạng Hệ Thống**: Thông tin trạng thái vận hành hệ thống ("Hệ thống hoạt động ổn định 100% • Supabase DB Connected • Bảo Mật RBAC") được đặt cố định ở **Footer** kèm bản quyền và phiên bản hệ thống, không đặt thẻ trùng lặp trong phần nội dung chính của Dashboard.
    - **Sidebar Thu Gọn (Collapsible)**: Sidebar bên trái hỗ trợ nút thu gọn (Collapse) thành cột icon 80px tinh gọn hoặc mở rộng 288px, ghi nhớ trạng thái thu gọn qua `localStorage`.
15. **Phân Định Dữ Liệu & Thao Tác Theo Cấp Bậc Vai Trò (Role Hierarchy Scope)**:
    - Khi một vai trò cấp dưới được cấp quyền truy cập màn hình (như Quản lý tài khoản hay Phân quyền), người dùng chỉ được xem và thao tác trên các tài khoản/vai trò có điểm số lớn hơn mình (cấp bậc thấp hơn: `targetRolePoints > currentUserRolePoints`).
    - Tuyệt đối khóa quyền chỉnh sửa, đổi vai trò, đổi trạng thái hoặc xóa tài khoản của chính mình và các vai trò có cấp bậc bằng hoặc cao hơn mình.
16. **Quy Chuẩn Quản Lý Cơ Sở Trực Thuộc (User Affiliated Centres Management)**:
    - Dữ liệu cơ sở trực thuộc được lưu trữ độc lập trên Supabase (`user_centres`), tuyệt đối không ghi ngược hay làm thay đổi dữ liệu trên LMS MindX.
    - Danh mục cơ sở chính thống để chọn thêm được đồng bộ từ LMS.
    - Khi tạo tài khoản loại LMS, hệ thống tự động đồng bộ cơ sở ban đầu từ LMS sang Supabase. Tài khoản tự tạo nội bộ ban đầu không có cơ sở trực thuộc (`[]`).
    - Tuân thủ phân cấp vai trò (`targetRolePoints > currentUserRolePoints`), khóa chỉnh sửa với chính mình và cấp bậc bằng/cao hơn.
17. **Quy Chuẩn Hiển Thị & Quản Lý Lịch Trải Nghiệm (Trial / Office Hours Standard)**:
    - **Đồng bộ cơ sở trực thuộc**: Chỉ truy vấn và sắp xếp các ca trải nghiệm theo đúng danh sách cơ sở trực thuộc được lưu trữ của tài khoản đang đăng nhập (`user_centres`), tuyệt đối không hiển thị bộ lọc chọn tài khoản hay role trên giao diện.
    - **Bố cục Ma trận Thống nhất (Single Matrix View)**: Bố cục bảng ma trận gồm 7 cột chuẩn theo đúng thứ tự: `[Cơ sở]` | `[Khối]` | `[Ca]` | `[Khung giờ]` | `[Mentor]` | `[Số lượng]` | `[Note]`. Mỗi case trải nghiệm là **1 dòng duy nhất** thể hiện Mentor và Số lượng học viên, tuyệt đối không tách chi tiết từng dòng học viên.
    - **Tiêu đề bảng tinh gọn & Triệt tiêu thanh cuộn**: Tiêu đề bảng chỉ hiển thị thuần túy `LỊCH TRẢI NGHIỆM ([Tên cơ sở]) • [Ngày]`, **tuyệt đối không để chữ "LMS MindX Hub" hay "Ultra HD 3x"** trên giao diện cũng như trong ảnh sao chép. Triệt tiêu hoàn toàn các thanh cuộn (`no-scrollbar`, `scrollbarWidth: none`) trên giao diện và trong ảnh sao chép.
    - **Định dạng chữ to, rõ ràng và tương phản cao (High-Legibility Standard)**: Cỡ chữ trong bảng và khi kết xuất ảnh sao chép (cả 1 cơ sở và toàn bộ cơ sở) phải to, rõ nét (`text-base`, `text-lg`, `font-black`), tương phản cao để khi xem ảnh thu nhỏ trên Zalo (điện thoại/máy tính) vẫn đọc rõ thông tin không bị mờ hay nhỏ.
    - **Thứ tự khối môn & ca**: Bắt buộc sắp xếp theo thứ tự Khối: `CODING` (Đỏ Ruby `#E11D48`) $\rightarrow$ `ART` (Xanh Navy `#1E3A8A`) $\rightarrow$ `ROBOTICS` (Xanh Lá `#15803D`). Ca học: `SÁNG` $\rightarrow$ `CHIỀU` $\rightarrow$ `TỐI` (sắp xếp tăng dần theo `startTime`).
    - **Lọc thô triệt để ca Makeup**: Tự động loại bỏ 100% các ca có `type` liên quan đến dạy bù (`MAKEUP`, `MAKE_UP`, `BÙ`, `BU`).
    - **Tính năng sao chép ảnh theo từng cơ sở & toàn bộ cơ sở**: Dưới mỗi tên cơ sở có nút "Sao chép ảnh" lưu thẳng Clipboard để dán nhanh (Ctrl+V) vào nhóm Zalo. **Chỉ hiển thị nút sao chép đối với các cơ sở có ca trải nghiệm**. Nút sao chép toàn bộ cơ sở nằm trên thanh công cụ trên cùng.
    - **Bắt buộc bọc bằng AppLayout**: Màn hình lịch trải nghiệm phải kế thừa `AppLayout` đầy đủ Sidebar bên trái, Header người dùng bên trên và Footer thông tin hệ thống bên dưới.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

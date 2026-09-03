# Danh Mục Schema & Lệnh Truy Vấn GraphQL LMS / Firebase (LMS GraphQL Reference)

> **File gốc JSON**: [docs/lms_graphql_schema.json](file:///d:/Documents/Practice/Self%20Project/SMH/docs/lms_graphql_schema.json)
>
> ⚠️ **QUY TẮC CỐT LÕI BẮT BUỘC DÀNH CHO AGENT KHI XÂY DỰNG API**:
> 1. Khi cần lấy bất kỳ dữ liệu gì từ LMS / Firebase, Agent **PHẢI TRA CỨU** danh mục schema dưới đây để tìm đúng bộ query / input / output tương ứng.
> 2. **ĐỊNH DẠNG DỮ LIỆU TRẢ VỀ CHO CLIENT**:
>    - Mọi dữ liệu mà API trả về cho phía giao diện (Client) **BẮT BUỘC PHẢI TRẢ VỀ DƯỚI DẠNG CHỮ (Text / Display Name / Title / Label)** đối với tất cả các trường tham chiếu hoặc khóa ngoại (`role`, `status`, `centre`, `department`, `city`, `district`, `ward`, `course_line`, v.v.).
>    - **TUYỆT ĐỐI KHÔNG** trả về các ID khóa ngoại thô (UUIDs hoặc external IDs).
>    - **NGOẠI LỆ DUY NHẤT**: Chỉ giữ lại `id` khóa chính (Primary Key) của chính đối tượng bản ghi đó (ví dụ `user.id`, `course.id`).

---

## 1. Bản Đồ Phân Loại Dữ Liệu LMS (Domain Map)

### 1.1 Khóa Học & Đào Tạo (Courses & Curriculum)
| Đối tượng chính | Query / Input liên quan | Output / Response |
| :--- | :--- | :--- |
| **Course** (Khóa học) | `QueryCourseInput`, `CourseFilterInput` | `GetListCourseOutput`, `Course` |
| **CourseLine** (Hệ khóa học) | `QueryCourseLineInput`, `CreateCourseLineInput`, `UpdateCourseLineInput` | `GetListCourseLineOutput`, `CourseLine` |
| **CourseTopic** (Chủ đề khóa học) | `QueryCourseTopicInput`, `CreateCourseTopicInput`, `UpdateCourseTopicInput` | `GetListCourseTopicOutput`, `CourseTopic` |
| **Product / ProductLine** (Sản phẩm giáo dục) | `QueryProductInput`, `CreateProductLinesInput`, `UpdateProductLinesInput` | `ProductPaginationResponse`, `ProductLineResponse`, `ProductGroup` |

### 1.2 Nhân Sự, Giáo Viên & Ca Dạy (Employees, Teachers & Shifts)
| Đối tượng chính | Query / Input liên quan | Output / Response |
| :--- | :--- | :--- |
| **Employee** (Giáo viên / Nhân viên) | `QueryEmployeeInput`, `UpdateEmployeeInput`, `UpdateEmployeeBaseIdInput` | `EmployeePaginationResponse`, `Employee` |
| **Contract** (Hợp đồng) | `Contract` | Nằm trong đối tượng `Employee` |
| **Department / Unit** (Phòng ban) | `Department`, `DepartmentUnit`, `Position` | Thông tin chức vụ và đơn vị trực thuộc |
| **WorkingHour / WorkShift** (Ca làm / Giờ dạy) | `FindWorkShiftInput` | `WorkShift`, `WorkingHour` |
| **Import Nhân Sự** | `ImportEmployeeInput`, `FindDetailImportEmployeeInput`, `ImportTaskListInput` | `ImportEmployeeResponse`, `FindDetailImportResponse` |

### 1.3 Cơ Sở & Địa Lý (Centres & Location)
| Đối tượng chính | Query / Input liên quan | Output / Response |
| :--- | :--- | :--- |
| **Centre** (Cơ sở MindX) | `QueryCentreInput`, `CreateCentreInput`, `UpdateCentreInput` | `GetListCentreOutput`, `Centre`, `CentreValueObject` |
| **City / Cities** (Tỉnh / Thành phố) | `QueryCitiesInput`, `QueryCityGetAllInput`, `QueryCityCriteriaInput` | `GetListCitiesOutput`, `Cities`, `City` |
| **District / Districts** (Quận / Huyện) | `QueryDistrictsInput`, `QueryDistrictsGetAllInput`, `QueryDistrictCriteriaInput` | `GetListDistrictsOutput`, `Districts`, `District` |
| **Ward / Wards** (Phường / Xã) | `QueryWardsInput`, `QueryWardsGetAllInput`, `QueryWardCriteriaInput` | `GetListWardsOutput`, `Wards`, `Ward` |
| **Address** (Địa chỉ) | `AddressInput` | `Address` |

### 1.4 Người Dùng, Quyền Hạn & Phiên Đăng Nhập (Users & Auth)
| Đối tượng chính | Query / Input liên quan | Output / Response |
| :--- | :--- | :--- |
| **User** (Tài khoản người dùng) | `QueryUserInput`, `CreateUserInput`, `UpdateUserInput` | `GetListUserOutput`, `User` |
| **Role & Permission** (Vai trò & Quyền) | `QueryRoleInput`, `CreateRoleInput`, `UpdateRoleInput`, `PermissionInput` | `GetListRoleOutput`, `Role`, `Permission`, `PermissionOutput` |
| **Xác thực / Phiên** | `LoginWithUsernameInput`, `RegisterWithTokenInput`, `RegisterDeviceInput` | `LoginOutput`, `RegisterWithTokenOutput`, `GetCustomTokenResult`, `SessionInfo` |
| **Đổi mật khẩu / Email / MFA** | `ChangePasswordInput`, `ChangeEmailInput`, `UpdateRequiredMfaInput` | `EnableTotpOutput`, `UserMutations` |

### 1.5 Cấu Hình Hệ Thống & Quản Trị Kinh Doanh (System & Business)
| Đối tượng chính | Query / Input liên quan | Output / Response |
| :--- | :--- | :--- |
| **ConfigSystem** (Cấu hình hệ thống) | `CreateConfigSystemInput`, `UpdateConfigSystemInput`, `RankingConfigurationInput` | `ConfigSystem`, `ConfigSystemHistoryItem` |
| **BusinessUnit / Domain** | `QueryBusinessUnitInput`, `CreateBusinessUnitInput`, `QueryBusinessDomainInput` | `BusinessUnitPaginationResponse`, `BusinessDomain` |
| **BusinessParameter** | `FindBusinessParameterInput`, `FindPaginatedBusinessParameterInput` | `BusinessParameter`, `PaginatedBusinessParameter` |
| **Marketing & Operations** | `FindMarketingProjectPayload`, `FindOperationMethodQuery` | `MarketingProject`, `GetOperationMethodsResponse` |

---

## 2. Quy Định Định Dạng Dữ Liệu Khi Viết API Backend SMH

Mỗi khi xây dựng endpoint API trong thư mục `app/api/...`:

```typescript
// ❌ SAI: Trả về trực tiếp foreign key ID
return NextResponse.json({
  id: user.id,
  full_name: user.full_name,
  role_id: "6750b1c2-7702-42c5-a95f-ca9fbf98839e", // KHÔNG ĐƯỢC
  status_id: "9e3c1...", // KHÔNG ĐƯỢC
  centre_id: "c123..."   // KHÔNG ĐƯỢC
});

// ✅ ĐÚNG: Luôn JOIN / Resolve ra chuỗi text hiển thị
return NextResponse.json({
  id: user.id,            // ID khóa chính được giữ lại
  full_name: user.full_name,
  role: "Teacher Part-time",      // Dữ liệu chữ
  status: "Đã phê duyệt",         // Dữ liệu chữ
  centre: "MindX Nguyễn Thị Minh Khai", // Dữ liệu chữ
  department: "Khối Đào tạo Công nghệ"   // Dữ liệu chữ
});
```

---

## 3. Cách Thức Tra Cứu & Gọi Lệnh Khi Cần Dữ Liệu Từ LMS / Firebase

1. **Bước 1**: Xác định thực thể cần truy vấn (ví dụ: Khóa học -> Nhóm `Course / CourseLine / CourseTopic`; Ca dạy -> Nhóm `Employee / WorkShift`; Cơ sở -> Nhóm `Centre`).
2. **Bước 2**: Tìm đúng tên type và query input trong bảng tra cứu trên hoặc trong [docs/lms_graphql_schema.json](file:///d:/Documents/Practice/Self%20Project/SMH/docs/lms_graphql_schema.json).
3. **Bước 3**: Gọi GraphQL query bằng Firebase Token hợp lệ (`id_token` lấy từ session cookie người dùng hoặc `LMS_FALLBACK` token).
4. **Bước 4**: Map và định dạng dữ liệu: chuyển đổi tất cả mã code / ID khóa ngoại sang tên chữ hoàn chỉnh trước khi trả response về phía giao diện người dùng.

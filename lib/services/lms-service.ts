const LMS_GRAPHQL_ENDPOINT =
  process.env.LMS_GRAPHQL_ENDPOINT || "https://lms-api.mindx.edu.vn/graphql";

// Lấy Firebase Token từ tài khoản quản trị fallback
let cachedWorkingLmsToken: string | null = null;

export function setWorkingLmsToken(token: string) {
  if (token) cachedWorkingLmsToken = token;
}

export function getWorkingLmsToken(): string | null {
  return cachedWorkingLmsToken;
}

// Lấy Firebase Token từ tài khoản quản trị fallback hoặc tài khoản hoạt động
export async function getAdminFirebaseToken(): Promise<string | null> {
  if (cachedWorkingLmsToken) {
    return cachedWorkingLmsToken;
  }

  const fallbackEmail =
    process.env.LMS_FALLBACK_EMAIL || "baotc@mindx.com.vn";
  const fallbackPassword =
    process.env.LMS_FALLBACK_PASSWORD || "MindX@2024";
  const apiKey =
    process.env.LMS_API_KEY || "AIzaSyAh2Au-mk5ci-hN83RUBqj1fsAmCMdvJx4";
  const apiUrl =
    process.env.LMS_API_URL ||
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

  // Danh sách các ứng viên tài khoản để lấy token LMS hợp lệ
  const candidateAccounts = [
    { email: "anhhn01@mindx.com.vn", password: "Nh@t@nh12@8" },
    { email: fallbackEmail, password: fallbackPassword },
  ];

  for (const acc of candidateAccounts) {
    try {
      const response = await fetch(`${apiUrl}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: acc.email,
          password: acc.password,
          returnSecureToken: true,
        }),
      });

      const data = await response.json();
      if (data.idToken) {
        cachedWorkingLmsToken = data.idToken;
        return data.idToken;
      }
    } catch (err) {
      console.error(`Lỗi lấy token LMS cho ${acc.email}:`, err);
    }
  }

  return null;
}

// Gọi GraphQL LMS lấy thông tin Teacher theo mã code
export async function fetchTeacherFromLms(
  code: string,
  token: string
): Promise<{ fullName: string; email: string } | null> {
  try {
    const query = `
      query GetTeachers($code: String) {
        teachers(payload: { code_eq: $code }) {
          data {
            id
            code
            username
            fullName
            email
          }
        }
      }
    `;

    const res = await fetch(LMS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        operationName: "GetTeachers",
        query,
        variables: { code },
      }),
    });

    const resData = await res.json();
    let teacher = resData.data?.teachers?.data?.[0];

    // Nếu không khớp code_eq, thử tìm qua searchString_wordSearch
    if (!teacher || !teacher.fullName) {
      const queryFallback = `
        query GetTeachers($search: String) {
          teachers(payload: { searchString_wordSearch: $search, pageIndex: 0, itemsPerPage: 5 }) {
            data {
              id
              code
              username
              fullName
              email
            }
          }
        }
      `;
      const resFallback = await fetch(LMS_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operationName: "GetTeachers",
          query: queryFallback,
          variables: { search: code },
        }),
      });
      const dataFallback = await resFallback.json();
      teacher =
        dataFallback.data?.teachers?.data?.find(
          (t: any) =>
            t.code?.toLowerCase() === code.toLowerCase() ||
            t.username?.toLowerCase() === code.toLowerCase()
        ) || dataFallback.data?.teachers?.data?.[0];
    }

    if (teacher && teacher.fullName) {
      return {
        fullName: teacher.fullName.trim(),
        email: teacher.email || `${code}@mindx.net.vn`,
      };
    }
  } catch (err) {
    console.error("Lỗi fetchTeacherFromLms:", err);
  }
  return null;
}

// Kiểm tra toàn diện sự tồn tại của tài khoản trên LMS / Firebase
export async function checkLmsAccount(cleanCode: string): Promise<{
  exists: boolean;
  fullName?: string;
  email?: string;
}> {
  const fbToken = await getAdminFirebaseToken();

  // 1. Kiểm tra qua GraphQL Teacher
  if (fbToken) {
    const teacher = await fetchTeacherFromLms(cleanCode, fbToken);
    if (teacher) {
      return {
        exists: true,
        fullName: teacher.fullName,
        email: teacher.email,
      };
    }
  }

  // 2. Kiểm tra qua Firebase Identity Toolkit
  const apiKey = process.env.LMS_API_KEY;
  const candidates: string[] = [
    cleanCode.includes("@") ? cleanCode : `${cleanCode}@mindx.net.vn`,
    `${cleanCode}@mindx.edu.vn`,
    `${cleanCode}@mindx.com.vn`,
  ];

  for (const email of candidates) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            continueUri: "http://localhost",
            identifier: email,
          }),
        }
      );
      const data = await response.json();
      if (data.registered === true) {
        return {
          exists: true,
          email: email,
        };
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra ứng viên email Firebase:", err);
    }
  }

  return { exists: false };
}

// Lấy danh mục cơ sở chính thống từ LMS (Hỗ trợ phân trang để lấy đầy đủ 101+ cơ sở)
export async function fetchOfficialCentresList(token?: string): Promise<Array<{ id: string; name: string; shortName?: string; code?: string }>> {
  const { OFFICIAL_LMS_CENTRES } = await import("@/lib/constants/centres");
  const authToken = token || (await getAdminFirebaseToken());

  if (!authToken) {
    return OFFICIAL_LMS_CENTRES;
  }

  try {
    let pageIndex = 0;
    const map = new Map<string, { id: string; name: string; shortName?: string; code?: string }>();

    while (true) {
      const query = `
        query GetCentresList($pageIndex: Int) {
          centres(payload: { itemsPerPage: 100, pageIndex: $pageIndex }) {
            data {
              id
              name
              shortName
              code
              isActive
            }
          }
        }
      `;

      const res = await fetch(LMS_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ query, variables: { pageIndex } }),
      });

      const data = await res.json();
      const pageData = data.data?.centres?.data;

      if (!Array.isArray(pageData) || pageData.length === 0) {
        break;
      }

      for (const c of pageData) {
        // Chỉ lấy các cơ sở đang hoạt động (isActive === true)
        if (c && c.id && c.isActive === true && !map.has(c.id)) {
          map.set(c.id, {
            id: c.id,
            name: c.name,
            shortName: c.shortName || undefined,
            code: c.code || undefined,
          });
        }
      }

      if (pageData.length < 100) {
        break;
      }
      pageIndex++;
    }

    if (map.size > 0) {
      // Gộp thêm với danh mục chuẩn nếu có cơ sở mới
      for (const defaultC of OFFICIAL_LMS_CENTRES) {
        if (!map.has(defaultC.id)) {
          map.set(defaultC.id, defaultC);
        }
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
    }
  } catch (err) {
    console.error("Lỗi khi lấy danh sách cơ sở từ LMS:", err);
  }

  return OFFICIAL_LMS_CENTRES;
}

// Tra cứu danh sách cơ sở trực thuộc của một giáo viên/tài khoản từ LMS
export async function fetchTeacherCentresFromLms(
  identifier: string,
  fullName?: string,
  token?: string
): Promise<Array<{ id: string; name: string; shortName?: string; code?: string }>> {
  const authToken = token || (await getAdminFirebaseToken());
  if (!authToken) return [];

  const cleanName = fullName?.replace(/^(TF|GV|Giảng\s*viên|Teacher|Admin)\s+/i, "").trim();
  const searchKeywords = [
    cleanName,
    fullName?.trim(),
    identifier.trim(),
  ].filter((s): s is string => !!s && s.length > 0);

  for (const keyword of searchKeywords) {
    try {
      const query = `
        query SearchTeacherCentres($search: String) {
          teachers(payload: { searchString_wordSearch: $search, itemsPerPage: 5 }) {
            data {
              id
              code
              fullName
              centres {
                id
                name
                shortName
                code
              }
            }
          }
        }
      `;

      const res = await fetch(LMS_GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          query,
          variables: { search: keyword },
        }),
      });

      const resData = await res.json();
      const teachers = resData.data?.teachers?.data;

      if (Array.isArray(teachers) && teachers.length > 0) {
        // Tìm giáo viên phù hợp nhất
        const matched =
          teachers.find((t: any) => {
            const tName = (t.fullName || "").toLowerCase();
            const cName = (cleanName || "").toLowerCase();
            const fName = (fullName || "").toLowerCase();
            const idCode = identifier.toLowerCase();
            return (
              (cName && (tName.includes(cName) || cName.includes(tName))) ||
              (fName && (tName.includes(fName) || fName.includes(tName))) ||
              (t.code && t.code.toLowerCase() === idCode)
            );
          }) || teachers[0];

        if (matched && Array.isArray(matched.centres) && matched.centres.length > 0) {
          return matched.centres.map((c: any) => ({
            id: c.id,
            name: c.name,
            shortName: c.shortName || undefined,
            code: c.code || undefined,
          }));
        }
      }
    } catch (err) {
      console.error(`Lỗi khi tra cứu cơ sở giáo viên với từ khóa "${keyword}":`, err);
    }
  }

  return [];
}

export interface OfficeHourItem {
  id: string;
  name: string | null;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  note?: string | null;
  managerNote?: string | null;
  studentCount?: number;
  centre: {
    id: string;
    name: string;
    shortName?: string;
  } | null;
  teacher: {
    id: string;
    fullName: string;
    code?: string;
  } | null;
  courses: Array<{ id: string; name: string }>;
  courseLines: Array<{ id: string; name: string }>;
  appointments: Array<{
    id: string;
    status: string;
    note?: string;
    candidate: {
      id: string;
      fullName: string;
      phoneNumber?: string;
    } | null;
  }>;
}

// Lấy danh sách lịch trải nghiệm (GetApprovedOfficeHours), lọc bỏ triệt để ca Makeup / Bù
export async function fetchOfficeHours({
  centreIds,
  timeFrom,
  timeTo,
  token,
  accountRole,
}: {
  centreIds?: string[];
  timeFrom: string;
  timeTo: string;
  token?: string;
  accountRole?: string;
}): Promise<OfficeHourItem[]> {
  const authToken = token || (await getAdminFirebaseToken());
  if (!authToken) return [];

  try {
    const payload: Record<string, any> = {
      paginationType: "OFFSET",
      pageIndex: 0,
      itemsPerPage: 500,
      statusIn: ["APPROVED"],
      timeFrom,
      timeTo,
    };

    if (Array.isArray(centreIds) && centreIds.length > 0) {
      payload.centreIn = centreIds;
    }

    if (accountRole) {
      payload.accountRole = accountRole;
    }

    const query = `
      query GetApprovedOfficeHours($payload: OfficeHourQuery) {
        officeHours(payload: $payload) {
          data {
            id
            name
            startTime
            endTime
            status
            type
            note
            managerNote
            studentCount
            centre {
              id
              name
              shortName
            }
            teacher {
              id
              fullName
              code
            }
            courses {
              id
              name
            }
            courseLines {
              id
              name
            }
            appointments {
              id
              status
              note
              candidate {
                id
                fullName
                phoneNumber
              }
            }
          }
          pagination {
            total
          }
        }
      }
    `;

    const res = await fetch(LMS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        query,
        variables: { payload },
      }),
    });

    const resData = await res.json();
    const rawList: any[] = resData.data?.officeHours?.data || [];

    // Hàm kiểm tra ca dạy bù / makeup (loại bỏ triệt để không phân biệt hoa thường và dấu tiếng Việt)
    const isMakeupCase = (typeStr?: string | null): boolean => {
      if (!typeStr) return false;
      const normalized = typeStr
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // BÙ -> BU
      return (
        normalized.includes("makeup") ||
        normalized.includes("make_up") ||
        normalized.includes("bu")
      );
    };

    // Lọc thô loại bỏ tất cả ca Makeup / Bù
    const filtered = rawList.filter((item) => !isMakeupCase(item.type));

    return filtered.map((item) => ({
      id: item.id,
      name: item.name || null,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status || "APPROVED",
      type: item.type || "Trial",
      note: item.note || null,
      managerNote: item.managerNote || null,
      studentCount:
        typeof item.studentCount === "number"
          ? item.studentCount
          : Array.isArray(item.appointments)
          ? item.appointments.length
          : 0,
      centre: item.centre
        ? {
            id: item.centre.id,
            name: item.centre.name,
            shortName: item.centre.shortName || undefined,
          }
        : null,
      teacher: item.teacher
        ? {
            id: item.teacher.id,
            fullName: item.teacher.fullName,
            code: item.teacher.code || undefined,
          }
        : null,
      courses: Array.isArray(item.courses)
        ? item.courses.map((c: any) => ({ id: c.id, name: c.name }))
        : [],
      courseLines: Array.isArray(item.courseLines)
        ? item.courseLines.map((cl: any) => ({ id: cl.id, name: cl.name }))
        : [],
      appointments: Array.isArray(item.appointments)
        ? item.appointments.map((ap: any) => ({
            id: ap.id,
            status: ap.status || "WAITING",
            note: ap.note || undefined,
            candidate: ap.candidate
              ? {
                  id: ap.candidate.id,
                  fullName: ap.candidate.fullName,
                  phoneNumber: ap.candidate.phoneNumber || undefined,
                }
              : null,
          }))
        : [],
    }));
  } catch (err) {
    console.error("Lỗi khi fetchOfficeHours:", err);
    return [];
  }
}

export interface LmsClassSlot {
  index: number;
  date: string;
  summary?: string | null;
  homework?: string | null;
}

export interface LmsClassItem {
  id: string;
  name: string; // Mã lớp
  status: "OPEN" | "RUNNING" | "FINISHED" | string;
  startDate?: string | null;
  endDate?: string | null;
  numberOfSessions: number;
  completedSessions: number;
  progressPercent: number;
  centre: {
    id: string;
    name: string;
    shortName?: string;
  } | null;
  course?: {
    id?: string;
    name?: string;
  } | null;
  courseProcess?: {
    name?: string;
    checkpoint1Session?: number | null;
    checkpoint1Date?: string | null;
    checkpoint2Session?: number | null;
    checkpoint2Date?: string | null;
    finalProjectSession?: number | null;
    finalProjectDate?: string | null;
  } | null;
  slots: LmsClassSlot[];
}

// Lấy danh sách lớp học theo cơ sở trực thuộc và trạng thái OPEN, RUNNING, FINISHED
export async function fetchClassesFromLms({
  centreIds,
  statuses = ["OPEN", "RUNNING", "FINISHED"],
  token,
}: {
  centreIds?: string[];
  statuses?: string[];
  token?: string;
}): Promise<LmsClassItem[]> {
  const authToken = token || (await getAdminFirebaseToken());
  if (!authToken) return [];

  try {
    const payload: Record<string, any> = {
      paginationType: "OFFSET",
      pageIndex: 0,
      itemsPerPage: 500,
      status_in: statuses,
    };

    if (Array.isArray(centreIds) && centreIds.length > 0) {
      payload.centre_in = centreIds;
    }

    const query = `
      query GetClasses($payload: ClassQuery) {
        classes(payload: $payload) {
          data {
            id
            name
            status
            startDate
            endDate
            numberOfSessions
            centre {
              id
              name
              shortName
            }
            course {
              id
              name
            }
            courseProcess {
              id
              name
              checkpointSessions {
                session
              }
              finalSession {
                id
              }
            }
            slots {
              index
              date
              summary
              homework
            }
          }
        }
      }
    `;

    const res = await fetch(LMS_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        operationName: "GetClasses",
        query,
        variables: { payload },
      }),
    });

    const resData = await res.json();
    const rawList = resData?.data?.classes?.data || [];
    const now = new Date();

    return rawList.map((c: any) => {
      const slots: LmsClassSlot[] = (c.slots || [])
        .map((s: any) => ({
          index: s.index,
          date: s.date,
          summary: s.summary || null,
          homework: s.homework || null,
        }))
        .sort((a: LmsClassSlot, b: LmsClassSlot) => a.index - b.index);

      const totalSessions = c.numberOfSessions || slots.length || 0;

      // Tính số buổi đã hoàn thành
      let completed = typeof c.completedSessions === "number" ? c.completedSessions : 0;
      if (completed === 0 && slots.length > 0) {
        completed = slots.filter((s) => new Date(s.date) <= now).length;
      }
      if (c.status === "FINISHED") {
        completed = totalSessions;
      }
      const progressPercent = totalSessions > 0 ? Math.min(100, Math.round((completed / totalSessions) * 100)) : 0;

      // Checkpoint 1 & 2
      const cpSessions = c.courseProcess?.checkpointSessions || [];
      const cp1Num = cpSessions[0]?.session || null;
      const cp2Num = cpSessions[1]?.session || null;
      const cp1Slot = cp1Num && slots[cp1Num - 1] ? slots[cp1Num - 1].date : null;
      const cp2Slot = cp2Num && slots[cp2Num - 1] ? slots[cp2Num - 1].date : null;

      // Buổi cuối khóa / Demo Day
      const finalSessionNum = totalSessions || (slots.length > 0 ? slots.length : null);
      const finalSlot = slots.length > 0 ? slots[slots.length - 1].date : null;

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        startDate: c.startDate || (slots.length > 0 ? slots[0].date : null),
        endDate: c.endDate || (slots.length > 0 ? slots[slots.length - 1].date : null),
        numberOfSessions: totalSessions,
        completedSessions: completed,
        progressPercent,
        centre: c.centre
          ? {
              id: c.centre.id,
              name: c.centre.name,
              shortName: c.centre.shortName || undefined,
            }
          : null,
        course: c.course
          ? {
              id: c.course.id,
              name: c.course.name,
            }
          : null,
        courseProcess: {
          name: c.courseProcess?.name || "Tiến trình chuẩn",
          checkpoint1Session: cp1Num,
          checkpoint1Date: cp1Slot,
          checkpoint2Session: cp2Num,
          checkpoint2Date: cp2Slot,
          finalProjectSession: finalSessionNum,
          finalProjectDate: finalSlot,
        },
        slots,
      };
    });
  } catch (err) {
    console.error("Lỗi khi fetchClassesFromLms:", err);
    return [];
  }
}


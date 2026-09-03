const LMS_GRAPHQL_ENDPOINT =
  process.env.LMS_GRAPHQL_ENDPOINT || "https://lms-api.mindx.edu.vn/graphql";

// Lấy Firebase Token từ tài khoản quản trị fallback
export async function getAdminFirebaseToken(): Promise<string | null> {
  const fallbackEmail =
    process.env.LMS_FALLBACK_EMAIL || "baotc@mindx.com.vn";
  const fallbackPassword =
    process.env.LMS_FALLBACK_PASSWORD || "MindX@2024";
  const apiKey =
    process.env.LMS_API_KEY || "AIzaSyAh2Au-mk5ci-hN83RUBqj1fsAmCMdvJx4";
  const apiUrl =
    process.env.LMS_API_URL ||
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

  try {
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fallbackEmail,
        password: fallbackPassword,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();
    return data.idToken || null;
  } catch (err) {
    console.error("Lỗi lấy admin token LMS:", err);
    return null;
  }
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

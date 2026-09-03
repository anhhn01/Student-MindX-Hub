import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { API_ROUTES } from "@/lib/constants/api-routes";
import { getRoleMenuPermissions } from "@/lib/services/permissions-service";

interface LoginRequest {
  lms_code?: string;
  identifier?: string;
  password: string;
}

interface FirebaseData {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  localId: string;
  email: string;
  displayName?: string;
}

interface FirebaseCheckResult {
  exists: boolean;
  data: FirebaseData | null;
  error: string | null;
  errorCode: string | null;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const ACCESS_DENIED_MESSAGE =
  "Xin lỗi bạn chưa có quyền truy cập vào trang website này. Vui lòng liên hệ admin nhé.";
const INVALID_CREDENTIALS_MESSAGE = "Xin lỗi thông tin đăng nhập chưa chính xác";

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const inputLmsCode = (body.lms_code || body.identifier || "").trim();
    const password = body.password;

    console.log("=== LOGIN ATTEMPT ===");
    console.log("Input LMS Code:", inputLmsCode);

    // Validate input
    if (!password || !inputLmsCode) {
      return NextResponse.json(
        { error: "Mã LMS và mật khẩu là bắt buộc" },
        { status: 400 }
      );
    }

    // Step 1: Query Supabase to find user with JOIN to user_statuses and roles
    let { data: userData, error: supabaseError } = await supabase
      .from("users")
      .select("id, lms_code, password_hash, full_name, status_id, role_id, is_firebase, user_statuses(id, name), roles(id, name)")
      .eq("lms_code", inputLmsCode)
      .maybeSingle();

    if (supabaseError && supabaseError.message?.includes("is_firebase")) {
      const fallbackQuery = await supabase
        .from("users")
        .select("id, lms_code, password_hash, full_name, status_id, role_id, user_statuses(id, name), roles(id, name)")
        .eq("lms_code", inputLmsCode)
        .maybeSingle();
      userData = fallbackQuery.data ? ({ ...fallbackQuery.data, is_firebase: undefined } as any) : null;
    }

    console.log("Supabase userData found:", !!userData);

    // CASE 1: User NOT found in Supabase -> Access Denied (403)
    if (!userData) {
      console.log("User not found in Supabase database.");
      return NextResponse.json(
        { error: ACCESS_DENIED_MESSAGE },
        { status: 403 }
      );
    }

    // CASE 2: User status check in Supabase (Must be 'Approved' / 'approved')
    const statusRelation = userData.user_statuses;
    const statusObj = Array.isArray(statusRelation) ? statusRelation[0] : statusRelation;
    const statusCode = ((statusObj as any)?.name || (statusObj as any)?.code || "").toLowerCase();

    console.log("User status resolved:", statusCode);

    if (statusCode !== "approved") {
      console.log(`User status is '${statusCode}' (not approved). Access denied.`);
      return NextResponse.json(
        { error: ACCESS_DENIED_MESSAGE },
        { status: 403 }
      );
    }

    // Differentiate between LMS Account vs Website-Created Account
    const isLmsAccount =
      userData.is_firebase === true ||
      userData.password_hash === "LMS_EXTERNAL_ACCOUNT" ||
      !userData.password_hash ||
      String(userData.password_hash).startsWith("LMS_");

    console.log("Account type resolved:", isLmsAccount ? "LMS Account" : "Website-Created Local Account");

    if (isLmsAccount) {
      // --- TYPE 1: LMS ACCOUNT ---
      // Do NOT check password in Supabase. Authenticate input LMS code & password against Firebase REST API directly.
      console.log("Authenticating LMS account with Firebase REST API...");
      const firebaseResult = await checkFirebaseUserWithCandidates(inputLmsCode, password);

      if (!firebaseResult.exists || !firebaseResult.data) {
        console.log("Firebase LMS auth failed for LMS account.");
        return NextResponse.json(
          { error: INVALID_CREDENTIALS_MESSAGE },
          { status: 401 }
        );
      }

      return await buildLoginSuccessResponse(
        userData,
        firebaseResult.data,
        inputLmsCode
      );
    } else {
      // --- TYPE 2: WEBSITE-CREATED LOCAL ACCOUNT ---
      // 1. Verify input password against password_hash stored in Supabase
      console.log("Verifying password_hash in Supabase for website-created account...");
      const isPasswordValid = await bcrypt.compare(password, userData.password_hash);

      if (!isPasswordValid) {
        console.log("Password hash match failed for website-created account.");
        return NextResponse.json(
          { error: INVALID_CREDENTIALS_MESSAGE },
          { status: 401 }
        );
      }

      // 2. Password is correct! Use LMS_FALLBACK credentials from .env to obtain valid Firebase token
      console.log("Password correct. Requesting Firebase token using LMS_FALLBACK credentials...");
      const fallbackResult = await loginWithFallback();

      if (!fallbackResult.success || !fallbackResult.data) {
        console.error("LMS Fallback token acquisition failed.");
        return NextResponse.json(
          { error: "Đăng nhập dịch vụ LMS thất bại. Vui lòng liên hệ quản trị viên." },
          { status: 500 }
        );
      }

      return await buildLoginSuccessResponse(
        userData,
        fallbackResult.data,
        inputLmsCode
      );
    }
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Lỗi máy chủ. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}

// Build success response with joined role text name, storing Firebase authentication tokens in cookies
async function buildLoginSuccessResponse(
  userData: any,
  firebaseData: FirebaseData,
  lmsCode: string
) {
  const greetingName = userData.full_name || lmsCode || "Người dùng";

  // Determine Joined Role Text Name & Target Dashboard Route
  const roleRelation = userData.roles;
  const roleObj = Array.isArray(roleRelation) ? roleRelation[0] : roleRelation;
  const rawRoleName = ((roleObj as any)?.name || "").toLowerCase();

  let redirectUrl: string = API_ROUTES.TEACHER_PARTTIME.DASHBOARD;
  let userRoleText = "Teacher Part-time";

  if (rawRoleName.includes("admin")) {
    redirectUrl = API_ROUTES.ADMIN.DASHBOARD;
    userRoleText = "Admin";
  } else if (rawRoleName.includes("full-time") || rawRoleName.includes("fulltime")) {
    redirectUrl = API_ROUTES.TEACHER_FULLTIME.DASHBOARD;
    userRoleText = "Teacher Full-time";
  } else {
    redirectUrl = API_ROUTES.TEACHER_PARTTIME.DASHBOARD;
    userRoleText = "Teacher Part-time";
  }

  // Resolve joined status text
  const statusRelation = userData.user_statuses;
  const statusObj = Array.isArray(statusRelation) ? statusRelation[0] : statusRelation;
  const statusText = (statusObj as any)?.name || "Approved";

  console.log(`User role resolved: ${userRoleText}, Status: ${statusText}, Redirecting to: ${redirectUrl}`);

  const res = NextResponse.json(
    {
      success: true,
      user: {
        id: userData.id,
        name: greetingName,
        lms_code: lmsCode,
        role: userRoleText, // Text string representation, NOT raw ID
        status: statusText, // Text string representation, NOT raw ID
      },
      token: firebaseData.idToken,
      refresh_token: firebaseData.refreshToken,
      redirect_url: redirectUrl,
    },
    { status: 200 }
  );

  // Store user & Firebase authentication tokens in cookies for future operations
  res.cookies.set("user_id", userData.id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("id_token", firebaseData.idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: Number(firebaseData.expiresIn) || 3600,
    path: "/",
  });

  res.cookies.set("refresh_token", firebaseData.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("user_name", encodeURIComponent(greetingName), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  res.cookies.set("user_role", encodeURIComponent(userRoleText), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  const userPerms = await getRoleMenuPermissions(userRoleText);
  res.cookies.set("user_permissions", encodeURIComponent(JSON.stringify(userPerms)), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return res;
}

// Authenticate with Firebase REST API using input LMS code and password directly
async function checkFirebaseUserWithCandidates(
  lms_code: string,
  password?: string
): Promise<FirebaseCheckResult> {
  // 1. Gửi trực tiếp lms_code và mật khẩu theo đúng yêu cầu
  const directResult = await checkFirebaseSingle(lms_code, password || "");
  if (directResult.exists) {
    return directResult;
  }

  // 2. Nếu lms_code chưa có domain và Firebase yêu cầu định dạng email, thử qua các domain nội bộ LMS
  if (!lms_code.includes("@")) {
    const candidates: string[] = [
      `${lms_code}@mindx.net.vn`,
      `${lms_code}@mindx.edu.vn`,
      `${lms_code}@mindx.com.vn`,
    ];

    for (const candidateEmail of candidates) {
      const result = await checkFirebaseSingle(candidateEmail, password || "");
      if (result.exists) {
        return result;
      }
    }
  }

  return {
    exists: false,
    data: null,
    error: "INVALID_CREDENTIALS",
    errorCode: "INVALID_CREDENTIALS",
  };
}

async function checkFirebaseSingle(identifier: string, password: string) {
  const apiKey = process.env.LMS_API_KEY;
  const apiUrl = process.env.LMS_API_URL;

  if (!apiKey || !apiUrl || !identifier) {
    return { exists: false, data: null, error: "LMS API configuration missing", errorCode: null };
  }

  try {
    const response = await fetch(`${apiUrl}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: identifier,
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errorCode = data.error?.message || "Firebase auth failed";
      return { exists: false, data: null, error: errorCode, errorCode };
    }

    return {
      exists: true,
      data: {
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn,
        localId: data.localId,
        email: data.email,
        displayName: data.displayName,
      } as FirebaseData,
      error: null,
      errorCode: null,
    };
  } catch (error) {
    return { exists: false, data: null, error: "Firebase check error", errorCode: "NETWORK_ERROR" };
  }
}

async function loginWithFallback() {
  const fallbackCode = process.env.LMS_FALLBACK_CODE || process.env.LMS_FALLBACK_EMAIL || "baotc";
  const fallbackPassword = process.env.LMS_FALLBACK_PASSWORD || "MindX@2024";
  const apiKey = process.env.LMS_API_KEY || "AIzaSyAh2Au-mk5ci-hN83RUBqj1fsAmCMdvJx4";
  const apiUrl = process.env.LMS_API_URL || "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword";

  if (!fallbackCode || !fallbackPassword || !apiKey || !apiUrl) {
    return { success: false, data: null, error: "LMS Fallback configuration missing" };
  }

  // Thử trực tiếp fallbackCode
  let fallbackResult = await checkFirebaseSingle(fallbackCode, fallbackPassword);

  // Nếu Firebase yêu cầu email và fallbackCode không có @, thử các domain LMS
  if (!fallbackResult.exists && !fallbackCode.includes("@")) {
    const candidates = [
      `${fallbackCode}@mindx.edu.vn`,
      `${fallbackCode}@mindx.net.vn`,
      `${fallbackCode}@mindx.com.vn`,
    ];
    for (const emailCandidate of candidates) {
      const res = await checkFirebaseSingle(emailCandidate, fallbackPassword);
      if (res.exists) {
        fallbackResult = res;
        break;
      }
    }
  }

  if (!fallbackResult.exists || !fallbackResult.data) {
    return { success: false, data: null, error: fallbackResult.error || "Fallback failed" };
  }

  return {
    success: true,
    data: fallbackResult.data,
    error: null,
  };
}

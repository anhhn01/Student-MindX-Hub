import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { saveGoogleDriveTokens } from "@/lib/services/google-drive-service";
import { signSmhToken, verifySmhToken } from "@/lib/auth/jwt";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const origin = request.nextUrl.origin;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() || `${origin}/api/auth/google/callback`;

  if (errorParam) {
    console.error("Google OAuth error from query:", errorParam);
    return NextResponse.redirect(
      new URL(`/connect-google-drive?error=${encodeURIComponent(errorParam)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect-google-drive?error=missing_code", origin)
    );
  }

  // Giải mã state
  let userId = "";
  let role = "";
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf-8"));
      userId = decoded.userId || "";
      role = decoded.role || "";
    } catch (_) {}
  }

  // Nếu không có userId từ state, fallback lấy từ cookie
  if (!userId) {
    userId = request.cookies.get("user_id")?.value || "";
  }
  if (!role) {
    const rawRole = request.cookies.get("user_role")?.value;
    role = rawRole ? decodeURIComponent(rawRole) : "";
  }

  // Tra cứu thêm từ smh_token nếu vẫn chưa có userId
  const smhTokenCookie = request.cookies.get("smh_token")?.value;
  if (!userId && smhTokenCookie) {
    const verified = await verifySmhToken(smhTokenCookie);
    if (verified.valid && verified.payload) {
      userId = verified.payload.userId;
      role = verified.payload.role;
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/connect-google-drive?error=missing_credentials", origin)
    );
  }

  try {
    // 1. Đổi code lấy tokens từ Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google token exchange failed:", tokenData);
      return NextResponse.redirect(
        new URL(
          `/connect-google-drive?error=${encodeURIComponent(
            tokenData.error_description || tokenData.error || "token_exchange_failed"
          )}`,
          origin
        )
      );
    }

    // 2. Lấy thông tin user (email) từ Google
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const googleUser = await userinfoResponse.json();
    const googleEmail = (googleUser.email || "").trim();

    if (!googleEmail) {
      return NextResponse.redirect(
        new URL("/connect-google-drive?error=no_email_returned", origin)
      );
    }

    // 3. Cập nhật email trong bảng users của Supabase
    if (userId) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          email: googleEmail,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Lỗi cập nhật email Supabase:", updateError);
      }

      // 4. Lưu Google Drive tokens vào kho dữ liệu bền vững
      saveGoogleDriveTokens(userId, {
        email: googleEmail,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        expiry_date: Date.now() + (Number(tokenData.expires_in) || 3600) * 1000,
      });
    }

    // 5. Ký lại SMH JWT token mới có chứa email
    let lmsCode = "user";
    let name = "Giáo viên";
    let status = "approved";

    if (userId) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("lms_code, full_name, user_statuses(name)")
        .eq("id", userId)
        .maybeSingle();

      if (dbUser) {
        lmsCode = dbUser.lms_code || lmsCode;
        name = dbUser.full_name || name;
        const statusObj = Array.isArray(dbUser.user_statuses)
          ? dbUser.user_statuses[0]
          : dbUser.user_statuses;
        status = (statusObj as any)?.name || status;
      }
    }

    const { token: newSmhToken, maxAgeSeconds } = await signSmhToken(
      {
        userId,
        lmsCode,
        name,
        role: role || "Teacher Part-time",
        status,
        email: googleEmail,
      },
      30
    );

    // Xác định đích chuyển tiếp: Teacher Part-time dashboard
    const targetDashboard = "/teacher-parttime/dashboard?connected=drive_success";
    const response = NextResponse.redirect(new URL(targetDashboard, origin));

    // Cập nhật cookies
    response.cookies.set("smh_token", newSmhToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSeconds,
      sameSite: "lax",
      path: "/",
    });

    response.cookies.set("user_email", encodeURIComponent(googleEmail), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: maxAgeSeconds,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Google OAuth callback exception:", err);
    return NextResponse.redirect(
      new URL(
        `/connect-google-drive?error=${encodeURIComponent(
          err?.message || "server_error"
        )}`,
        origin
      )
    );
  }
}

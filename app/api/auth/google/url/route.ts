import { NextRequest, NextResponse } from "next/server";
import { verifySmhToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
  const smhToken = request.cookies.get("smh_token")?.value;
  const userIdCookie = request.cookies.get("user_id")?.value;
  const userRoleCookie = request.cookies.get("user_role")?.value;

  let userId = userIdCookie || "";
  let role = userRoleCookie ? decodeURIComponent(userRoleCookie) : "";

  if (smhToken) {
    const verified = await verifySmhToken(smhToken);
    if (verified.valid && verified.payload) {
      userId = verified.payload.userId;
      role = verified.payload.role;
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${request.nextUrl.origin}/api/auth/google/callback`;

  const isConfigured = !!clientId && !!clientSecret;

  if (!isConfigured) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message:
          "Google OAuth chưa được cấu hình. Quản trị viên vui lòng thêm GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET vào file .env",
      },
      { status: 200 }
    );
  }

  // Scopes yêu cầu: Google Drive File & Thông tin người dùng (Email, Profile)
  const scopes = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];

  const state = JSON.stringify({
    userId,
    role,
    ts: Date.now(),
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", Buffer.from(state).toString("base64url"));

  return NextResponse.json({
    success: true,
    configured: true,
    url: authUrl.toString(),
  });
}

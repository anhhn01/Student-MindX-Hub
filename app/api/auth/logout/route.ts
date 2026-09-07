import { NextResponse } from "next/server";

const AUTH_COOKIES = [
  "smh_token",
  "id_token",
  "refresh_token",
  "user_id",
  "user_name",
  "user_role",
  "user_permissions",
];

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Đã đăng xuất" });

  for (const cookieName of AUTH_COOKIES) {
    res.cookies.delete(cookieName);
    res.cookies.set(cookieName, "", {
      maxAge: 0,
      path: "/",
      expires: new Date(0),
    });
  }

  return res;
}

export async function GET() {
  return POST();
}

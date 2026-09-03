import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Đã đăng xuất" });

  res.cookies.delete("id_token");
  res.cookies.delete("refresh_token");
  res.cookies.delete("user_name");

  return res;
}

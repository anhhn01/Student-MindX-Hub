import { NextResponse } from "next/server";
import { fetchOfficialCentresList } from "@/lib/services/lms-service";
import { OFFICIAL_LMS_CENTRES } from "@/lib/constants/centres";

export async function GET() {
  try {
    const centres = await fetchOfficialCentresList();
    return NextResponse.json({
      success: true,
      centres: centres && centres.length > 0 ? centres : OFFICIAL_LMS_CENTRES,
    });
  } catch (err: any) {
    console.error("Lỗi lấy danh mục cơ sở:", err);
    return NextResponse.json({
      success: true,
      centres: OFFICIAL_LMS_CENTRES,
    });
  }
}

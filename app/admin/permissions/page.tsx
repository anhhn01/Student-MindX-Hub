import { redirect } from "next/navigation";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function LegacyAdminPermissionsRedirect() {
  redirect(API_ROUTES.ADMIN.PERMISSIONS_SCREEN);
}

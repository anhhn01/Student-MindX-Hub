import { redirect } from "next/navigation";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function LegacyAdminUsersRedirect() {
  redirect(API_ROUTES.ADMIN.USERS_SCREEN);
}

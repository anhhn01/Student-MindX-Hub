"use client";

import { useRouter } from "next/navigation";
import { API_ROUTES } from "@/lib/constants/api-routes";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(API_ROUTES.AUTH.LOGOUT, { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    
    // Clear cookies on client side
    document.cookie = "id_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    router.push("/");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
    >
      Đăng xuất
    </button>
  );
}
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
    
    // Clear all cookies on client side
    const clientCookies = [
      "user_id",
      "user_name",
      "user_role",
      "user_permissions",
      "id_token",
      "refresh_token",
      "smh_token",
    ];
    clientCookies.forEach((c) => {
      document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });

    window.location.href = "/";
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
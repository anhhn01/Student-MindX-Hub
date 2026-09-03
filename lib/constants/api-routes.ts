export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
  },
  ADMIN: {
    USERS: "/api/admin/users",
    USER_DETAIL: (userId: string) => `/api/admin/users/${userId}`,
    USER_STATUS: (userId: string) => `/api/admin/users/${userId}/status`,
    USER_ROLE: (userId: string) => `/api/admin/users/${userId}/role`,
    CHECK_LMS: "/api/admin/users/check-lms",
    PERMISSIONS: "/api/admin/permissions",
    PERMISSIONS_SCREEN: "/admin/permissions",
    USERS_SCREEN: "/admin/users",
    DASHBOARD: "/admin/dashboard",
  },
  TEACHER_FULLTIME: {
    DASHBOARD: "/teacher-fulltime/dashboard",
  },
  TEACHER_PARTTIME: {
    DASHBOARD: "/teacher-parttime/dashboard",
  },
  USER: {
    PROFILE: "/profile",
    API_PROFILE: "/api/profile",
  },
  DASHBOARD_STATS: "/api/dashboard/stats",
} as const;

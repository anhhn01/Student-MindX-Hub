export interface RoleHierarchyItem {
  name: string;
  points: number; // Điểm càng thấp, role càng cao (1 là cao nhất)
  description: string;
  badgeColor: string;
}

export const ROLE_HIERARCHY: Record<string, RoleHierarchyItem> = {
  ADMIN: {
    name: "Admin",
    points: 1, // Cao nhất
    description: "Quản trị viên toàn quyền hệ thống (Duy nhất 1 tài khoản)",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  TEACHER_FULLTIME: {
    name: "Teacher Full-time",
    points: 2,
    description: "Giáo viên cơ hữu",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  TEACHER_PARTTIME: {
    name: "Teacher Part-time",
    points: 3, // Thấp nhất
    description: "Giáo viên bán thời gian / đối tác",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
} as const;

export const LOWEST_ROLE_NAME = "Teacher Part-time";

/**
 * Trả về số điểm của role (điểm càng thấp, role càng cao)
 */
export function getRolePoints(roleName?: string | null): number {
  if (!roleName) return 3;
  const lower = roleName.toLowerCase();
  if (lower.includes("admin")) return 1;
  if (lower.includes("full-time") || lower.includes("fulltime")) return 2;
  return 3;
}

/**
 * So sánh 2 role: trả về true nếu roleA có quyền cao hơn roleB (điểm roleA < điểm roleB)
 */
export function isRoleHigher(roleA: string, roleB: string): boolean {
  return getRolePoints(roleA) < getRolePoints(roleB);
}

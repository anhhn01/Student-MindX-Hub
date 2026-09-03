import { supabase } from "./client";
import bcrypt from "bcryptjs";

// Role enum values
export const ROLES = {
  ADMIN: "admin",
  TEACHER: "teacher",
} as const;

export type Role = typeof ROLES.ADMIN | typeof ROLES.TEACHER;

// User status enum values
export const USER_STATUS = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
} as const;

export type UserStatus = 
  | typeof USER_STATUS.APPROVED
  | typeof USER_STATUS.PENDING
  | typeof USER_STATUS.REJECTED;

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Compare password with hash
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Check if user exists in Supabase and is approved
export async function checkUserInSupabase(
  identifier: string,
  password: string
): Promise<{
  exists: boolean;
  isApproved: boolean;
  isPending: boolean;
  userId?: string;
  user?: {
    id: string;
    email: string;
    lms_code: string;
    role: Role;
    status: UserStatus;
  };
}> {
  try {
    // Query by lms_code or email
    const { data, error } = await supabase
      .from("users")
      .select("id, email, lms_code, password_hash, role_id, status_id")
      .eq("lms_code", identifier)
      .or(`email.eq.${identifier}`)
      .single();

    if (error || !data) {
      return { exists: false, isApproved: false, isPending: false };
    }

    const isPasswordValid = await verifyPassword(password, data.password_hash);

    if (!isPasswordValid) {
      return { exists: true, isApproved: false, isPending: false };
    }

    // Map role_id and status_id to names
    const role = data.role_id;
    const status = data.status_id;

    return {
      exists: true,
      isApproved: status === USER_STATUS.APPROVED,
      isPending: status === USER_STATUS.PENDING,
      userId: data.id,
      user: {
        id: data.id,
        email: data.email,
        lms_code: data.lms_code,
        role: role as Role,
        status: status as UserStatus,
      },
    };
  } catch (error) {
    console.error("Error checking user in Supabase:", error);
    return { exists: false, isApproved: false, isPending: false };
  }
}

// Get user role by ID
export async function getUserRole(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role_id;
}

// Get user status by ID
export async function getUserStatus(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("status_id")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.status_id;
}
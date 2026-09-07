import { SignJWT, jwtVerify } from "jose";

// Secret key từ biến môi trường (duy nhất trong .env)
const JWT_SECRET_STRING = process.env.JWT_SECRET || "student-mindx-hub";
const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SmhJwtPayload {
  userId: string;
  lmsCode: string;
  name: string;
  role: string;
  status: string;
  email?: string;
  expiryDays: number;
}

/**
 * Ký JWT token định danh SMH cho phiên đăng nhập (Hỗ trợ Node.js & Edge Runtime)
 */
export async function signSmhToken(
  payload: Omit<SmhJwtPayload, "expiryDays">,
  expiryDays: number = 30
): Promise<{ token: string; expiryDays: number; maxAgeSeconds: number }> {
  // Thời hạn token mặc định 30 ngày (tối đa 30 ngày)
  const safeDays = Math.min(30, Math.max(1, Math.round(expiryDays || 30)));

  const fullPayload: SmhJwtPayload = {
    ...payload,
    expiryDays: safeDays,
  };

  const token = await new SignJWT(fullPayload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${safeDays}d`)
    .sign(JWT_SECRET_BYTES);

  const maxAgeSeconds = safeDays * 24 * 60 * 60;

  return {
    token,
    expiryDays: safeDays,
    maxAgeSeconds,
  };
}

/**
 * Kiểm tra và giải mã JWT token SMH (Hoạt động hoàn hảo trong Middleware Edge Runtime)
 */
export async function verifySmhToken(
  token: string
): Promise<{ valid: boolean; payload: SmhJwtPayload | null; expired: boolean }> {
  if (!token) {
    return { valid: false, payload: null, expired: false };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES);
    return {
      valid: true,
      payload: payload as unknown as SmhJwtPayload,
      expired: false,
    };
  } catch (err: any) {
    const isExpired = err?.code === "ERR_JWT_EXPIRED" || err?.name === "JWTExpired";
    return {
      valid: false,
      payload: null,
      expired: isExpired,
    };
  }
}

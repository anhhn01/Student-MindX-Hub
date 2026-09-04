import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { CentreItem, OFFICIAL_LMS_CENTRES } from "@/lib/constants/centres";
import { fetchTeacherCentresFromLms } from "@/lib/services/lms-service";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA_FILE = path.join(process.cwd(), "data", "user_centres_store.json");

// Đọc bộ nhớ lưu trữ file bền vững
function readStore(): Record<string, CentreItem[]> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf8");
      return JSON.parse(content) || {};
    }
  } catch (err) {
    console.warn("Lỗi đọc file user_centres_store.json:", err);
  }
  return {};
}

// Ghi bộ nhớ lưu trữ file bền vững
function writeStore(store: Record<string, CentreItem[]>) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.warn("Lỗi ghi file user_centres_store.json:", err);
  }
}

export async function getUserCentres(userId: string): Promise<CentreItem[]> {
  if (!userId) return [];

  // 1. Thử lấy trực tiếp từ database Supabase (bảng user_centres)
  try {
    const { data, error } = await supabase
      .from("user_centres")
      .select("centre_id, centre_name, centre_short_name, centre_code")
      .eq("user_id", userId);

    if (!error && data && data.length > 0) {
      const dbCentres: CentreItem[] = data.map((row: any) => ({
        id: row.centre_id,
        name: row.centre_name,
        shortName: row.centre_short_name || undefined,
        code: row.centre_code || undefined,
      }));
      // Lưu vào store
      const store = readStore();
      store[userId] = dbCentres;
      writeStore(store);
      return dbCentres;
    }
  } catch (err) {
    // Supabase table chưa tồn tại hoặc lỗi kết nối, chuyển sang đọc file store
  }

  // 2. Tra cứu từ file bền vững
  const store = readStore();
  if (store[userId] && store[userId].length > 0) {
    return store[userId];
  }

  // 3. Nếu vẫn rỗng, tra cứu thông tin user từ Supabase (theo id hoặc lms_code)
  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("id, lms_code, full_name")
      .or(`id.eq.${userId},lms_code.eq.${userId}`)
      .maybeSingle();

    if (userRow) {
      // Thử đọc lại store với id hoặc lms_code của userRow
      if (store[userRow.id] && store[userRow.id].length > 0) {
        return store[userRow.id];
      }
      if (userRow.lms_code && store[userRow.lms_code] && store[userRow.lms_code].length > 0) {
        return store[userRow.lms_code];
      }

      // Tự động đồng bộ từ LMS
      const synced = await syncLmsCentresForUser(
        userRow.id,
        userRow.lms_code || "",
        userRow.full_name || ""
      );
      if (synced && synced.length > 0) {
        return synced;
      }
    }
  } catch (syncErr) {
    console.warn("Lỗi auto-sync user centres:", syncErr);
  }

  return [];
}

export async function updateUserCentres(
  userId: string,
  centres: CentreItem[]
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: "Thiếu ID người dùng" };
  }

  // 1. Lưu vào file bền vững
  const store = readStore();
  store[userId] = centres;

  // Lấy thêm lms_code nếu có để đồng bộ 2 chiều
  try {
    const { data: userRow } = await supabase
      .from("users")
      .select("id, lms_code")
      .or(`id.eq.${userId},lms_code.eq.${userId}`)
      .maybeSingle();

    if (userRow) {
      store[userRow.id] = centres;
      if (userRow.lms_code) {
        store[userRow.lms_code] = centres;
      }
    }
  } catch (_) {}

  writeStore(store);

  // 2. Thử lưu vào Supabase table user_centres nếu bảng đã được tạo
  try {
    await supabase.from("user_centres").delete().eq("user_id", userId);

    if (centres.length > 0) {
      const rows = centres.map((c) => ({
        user_id: userId,
        centre_id: c.id,
        centre_name: c.name,
        centre_short_name: c.shortName || null,
        centre_code: c.code || null,
      }));

      await supabase.from("user_centres").insert(rows);
    }
  } catch (err: any) {
    // Không làm gián đoạn nếu bảng DB chưa sẵn sàng vì đã lưu vào file bền vững
  }

  return { success: true };
}

// Đồng bộ cơ sở từ LMS sang Supabase khi tạo tài khoản LMS hoặc đăng nhập
export async function syncLmsCentresForUser(
  userId: string,
  lmsCode: string,
  fullName?: string,
  token?: string,
  knownCentres?: CentreItem[]
): Promise<CentreItem[]> {
  if (!userId) return [];

  // Nếu đã truyền sẵn knownCentres từ lệnh getOwnCentres
  if (knownCentres && knownCentres.length > 0) {
    await updateUserCentres(userId, knownCentres);
    return knownCentres;
  }

  // Tra cứu từ GraphQL LMS
  const lmsCentres = await fetchTeacherCentresFromLms(lmsCode, fullName, token);
  if (lmsCentres.length > 0) {
    await updateUserCentres(userId, lmsCentres);
    return lmsCentres;
  }

  return [];
}

-- Create user_statuses table
CREATE TABLE IF NOT EXISTS user_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default statuses
INSERT INTO user_statuses (code, display_name)
VALUES 
  ('approved', 'Đã phê duyệt'),
  ('pending', 'Chờ phê duyệt'),
  ('rejected', 'Từ chối')
ON CONFLICT (code) DO NOTHING;

-- Create or update users table to use status_id
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lms_code TEXT UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  status_id UUID REFERENCES user_statuses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_lms_code ON users(lms_code);
CREATE INDEX IF NOT EXISTS idx_users_status_id ON users(status_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statuses ENABLE ROW LEVEL SECURITY;

-- Allow public read access to user_statuses
CREATE POLICY "Allow public read access to user_statuses"
ON user_statuses FOR SELECT
USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_updated_at();

-- Insert default admin user (baotc) with approved status
DO $$
DECLARE
  approved_status_id UUID;
BEGIN
  SELECT id INTO approved_status_id FROM user_statuses WHERE code = 'approved';

  IF approved_status_id IS NOT NULL THEN
    INSERT INTO users (lms_code, email, password_hash, full_name, status_id)
    VALUES (
      'baotc',
      'baotc@mindx.com.vn',
      '$2a$10$YourHashedPasswordHere', -- bcrypt hash
      'Bảo TC',
      approved_status_id
    )
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;

-- Create permissions enum
CREATE TYPE IF NOT EXISTS permission_status AS ENUM ('approved', 'pending', 'rejected');

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lms_code TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  permission permission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_lms_code ON users(lms_code);
CREATE INDEX IF NOT EXISTS idx_users_permission ON users(permission);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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

-- Insert default admin user (fallback account)
-- Password: MindX@2024
-- LMS Code: baotc
-- Email: baotc@mindx.com.vn
-- Permission: approved
-- Note: password_hash needs to be generated using bcrypt
-- You can generate it using: bcrypt.hashSync('MindX@2024', 10)
INSERT INTO users (lms_code, email, password_hash, permission)
VALUES (
  'baotc',
  'baotc@mindx.com.vn',
  '$2a$10$EXAMPLEBCRYPTHASHMINDX2024', -- Replace with actual bcrypt hash
  'approved'
)
ON CONFLICT (email) DO NOTHING;
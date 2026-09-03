-- Migration: Add is_firebase column to users table to distinguish Firebase vs Local accounts

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_firebase BOOLEAN NOT NULL DEFAULT false;

-- Create index for is_firebase for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_is_firebase ON users(is_firebase);

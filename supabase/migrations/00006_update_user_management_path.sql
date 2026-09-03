-- Migration 00006: Update user_management path to /admin/users
UPDATE menus 
SET path = '/admin/users' 
WHERE code = 'user_management';

# SMH Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" or "Create a new project"
3. Fill in project details:
   - Name: `smh`
   - Database Password: (create a strong password)
   - Region: (choose closest to you)
4. Wait for project to be created

## 2. Get Credentials

After project is created, go to:
- **Project URL**: Settings > Project > Project URL
- ** anon key**: Settings > API > Project API keys > anon public key
- **Service role key**: Settings > API > Project API keys > service role private key

## 3. Setup Database

Copy and run the SQL migration in the Supabase SQL Editor:

1. Go to SQL Editor in Supabase dashboard
2. Copy content from `migrations/00001_create_users_table.sql`
3. Paste and run

## 4. Configure .env

Update your `.env` file with the credentials:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## 5. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

## 6. Generate Password Hash for Fallback User

Run this in Node.js to generate bcrypt hash:

```js
const bcrypt = require('bcrypt');
const hash = bcrypt.hashSync('MindX@2024', 10);
console.log(hash);
```

Replace the placeholder in the migration file with the generated hash.
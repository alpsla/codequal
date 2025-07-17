# User Profiles Table Missing - Fix Guide

## Problem Summary

Supabase reported the following error during authentication:
```
"relation \"user_profiles\" does not exist"
```

This occurs when the `ensure_user_profile` trigger function tries to access the `user_profiles` table, but the table either:
1. Doesn't exist in the database
2. Exists in a different schema
3. Has permissions issues
4. Was created but later dropped

## Root Cause Analysis

Based on Supabase's response, the issue is that:
- A trigger on `auth.users` table calls the `ensure_user_profile` function
- This function references the `user_profiles` table
- The table cannot be found when the function executes

## Solution Steps

### 1. Run Diagnostic Script

First, run the diagnostic script to identify the specific issue:
```sql
-- Check if table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as table_exists;
```

### 2. Apply the Fix

Run the fix script (`/scripts/fix-user-profiles-table.sql`) which will:
1. Check if the table exists
2. Create it if missing
3. Ensure proper schema references
4. Recreate the trigger function with explicit schema
5. Create profiles for existing users

### 3. Verify the Fix

After applying the fix, test authentication:
```javascript
// Test magic link authentication
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'test@example.com'
});
```

## Prevention

To prevent this issue in the future:

1. **Always use explicit schema references** in functions:
   ```sql
   -- Good
   SELECT * FROM public.user_profiles WHERE user_id = NEW.id;
   
   -- Bad (relies on search_path)
   SELECT * FROM user_profiles WHERE user_id = NEW.id;
   ```

2. **Add error handling** to trigger functions:
   ```sql
   BEGIN
       -- Your logic here
   EXCEPTION
       WHEN OTHERS THEN
           RAISE WARNING 'Error in trigger: %', SQLERRM;
           RETURN NEW; -- Don't fail the main operation
   END;
   ```

3. **Monitor migrations** to ensure they run successfully in all environments

## Related Issues

- Authentication workaround guide: `/docs/api/auth-workaround-guide.md`
- Original migration: `/packages/database/migrations/20250106_fix_profile_creation_safe.sql`

## Quick Fix Command

If you need a quick fix, run this in Supabase SQL editor:
```sql
-- Create table if missing
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create profiles for existing users
INSERT INTO public.user_profiles (user_id, email, created_at, updated_at)
SELECT u.id, u.email, u.created_at, NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
);
```
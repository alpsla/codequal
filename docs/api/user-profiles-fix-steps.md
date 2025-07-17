# Step-by-Step Guide to Fix User Profiles Table Issue

## Quick Fix (5 minutes)

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Run the Immediate Fix Script**
   - Copy the entire contents of `/scripts/immediate-user-profiles-fix.sql`
   - Paste into SQL Editor
   - Click "Run"
   - You should see success messages indicating the table and profiles were created

3. **Verify the Fix**
   - Try logging in with magic link again
   - Check the Authentication logs in Supabase dashboard
   - The "Database error granting user" should be resolved

## Detailed Investigation (if Quick Fix doesn't work)

### Step 1: Run Diagnostics

Run each section of `/scripts/diagnose-user-profiles-issue.sql` separately:

```sql
-- Check if table exists
SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as table_exists;
```

If this returns `false`, the table doesn't exist and needs to be created.

### Step 2: Check Function Definition

```sql
-- Check the function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'ensure_user_profile';
```

Look for any references to `user_profiles` without the `public.` schema prefix.

### Step 3: Apply Manual Fixes

If the quick fix didn't work, try these manual steps:

1. **Create the table manually**:
```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

2. **Create a simple trigger function**:
```sql
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW; -- Don't fail auth
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

3. **Create the trigger**:
```sql
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_user_profile();
```

### Step 4: Test the Fix

Run the test script:
```bash
cd apps/api
npx tsx src/test-scripts/test-user-profiles-fix.ts
```

## Common Issues and Solutions

### Issue: "permission denied for schema public"
**Solution**: Run this first:
```sql
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;
```

### Issue: "relation already exists"
**Solution**: The table exists but might be in wrong schema:
```sql
-- Check all schemas
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'user_profiles';
```

### Issue: Function keeps failing
**Solution**: Add more error handling:
```sql
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple insert, ignore all errors
    BEGIN
        INSERT INTO public.user_profiles (user_id, email)
        VALUES (NEW.id, NEW.email);
    EXCEPTION
        WHEN OTHERS THEN
            NULL; -- Ignore all errors
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Verification Checklist

- [ ] Table exists in public schema
- [ ] Function uses explicit `public.` prefix
- [ ] Trigger is active on auth.users
- [ ] Permissions are granted to authenticated and service_role
- [ ] Test user can sign up/sign in without errors
- [ ] Profile is created automatically after sign up

## Long-term Solution

1. **Update all migrations** to use explicit schema references
2. **Add monitoring** for failed profile creations
3. **Implement fallback** in application code (already done in ensure-profile middleware)
4. **Regular health checks** to verify table and trigger status

## Emergency Workaround

If nothing else works, disable the trigger and rely on application-level profile creation:

```sql
-- Disable the trigger
ALTER TABLE auth.users DISABLE TRIGGER ensure_profile_on_user_change;

-- The application middleware will handle profile creation
```

The `/apps/api/src/middleware/ensure-profile.ts` middleware will create profiles on-demand.
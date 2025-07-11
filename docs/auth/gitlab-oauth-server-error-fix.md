# GitLab OAuth Server Error Fix

## Problem
GitLab OAuth fails with `server_error` when Supabase tries to redirect back to the application after successful GitLab authentication.

## Root Causes & Solutions

### 1. Check Supabase URL Configuration

The most common cause is misconfigured URLs in Supabase Dashboard.

**In Supabase Dashboard → Authentication → URL Configuration:**

```
Site URL: http://localhost:3000
Redirect URLs: 
- http://localhost:3000/auth/callback
- http://localhost:3000/api/auth/callback
- http://localhost:3000/**
```

### 2. Fix the Callback Handler

The current callback handler is expecting OAuth code exchange, but Supabase handles this internally. Update the callback to properly handle Supabase's response:

```typescript
// apps/web/src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the error from URL if any
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          router.push(`/login?error=${error}&description=${encodeURIComponent(errorDescription || '')}`);
          return;
        }

        // Check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/login?error=session_error');
          return;
        }

        if (session) {
          // Successfully authenticated
          router.push('/dashboard');
        } else {
          // No session found
          router.push('/login?error=no_session');
        }
      } catch (err) {
        console.error('Callback error:', err);
        router.push('/login?error=callback_failed');
      }
    };

    handleCallback();
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Completing authentication...
        </h2>
        <p className="text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  );
}
```

### 3. Verify GitLab OAuth App Configuration

In GitLab (Settings → Applications), ensure:

1. **Redirect URI** is exactly: `https://ftjhmbbcuqjqmmbaymqb.supabase.co/auth/v1/callback`
2. **Scopes**: At minimum `read_user` and `email`
3. **Application is Active**: Not expired or revoked

### 4. Check Supabase GitLab Provider Settings

In Supabase Dashboard → Authentication → Providers → GitLab:

1. **Enabled**: Toggle is ON
2. **Client ID**: `7f7e8d78a21d74b1807091e7256838e3d4218623490043eab60625fa25cb2ca8`
3. **Client Secret**: Starts with `gloas-`
4. **GitLab URL**: Leave empty for gitlab.com
5. **Skip nonce checks**: Try enabling this if the error persists

### 5. Debug the Actual Error

Add this temporary debug code to see the actual error:

```typescript
// In your login component where you trigger GitLab OAuth
const handleGitLabLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'gitlab',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
  
  if (error) {
    console.error('GitLab OAuth error:', error);
  }
};
```

### 6. Common Server Error Causes

1. **Token Size**: GitLab tokens might be too large. Try adding to Supabase env vars:
   ```
   GOTRUE_JWT_MAX_AGE=3600
   ```

2. **Callback URL Protocol**: Ensure you're not mixing http/https
   - Local dev: Use http://localhost:3000
   - Production: Use https://yourdomain.com

3. **Cookie Issues**: Clear all cookies for localhost and Supabase domain

### 7. Alternative: Direct Supabase Client Usage

If the server error persists, try using the Supabase client directly:

```typescript
// Install if not already installed
// npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// In your GitLab login handler
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'gitlab',
  options: {
    redirectTo: 'http://localhost:3000/auth/callback'
  }
});
```

### 8. Verify with Supabase Logs

Check the actual error in Supabase:

```sql
-- Run in SQL Editor
SELECT 
    created_at,
    raw_request->'headers'->>'user-agent' as user_agent,
    raw_request->'url' as url,
    raw_response->'status' as status,
    raw_response->'body' as response_body,
    CASE 
        WHEN raw_response->'body'->>'error' IS NOT NULL 
        THEN raw_response->'body'->>'error' 
        ELSE 'No error' 
    END as error_message
FROM auth.audit_log_entries
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND (raw_request->>'url' LIKE '%gitlab%' 
       OR raw_response->'body'->>'error' IS NOT NULL)
ORDER BY created_at DESC
LIMIT 10;
```

## Quick Fix Checklist

- [ ] Site URL in Supabase is `http://localhost:3000`
- [ ] Redirect URLs include `/auth/callback`
- [ ] GitLab OAuth app redirect URI is exactly Supabase's callback URL
- [ ] Client ID and Secret match in both GitLab and Supabase
- [ ] No trailing spaces in credentials
- [ ] Cookies cleared
- [ ] Using the correct protocol (http for local, https for production)

## If All Else Fails

1. Create a new GitLab OAuth application
2. Update Supabase with new credentials
3. Wait 2-3 minutes for propagation
4. Test in incognito/private browsing mode

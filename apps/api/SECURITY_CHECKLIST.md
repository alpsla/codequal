# CodeQual Security Checklist

## Email Verification Issue - FIXED ✅

### Problem
Users could subscribe to paid plans without verifying their email addresses.

### Solution Implemented
1. Created `requireEmailVerification` middleware that checks if user's email is confirmed
2. Added middleware to all billing endpoints:
   - `POST /api/v1/billing/create-checkout` ✅
   - `POST /api/v1/billing/create-setup-intent` ✅
   - `POST /api/v1/billing/confirm-payment-method` ✅
   - `POST /api/v1/billing/charge-scan` ✅

### Required Database Changes
Run this SQL in Supabase:
```sql
-- Function to check if a user's email is verified
CREATE OR REPLACE FUNCTION public.check_user_email_verified(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE id = user_id 
    AND email_confirmed_at IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_user_email_verified(UUID) TO authenticated;
```

### Testing
1. **Automated Test**: Run `npx ts-node src/test-scripts/test-email-verification.ts`
2. **Manual Test**:
   - Create new account without verifying email
   - Try to subscribe → Should see "Email verification required"
   - Verify email
   - Try to subscribe → Should work

## Other Security Considerations

### 1. API Key Security ✅
- API keys are hashed before storage
- Keys shown only once during creation
- Rate limiting applied per key

### 2. SQL Injection Protection ✅
- Using parameterized queries via Supabase
- Input validation on all endpoints

### 3. XSS Protection ✅
- HTML sanitization in report generation
- Content-Type headers properly set

### 4. Authentication & Authorization ✅
- JWT tokens with expiration
- Role-based access control
- Repository access checks

### 5. Rate Limiting ✅
- Global rate limiting: 100 requests/minute
- Per-user rate limiting based on plan
- API key specific limits

### 6. Sensitive Data Protection
- [ ] Ensure no secrets in logs
- [ ] Stripe webhook signature verification
- [ ] Environment variables for all secrets

### 7. CORS Configuration
- [ ] Whitelist only allowed origins
- [ ] Proper preflight handling

### 8. Input Validation
- [x] Repository URL validation
- [x] File size limits
- [x] Request body size limits

### 9. Error Handling
- [x] Generic error messages to users
- [x] Detailed logs for debugging
- [x] No stack traces in production

### 10. Monitoring & Alerts
- [ ] Set up alerts for:
  - Failed payment attempts
  - Multiple failed login attempts
  - Unusual API usage patterns
  - Email verification bypass attempts

## Deployment Checklist

Before deploying to production:

1. **Database**:
   - [ ] Run email verification function SQL
   - [ ] Verify RLS policies are enabled
   - [ ] Check indexes on frequently queried columns

2. **Environment Variables**:
   - [ ] All Stripe keys set correctly
   - [ ] Supabase service role key secured
   - [ ] Frontend URLs configured

3. **Code**:
   - [ ] Email verification middleware applied
   - [ ] All console.logs removed/wrapped
   - [ ] Error messages sanitized

4. **Testing**:
   - [ ] Run full test suite
   - [ ] Manual security testing
   - [ ] Load testing for rate limits

5. **Monitoring**:
   - [ ] Error tracking enabled (Sentry/etc)
   - [ ] Performance monitoring
   - [ ] Security alerts configured

## Incident Response Plan

If security issue detected:

1. **Immediate Actions**:
   - Disable affected endpoints
   - Revoke compromised API keys
   - Alert affected users

2. **Investigation**:
   - Check logs for extent of issue
   - Identify root cause
   - Document timeline

3. **Remediation**:
   - Fix vulnerability
   - Deploy patch
   - Verify fix works

4. **Post-Incident**:
   - User communication
   - Security audit
   - Update procedures

## Regular Security Tasks

- **Weekly**: Review error logs for security issues
- **Monthly**: Audit user permissions and API keys
- **Quarterly**: Full security assessment
- **Annually**: Penetration testing

## Contact for Security Issues

Security issues should be reported to: security@codequal.dev

Response time:
- Critical: < 4 hours
- High: < 24 hours
- Medium: < 72 hours
- Low: < 1 week
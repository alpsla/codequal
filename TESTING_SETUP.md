# Testing Setup Guide

## 1. Database Setup

### Apply Migrations
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the content from `packages/database/migrations/combined-billing-migrations.sql`
4. Run the SQL in the editor

Or run each migration file individually in order:
- `20250108_billing_tables.sql`
- `20250108_trial_tracking.sql`
- `20250108_error_logging.sql`

## 2. Environment Variables

### API (.env)
```env
# Add these to your existing .env file
STRIPE_SECRET_KEY=sk_test_... # Get from Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_... # Get after setting up webhook
STRIPE_INDIVIDUAL_PRICE_ID=price_... # Create in Stripe
STRIPE_TEAM_PRICE_ID=price_... # Create in Stripe
FRONTEND_URL=http://localhost:3000
```

### Web App (.env.local)
```env
# Already should have these
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 3. Start Services

### Terminal 1 - API
```bash
cd apps/api
npm run dev
```

### Terminal 2 - Web
```bash
cd apps/web
npm run dev
```

## 4. Testing Flow

### Authentication
1. Visit http://localhost:3000
2. You should be redirected to /login
3. Login with GitHub/GitLab

### Trial System
1. Go to http://localhost:3000/scan
2. Enter a repository URL (e.g., https://github.com/facebook/react)
3. Click "Scan Repository"
4. You should see:
   - Trial status showing 9 scans remaining
   - The repository is now locked as your trial repository
5. Try scanning a different repository - it should be blocked

### PR Analysis
1. Go to http://localhost:3000/pr-analysis
2. Use one of the example PRs provided
3. Should enforce same trial restrictions

### Subscription
1. Visit http://localhost:3000/subscribe
2. View pricing plans
3. Click "Subscribe" (requires Stripe setup)

## 5. Monitoring

### Check Database
```sql
-- Check user billing status
SELECT * FROM user_billing WHERE user_id = 'your-user-id';

-- Check trial usage
SELECT * FROM trial_usage WHERE user_id = 'your-user-id';

-- Check trial repository
SELECT * FROM user_trial_repository WHERE user_id = 'your-user-id';

-- Check error logs
SELECT * FROM error_logs ORDER BY created_at DESC LIMIT 10;
```

### Common Issues

1. **"Failed to fetch" error**
   - Check API is running on port 8080
   - Check CORS settings
   - Verify Supabase credentials

2. **Trial not enforcing**
   - Ensure migrations were run
   - Check user has billing record
   - Verify middleware is applied to routes

3. **Stripe errors**
   - Verify Stripe keys are set
   - Ensure webhook secret is correct
   - Check Stripe dashboard for errors

## 6. Reset Trial (Testing)

To reset a user's trial for testing:
```sql
UPDATE user_billing 
SET trial_scans_used = 0 
WHERE user_id = 'your-user-id';

DELETE FROM user_trial_repository 
WHERE user_id = 'your-user-id';

DELETE FROM trial_usage 
WHERE user_id = 'your-user-id';
```
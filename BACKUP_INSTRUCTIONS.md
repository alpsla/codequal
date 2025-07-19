# Database Backup Instructions

## Quick Steps

Run these commands in your terminal:

```bash
# 1. Login to Supabase (this will open a browser)
supabase login

# 2. Run the backup script
cd "/Users/alpinro/Code Prjects/codequal"
./scripts/backup-database.sh
```

## Alternative: Manual Backup Command

If the script doesn't work, you can run the backup directly:

```bash
# Create backup directory
mkdir -p database-backups

# Run backup
supabase db dump --project-ref ftjhmbbcuqjqmmbaymqb -f database-backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql
```

## What Happens During Backup

1. The Supabase CLI connects to your project
2. Creates a complete SQL dump of all tables, data, and schema
3. Saves it to a timestamped file in `database-backups/`
4. The backup includes:
   - All table structures
   - All data
   - Indexes
   - Constraints
   - RLS policies
   - Functions and procedures

## Estimated Time

- For a typical database: 1-3 minutes
- Larger databases: 5-10 minutes

## After Backup Completes

You'll see:
- ✅ Backup completed successfully!
- File location and size
- A restore script for emergencies

Then you can safely proceed with applying the database fixes!

## If Login Fails

You might need to:
1. Update Supabase CLI: `brew upgrade supabase`
2. Or get an access token from: https://supabase.com/dashboard/account/tokens

## Need Help?

If you encounter issues:
1. Check your internet connection
2. Verify your project reference is correct
3. Ensure you have admin access to the project
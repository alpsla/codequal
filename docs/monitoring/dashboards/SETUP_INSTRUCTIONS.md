# Grafana Dashboard Setup Instructions

## Prerequisites

1. **Supabase Database Setup**
   - You need to create the `agent_activity` table first
   - This table stores all agent operations for monitoring

## Step 1: Create the Database Table

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy and paste the entire contents of:
   ```
   /packages/agents/src/migrations/create-agent-activity-table.sql
   ```
5. Click **Run** to execute the SQL
6. You should see "Success" message

## Step 2: Verify Metrics Collection

After creating the table, verify it's working:

```bash
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
npm run metrics:check
```

You should see:
- ✅ Connected to Supabase successfully
- If no data yet: "⚠️ No agent activity found in the database"
- Instructions on how to generate metrics

## Step 3: Generate Test Metrics (Optional)

If you want to see data in your dashboard immediately:

```bash
# Run a test analysis with tracking enabled
cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
USE_DEEPWIKI_MOCK=false npm run analyze -- --repo https://github.com/sindresorhus/ky --pr 700
```

This will create real tracking data in the database.

## Step 4: Import Grafana Dashboard

1. Open your Grafana instance
2. Navigate to **Dashboards → Import** (left sidebar)
3. Click **Upload JSON file**
4. Select the file:
   ```
   /packages/agents/grafana/codequal-performance-dashboard.json
   ```
5. On the import screen:
   - Select your **Supabase PostgreSQL** datasource
   - Click **Import**

## Step 5: Configure Grafana Data Source (if not already done)

If you haven't connected Grafana to Supabase yet:

1. In Grafana, go to **Configuration → Data Sources**
2. Click **Add data source**
3. Choose **PostgreSQL**
4. Configure with your Supabase connection details:
   ```
   Host: [Your Supabase Host]
   Database: postgres
   User: postgres
   Password: [Your Supabase Password]
   SSL Mode: require
   Port: 5432 (or 6543 for connection pooling)
   ```
5. Click **Save & Test**

You can find your connection details in Supabase:
- Go to Settings → Database
- Look for "Connection string" section

## Step 6: View Your Dashboard

1. Navigate to **Dashboards** in Grafana
2. You should see "CodeQual Performance Dashboard"
3. Open it to view:
   - Real-time metrics
   - Agent performance
   - Cost analysis
   - Success rates
   - Response times

## Step 7: Optimize Performance (Optional)

For better dashboard performance, run the optimization script in Supabase SQL Editor:

```sql
-- Copy contents from:
-- /packages/agents/grafana/optimize-supabase.sql
```

This creates indexes and materialized views for faster queries.

## Troubleshooting

### No Data Showing
1. Check metrics are being recorded:
   ```bash
   npm run metrics:check
   ```
2. Ensure `USE_DEEPWIKI_MOCK=false` when running analyses
3. Verify timestamps are in milliseconds

### Connection Issues
1. Verify Supabase credentials in `.env`
2. Check Grafana datasource test passes
3. Ensure RLS policies allow reading

### Slow Dashboard
1. Run the optimization SQL script
2. Reduce time range in Grafana
3. Check if indexes are being used

## CLI Monitoring Tools

Besides Grafana, you can use CLI tools:

```bash
# Summary metrics
npm run metrics:summary -- --time 1h

# Agent performance
npm run metrics:agents -- --time 6h

# Cost analysis
npm run metrics:costs -- --time 24h

# Live monitoring
npm run metrics:watch -- --interval 5
```

## Support

For issues, check:
- Grafana logs: Settings → Server Admin → Logs
- Supabase logs: Dashboard → Logs
- Agent logs: Check console output during analyses
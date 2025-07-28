# Quick Start Guide for Monitoring Dashboard Testing

## Prerequisites

### 1. Ensure API Server is Running

Check if the server is already running:
```bash
lsof -i :3001
```

If not running, start it:
```bash
cd apps/api
npm run dev
```

The API server should be accessible at: http://localhost:3001

### 2. Get JWT Token

We've created a helper script to get a JWT token:

```bash
node scripts/get-jwt-token.js
```

This will output a JWT token that looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Copy this entire token** - you'll need it for the dashboard.

## Testing the Monitoring Dashboard

### 1. Open DeepWiki Dashboard

Open the dashboard in your browser:
```bash
open file:///Users/alpinro/Code%20Prjects/codequal/testing/deepwiki-dashboard.html
```

Or manually navigate to:
- **File Path**: `/testing/deepwiki-dashboard.html`

### 2. Enter JWT Token

When the dashboard loads, it will prompt for a JWT token:
1. Paste the token you copied from the script
2. Click OK or press Enter
3. The dashboard will save the token in localStorage for future use

### 3. Verify Dashboard is Working

You should see:
- **Storage Usage**: Percentage and GB used/total
- **Active Analyses**: Count of running analyses
- **Available Space**: Remaining storage
- **System Status**: Health indicator

The dashboard auto-refreshes every 10 seconds.

## Testing API Endpoints Directly

With your JWT token, you can also test the API endpoints:

### Health Check (No Auth Required)
```bash
curl http://localhost:3001/api/monitoring/health
```

### Prometheus Metrics (No Auth Required)
```bash
curl http://localhost:3001/api/monitoring/metrics
```

### DeepWiki Metrics (Auth Required)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/metrics
```

Replace `YOUR_JWT_TOKEN` with the token from the script.

### Active Analyses (Auth Required)
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3001/api/deepwiki/temp/active-analyses
```

## Troubleshooting

### Token Issues
If the token doesn't work:
1. Clear browser localStorage: `localStorage.clear()`
2. Regenerate token: `node scripts/get-jwt-token.js`
3. Check server logs for auth errors

### Dashboard Not Loading
1. Verify server is running: `lsof -i :3001`
2. Check browser console for errors (F12)
3. Ensure you're using the correct file:// URL

### API Errors
1. Check if endpoints return 401 (auth issue) or 500 (server error)
2. View server logs: `cd apps/api && npm run dev`
3. Verify environment variables are set

## Alternative: Using the Web UI

If you prefer to get a real JWT token:

1. Start the web server (if not running):
   ```bash
   cd apps/web
   npm run dev
   ```

2. Open: http://localhost:3000

3. Login with your credentials

4. Get token from browser:
   - Open DevTools (F12)
   - Go to Application tab
   - Check Local Storage
   - Look for `jwt_token` or `access_token`

## Next Steps

Once the dashboard is working:
1. Test all monitoring features
2. Import Grafana dashboard for alerts
3. Configure alert thresholds
4. Set up notification channels

Happy monitoring! 🎯
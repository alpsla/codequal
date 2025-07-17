# How to Get Your Auth Token

## Option 1: From the Web App (Easiest)

1. Open your browser's Developer Tools (F12 or right-click → Inspect)
2. Go to the Network tab
3. Visit http://localhost:3000 (or wherever your web app is running)
4. Look for any API call to your backend
5. Click on it and check the Headers
6. Find the `Authorization` header - it will look like: `Bearer eyJhbGc...`
7. Copy everything after "Bearer "

## Option 2: From Browser's Local Storage

1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Look for Local Storage → your domain
4. Find a key like `auth_token` or `session_token`
5. Copy the value

## Option 3: Use the Mock Endpoint

Since we're testing, let's use the `/api/mock-pr-analysis/github-pr-analysis` endpoint instead, which might have less strict auth:

```bash
curl -X POST 'http://localhost:3001/api/mock-pr-analysis/github-pr-analysis' \
  -H 'Authorization: Bearer ANY_TOKEN_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }'
```

## Option 4: Get Token from Current Session

If you're logged in via the web app, check the browser console and run:
```javascript
// This might vary based on your app's implementation
localStorage.getItem('token') || 
localStorage.getItem('auth_token') || 
localStorage.getItem('session_token') ||
sessionStorage.getItem('token')
```

## For Testing the Monitoring

Once you have a valid token, run:

```bash
# Replace YOUR_VALID_TOKEN with the actual token
curl -X POST 'http://localhost:3001/api/github-pr-analysis' \
  -H 'Authorization: Bearer YOUR_VALID_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }'
```

Then watch the logs:
```bash
tail -f /tmp/api-server.log | grep -E "(ResultOrchestrator|DataFlowMonitor|Step completed|Starting)"
```
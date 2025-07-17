# Simple Testing Guide - With Authentication

## 1. Login First

Open your browser and go to:
```
http://localhost:3001/auth-test.html
```

Or get your auth token from the web app if you're already logged in.

## 2. Run PR Analysis

Replace `YOUR_AUTH_TOKEN` with your actual token:

```bash
curl -X POST 'http://localhost:3001/api/github-pr-analysis' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }'
```

## 3. Monitor the Analysis

### Watch Server Logs (Most Important)
```bash
tail -f /tmp/api-server.log | grep -E "(WARN|ERROR|INFO|Starting|Completed|Failed)"
```

### Get Active Sessions
```bash
curl 'http://localhost:3001/api/monitoring/sessions' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' | jq .
```

### View Session Details (replace SESSION_ID)
```bash
curl 'http://localhost:3001/api/monitoring/session/SESSION_ID' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' | jq .
```

### Open Visualization in Browser (replace SESSION_ID)
```
http://localhost:3001/api/monitoring/session/SESSION_ID/visualize
```
(You'll need to add auth header or be logged in)

## 4. What to Watch For in Logs

✅ **Successful Flow:**
- `[INFO] Starting GitHub PR analysis with ResultOrchestrator`
- `[INFO] Starting unified analysis tracking`
- `[INFO] ✅ Step completed: Extract PR Context`
- `[INFO] ✅ Step completed: Check Repository Status`
- `[INFO] ✅ Step completed: Retrieve MCP Tool Results`
- `[INFO] ✅ Step completed: Coordinate Multi-Agent Analysis`
- `[INFO] ✅ Step completed: Educational Agent Processing`
- `[INFO] ✅ Step completed: Reporter Agent Processing`

⚠️ **Common Issues:**
- `Repository not found in Vector DB` - Expected if repo hasn't been analyzed
- `No tool results found` - MCP tools haven't run
- `Agent timeout` - Agent took too long
- `Missing Vector chunks` - No DeepWiki data

## 5. Quick Test Script

Save this as `test-pr.sh`:

```bash
#!/bin/bash
TOKEN="YOUR_AUTH_TOKEN"
API_URL="http://localhost:3001"

echo "🚀 Starting PR Analysis..."
RESPONSE=$(curl -s -X POST "$API_URL/api/github-pr-analysis" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }')

echo "Response: $RESPONSE"

# Watch logs in another terminal:
# tail -f /tmp/api-server.log
```

## 6. Expected Response

If repository not in VectorDB:
```json
{
  "error": "Repository not analyzed",
  "code": "REPOSITORY_NOT_ANALYZED",
  "details": {
    "message": "This repository needs to be analyzed by DeepWiki first...",
    "repositoryUrl": "https://github.com/facebook/react",
    "suggestion": "Please run a full repository analysis first using the /api/scan endpoint"
  }
}
```

If successful, you'll get analysis results with findings, recommendations, etc.
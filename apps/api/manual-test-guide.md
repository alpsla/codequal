# Manual Testing Guide for Data Flow Monitoring

## 1. Server Status
The API server is running on port 3001.

## 2. Quick Test Without Authentication

Since we're focusing on monitoring the data flow, let's use the mock PR analysis endpoint that might have less strict auth:

```bash
# Test the mock PR analysis endpoint
curl -X POST 'http://localhost:3001/api/mock-pr-analysis/github-pr-analysis' \
  -H 'Content-Type: application/json' \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }'
```

## 3. Monitor the Data Flow

### Option A: Real-time Session Monitoring
```bash
# 1. First, get active sessions
curl 'http://localhost:3001/api/monitoring/sessions' | jq .

# 2. Get detailed session info (replace SESSION_ID)
curl 'http://localhost:3001/api/monitoring/session/SESSION_ID' | jq .

# 3. View HTML visualization in browser
open 'http://localhost:3001/api/monitoring/session/SESSION_ID/visualize'

# 4. Stream real-time updates
curl 'http://localhost:3001/api/monitoring/stream/SESSION_ID'
```

### Option B: Watch Server Logs
```bash
# In a separate terminal, watch the server logs
tail -f /tmp/api-server.log
```

### Option C: Test Monitoring Trigger
```bash
# Trigger a test monitoring session
curl 'http://localhost:3001/api/test-monitoring/trigger' | jq .
```

## 4. Common Issues to Watch For

1. **"Repository not analyzed"** - DeepWiki hasn't analyzed the repo yet
2. **"Vector DB empty"** - No DeepWiki chunks stored
3. **"MCP tools failed"** - Tool execution issues
4. **"Agent timeout"** - Agent processing took too long

## 5. Monitoring Dashboard URLs

- Active Sessions: http://localhost:3001/api/monitoring/sessions
- Session Visualization: http://localhost:3001/api/monitoring/session/{SESSION_ID}/visualize
- Unified Progress: http://localhost:3001/api/unified-progress/{ANALYSIS_ID}
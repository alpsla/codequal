# 🚀 Quick Test Commands for Data Flow Monitoring

The server is running on port 3001. Here are the commands to test and monitor the data flow:

## 1. Trigger a Test Analysis (No Auth Required)

```bash
curl -X POST 'http://localhost:3001/api/dev-test/trigger-analysis' \
  -H 'Content-Type: application/json' \
  -d '{
    "repositoryUrl": "https://github.com/facebook/react",
    "prNumber": 28000
  }'
```

This will return something like:
```json
{
  "message": "Analysis started",
  "analysisId": "analysis_1234567890_abc123",
  "sessionId": "pr-analysis-1234567890-xyz789",
  "monitoringUrls": {
    "session": "/api/dev-test/session/pr-analysis-1234567890-xyz789",
    "visualization": "/api/dev-test/session/pr-analysis-1234567890-xyz789/visualize",
    "progress": "/api/dev-test/progress/analysis_1234567890_abc123"
  }
}
```

## 2. Monitor in Real-Time

### Option A: Browser Visualization (Auto-Refreshes Every 5 Seconds)
Open in your browser:
```
http://localhost:3001/api/dev-test/session/YOUR_SESSION_ID/visualize
```

### Option B: Check Session Details via API
```bash
curl 'http://localhost:3001/api/dev-test/session/YOUR_SESSION_ID' | jq .
```

### Option C: Watch Server Logs
```bash
tail -f /tmp/api-server.log
```

### Option D: See All Active Sessions
```bash
curl 'http://localhost:3001/api/dev-test/sessions' | jq .
```

## 3. What to Look For

### Success Flow:
1. ✅ Extract PR Context
2. ✅ Check Repository Status (might fail if not in Vector DB)
3. ✅ Retrieve MCP Tool Results
4. ✅ Coordinate Multi-Agent Analysis
5. ✅ Process Results
6. ✅ Generate Recommendations
7. ✅ Educational Agent Processing
8. ✅ Reporter Agent Processing
9. ✅ Store Report

### Common Issues:
- ⚠️ "Repository not in VectorDB" - Expected if repo hasn't been analyzed by DeepWiki
- ⚠️ "MCP tools empty" - No tool results available
- ⚠️ "Agent timeout" - Agent took too long
- ⚠️ "Vector chunks missing" - No DeepWiki chunks for agents

## 4. Example Test Flow

```bash
# 1. Start analysis
RESPONSE=$(curl -s -X POST 'http://localhost:3001/api/dev-test/trigger-analysis' \
  -H 'Content-Type: application/json' \
  -d '{"repositoryUrl": "https://github.com/facebook/react", "prNumber": 28000}')

# 2. Extract session ID
SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')

# 3. Open browser to monitor
open "http://localhost:3001/api/dev-test/session/$SESSION_ID/visualize"

# 4. Or watch in terminal
watch -n 2 "curl -s 'http://localhost:3001/api/dev-test/session/$SESSION_ID' | jq '.steps[-5:]'"
```
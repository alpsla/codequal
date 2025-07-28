#!/bin/bash

# Test repository for analysis
REPO_URL="https://github.com/expressjs/express"
PR_NUMBER=5906

echo "🚀 Starting DeepWiki analysis for test repository..."
echo "Repository: $REPO_URL"
echo "PR: #$PR_NUMBER"

# Get auth token (you'll need to set this)
AUTH_TOKEN="${AUTH_TOKEN:-your-jwt-token-here}"

# Run analysis
curl -X POST http://localhost:3001/api/analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "repositoryUrl": "'$REPO_URL'",
    "prNumber": '$PR_NUMBER',
    "analysisMode": "comprehensive"
  }' | jq

echo "✅ Analysis triggered!"
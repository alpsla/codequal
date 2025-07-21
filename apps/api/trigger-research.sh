#!/bin/bash

# Trigger Research Script
# This script triggers the researcher to run immediately

echo "=== TRIGGERING RESEARCHER ==="
echo "Date: $(date)"
echo ""

# Check if API is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ API server is not running!"
    echo "Please start it with: npm run dev"
    exit 1
fi

echo "✅ API server is running"
echo ""

# Instructions for getting JWT token
echo "📋 To run the researcher, you need a valid JWT token:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Log in with your credentials"
echo "3. Open Developer Tools (F12)"
echo "4. Go to Application/Storage > Local Storage"
echo "5. Find 'supabase.auth.token' and copy the access_token value"
echo "6. Run this command with your token:"
echo ""
echo "curl -X POST http://localhost:3001/api/researcher/research \\"
echo "  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"trigger\": \"manual\", \"reason\": \"Reset scheduler to run immediately\"}'"
echo ""
echo "This will:"
echo "- Fetch latest models from OpenRouter"
echo "- Evaluate them with dynamic scoring (no hardcoded models)"
echo "- Update configurations for all 10 agent roles"
echo "- Reset the quarterly schedule to start from today"
echo ""
echo "Next scheduled run will be in 3 months from today."
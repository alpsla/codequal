#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Real Data Flow Monitor for PR Analysis ===${NC}"
echo "This will monitor all transition points during PR analysis"
echo ""

# Create monitoring directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
MONITOR_DIR="monitoring-results/$TIMESTAMP"
mkdir -p "$MONITOR_DIR"

echo -e "${YELLOW}Monitoring results will be saved to: $MONITOR_DIR${NC}"
echo ""

# Function to monitor server logs
monitor_logs() {
    echo -e "${BLUE}Starting log monitoring...${NC}"
    
    # Monitor different aspects in separate files
    echo "Monitoring PR Context Extraction..." > "$MONITOR_DIR/pr-context.log"
    echo "Monitoring DeepWiki Calls..." > "$MONITOR_DIR/deepwiki.log"
    echo "Monitoring MCP Tools..." > "$MONITOR_DIR/mcp-tools.log"
    echo "Monitoring Agent Processing..." > "$MONITOR_DIR/agents.log"
    echo "Monitoring File Operations..." > "$MONITOR_DIR/files.log"
    
    # Tail the main server output and route to different logs based on content
    tail -f /tmp/api-server.log 2>/dev/null | while read line; do
        # Timestamp each line
        timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        
        # Route to appropriate log file based on content
        if echo "$line" | grep -E "(PR Context|Extracting PR|GitHub API|GitLab API)" > /dev/null; then
            echo "[$timestamp] $line" >> "$MONITOR_DIR/pr-context.log"
            echo -e "${GREEN}[PR Context]${NC} $line"
        elif echo "$line" | grep -E "(DeepWiki|Branch:|branch:|Trigger.*analysis|Repository analysis)" > /dev/null; then
            echo "[$timestamp] $line" >> "$MONITOR_DIR/deepwiki.log"
            echo -e "${BLUE}[DeepWiki]${NC} $line"
        elif echo "$line" | grep -E "(MCP Tools|eslint|semgrep|npm-audit|madge|dependency-cruiser|Tool execution)" > /dev/null; then
            echo "[$timestamp] $line" >> "$MONITOR_DIR/mcp-tools.log"
            echo -e "${YELLOW}[MCP Tools]${NC} $line"
        elif echo "$line" | grep -E "(Agent|security|architecture|performance|codeQuality|dependency)" | grep -v "Tool" > /dev/null; then
            echo "[$timestamp] $line" >> "$MONITOR_DIR/agents.log"
            echo -e "${CYAN}[Agents]${NC} $line"
        elif echo "$line" | grep -E "(File|file|content|cached|enrich)" > /dev/null; then
            echo "[$timestamp] $line" >> "$MONITOR_DIR/files.log"
            echo -e "${PURPLE}[Files]${NC} $line"
        else
            echo "[$timestamp] $line" >> "$MONITOR_DIR/general.log"
        fi
    done
}

# Function to capture network requests
capture_requests() {
    echo -e "${BLUE}Setting up request capture...${NC}"
    
    # Create a simple proxy to log requests
    cat > "$MONITOR_DIR/capture-requests.js" << 'EOF'
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const logFile = process.argv[2] || 'requests.log';
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log function
function logRequest(type, url, data) {
    const timestamp = new Date().toISOString();
    const entry = {
        timestamp,
        type,
        url,
        data: data ? JSON.stringify(data).substring(0, 500) : null
    };
    logStream.write(JSON.stringify(entry) + '\n');
    console.log(`[${type}] ${url}`);
}

// Override https.request to capture GitHub API calls
const originalHttpsRequest = https.request;
https.request = function(options, callback) {
    const url = `https://${options.hostname}${options.path}`;
    logRequest('HTTPS Request', url, options);
    return originalHttpsRequest.apply(this, arguments);
};

console.log('Request capture started. Logging to:', logFile);
EOF
}

# Function to create analysis summary
create_summary() {
    echo -e "${BLUE}Creating analysis summary...${NC}"
    
    cat > "$MONITOR_DIR/summary.md" << EOF
# PR Analysis Data Flow Summary
Generated: $(date)

## Monitoring Directory: $MONITOR_DIR

## Key Checkpoints

### 1. PR Context Extraction
\`\`\`
$(grep -E "Extracting PR|PR Context" "$MONITOR_DIR/pr-context.log" 2>/dev/null | head -10)
\`\`\`

### 2. DeepWiki Branch Analysis
\`\`\`
$(grep -E "Branch:|branch:" "$MONITOR_DIR/deepwiki.log" 2>/dev/null | head -10)
\`\`\`

### 3. MCP Tool Execution
\`\`\`
$(grep -E "Executing tools|Tool execution" "$MONITOR_DIR/mcp-tools.log" 2>/dev/null | head -10)
\`\`\`

### 4. File Operations
\`\`\`
$(grep -E "cached files|enriched files" "$MONITOR_DIR/files.log" 2>/dev/null | head -10)
\`\`\`

### 5. Agent Processing
\`\`\`
$(grep -E "Agent processing|Selected agents" "$MONITOR_DIR/agents.log" 2>/dev/null | head -10)
\`\`\`

## Log Files
- PR Context: pr-context.log
- DeepWiki: deepwiki.log  
- MCP Tools: mcp-tools.log
- Agents: agents.log
- Files: files.log
- General: general.log
EOF
}

# Main monitoring flow
echo -e "${GREEN}=== Starting Comprehensive Monitoring ===${NC}"
echo ""

# Start monitoring in background
monitor_logs &
MONITOR_PID=$!

echo -e "${GREEN}✓ Log monitoring started (PID: $MONITOR_PID)${NC}"
echo ""

# Create helper script for analysis
cat > "$MONITOR_DIR/analyze-pr.sh" << EOF
#!/bin/bash
# Helper script to run PR analysis with monitoring

AUTH_TOKEN=\$1
REPO_URL=\${2:-"https://github.com/facebook/react"}
PR_NUMBER=\${3:-"28298"}

if [ -z "\$AUTH_TOKEN" ]; then
    echo "Usage: \$0 <auth-token> [repo-url] [pr-number]"
    exit 1
fi

echo "Analyzing PR #\$PR_NUMBER from \$REPO_URL"
echo ""

# Run the analysis
curl -X POST "http://localhost:3001/api/result-orchestrator/analyze-pr" \\
    -H "Authorization: Bearer \$AUTH_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d "{
        \"repositoryUrl\": \"\$REPO_URL\",
        \"prNumber\": \$PR_NUMBER,
        \"analysisMode\": \"comprehensive\"
    }" \\
    -o "$MONITOR_DIR/analysis-response.json" \\
    -w "\\nHTTP Status: %{http_code}\\nTime: %{time_total}s\\n"

echo ""
echo "Response saved to: $MONITOR_DIR/analysis-response.json"
EOF

chmod +x "$MONITOR_DIR/analyze-pr.sh"

echo -e "${YELLOW}=== Instructions ===${NC}"
echo ""
echo "1. The monitor is now running and capturing all logs"
echo ""
echo "2. To run a PR analysis with monitoring:"
echo "   $MONITOR_DIR/analyze-pr.sh YOUR_AUTH_TOKEN [repo-url] [pr-number]"
echo ""
echo "3. Monitor different aspects in real-time:"
echo "   - PR Context: tail -f $MONITOR_DIR/pr-context.log"
echo "   - DeepWiki: tail -f $MONITOR_DIR/deepwiki.log"
echo "   - MCP Tools: tail -f $MONITOR_DIR/mcp-tools.log"
echo "   - Agents: tail -f $MONITOR_DIR/agents.log"
echo "   - Files: tail -f $MONITOR_DIR/files.log"
echo ""
echo "4. To stop monitoring:"
echo "   kill $MONITOR_PID"
echo ""
echo "5. View summary after analysis:"
echo "   cat $MONITOR_DIR/summary.md"
echo ""
echo -e "${GREEN}Monitoring is active. Ready to analyze PRs!${NC}"

# Keep script running
wait $MONITOR_PID
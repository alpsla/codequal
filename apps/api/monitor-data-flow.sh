#!/bin/bash

# DataFlow Monitoring Script for CodeQual PR Analysis
# This script helps monitor all steps in the data flow

echo "=== CodeQual Data Flow Monitor ==="
echo "This will monitor all data flow steps during PR analysis"
echo ""

# Color codes for better visibility
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to colorize output based on keywords
colorize() {
    sed -E \
        -e "s/(DataFlowMonitor)/${GREEN}\1${NC}/g" \
        -e "s/(DeepWiki|DEEPWIKI)/${BLUE}\1${NC}/g" \
        -e "s/(VectorDB|Vector DB)/${PURPLE}\1${NC}/g" \
        -e "s/(MCP Tools|semgrep|eslint|npm-audit|madge|dependency-cruiser)/${YELLOW}\1${NC}/g" \
        -e "s/(Agent:|security|codeQuality|architecture|performance|dependency)/${CYAN}\1${NC}/g" \
        -e "s/(Educator|Reporter)/${RED}\1${NC}/g" \
        -e "s/(ERROR|FAILED|Failed)/${RED}\1${NC}/g" \
        -e "s/(SUCCESS|COMPLETED|Complete)/${GREEN}\1${NC}/g"
}

echo "Starting monitoring of /tmp/api-server-new.log"
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "=== Legend ==="
echo -e "${GREEN}Green${NC}: DataFlowMonitor events"
echo -e "${BLUE}Blue${NC}: DeepWiki operations"
echo -e "${PURPLE}Purple${NC}: Vector DB operations"
echo -e "${YELLOW}Yellow${NC}: MCP Tools (semgrep, eslint, etc.)"
echo -e "${CYAN}Cyan${NC}: Agent processing"
echo -e "${RED}Red${NC}: Educator/Reporter/Errors"
echo ""
echo "=== Monitoring Started ==="
echo ""

# First check if log file exists, if not create it
LOG_FILE="/tmp/api-server.log"
if [ ! -f "$LOG_FILE" ]; then
    echo "Log file not found, creating $LOG_FILE"
    touch "$LOG_FILE"
fi

# Also monitor console output from the API server process
echo "Monitoring both $LOG_FILE and console output..."

# Monitor with grep for relevant keywords and colorize
# Use a broader grep pattern to catch more events
tail -f "$LOG_FILE" 2>/dev/null | grep -E "(DataFlow|Progress|DeepWiki|DEEPWIKI|Vector|MCP|Tool|semgrep|eslint|npm-audit|madge|dependency-cruiser|Agent|security|codeQuality|architecture|performance|dependency|Educator|Reporter|Orchestrator|STEP|SESSION|Step|ERROR|FAILED|SUCCESS|COMPLETED|chunk|embedding|Retriev|Process|Analyz|Compil|Execute|Trigger|coordinat|PR analysis|Monitoring)" --line-buffered | colorize
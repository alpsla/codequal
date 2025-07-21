#!/bin/bash
#
# Scheduled Research Runner Script
# 
# This script is designed to be called by system cron jobs
# It runs the quarterly research without requiring user authentication
#
# Add to crontab:
# 0 5 1 */3 * /path/to/codequal/scripts/run-scheduled-research.sh >> /var/log/codequal-research.log 2>&1

# Set up environment
export NODE_ENV=production
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY}"

# Change to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo "========================================="
echo "SCHEDULED RESEARCH RUN"
echo "Time: $(date)"
echo "========================================="

# Check if OpenRouter API key is set
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "ERROR: OPENROUTER_API_KEY environment variable not set"
    echo "Please set it in your crontab or system environment"
    exit 1
fi

# Run the scheduled research
echo "Starting scheduled research..."
npx tsx packages/agents/src/researcher/scheduled-research-runner.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ Scheduled research completed successfully"
else
    echo "❌ Scheduled research failed"
    exit 1
fi

echo "========================================="
echo ""
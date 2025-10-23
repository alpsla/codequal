#!/bin/bash

# Cleanup script for Oracle cloud test files
# Run this after each test to avoid storage costs

export SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
export ORACLE_IP="129.213.49.128"

echo "🧹 Cleaning up Oracle cloud test files..."
echo ""

ssh -i "$SSH_KEY" "opc@${ORACLE_IP}" << 'EOF'
  echo "=== Current disk usage ==="
  df -h /tmp | tail -1
  echo ""
  
  echo "=== Cleaning up test files ==="
  
  # Remove old test logs (keep only latest 2)
  echo "Removing old test logs..."
  cd /tmp && ls -t test-*.log 2>/dev/null | tail -n +3 | xargs -r rm -f
  
  # Remove old V9 reports (keep only latest)
  echo "Removing old V9 reports..."
  cd /tmp/v9-reports 2>/dev/null && ls -t v9-*.md 2>/dev/null | tail -n +2 | xargs -r rm -f
  
  # Remove all attachments (they're already in the report)
  echo "Removing attachment files..."
  rm -rf /tmp/v9-reports/attachments/ 2>/dev/null
  
  # Remove AI response cache files older than 1 day
  echo "Removing old AI response cache..."
  find /tmp -name "ai_responses_cache_*" -mtime +1 -delete 2>/dev/null
  
  # Remove temporary analysis files
  echo "Removing temporary analysis files..."
  rm -rf /tmp/analysis-* 2>/dev/null
  rm -rf /tmp/tool-results-* 2>/dev/null
  
  # Remove old Kafka clones (keep only latest)
  echo "Checking Kafka clones..."
  cd /workspace 2>/dev/null && ls -td kafka-* 2>/dev/null | tail -n +2 | xargs -r rm -rf
  
  echo ""
  echo "=== Disk usage after cleanup ==="
  df -h /tmp | tail -1
  echo ""
  
  echo "=== Remaining files in /tmp/v9-reports ==="
  ls -lh /tmp/v9-reports/ 2>/dev/null | head -10
  
  echo ""
  echo "✅ Cleanup complete!"
EOF

echo ""
echo "🎯 To clean up everything (nuclear option):"
echo "   ssh oracle 'rm -rf /tmp/v9-reports/* /tmp/test-*.log /tmp/ai_responses_cache_* /tmp/analysis-* /tmp/tool-results-*'"


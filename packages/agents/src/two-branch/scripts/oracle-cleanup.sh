#!/bin/bash

# Oracle A1.Flex Disk Cleanup Script
# Removes outdated reports, logs, and temporary files

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Oracle A1.Flex Disk Cleanup"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check current disk usage
echo "📊 Current Disk Usage:"
df -h /home/ubuntu
echo ""

echo "📁 Current Directory Sizes:"
du -sh /home/ubuntu/* 2>/dev/null | sort -h
echo ""

# 1. Clean old test results
echo "🧹 Cleaning old test results..."
if [ -d "/home/ubuntu/test-results" ]; then
  BEFORE=$(du -sh /home/ubuntu/test-results 2>/dev/null | awk '{print $1}')
  find /home/ubuntu/test-results -type f -mtime +7 -delete 2>/dev/null || true
  find /home/ubuntu/test-results -type d -empty -delete 2>/dev/null || true
  AFTER=$(du -sh /home/ubuntu/test-results 2>/dev/null | awk '{print $1}')
  echo "   Before: $BEFORE → After: $AFTER"
fi

# 2. Clean old reports
echo "🧹 Cleaning old reports..."
if [ -d "/home/ubuntu/reports" ]; then
  BEFORE=$(du -sh /home/ubuntu/reports 2>/dev/null | awk '{print $1}')
  find /home/ubuntu/reports -name "*.md" -mtime +7 -delete 2>/dev/null || true
  find /home/ubuntu/reports -name "*.json" -mtime +7 -delete 2>/dev/null || true
  AFTER=$(du -sh /home/ubuntu/reports 2>/dev/null | awk '{print $1}')
  echo "   Before: $BEFORE → After: $AFTER"
fi

# 3. Clean Docker build cache
echo "🧹 Cleaning Docker build cache..."
docker system prune -af --volumes 2>/dev/null || echo "   No Docker or insufficient permissions"

# 4. Clean old logs
echo "🧹 Cleaning old logs..."
if [ -d "/home/ubuntu/logs" ]; then
  BEFORE=$(du -sh /home/ubuntu/logs 2>/dev/null | awk '{print $1}')
  find /home/ubuntu/logs -name "*.log" -mtime +3 -delete 2>/dev/null || true
  AFTER=$(du -sh /home/ubuntu/logs 2>/dev/null | awk '{print $1}')
  echo "   Before: $BEFORE → After: $AFTER"
fi

# 5. Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force 2>/dev/null || echo "   npm not available"

# 6. Clean old analysis results
echo "🧹 Cleaning old analysis results..."
find /home/ubuntu -name "checkstyle-results-*.xml" -mtime +7 -delete 2>/dev/null || true
find /home/ubuntu -name "pmd-results-*.xml" -mtime +7 -delete 2>/dev/null || true
find /home/ubuntu -name "semgrep-results-*.json" -mtime +7 -delete 2>/dev/null || true
find /home/ubuntu -name "dependency-check-results-*" -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
find /home/ubuntu -name "spotbugs-results-*.xml" -mtime +7 -delete 2>/dev/null || true

# 7. Clean temp files
echo "🧹 Cleaning temp files..."
find /tmp -name "kafka-*" -mtime +1 -exec rm -rf {} \; 2>/dev/null || true
find /tmp -name "codequal-*" -mtime +1 -exec rm -rf {} \; 2>/dev/null || true

# 8. Show final disk usage
echo ""
echo "═══════════════════════════════════════════════════════"
echo "CLEANUP COMPLETE"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "📊 Final Disk Usage:"
df -h /home/ubuntu
echo ""

echo "📁 Final Directory Sizes:"
du -sh /home/ubuntu/* 2>/dev/null | sort -h
echo ""

echo "✅ Cleanup complete!"

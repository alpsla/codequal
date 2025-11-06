#!/bin/bash
# Cleanup Oracle Cloud Environment
# Removes outdated test files, reports, scripts, and session docs

set -e

SSH_KEY="/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-10-07.key"
ORACLE_IP="129.213.49.128"

echo "🧹 Starting Oracle Cloud Cleanup..."
echo ""

# Create backup directory
ssh -i "$SSH_KEY" "opc@$ORACLE_IP" "cd ~/codequal/packages/agents && mkdir -p .archive/cleanup-$(date +%Y%m%d)"

echo "📦 Step 1: Archiving files before deletion..."

# Archive outdated test files
ssh -i "$SSH_KEY" "opc@$ORACLE_IP" << 'EOF'
cd ~/codequal/packages/agents

# Test files to KEEP (new architecture)
KEEP_TESTS=(
  "test-v9-lite-e2e.ts"
  "test-multi-framework-universal.ts"
  "test-v9-e2e-complete.ts"
)

# Archive and remove old test files
for file in test-*.ts; do
  if [[ ! " ${KEEP_TESTS[@]} " =~ " ${file} " ]]; then
    echo "  📋 Archiving old test: $file"
    mv "$file" ".archive/cleanup-$(date +%Y%m%d)/"
  fi
done

# Archive old report files (keep only latest 2)
if [ -d "reports" ]; then
  echo "  📊 Archiving old reports..."
  ls -t reports/*.md 2>/dev/null | tail -n +3 | while read report; do
    echo "    → $(basename $report)"
    mv "$report" ".archive/cleanup-$(date +%Y%m%d)/"
  done
fi

# Archive old session docs (keep only latest 3)
echo "  📝 Archiving old session docs..."
ls -t SESSION*.md *COMPLETE*.md *ACHIEVEMENTS*.md *SUMMARY*.md 2>/dev/null | tail -n +4 | while read doc; do
  echo "    → $(basename $doc)"
  mv "$doc" ".archive/cleanup-$(date +%Y%m%d)/"
done

# Archive old shell scripts (keep only essential ones)
KEEP_SCRIPTS=(
  "connect-oracle.sh"
  "setup-oracle-analyzers.sh"
)

for script in *.sh; do
  if [[ ! " ${KEEP_SCRIPTS[@]} " =~ " ${script} " ]]; then
    if [ -f "$script" ]; then
      echo "  🔧 Archiving script: $script"
      mv "$script" ".archive/cleanup-$(date +%Y%m%d)/"
    fi
  fi
done

# Clean up old Python scripts (archive all except essential)
for pyscript in *.py; do
  if [ -f "$pyscript" ] && [ "$pyscript" != "refactor-compile-report.py" ]; then
    echo "  🐍 Archiving Python script: $pyscript"
    mv "$pyscript" ".archive/cleanup-$(date +%Y%m%d)/"
  fi
done

# Clean up test output directories
if [ -d "test-outputs" ]; then
  echo "  🗑️  Cleaning test outputs..."
  rm -rf test-outputs/*
fi

# Clean up log files
echo "  📜 Removing log files..."
rm -f *.log
rm -f *-results-*.txt *-results-*.json

# Clean up temporary directories
rm -rf /tmp/test-* /tmp/*-pmd.json 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
ls -1 test-*.ts 2>/dev/null | wc -l | xargs echo "  Test files remaining:"
ls -1 reports/*.md 2>/dev/null | wc -l | xargs echo "  Report files remaining:"
ls -1 *.sh 2>/dev/null | wc -l | xargs echo "  Shell scripts remaining:"
ls -1 SESSION*.md *COMPLETE*.md 2>/dev/null | wc -l | xargs echo "  Session docs remaining:"
du -sh .archive/cleanup-$(date +%Y%m%d) 2>/dev/null | xargs echo "  Archive size:"

EOF

echo ""
echo "🎉 Oracle Cloud cleanup completed!"
echo ""
echo "Files kept:"
echo "  ✅ test-v9-lite-e2e.ts (NEW - lite E2E test)"
echo "  ✅ test-multi-framework-universal.ts (NEW - multi-framework test)"
echo "  ✅ test-v9-e2e-complete.ts (reference implementation)"
echo "  ✅ Latest 2 reports"
echo "  ✅ Latest 3 session docs"
echo "  ✅ Essential scripts only"
echo ""
echo "All removed files backed up to: .archive/cleanup-$(date +%Y%m%d)/"


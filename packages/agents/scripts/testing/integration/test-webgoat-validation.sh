#!/bin/bash
# Quick validation test on WebGoat (intentionally vulnerable app)
# This should find issues with ALL tools, not just PMD

echo "🔍 Testing WebGoat (Intentionally Vulnerable Application)"
echo "=========================================="
echo "Purpose: Validate that ALL 5 tools can detect issues"
echo ""

REPO_URL="https://github.com/WebGoat/WebGoat"
REPO_DIR="/tmp/webgoat-validation"

# Clone
echo "📥 Cloning WebGoat..."
rm -rf "$REPO_DIR"
git clone --depth=10 --no-single-branch "$REPO_URL" "$REPO_DIR"

# Count files
FILE_COUNT=$(find "$REPO_DIR" -name "*.java" -type f | wc -l)
echo "📊 Java files: $FILE_COUNT"

# Setup
cd "$REPO_DIR"
git checkout -B main origin/main

# Link for test
ln -sf "$REPO_DIR" /tmp/kafka-repo

# Run analysis
cd ~/codequal/packages/agents
echo ""
echo "🔧 Running complete analysis on WebGoat..."
echo "⏱️  This should find issues with ALL tools (not just PMD)"
echo ""

npx ts-node src/two-branch/tests/__tests__/test-java-all-modes.ts

echo ""
echo "✅ WebGoat validation complete!"
echo ""
echo "🔍 EXPECTED RESULTS:"
echo "  - PMD: ~1000+ issues"
echo "  - Semgrep: 50+ security issues (SQL injection, XSS, etc.)"
echo "  - Dependency-Check: 10+ CVEs in dependencies"
echo "  - SpotBugs: 20+ security bugs (if compilation succeeds)"
echo "  - Checkstyle: 100+ style violations"
echo ""
echo "⚠️  If Semgrep/Dependency-Check still show 0, there's a configuration issue!"


#!/bin/bash

# Test 3 new Java repos with full V9 analysis
# Goal: Validate all 5 tools find issues + verify Bug #6 fix

set -e

TIMESTAMP=$(date +%s)
AGENTS_DIR="/Users/alpinro/Code Prjects/codequal/packages/agents"
OUTPUT_DIR="$AGENTS_DIR/test-outputs"

cd "$AGENTS_DIR"

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                           ║"
echo "║         TESTING 3 NEW JAVA REPOS WITH FULL V9 ANALYSIS                   ║"
echo "║                                                                           ║"
echo "║  Goal: All 5 tools should find issues in each repo                       ║"
echo "║  • PMD, Checkstyle, Semgrep, SpotBugs, Dependency-Check                 ║"
echo "║  • Validate Bug #6 fix (accurate auto-fix percentages)                   ║"
echo "║                                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: JHipster Sample App
echo "================================================================================"
echo "🧪 Test 1/3: JHipster Sample App"
echo "================================================================================"
echo "📋 Full-stack Spring Boot application (easy to compile)"
echo "🔗 https://github.com/jhipster/jhipster-sample-app"
echo ""

REPO_DIR_1="/tmp/test-jhipster-$TIMESTAMP"
git clone --depth 1 https://github.com/jhipster/jhipster-sample-app "$REPO_DIR_1"

echo "🔨 Compiling project for SpotBugs..."
cd "$REPO_DIR_1"
chmod +x mvnw
./mvnw clean compile -DskipTests -q || echo "⚠️  Compilation had warnings (continuing)"

cd "$AGENTS_DIR"
echo "🔧 Running V9 analysis..."
npx ts-node test-v9-lite-e2e.ts 2>&1 | tee "$OUTPUT_DIR/jhipster-test-$TIMESTAMP.log" || true

rm -rf "$REPO_DIR_1"
echo "✅ JHipster test complete"
echo ""

# Test 2: Spring Boot Admin
echo "================================================================================"
echo "🧪 Test 2/3: Spring Boot Admin"
echo "================================================================================"
echo "📋 Spring Boot monitoring UI (Maven multi-module)"
echo "🔗 https://github.com/codecentric/spring-boot-admin"
echo ""

REPO_DIR_2="/tmp/test-spring-boot-admin-$TIMESTAMP"
git clone --depth 1 https://github.com/codecentric/spring-boot-admin "$REPO_DIR_2"

echo "🔨 Compiling project for SpotBugs..."
cd "$REPO_DIR_2"
chmod +x mvnw
./mvnw clean compile -DskipTests -q || echo "⚠️  Compilation had warnings (continuing)"

cd "$AGENTS_DIR"
echo "🔧 Running V9 analysis..."
npx ts-node test-v9-lite-e2e.ts 2>&1 | tee "$OUTPUT_DIR/spring-boot-admin-test-$TIMESTAMP.log" || true

rm -rf "$REPO_DIR_2"
echo "✅ Spring Boot Admin test complete"
echo ""

# Test 3: Netflix Conductor
echo "================================================================================"
echo "🧪 Test 3/3: Netflix Conductor"
echo "================================================================================"
echo "📋 Workflow orchestration engine (Gradle)"
echo "🔗 https://github.com/Netflix/conductor"
echo ""

REPO_DIR_3="/tmp/test-conductor-$TIMESTAMP"
git clone --depth 1 https://github.com/Netflix/conductor "$REPO_DIR_3"

echo "🔨 Compiling project for SpotBugs..."
cd "$REPO_DIR_3"
chmod +x gradlew
./gradlew compileJava -x test || echo "⚠️  Compilation had warnings (continuing)"

cd "$AGENTS_DIR"
echo "🔧 Running V9 analysis..."
npx ts-node test-v9-lite-e2e.ts 2>&1 | tee "$OUTPUT_DIR/conductor-test-$TIMESTAMP.log" || true

rm -rf "$REPO_DIR_3"
echo "✅ Netflix Conductor test complete"
echo ""

# Summary
echo "================================================================================"
echo "📊 FINAL SUMMARY"
echo "================================================================================"
echo ""
echo "✅ All 3 repo tests completed"
echo ""
echo "📁 Logs saved to:"
echo "   - $OUTPUT_DIR/jhipster-test-$TIMESTAMP.log"
echo "   - $OUTPUT_DIR/spring-boot-admin-test-$TIMESTAMP.log"
echo "   - $OUTPUT_DIR/conductor-test-$TIMESTAMP.log"
echo ""
echo "📄 Generated reports:"
ls -lh "$OUTPUT_DIR"/*-$TIMESTAMP.* 2>/dev/null | grep -v ".log" || echo "   (Check test-outputs/ directory)"
echo ""
echo "🎉 Multi-repo testing complete!"

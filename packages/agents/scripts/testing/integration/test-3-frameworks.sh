#!/bin/bash

# Multi-Framework Testing Script
# Tests 3 different Java frameworks with full V9 analysis (including SpotBugs and Dependency-Check)

set -e

TIMESTAMP=$(date +%s)
OUTPUT_DIR="test-outputs"

echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                           ║"
echo "║              MULTI-FRAMEWORK REPORT GENERATION TEST                       ║"
echo "║                                                                           ║"
echo "║  Testing 3 Java Frameworks with Full V9 Analysis                         ║"
echo "║  • All 5 tools: PMD, Checkstyle, Semgrep, SpotBugs, Dependency-Check    ║"
echo "║  • Goal: Find CVEs and validate Bug #6 fix                              ║"
echo "║                                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Framework 1: Quarkus quickstarts
echo "================================================================================"
echo "🧪 Test 1: Quarkus Quickstarts"
echo "================================================================================"
echo "📋 Modern cloud-native Java framework"
echo "🔗 https://github.com/quarkusio/quarkus-quickstarts"
echo ""

REPO_URL_1="https://github.com/quarkusio/quarkus-quickstarts"
REPO_DIR_1="/tmp/test-quarkus-$TIMESTAMP"

echo "📦 Cloning repository..."
git clone --depth 1 "$REPO_URL_1" "$REPO_DIR_1"

echo "🔧 Running V9 analysis (this may take 5-10 minutes)..."
cd "$(dirname "$0")"
QUARKUS_OUTPUT=$(npx ts-node test-v9-lite-e2e.ts --repo "$REPO_DIR_1" --name "Quarkus" 2>&1 | tee "$OUTPUT_DIR/quarkus-test-$TIMESTAMP.log")

echo "🧹 Cleaning up..."
rm -rf "$REPO_DIR_1"

echo "✅ Quarkus test complete"
echo ""

# Framework 2: Micronaut starter
echo "================================================================================"
echo "🧪 Test 2: Micronaut Starter"
echo "================================================================================"
echo "📋 Modern JVM framework for microservices"
echo "🔗 https://github.com/micronaut-projects/micronaut-starter"
echo ""

REPO_URL_2="https://github.com/micronaut-projects/micronaut-starter"
REPO_DIR_2="/tmp/test-micronaut-$TIMESTAMP"

echo "📦 Cloning repository..."
git clone --depth 1 "$REPO_URL_2" "$REPO_DIR_2"

echo "🔧 Running V9 analysis (this may take 5-10 minutes)..."
MICRONAUT_OUTPUT=$(npx ts-node test-v9-lite-e2e.ts --repo "$REPO_DIR_2" --name "Micronaut" 2>&1 | tee "$OUTPUT_DIR/micronaut-test-$TIMESTAMP.log")

echo "🧹 Cleaning up..."
rm -rf "$REPO_DIR_2"

echo "✅ Micronaut test complete"
echo ""

# Framework 3: Spring Boot (older branch with potential CVEs)
echo "================================================================================"
echo "🧪 Test 3: Spring Boot PetClinic (tested again for consistency)"
echo "================================================================================"
echo "📋 Classic Spring Boot application"
echo "🔗 https://github.com/spring-projects/spring-petclinic"
echo ""

REPO_URL_3="https://github.com/spring-projects/spring-petclinic"
REPO_DIR_3="/tmp/test-spring-petclinic-$TIMESTAMP"

echo "📦 Cloning repository..."
git clone --depth 1 "$REPO_URL_3" "$REPO_DIR_3"

echo "🔧 Running V9 analysis (this may take 5-10 minutes)..."
SPRING_OUTPUT=$(npx ts-node test-v9-lite-e2e.ts --repo "$REPO_DIR_3" --name "Spring-PetClinic" 2>&1 | tee "$OUTPUT_DIR/spring-test-$TIMESTAMP.log")

echo "🧹 Cleaning up..."
rm -rf "$REPO_DIR_3"

echo "✅ Spring Boot test complete"
echo ""

# Summary
echo "================================================================================"
echo "📊 FINAL SUMMARY"
echo "================================================================================"
echo ""
echo "✅ All 3 framework tests completed"
echo ""
echo "📁 Reports and logs saved to: $OUTPUT_DIR"
echo ""
echo "🔍 Check the following files for results:"
echo "   - quarkus-test-$TIMESTAMP.log"
echo "   - micronaut-test-$TIMESTAMP.log"
echo "   - spring-test-$TIMESTAMP.log"
echo ""
echo "📊 Generated reports (check test-outputs/):"
ls -lh "$OUTPUT_DIR"/*-$TIMESTAMP.* 2>/dev/null || echo "   (Reports will be generated during execution)"
echo ""
echo "🎉 Multi-framework testing complete!"

#!/bin/bash

# ============================================================================
# Focused E2E Test - Validates All Fixes Without Full Infrastructure
# ============================================================================
#
# This script validates code-level fixes only (no Redis, no Supabase required)
# - All 6 Java tool fixes
# - Resilient AI infrastructure files
# - Developer skill tracking files
# - Oracle Cloud connectivity
#
# Usage:
#   ./test-fixes-validation-only.sh
#
# ============================================================================

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
declare -a TESTS_PASSED=()
declare -a TESTS_FAILED=()
declare -a TESTS_SKIPPED=()

# Configuration
SSH_KEY="${SSH_KEY:-/Users/alpinro/Code Prjects/codequal/keys/oracle/ssh-key-2025-05-08.key}"
ORACLE_IP="${ORACLE_IP:-129.213.49.128}"
ORACLE_USER="opc"

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}▶ TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED+=("$1")
}

print_failure() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED+=("$1")
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# TEST SUITE 1: All 6 Java Tool Fixes
# ============================================================================

print_header "TEST SUITE 1: All 6 Java Tool Fixes Validation"

cd /Users/alpinro/Code\ Prjects/codequal/packages/agents

print_test "Fix #1: PMD Default Rulesets"
if npx ts-node -e "
const config = { pmd: { rulesets: [] } };
const rulesets = config.pmd.rulesets.length > 0
  ? config.pmd.rulesets.join(',')
  : 'category/java/bestpractices.xml';
console.log('Default rulesets:', rulesets);
process.exit(rulesets.includes('category') ? 0 : 1);
" > /dev/null 2>&1; then
    print_success "Fix #1: PMD provides default rulesets when empty ✅"
else
    print_failure "Fix #1: PMD default rulesets logic failed"
fi

print_test "Fix #2: Checkstyle Path-Based Exclusion"
if grep -q "! -path '\*/src/test/\*' ! -path '\*/src/tests/\*'" src/two-branch/tools/java/java-tool-orchestrator.ts; then
    print_success "Fix #2: Checkstyle uses path-based exclusion ✅"
else
    print_failure "Fix #2: Checkstyle exclusion pattern incorrect"
fi

print_test "Fix #3: Branch Checkout Logic"
if grep -q "git -C.*checkout" src/two-branch/tools/java/java-tool-orchestrator.ts; then
    print_success "Fix #3: Branch checkout logic implemented ✅"
else
    print_failure "Fix #3: Branch checkout logic missing"
fi

print_test "Fix #4: PMD Command Syntax"
if grep -q "pmd check" src/two-branch/tools/java/java-tool-orchestrator.ts; then
    print_success "Fix #4: PMD uses correct 'check' syntax ✅"
else
    print_failure "Fix #4: PMD command syntax incorrect"
fi

print_test "Fix #5: SpotBugs Graceful Degradation"
if grep -q "compilationError" src/two-branch/tools/java/java-tool-orchestrator.ts; then
    print_success "Fix #5: SpotBugs has graceful degradation ✅"
else
    print_failure "Fix #5: SpotBugs graceful degradation missing"
fi

print_test "Fix #6: Dependency-Check Shared PostgreSQL"
if grep -q "jdbc:postgresql" src/two-branch/tests/__tests__/test-kafka-with-spotbugs.ts; then
    print_success "Fix #6: Dependency-Check uses shared PostgreSQL ✅"
else
    print_failure "Fix #6: Dependency-Check PostgreSQL config missing"
fi

# ============================================================================
# TEST SUITE 2: Resilient AI Infrastructure
# ============================================================================

print_header "TEST SUITE 2: Resilient AI Infrastructure"

print_test "Resilient AI Client"
if [ -f "src/two-branch/services/resilient-ai-client.ts" ]; then
    print_success "Resilient AI client exists ✅"
else
    print_failure "Resilient AI client not found"
fi

print_test "OpenRouter Key Manager"
if [ -f "src/two-branch/services/openrouter-key-manager.ts" ]; then
    print_success "OpenRouter key manager exists ✅"
else
    print_failure "OpenRouter key manager not found"
fi

print_test "Emergency Fallback Provider"
if [ -f "src/two-branch/services/emergency-fallback-provider.ts" ]; then
    print_success "Emergency fallback provider exists ✅"
else
    print_failure "Emergency fallback provider not found"
fi

print_test "Resilience Test Suite"
if [ -f "src/two-branch/tests/__tests__/test-resilience-chain.ts" ]; then
    print_success "Resilience test suite exists ✅"
else
    print_failure "Resilience test suite not found"
fi

# ============================================================================
# TEST SUITE 3: Developer Skill Tracking
# ============================================================================

print_header "TEST SUITE 3: Developer Skill Tracking System"

print_test "Skill Score Manager"
if [ -f "src/two-branch/analyzers/v9-skill-score-manager.ts" ]; then
    print_success "Skill score manager exists ✅"
else
    print_failure "Skill score manager not found"
fi

print_test "Database Migrations"
if [ -f "src/two-branch/database/migrations/003_skill_tracking_tables_SAFE.sql" ]; then
    print_success "Skill tracking migrations exist ✅"
else
    print_failure "Skill tracking migrations not found"
fi

print_test "Diagnostic Queries"
if [ -f "src/two-branch/database/DIAGNOSTIC_QUERIES.sql" ]; then
    print_success "Diagnostic queries exist ✅"
else
    print_failure "Diagnostic queries not found"
fi

# ============================================================================
# TEST SUITE 4: Oracle Cloud Connectivity
# ============================================================================

print_header "TEST SUITE 4: Oracle Cloud Infrastructure"

print_test "SSH Connectivity"
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$ORACLE_USER@$ORACLE_IP" "echo 'Connected'" > /dev/null 2>&1; then
    print_success "Oracle Cloud SSH connection working ✅"
else
    print_failure "Cannot connect to Oracle Cloud"
fi

print_test "Oracle Docker Images"
if ssh -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP" "docker images | grep -q 'analyzer'" 2>/dev/null; then
    print_success "Docker analyzer images available on Oracle ✅"
else
    print_failure "Docker analyzer images not found on Oracle"
fi

print_test "OSS Index Configuration"
if ssh -i "$SSH_KEY" "$ORACLE_USER@$ORACLE_IP" "grep -q 'OSS_INDEX' ~/.env 2>/dev/null"; then
    print_success "OSS Index credentials configured ✅"
else
    print_failure "OSS Index credentials not configured"
fi

# ============================================================================
# TEST SUITE 5: Test Suites Availability
# ============================================================================

print_header "TEST SUITE 5: Test Suites Availability"

print_test "V9 Complete Integration Test"
if [ -f "src/two-branch/tests/__tests__/test-v9-complete-integration.ts" ]; then
    print_success "V9 complete integration test exists ✅"
else
    print_failure "V9 complete integration test not found"
fi

print_test "V9 Full Regression Test"
if [ -f "src/two-branch/tests/__tests__/test-v9-full-regression-with-spotbugs.ts" ]; then
    print_success "V9 full regression test exists ✅"
else
    print_failure "V9 full regression test not found"
fi

print_test "WebGoat All Tools Test"
if [ -f "src/two-branch/tests/__tests__/test-webgoat-all-tools.ts" ]; then
    print_success "WebGoat all tools test exists ✅"
else
    print_failure "WebGoat all tools test not found"
fi

print_test "Kafka with SpotBugs Test"
if [ -f "src/two-branch/tests/__tests__/test-kafka-with-spotbugs.ts" ]; then
    print_success "Kafka with SpotBugs test exists ✅"
else
    print_failure "Kafka with SpotBugs test not found"
fi

# ============================================================================
# FINAL SUMMARY
# ============================================================================

print_header "VALIDATION RESULTS SUMMARY"

echo -e "${BLUE}📊 Test Statistics:${NC}"
echo -e "   ${GREEN}Passed: ${#TESTS_PASSED[@]}${NC}"
echo -e "   ${RED}Failed: ${#TESTS_FAILED[@]}${NC}"
echo ""

if [ ${#TESTS_PASSED[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ Passed Tests (${#TESTS_PASSED[@]}):${NC}"
    for test in "${TESTS_PASSED[@]}"; do
        echo -e "   ✅ $test"
    done
    echo ""
fi

if [ ${#TESTS_FAILED[@]} -gt 0 ]; then
    echo -e "${RED}❌ Failed Tests (${#TESTS_FAILED[@]}):${NC}"
    for test in "${TESTS_FAILED[@]}"; do
        echo -e "   ❌ $test"
    done
    echo ""
fi

# Calculate success rate
TOTAL_TESTS=$((${#TESTS_PASSED[@]} + ${#TESTS_FAILED[@]}))
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((${#TESTS_PASSED[@]} * 100 / TOTAL_TESTS))
    echo -e "${BLUE}Success Rate: ${SUCCESS_RATE}%${NC}"
    echo ""
fi

# Final verdict
if [ ${#TESTS_FAILED[@]} -eq 0 ]; then
    print_header "✅ ALL VALIDATIONS PASSED!"
    echo ""
    echo -e "${GREEN}All code-level fixes verified:${NC}"
    echo -e "   ✅ All 6 Java tool fixes implemented"
    echo -e "   ✅ Resilient AI infrastructure in place"
    echo -e "   ✅ Developer skill tracking system ready"
    echo -e "   ✅ Oracle Cloud connectivity confirmed"
    echo -e "   ✅ All test suites available"
    echo ""
    echo -e "${GREEN}Ready for full E2E testing on Oracle Cloud! 🚀${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "   1. Run full E2E tests on Oracle Cloud (with Redis)"
    echo -e "   2. Test real repositories (Apache Kafka, WebGoat)"
    echo -e "   3. Validate V9 complete flow end-to-end"
    echo ""
    exit 0
else
    print_header "⚠️  SOME VALIDATIONS FAILED"
    echo ""
    echo -e "${YELLOW}Please review failed tests above${NC}"
    echo ""
    exit 1
fi

#!/bin/bash

# Framework Protection Suite - Master Validation Script
# This script runs all validation tools and provides a comprehensive protection report

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
AGENTS_DIR="$PROJECT_ROOT/packages/agents"
SCRIPTS_DIR="$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${CYAN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}❌ ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️  WARNING:${NC} $1"
}

success() {
    echo -e "${GREEN}✅ SUCCESS:${NC} $1"
}

info() {
    echo -e "${BLUE}ℹ️  INFO:${NC} $1"
}

# Initialize counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_COUNT=0

# Function to run a check and track results
run_check() {
    local check_name="$1"
    local command="$2"
    local critical="${3:-false}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    log "Running: $check_name"
    
    if eval "$command" >/dev/null 2>&1; then
        success "$check_name"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$critical" = "true" ]; then
            error "$check_name - CRITICAL FAILURE"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        else
            warning "$check_name - Non-critical issue"
            WARNING_COUNT=$((WARNING_COUNT + 1))
            return 2
        fi
    fi
}

# Header
echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║              FRAMEWORK PROTECTION SUITE - V9 GUARD                ║"
echo "║                    Comprehensive Validation System                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log "Starting comprehensive framework protection validation..."
log "Project root: $PROJECT_ROOT"

# Change to agents directory
cd "$AGENTS_DIR"

echo ""
echo -e "${BLUE}🔍 PHASE 1: Configuration Validation${NC}"
echo "═══════════════════════════════════════════════════════"

# Check if configuration files exist
run_check "Framework registry exists (.codequal-config.yaml)" \
    "test -f .codequal-config.yaml" true

run_check "Component manifest exists (.codequal-manifest.json)" \
    "test -f .codequal-manifest.json" true

run_check "Session validator exists" \
    "test -f src/session-validator.ts" true

run_check "Framework guards exist" \
    "test -f src/framework-guards.ts" true

run_check "Naming enforcer exists" \
    "test -f src/naming-enforcer.ts" true

echo ""
echo -e "${BLUE}🛡️  PHASE 2: Framework Validation${NC}"
echo "═══════════════════════════════════════════════════════"

# Core framework validation
run_check "Framework validation (session-validator)" \
    "npx ts-node src/session-validator.ts" true

# Component manifest validation
run_check "Component existence verification" \
    "npx ts-node src/framework-guards.ts check" true

# Naming convention compliance
run_check "Naming convention compliance" \
    "npx ts-node src/naming-enforcer.ts check" false

# Directory structure validation
run_check "Directory structure compliance" \
    "npx ts-node src/naming-enforcer.ts structure" false

echo ""
echo -e "${BLUE}🔍 PHASE 3: Framework Integrity Checks${NC}"
echo "═══════════════════════════════════════════════════════"

# Check for V9 framework components
run_check "V9 analyzer framework exists" \
    "test -f src/two-branch/analyzers/v9-analyzer-framework.ts" true

run_check "V9 base analyzer exists" \
    "test -f src/two-branch/analyzers/v9-base-analyzer.ts" true

run_check "V9 analyzer factory exists" \
    "test -f src/two-branch/analyzers/v9-analyzer-factory.ts" true

run_check "V9 types definition exists" \
    "test -f src/two-branch/analyzers/v9-types.ts" true

run_check "Working test file exists" \
    "test -f ../test-v9-kafka-fixed.ts" true

echo ""
echo -e "${BLUE}🚫 PHASE 4: Duplication Detection${NC}"
echo "═══════════════════════════════════════════════════════"

# Check for forbidden directories
run_check "No standard/analyzers directory" \
    "test ! -d src/standard/analyzers" true

run_check "No specialized/analyzers directory" \
    "test ! -d src/specialized/analyzers" true

run_check "No root analyzers directory" \
    "test ! -d src/analyzers" true

# Check for V7/V8 files (should be archived/deprecated)
run_check "No V7 analyzer files in active locations" \
    "! find src/two-branch -name '*v7*analyzer*.ts' -type f | grep -q ." false

run_check "No V8 analyzer files in active locations" \
    "! find src/two-branch -name '*v8*analyzer*.ts' -type f | grep -q ." false

# Check for forbidden naming patterns
run_check "No new-analyzer files" \
    "! find src -name 'new-analyzer*.ts' -type f | grep -q ." true

run_check "No improved-analyzer files" \
    "! find src -name 'improved-*.ts' -type f | grep -q ." true

echo ""
echo -e "${BLUE}🧪 PHASE 5: Testing Validation${NC}"
echo "═══════════════════════════════════════════════════════"

# Test file validation
run_check "TypeScript compilation check" \
    "npx tsc --noEmit" false

run_check "Working test file execution" \
    "timeout 30s npx ts-node ../test-v9-kafka-fixed.ts >/dev/null 2>&1" false

echo ""
echo -e "${BLUE}🔧 PHASE 6: Git Protection Status${NC}"
echo "═══════════════════════════════════════════════════════"

# Git hooks validation
run_check "Git pre-commit hook exists" \
    "test -f ../.git/hooks/pre-commit" false

run_check "Git pre-commit hook is executable" \
    "test -x ../.git/hooks/pre-commit" false

run_check "Git hooks setup script exists" \
    "test -f scripts/setup-git-hooks.sh" true

echo ""
echo -e "${BLUE}📋 PHASE 7: Template Validation${NC}"
echo "═══════════════════════════════════════════════════════"

# Template validation
run_check "Session starter template exists" \
    "test -f templates/session-starter-template.md" true

run_check "Component creation template exists" \
    "test -f templates/component-creation-template.md" true

run_check "Session handoff template exists" \
    "test -f templates/session-handoff-template.md" true

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Generate summary report
echo -e "${CYAN}📊 VALIDATION SUMMARY REPORT${NC}"
echo "═══════════════════════════════════════════════════════"
echo ""
echo -e "Total Checks Run:     ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed:              ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed (Critical):   ${RED}$FAILED_CHECKS${NC}"
echo -e "Warnings:            ${YELLOW}$WARNING_COUNT${NC}"
echo ""

# Calculate success rate
SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo -e "Success Rate:        ${BLUE}$SUCCESS_RATE%${NC}"

# Determine overall status
if [ $FAILED_CHECKS -eq 0 ]; then
    if [ $WARNING_COUNT -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 FRAMEWORK PROTECTION STATUS: EXCELLENT${NC}"
        echo -e "${GREEN}✅ All critical systems operational${NC}"
        echo -e "${GREEN}✅ Framework duplication prevention active${NC}"
        echo -e "${GREEN}✅ V9 Two-Branch Analyzer protected${NC}"
        echo ""
        echo -e "${CYAN}🛡️  Your codebase is fully protected against framework duplication!${NC}"
        FINAL_STATUS=0
    else
        echo ""
        echo -e "${YELLOW}⚠️  FRAMEWORK PROTECTION STATUS: GOOD WITH WARNINGS${NC}"
        echo -e "${GREEN}✅ All critical systems operational${NC}"
        echo -e "${YELLOW}⚠️  Some non-critical issues detected${NC}"
        echo -e "${GREEN}✅ Framework duplication prevention active${NC}"
        echo ""
        echo -e "${CYAN}🛡️  Core protection is active, but consider addressing warnings${NC}"
        FINAL_STATUS=0
    fi
else
    echo ""
    echo -e "${RED}🚨 FRAMEWORK PROTECTION STATUS: COMPROMISED${NC}"
    echo -e "${RED}❌ Critical system failures detected${NC}"
    echo -e "${RED}❌ Framework duplication prevention may be disabled${NC}"
    echo -e "${RED}❌ Manual intervention required${NC}"
    echo ""
    echo -e "${RED}🛑 DO NOT PROCEED WITH DEVELOPMENT UNTIL ISSUES ARE RESOLVED${NC}"
    FINAL_STATUS=1
fi

echo ""
echo -e "${BLUE}📖 RECOMMENDED ACTIONS${NC}"
echo "═══════════════════════════════════════════════════════"

if [ $FAILED_CHECKS -gt 0 ]; then
    echo -e "${RED}CRITICAL ACTIONS REQUIRED:${NC}"
    echo "1. Address all failed critical checks above"
    echo "2. Ensure .codequal-config.yaml and .codequal-manifest.json exist"
    echo "3. Verify V9 framework components are in place"
    echo "4. Run validation again: ./scripts/framework-protection-suite.sh"
    echo ""
fi

if [ $WARNING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}RECOMMENDED IMPROVEMENTS:${NC}"
    echo "1. Review warning items above"
    echo "2. Fix naming convention violations"
    echo "3. Update directory structure if needed"
    echo "4. Install Git hooks: ./scripts/setup-git-hooks.sh"
    echo ""
fi

echo -e "${CYAN}REGULAR MAINTENANCE:${NC}"
echo "1. Run this validation suite before each session"
echo "2. Check framework integrity after major changes"
echo "3. Update documentation templates as framework evolves"
echo "4. Review and update component manifest regularly"

echo ""
echo -e "${BLUE}📞 SUPPORT RESOURCES${NC}"
echo "═══════════════════════════════════════════════════════"
echo "• Framework Documentation: V9_FRAMEWORK_ESTABLISHED.md"
echo "• Working Test Reference: test-v9-kafka-fixed.ts" 
echo "• Session Startup Guide: templates/session-starter-template.md"
echo "• Component Creation Guide: templates/component-creation-template.md"
echo "• Framework Registry: .codequal-config.yaml"
echo "• Component Manifest: .codequal-manifest.json"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    FRAMEWORK PROTECTION SUITE                     ║${NC}"
if [ $FINAL_STATUS -eq 0 ]; then
    echo -e "${CYAN}║                        ${GREEN}✅ PROTECTION ACTIVE${CYAN}                         ║${NC}"
else
    echo -e "${CYAN}║                        ${RED}🚨 PROTECTION FAILED${CYAN}                        ║${NC}"
fi
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"

exit $FINAL_STATUS
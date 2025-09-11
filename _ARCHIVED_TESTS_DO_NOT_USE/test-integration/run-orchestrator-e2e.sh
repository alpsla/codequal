#!/bin/bash

# CodeQual Orchestrator E2E Test Runner
# This script provides an easy interface to run the orchestrator E2E tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure your API keys.${NC}"
    exit 1
fi

# Function to display usage
usage() {
    echo -e "${BLUE}CodeQual Orchestrator E2E Test Runner${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  all              Run all predefined test scenarios"
    echo "  custom <url> <pr> Test a specific GitHub PR"
    echo "  tracking         Test token usage tracking"
    echo "  quick            Run only the quick test scenario"
    echo "  report           Show the latest test report"
    echo "  clean            Clean up old test reports"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 custom https://github.com/facebook/react 28000"
    echo "  $0 tracking"
    echo ""
}

# Function to run all tests
run_all() {
    echo -e "${BLUE}Running all orchestrator E2E test scenarios...${NC}"
    npm run test:orchestrator-e2e
}

# Function to run custom test
run_custom() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo -e "${RED}Error: Repository URL and PR number required${NC}"
        echo "Usage: $0 custom <repository-url> <pr-number>"
        exit 1
    fi
    
    echo -e "${BLUE}Running custom test for PR #$2 in $1...${NC}"
    npm run test:orchestrator-e2e -- --repo "$1" "$2"
}

# Function to run tracking test
run_tracking() {
    echo -e "${BLUE}Testing token usage tracking...${NC}"
    npm run test:orchestrator-e2e:tracking
}

# Function to run quick test
run_quick() {
    echo -e "${BLUE}Running quick test scenario...${NC}"
    # Temporarily modify the test to run only the first scenario
    export E2E_QUICK_TEST=true
    npm run test:orchestrator-e2e
}

# Function to show latest report
show_report() {
    LATEST_REPORT=$(ls -t reports/orchestrator-e2e-*.json 2>/dev/null | head -1)
    
    if [ -z "$LATEST_REPORT" ]; then
        echo -e "${YELLOW}No test reports found.${NC}"
        exit 0
    fi
    
    echo -e "${BLUE}Latest test report: $LATEST_REPORT${NC}"
    echo ""
    
    # Use jq if available, otherwise cat
    if command -v jq &> /dev/null; then
        jq '.summary' "$LATEST_REPORT"
    else
        cat "$LATEST_REPORT"
    fi
}

# Function to clean old reports
clean_reports() {
    echo -e "${YELLOW}Cleaning old test reports...${NC}"
    
    # Keep only the 5 most recent reports
    ls -t reports/orchestrator-e2e-*.json 2>/dev/null | tail -n +6 | xargs -r rm -f
    
    echo -e "${GREEN}Old reports cleaned.${NC}"
}

# Main script logic
case "$1" in
    all)
        run_all
        ;;
    custom)
        run_custom "$2" "$3"
        ;;
    tracking)
        run_tracking
        ;;
    quick)
        run_quick
        ;;
    report)
        show_report
        ;;
    clean)
        clean_reports
        ;;
    *)
        usage
        exit 0
        ;;
esac

echo -e "${GREEN}Done!${NC}"
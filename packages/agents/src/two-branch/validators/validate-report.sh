#!/bin/bash

# V9 Report Validator Script
# Convenience script for validating V9 reports

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VALIDATOR_SCRIPT="$SCRIPT_DIR/cli-validator.ts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
THRESHOLD=90
VERBOSE=false
JSON=false

# Function to show usage
show_usage() {
    echo -e "${BLUE}V9 Template Validator${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] <report-file>"
    echo ""
    echo "Options:"
    echo "  -t, --threshold NUM  Minimum percentage threshold (default: 90)"
    echo "  -v, --verbose        Show detailed validation report"
    echo "  -j, --json          Output results in JSON format"
    echo "  -l, --list          List all required sections"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 report.md                    # Validate with 90% threshold"
    echo "  $0 -t 80 report.md             # Validate with 80% threshold"
    echo "  $0 --verbose report.md         # Show detailed report"
    echo "  $0 --json report.md            # JSON output"
    echo "  $0 --list                      # List required sections"
    echo ""
    exit 0
}

# Function to list sections
list_sections() {
    echo -e "${BLUE}Running V9 validator to list sections...${NC}"
    cd "$(dirname "$VALIDATOR_SCRIPT")"
    npx ts-node "$(basename "$VALIDATOR_SCRIPT")" --list
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -j|--json)
            JSON=true
            shift
            ;;
        -l|--list)
            list_sections
            ;;
        -h|--help)
            show_usage
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}" >&2
            show_usage
            ;;
        *)
            if [[ -z "${REPORT_FILE:-}" ]]; then
                REPORT_FILE="$1"
            else
                echo -e "${RED}Error: Multiple files specified${NC}" >&2
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if report file is specified
if [[ -z "${REPORT_FILE:-}" ]]; then
    echo -e "${RED}Error: No report file specified${NC}" >&2
    echo ""
    show_usage
fi

# Check if report file exists
if [[ ! -f "$REPORT_FILE" ]]; then
    echo -e "${RED}Error: File not found: $REPORT_FILE${NC}" >&2
    exit 1
fi

# Build command arguments
ARGS=("--file" "$REPORT_FILE" "--threshold" "$THRESHOLD")

if [[ "$VERBOSE" == "true" ]]; then
    ARGS+=("--verbose")
fi

if [[ "$JSON" == "true" ]]; then
    ARGS+=("--json")
fi

# Run the validator
echo -e "${BLUE}Validating V9 report: $REPORT_FILE${NC}"
echo -e "${BLUE}Threshold: $THRESHOLD%${NC}"
echo ""

cd "$(dirname "$VALIDATOR_SCRIPT")"
if npx ts-node "$(basename "$VALIDATOR_SCRIPT")" "${ARGS[@]}"; then
    if [[ "$JSON" != "true" ]]; then
        echo ""
        echo -e "${GREEN}✅ Validation completed successfully${NC}"
    fi
    exit 0
else
    EXIT_CODE=$?
    if [[ "$JSON" != "true" ]]; then
        echo ""
        if [[ $EXIT_CODE -eq 1 ]]; then
            echo -e "${YELLOW}⚠️  Report validation failed (below threshold)${NC}"
        else
            echo -e "${RED}❌ Validation error${NC}"
        fi
    fi
    exit $EXIT_CODE
fi
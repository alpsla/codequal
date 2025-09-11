#!/bin/bash

# Enhanced script to properly capture and display failed tests
# Usage: ./debug-failed-tests-working.sh [package-name] [options]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'
DIM='\033[2m'

# Variables
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
TEMP_DIR="$PROJECT_ROOT/.test-results"
FAILED_TESTS_FILE="$TEMP_DIR/failed-tests.txt"
PACKAGE_NAME="${1:-}"

# Create temp directory
mkdir -p "$TEMP_DIR"

# Function to print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# Function to run tests for a package
run_package_tests() {
    local package_path=$1
    local package_name=$(basename "$package_path")
    local output_file="$TEMP_DIR/${package_name}-output.txt"
    local json_file="$TEMP_DIR/${package_name}-results.json"
    
    print_color "$BLUE" "\n📦 Testing package: $package_name"
    
    cd "$package_path"
    
    # Check if package has tests
    if [ ! -f "package.json" ] || ! grep -q '"test"' package.json 2>/dev/null; then
        print_color "$YELLOW" "  ⚠️  No test script found in $package_name"
        return 0
    fi
    
    # Run tests and capture output
    local test_passed=true
    if npm test 2>&1 | tee "$output_file"; then
        print_color "$GREEN" "  ✅ All tests passed in $package_name"
    else
        test_passed=false
        print_color "$RED" "  ❌ Tests failed in $package_name"
        
        # Extract failed test information
        echo -e "\n=== FAILED PACKAGE: $package_name ===" >> "$FAILED_TESTS_FILE"
        
        # Look for FAIL blocks in the output
        if grep -q "FAIL" "$output_file"; then
            # Extract failed test files
            grep "FAIL" "$output_file" | while read -r line; do
                if [[ $line =~ FAIL[[:space:]]+(.*) ]]; then
                    echo "Failed test file: ${BASH_REMATCH[1]}" >> "$FAILED_TESTS_FILE"
                fi
            done
            
            # Extract TypeScript errors
            if grep -q "error TS" "$output_file"; then
                echo -e "\nTypeScript Errors:" >> "$FAILED_TESTS_FILE"
                grep -A 2 "error TS" "$output_file" >> "$FAILED_TESTS_FILE"
            fi
            
            # Extract test suite summary
            if grep -q "Test Suites:" "$output_file"; then
                echo -e "\nTest Summary:" >> "$FAILED_TESTS_FILE"
                grep -E "(Test Suites:|Tests:|Snapshots:|Time:)" "$output_file" >> "$FAILED_TESTS_FILE"
            fi
        fi
        
        echo "" >> "$FAILED_TESTS_FILE"
    fi
    
    return 0
}

# Main execution
main() {
    print_color "$PURPLE" "${BOLD}🧪 CodeQual Test Debugger${NC}"
    print_color "$PURPLE" "========================"
    
    # Clear previous results
    rm -f "$FAILED_TESTS_FILE"
    touch "$FAILED_TESTS_FILE"
    
    # Determine which packages to test
    local packages_to_test=()
    
    if [ -z "$PACKAGE_NAME" ]; then
        # Test all packages
        for dir in "$PROJECT_ROOT"/packages/* "$PROJECT_ROOT"/apps/*; do
            if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
                packages_to_test+=("$dir")
            fi
        done
    else
        # Test specific package
        if [ -d "$PROJECT_ROOT/packages/$PACKAGE_NAME" ]; then
            packages_to_test+=("$PROJECT_ROOT/packages/$PACKAGE_NAME")
        elif [ -d "$PROJECT_ROOT/apps/$PACKAGE_NAME" ]; then
            packages_to_test+=("$PROJECT_ROOT/apps/$PACKAGE_NAME")
        else
            print_color "$RED" "❌ Package '$PACKAGE_NAME' not found!"
            exit 1
        fi
    fi
    
    # Run tests for each package
    local failed_packages=0
    for package in "${packages_to_test[@]}"; do
        run_package_tests "$package"
        
        # Check if this package had failures
        if grep -q "$(basename "$package")" "$FAILED_TESTS_FILE" 2>/dev/null; then
            ((failed_packages++)) || true
        fi
    done
    
    # Display results
    print_color "$PURPLE" "\n${BOLD}📊 TEST RESULTS SUMMARY${NC}"
    print_color "$PURPLE" "======================"
    
    if [ ! -s "$FAILED_TESTS_FILE" ]; then
        print_color "$GREEN" "\n✨ All tests passed! No failures found."
    else
        print_color "$RED" "\n❌ Found test failures in $failed_packages package(s)"
        
        # Display failed packages
        print_color "$YELLOW" "\n📦 Failed Packages:"
        grep "=== FAILED PACKAGE:" "$FAILED_TESTS_FILE" | sed 's/=== FAILED PACKAGE: /  • /' | sed 's/ ===//'
        
        # Show TypeScript error summary
        local ts_error_count=$(grep -c "error TS" "$FAILED_TESTS_FILE" 2>/dev/null || echo 0)
        if [ "$ts_error_count" -gt 0 ]; then
            print_color "$YELLOW" "\n🔧 TypeScript Errors: $ts_error_count"
            
            # Show unique error types
            print_color "$NC" "\nError Types Found:"
            grep -o "error TS[0-9]\+" "$FAILED_TESTS_FILE" | sort -u | while read -r error; do
                local count=$(grep -c "$error" "$FAILED_TESTS_FILE")
                case "$error" in
                    "error TS2307") echo "  • $error: Cannot find module ($count occurrences)" ;;
                    "error TS2339") echo "  • $error: Property does not exist ($count occurrences)" ;;
                    "error TS2345") echo "  • $error: Argument type mismatch ($count occurrences)" ;;
                    "error TS2558") echo "  • $error: Wrong number of type arguments ($count occurrences)" ;;
                    "error TS1161") echo "  • $error: Unterminated string/regex ($count occurrences)" ;;
                    *) echo "  • $error: ($count occurrences)" ;;
                esac
            done
        fi
        
        # Show test suite summary
        print_color "$YELLOW" "\n📊 Overall Test Results:"
        if grep -q "Test Suites:" "$FAILED_TESTS_FILE"; then
            tail -20 "$FAILED_TESTS_FILE" | grep -A 5 "Test Suites:" | head -5 | while read -r line; do
                echo "  $line"
            done
        fi
        
        print_color "$BLUE" "\n📄 Full details saved to:"
        print_color "$NC" "  $FAILED_TESTS_FILE"
        
        # Provide specific fix suggestions
        print_color "$GREEN" "\n💡 Suggested Fixes:"
        
        if [ "$PACKAGE_NAME" = "testing" ] || [ -z "$PACKAGE_NAME" ]; then
            print_color "$NC" "\nFor Educational Agent tests:"
            print_color "$GREEN" "  ./ultimate-fix-educational-tests.sh"
            print_color "$NC" "  This will fix import paths, Jest syntax, and TypeScript errors"
        fi
        
        print_color "$NC" "\nTo run specific failed tests:"
        grep "Failed test file:" "$FAILED_TESTS_FILE" | head -3 | while read -r line; do
            local file=$(echo "$line" | sed 's/Failed test file: //')
            print_color "$GREEN" "  npm test -- $file"
        done
    fi
}

# Run main function
main

# Exit with error if there were failures
if [ -s "$FAILED_TESTS_FILE" ] && grep -q "FAILED PACKAGE" "$FAILED_TESTS_FILE"; then
    exit 1
else
    exit 0
fi

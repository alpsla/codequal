#!/bin/bash

# Real Tool Testing Script
# Executes all security tools against test repositories and collects metrics

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}🔬 CodeQual Real Tool Testing Suite${NC}"
echo "======================================"
echo ""

# Configuration
TEST_REPOS_DIR="/opt/test-repos"
RESULTS_DIR="/tmp/tool-test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$RESULTS_DIR/test-report-$TIMESTAMP.json"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Initialize report
cat << EOF > "$REPORT_FILE"
{
  "timestamp": "$(date -Iseconds)",
  "environment": "$(uname -a)",
  "test_results": {
EOF

# Function to test Java tools
test_java_tools() {
    echo -e "\n${CYAN}☕ Testing Java Security Tools${NC}"
    echo "--------------------------------"
    
    local JAVA_DIR="$TEST_REPOS_DIR/java-sample"
    local JAVA_RESULTS="$RESULTS_DIR/java"
    mkdir -p "$JAVA_RESULTS"
    
    # Test SpotBugs
    echo -e "${YELLOW}Running SpotBugs...${NC}"
    local SPOTBUGS_START=$(date +%s%3N)
    if command -v spotbugs &> /dev/null; then
        spotbugs -textui -xml:withMessages "$JAVA_DIR" > "$JAVA_RESULTS/spotbugs.xml" 2>&1 || true
        local SPOTBUGS_END=$(date +%s%3N)
        local SPOTBUGS_TIME=$((SPOTBUGS_END - SPOTBUGS_START))
        local SPOTBUGS_ISSUES=$(grep -c "<BugInstance" "$JAVA_RESULTS/spotbugs.xml" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ SpotBugs completed: ${SPOTBUGS_ISSUES} issues found in ${SPOTBUGS_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "java": {
      "spotbugs": {
        "status": "success",
        "execution_time_ms": $SPOTBUGS_TIME,
        "issues_found": $SPOTBUGS_ISSUES,
        "output_file": "$JAVA_RESULTS/spotbugs.xml"
      },
EOF
    else
        echo -e "${RED}❌ SpotBugs not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "java": {
      "spotbugs": {
        "status": "not_installed",
        "error": "SpotBugs command not found"
      },
EOF
    fi
    
    # Test PMD
    echo -e "${YELLOW}Running PMD...${NC}"
    local PMD_START=$(date +%s%3N)
    if command -v pmd &> /dev/null; then
        pmd check -d "$JAVA_DIR" -R rulesets/java/quickstart.xml -f json > "$JAVA_RESULTS/pmd.json" 2>&1 || true
        local PMD_END=$(date +%s%3N)
        local PMD_TIME=$((PMD_END - PMD_START))
        local PMD_ISSUES=$(jq '.violations | length' "$JAVA_RESULTS/pmd.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ PMD completed: ${PMD_ISSUES} issues found in ${PMD_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
      "pmd": {
        "status": "success",
        "execution_time_ms": $PMD_TIME,
        "issues_found": $PMD_ISSUES,
        "output_file": "$JAVA_RESULTS/pmd.json"
      },
EOF
    else
        echo -e "${RED}❌ PMD not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
      "pmd": {
        "status": "not_installed",
        "error": "PMD command not found"
      },
EOF
    fi
    
    # Test Checkstyle
    echo -e "${YELLOW}Running Checkstyle...${NC}"
    local CHECKSTYLE_START=$(date +%s%3N)
    if command -v checkstyle &> /dev/null; then
        checkstyle -c /google_checks.xml "$JAVA_DIR" > "$JAVA_RESULTS/checkstyle.xml" 2>&1 || true
        local CHECKSTYLE_END=$(date +%s%3N)
        local CHECKSTYLE_TIME=$((CHECKSTYLE_END - CHECKSTYLE_START))
        local CHECKSTYLE_ISSUES=$(grep -c "<error" "$JAVA_RESULTS/checkstyle.xml" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Checkstyle completed: ${CHECKSTYLE_ISSUES} issues found in ${CHECKSTYLE_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
      "checkstyle": {
        "status": "success",
        "execution_time_ms": $CHECKSTYLE_TIME,
        "issues_found": $CHECKSTYLE_ISSUES,
        "output_file": "$JAVA_RESULTS/checkstyle.xml"
      }
    },
EOF
    else
        echo -e "${RED}❌ Checkstyle not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
      "checkstyle": {
        "status": "not_installed",
        "error": "Checkstyle command not found"
      }
    },
EOF
    fi
}

# Function to test PHP tools
test_php_tools() {
    echo -e "\n${CYAN}🐘 Testing PHP Security Tools${NC}"
    echo "--------------------------------"
    
    local PHP_DIR="$TEST_REPOS_DIR/php-sample"
    local PHP_RESULTS="$RESULTS_DIR/php"
    mkdir -p "$PHP_RESULTS"
    
    # Test PHP_CodeSniffer
    echo -e "${YELLOW}Running PHP_CodeSniffer...${NC}"
    local PHPCS_START=$(date +%s%3N)
    if command -v phpcs &> /dev/null; then
        phpcs --standard=PSR2 --report=json "$PHP_DIR" > "$PHP_RESULTS/phpcs.json" 2>&1 || true
        local PHPCS_END=$(date +%s%3N)
        local PHPCS_TIME=$((PHPCS_END - PHPCS_START))
        local PHPCS_ISSUES=$(jq '.totals.errors + .totals.warnings' "$PHP_RESULTS/phpcs.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ PHP_CodeSniffer completed: ${PHPCS_ISSUES} issues found in ${PHPCS_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "php": {
      "phpcs": {
        "status": "success",
        "execution_time_ms": $PHPCS_TIME,
        "issues_found": $PHPCS_ISSUES,
        "output_file": "$PHP_RESULTS/phpcs.json"
      },
EOF
    else
        echo -e "${RED}❌ PHP_CodeSniffer not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "php": {
      "phpcs": {
        "status": "not_installed",
        "error": "PHPCS command not found"
      },
EOF
    fi
    
    # Test Psalm
    echo -e "${YELLOW}Running Psalm...${NC}"
    local PSALM_START=$(date +%s%3N)
    if command -v psalm &> /dev/null; then
        psalm --no-cache --output-format=json "$PHP_DIR" > "$PHP_RESULTS/psalm.json" 2>&1 || true
        local PSALM_END=$(date +%s%3N)
        local PSALM_TIME=$((PSALM_END - PSALM_START))
        local PSALM_ISSUES=$(jq '.issues | length' "$PHP_RESULTS/psalm.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Psalm completed: ${PSALM_ISSUES} issues found in ${PSALM_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
      "psalm": {
        "status": "success",
        "execution_time_ms": $PSALM_TIME,
        "issues_found": $PSALM_ISSUES,
        "output_file": "$PHP_RESULTS/psalm.json"
      },
EOF
    else
        echo -e "${RED}❌ Psalm not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
      "psalm": {
        "status": "not_installed",
        "error": "Psalm command not found"
      },
EOF
    fi
    
    # Test PHPStan
    echo -e "${YELLOW}Running PHPStan...${NC}"
    local PHPSTAN_START=$(date +%s%3N)
    if command -v phpstan &> /dev/null; then
        phpstan analyze --no-progress --error-format=json "$PHP_DIR" > "$PHP_RESULTS/phpstan.json" 2>&1 || true
        local PHPSTAN_END=$(date +%s%3N)
        local PHPSTAN_TIME=$((PHPSTAN_END - PHPSTAN_START))
        local PHPSTAN_ISSUES=$(jq '.totals.file_errors' "$PHP_RESULTS/phpstan.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ PHPStan completed: ${PHPSTAN_ISSUES} issues found in ${PHPSTAN_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
      "phpstan": {
        "status": "success",
        "execution_time_ms": $PHPSTAN_TIME,
        "issues_found": $PHPSTAN_ISSUES,
        "output_file": "$PHP_RESULTS/phpstan.json"
      }
    },
EOF
    else
        echo -e "${RED}❌ PHPStan not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
      "phpstan": {
        "status": "not_installed",
        "error": "PHPStan command not found"
      }
    },
EOF
    fi
}

# Function to test C++ tools
test_cpp_tools() {
    echo -e "\n${CYAN}⚙️ Testing C++ Security Tools${NC}"
    echo "--------------------------------"
    
    local CPP_DIR="$TEST_REPOS_DIR/cpp-sample"
    local CPP_RESULTS="$RESULTS_DIR/cpp"
    mkdir -p "$CPP_RESULTS"
    
    # Test Cppcheck
    echo -e "${YELLOW}Running Cppcheck...${NC}"
    local CPPCHECK_START=$(date +%s%3N)
    if command -v cppcheck &> /dev/null; then
        cppcheck --enable=all --xml --xml-version=2 "$CPP_DIR" 2> "$CPP_RESULTS/cppcheck.xml"
        local CPPCHECK_END=$(date +%s%3N)
        local CPPCHECK_TIME=$((CPPCHECK_END - CPPCHECK_START))
        local CPPCHECK_ISSUES=$(grep -c "<error" "$CPP_RESULTS/cppcheck.xml" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Cppcheck completed: ${CPPCHECK_ISSUES} issues found in ${CPPCHECK_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "cpp": {
      "cppcheck": {
        "status": "success",
        "execution_time_ms": $CPPCHECK_TIME,
        "issues_found": $CPPCHECK_ISSUES,
        "output_file": "$CPP_RESULTS/cppcheck.xml"
      },
EOF
    else
        echo -e "${RED}❌ Cppcheck not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "cpp": {
      "cppcheck": {
        "status": "not_installed",
        "error": "Cppcheck command not found"
      },
EOF
    fi
    
    # Test Clang-tidy
    echo -e "${YELLOW}Running Clang-tidy...${NC}"
    local CLANGTIDY_START=$(date +%s%3N)
    if command -v clang-tidy &> /dev/null; then
        clang-tidy "$CPP_DIR/vulnerable.cpp" --checks=* > "$CPP_RESULTS/clang-tidy.txt" 2>&1 || true
        local CLANGTIDY_END=$(date +%s%3N)
        local CLANGTIDY_TIME=$((CLANGTIDY_END - CLANGTIDY_START))
        local CLANGTIDY_ISSUES=$(grep -c "warning:" "$CPP_RESULTS/clang-tidy.txt" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Clang-tidy completed: ${CLANGTIDY_ISSUES} issues found in ${CLANGTIDY_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
      "clang-tidy": {
        "status": "success",
        "execution_time_ms": $CLANGTIDY_TIME,
        "issues_found": $CLANGTIDY_ISSUES,
        "output_file": "$CPP_RESULTS/clang-tidy.txt"
      }
    },
EOF
    else
        echo -e "${RED}❌ Clang-tidy not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
      "clang-tidy": {
        "status": "not_installed",
        "error": "Clang-tidy command not found"
      }
    },
EOF
    fi
}

# Function to test Rust tools
test_rust_tools() {
    echo -e "\n${CYAN}🦀 Testing Rust Security Tools${NC}"
    echo "--------------------------------"
    
    local RUST_DIR="$TEST_REPOS_DIR/rust-sample"
    local RUST_RESULTS="$RESULTS_DIR/rust"
    mkdir -p "$RUST_RESULTS"
    
    # Test cargo-audit
    echo -e "${YELLOW}Running cargo-audit...${NC}"
    local AUDIT_START=$(date +%s%3N)
    if command -v cargo-audit &> /dev/null; then
        cd "$RUST_DIR"
        cargo-audit --json > "$RUST_RESULTS/cargo-audit.json" 2>&1 || true
        local AUDIT_END=$(date +%s%3N)
        local AUDIT_TIME=$((AUDIT_END - AUDIT_START))
        local AUDIT_ISSUES=$(jq '.vulnerabilities.count' "$RUST_RESULTS/cargo-audit.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ cargo-audit completed: ${AUDIT_ISSUES} issues found in ${AUDIT_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "rust": {
      "cargo-audit": {
        "status": "success",
        "execution_time_ms": $AUDIT_TIME,
        "issues_found": $AUDIT_ISSUES,
        "output_file": "$RUST_RESULTS/cargo-audit.json"
      },
EOF
    else
        echo -e "${RED}❌ cargo-audit not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "rust": {
      "cargo-audit": {
        "status": "not_installed",
        "error": "cargo-audit command not found"
      },
EOF
    fi
    
    # Test Clippy
    echo -e "${YELLOW}Running Clippy...${NC}"
    local CLIPPY_START=$(date +%s%3N)
    if command -v cargo &> /dev/null && cargo clippy --version &> /dev/null; then
        cd "$RUST_DIR"
        cargo clippy --message-format=json 2>&1 | grep '"reason":"compiler-message"' > "$RUST_RESULTS/clippy.json" || true
        local CLIPPY_END=$(date +%s%3N)
        local CLIPPY_TIME=$((CLIPPY_END - CLIPPY_START))
        local CLIPPY_ISSUES=$(wc -l < "$RUST_RESULTS/clippy.json")
        echo -e "${GREEN}✅ Clippy completed: ${CLIPPY_ISSUES} issues found in ${CLIPPY_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
      "clippy": {
        "status": "success",
        "execution_time_ms": $CLIPPY_TIME,
        "issues_found": $CLIPPY_ISSUES,
        "output_file": "$RUST_RESULTS/clippy.json"
      }
    },
EOF
    else
        echo -e "${RED}❌ Clippy not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
      "clippy": {
        "status": "not_installed",
        "error": "Clippy not available"
      }
    },
EOF
    fi
}

# Function to test Python tools
test_python_tools() {
    echo -e "\n${CYAN}🐍 Testing Python Security Tools${NC}"
    echo "------------------------------------"
    
    local PYTHON_DIR="$TEST_REPOS_DIR/python-sample"
    local PYTHON_RESULTS="$RESULTS_DIR/python"
    mkdir -p "$PYTHON_RESULTS"
    
    # Test Bandit
    echo -e "${YELLOW}Running Bandit...${NC}"
    local BANDIT_START=$(date +%s%3N)
    if command -v bandit &> /dev/null; then
        bandit -r "$PYTHON_DIR" -f json > "$PYTHON_RESULTS/bandit.json" 2>&1 || true
        local BANDIT_END=$(date +%s%3N)
        local BANDIT_TIME=$((BANDIT_END - BANDIT_START))
        local BANDIT_ISSUES=$(jq '.results | length' "$PYTHON_RESULTS/bandit.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Bandit completed: ${BANDIT_ISSUES} issues found in ${BANDIT_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "python": {
      "bandit": {
        "status": "success",
        "execution_time_ms": $BANDIT_TIME,
        "issues_found": $BANDIT_ISSUES,
        "output_file": "$PYTHON_RESULTS/bandit.json"
      }
    },
EOF
    else
        echo -e "${RED}❌ Bandit not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "python": {
      "bandit": {
        "status": "not_installed",
        "error": "Bandit command not found"
      }
    },
EOF
    fi
}

# Function to test Go tools
test_go_tools() {
    echo -e "\n${CYAN}🐹 Testing Go Security Tools${NC}"
    echo "--------------------------------"
    
    local GO_DIR="$TEST_REPOS_DIR/go-sample"
    local GO_RESULTS="$RESULTS_DIR/go"
    mkdir -p "$GO_RESULTS"
    
    # Test gosec
    echo -e "${YELLOW}Running gosec...${NC}"
    local GOSEC_START=$(date +%s%3N)
    if command -v gosec &> /dev/null; then
        gosec -fmt json "$GO_DIR/..." > "$GO_RESULTS/gosec.json" 2>&1 || true
        local GOSEC_END=$(date +%s%3N)
        local GOSEC_TIME=$((GOSEC_END - GOSEC_START))
        local GOSEC_ISSUES=$(jq '.Issues | length' "$GO_RESULTS/gosec.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ gosec completed: ${GOSEC_ISSUES} issues found in ${GOSEC_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "go": {
      "gosec": {
        "status": "success",
        "execution_time_ms": $GOSEC_TIME,
        "issues_found": $GOSEC_ISSUES,
        "output_file": "$GO_RESULTS/gosec.json"
      }
    },
EOF
    else
        echo -e "${RED}❌ gosec not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "go": {
      "gosec": {
        "status": "not_installed",
        "error": "gosec command not found"
      }
    },
EOF
    fi
}

# Function to test Ruby tools
test_ruby_tools() {
    echo -e "\n${CYAN}💎 Testing Ruby Security Tools${NC}"
    echo "---------------------------------"
    
    local RUBY_DIR="$TEST_REPOS_DIR/ruby-sample"
    local RUBY_RESULTS="$RESULTS_DIR/ruby"
    mkdir -p "$RUBY_RESULTS"
    
    # Test Brakeman
    echo -e "${YELLOW}Running Brakeman...${NC}"
    local BRAKEMAN_START=$(date +%s%3N)
    if command -v brakeman &> /dev/null; then
        brakeman -p "$RUBY_DIR" -f json > "$RUBY_RESULTS/brakeman.json" 2>&1 || true
        local BRAKEMAN_END=$(date +%s%3N)
        local BRAKEMAN_TIME=$((BRAKEMAN_END - BRAKEMAN_START))
        local BRAKEMAN_ISSUES=$(jq '.warnings | length' "$RUBY_RESULTS/brakeman.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Brakeman completed: ${BRAKEMAN_ISSUES} issues found in ${BRAKEMAN_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "ruby": {
      "brakeman": {
        "status": "success",
        "execution_time_ms": $BRAKEMAN_TIME,
        "issues_found": $BRAKEMAN_ISSUES,
        "output_file": "$RUBY_RESULTS/brakeman.json"
      }
    },
EOF
    else
        echo -e "${RED}❌ Brakeman not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "ruby": {
      "brakeman": {
        "status": "not_installed",
        "error": "Brakeman command not found"
      }
    },
EOF
    fi
}

# Function to test JavaScript tools
test_javascript_tools() {
    echo -e "\n${CYAN}📜 Testing JavaScript Security Tools${NC}"
    echo "--------------------------------------"
    
    local JS_DIR="$TEST_REPOS_DIR/javascript-sample"
    local JS_RESULTS="$RESULTS_DIR/javascript"
    mkdir -p "$JS_RESULTS"
    
    # Test ESLint with security plugin
    echo -e "${YELLOW}Running ESLint...${NC}"
    local ESLINT_START=$(date +%s%3N)
    if command -v eslint &> /dev/null; then
        eslint "$JS_DIR" --format json > "$JS_RESULTS/eslint.json" 2>&1 || true
        local ESLINT_END=$(date +%s%3N)
        local ESLINT_TIME=$((ESLINT_END - ESLINT_START))
        local ESLINT_ISSUES=$(jq '.[].messages | length' "$JS_RESULTS/eslint.json" 2>/dev/null | awk '{s+=$1} END {print s}' || echo "0")
        echo -e "${GREEN}✅ ESLint completed: ${ESLINT_ISSUES} issues found in ${ESLINT_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "javascript": {
      "eslint": {
        "status": "success",
        "execution_time_ms": $ESLINT_TIME,
        "issues_found": $ESLINT_ISSUES,
        "output_file": "$JS_RESULTS/eslint.json"
      }
    },
EOF
    else
        echo -e "${RED}❌ ESLint not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "javascript": {
      "eslint": {
        "status": "not_installed",
        "error": "ESLint command not found"
      }
    },
EOF
    fi
}

# Function to test Semgrep (multi-language)
test_semgrep() {
    echo -e "\n${CYAN}🔍 Testing Semgrep (Multi-language)${NC}"
    echo "-------------------------------------"
    
    local SEMGREP_RESULTS="$RESULTS_DIR/semgrep"
    mkdir -p "$SEMGREP_RESULTS"
    
    echo -e "${YELLOW}Running Semgrep...${NC}"
    local SEMGREP_START=$(date +%s%3N)
    if command -v semgrep &> /dev/null; then
        semgrep --config=auto --json "$TEST_REPOS_DIR" > "$SEMGREP_RESULTS/semgrep.json" 2>&1 || true
        local SEMGREP_END=$(date +%s%3N)
        local SEMGREP_TIME=$((SEMGREP_END - SEMGREP_START))
        local SEMGREP_ISSUES=$(jq '.results | length' "$SEMGREP_RESULTS/semgrep.json" 2>/dev/null || echo "0")
        echo -e "${GREEN}✅ Semgrep completed: ${SEMGREP_ISSUES} issues found in ${SEMGREP_TIME}ms${NC}"
        
        cat << EOF >> "$REPORT_FILE"
    "semgrep": {
      "status": "success",
      "execution_time_ms": $SEMGREP_TIME,
      "issues_found": $SEMGREP_ISSUES,
      "output_file": "$SEMGREP_RESULTS/semgrep.json"
    }
EOF
    else
        echo -e "${RED}❌ Semgrep not installed${NC}"
        cat << EOF >> "$REPORT_FILE"
    "semgrep": {
      "status": "not_installed",
      "error": "Semgrep command not found"
    }
EOF
    fi
}

# Main execution
echo "Starting comprehensive tool testing..."
echo ""

# Create test repositories if they don't exist
if [ ! -d "$TEST_REPOS_DIR" ]; then
    echo -e "${YELLOW}Creating test repositories...${NC}"
    bash create-test-repos.sh
fi

# Run all tests
test_java_tools
test_php_tools
test_cpp_tools
test_rust_tools
test_python_tools
test_go_tools
test_ruby_tools
test_javascript_tools
test_semgrep

# Close JSON report
cat << EOF >> "$REPORT_FILE"
  },
  "summary": {
    "total_languages_tested": 8,
    "timestamp_completed": "$(date -Iseconds)"
  }
}
EOF

# Generate summary
echo ""
echo -e "${BLUE}======================================"
echo "📊 Test Results Summary"
echo "======================================${NC}"

# Parse and display results
if command -v jq &> /dev/null; then
    echo -e "\n${CYAN}Tool Installation Status:${NC}"
    jq -r '.test_results | to_entries[] | .key as $lang | .value | to_entries[] | "\($lang)/\(.key): \(.value.status)"' "$REPORT_FILE" | while read line; do
        if [[ $line == *"success"* ]]; then
            echo -e "  ${GREEN}✅ $line${NC}"
        else
            echo -e "  ${RED}❌ $line${NC}"
        fi
    done
    
    echo -e "\n${CYAN}Performance Metrics:${NC}"
    jq -r '.test_results | to_entries[] | .value | to_entries[] | select(.value.execution_time_ms != null) | "  \(.key): \(.value.execution_time_ms)ms (\(.value.issues_found) issues)"' "$REPORT_FILE"
    
    echo -e "\n${CYAN}Total Issues Found by Language:${NC}"
    for lang in java php cpp rust python go ruby javascript; do
        TOTAL=$(jq -r ".test_results.$lang | to_entries[] | .value.issues_found // 0" "$REPORT_FILE" 2>/dev/null | awk '{s+=$1} END {print s}')
        if [ ! -z "$TOTAL" ] && [ "$TOTAL" -gt 0 ]; then
            echo -e "  ${GREEN}$lang: $TOTAL issues${NC}"
        fi
    done
fi

echo ""
echo -e "${GREEN}✅ Testing complete!${NC}"
echo -e "Full report saved to: ${BLUE}$REPORT_FILE${NC}"
echo ""
echo "Next steps:"
echo "1. Review the detailed report: cat $REPORT_FILE | jq"
echo "2. Check individual tool outputs in: $RESULTS_DIR"
echo "3. Compare with expected vulnerabilities in test code"
echo "4. Run integration tests: npm test src/two-branch/tests/integration/real-tools-integration.test.ts"
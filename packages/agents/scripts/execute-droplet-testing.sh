#!/bin/bash

# Master Script for Droplet Testing
# This script orchestrates the entire testing process on the DigitalOcean droplet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}╔════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║     CodeQual Security Tools Testing Suite     ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check for required environment variables
if [ -z "$DROPLET_IP" ]; then
    echo -e "${YELLOW}Please provide the DigitalOcean droplet IP address:${NC}"
    read -p "DROPLET_IP: " DROPLET_IP
    export DROPLET_IP
fi

if [ -z "$DROPLET_USER" ]; then
    DROPLET_USER="root"
    echo -e "${CYAN}Using default user: $DROPLET_USER${NC}"
fi

echo -e "${BLUE}Target Droplet: ${DROPLET_USER}@${DROPLET_IP}${NC}"
echo ""

# Function to show menu
show_menu() {
    echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
    echo -e "${CYAN}Please select an action:${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
    echo "1) Full Installation & Testing (Complete Setup)"
    echo "2) Install Security Tools Only"
    echo "3) Create Test Repositories Only"
    echo "4) Run Tool Tests Only"
    echo "5) Run Integration Tests"
    echo "6) View Test Results"
    echo "7) Check Tool Health Status"
    echo "8) Clean Up Test Environment"
    echo "9) Exit"
    echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
}

# Function to run full installation and testing
run_full_setup() {
    echo -e "\n${YELLOW}Starting full installation and testing...${NC}"
    
    # Step 1: Deploy and install tools
    echo -e "\n${BLUE}Step 1: Installing security tools on droplet${NC}"
    ./deploy-and-test-tools.sh
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Tool installation failed${NC}"
        return 1
    fi
    
    # Step 2: Create test repositories
    echo -e "\n${BLUE}Step 2: Creating test repositories${NC}"
    scp create-test-repos.sh "${DROPLET_USER}@${DROPLET_IP}:/tmp/"
    ssh "${DROPLET_USER}@${DROPLET_IP}" "bash /tmp/create-test-repos.sh"
    
    # Step 3: Run tool tests
    echo -e "\n${BLUE}Step 3: Running security tool tests${NC}"
    scp run-real-tool-tests.sh "${DROPLET_USER}@${DROPLET_IP}:/tmp/"
    ssh "${DROPLET_USER}@${DROPLET_IP}" "bash /tmp/run-real-tool-tests.sh"
    
    # Step 4: Retrieve results
    echo -e "\n${BLUE}Step 4: Retrieving test results${NC}"
    mkdir -p ./results
    scp -r "${DROPLET_USER}@${DROPLET_IP}:/tmp/tool-test-results/*" ./results/ 2>/dev/null || true
    
    echo -e "\n${GREEN}✅ Full setup and testing completed!${NC}"
}

# Function to install tools only
install_tools_only() {
    echo -e "\n${YELLOW}Installing security tools...${NC}"
    scp install-security-tools.sh "${DROPLET_USER}@${DROPLET_IP}:/tmp/"
    ssh "${DROPLET_USER}@${DROPLET_IP}" "bash /tmp/install-security-tools.sh"
}

# Function to create test repos only
create_test_repos() {
    echo -e "\n${YELLOW}Creating test repositories...${NC}"
    scp create-test-repos.sh "${DROPLET_USER}@${DROPLET_IP}:/tmp/"
    ssh "${DROPLET_USER}@${DROPLET_IP}" "bash /tmp/create-test-repos.sh"
}

# Function to run tests only
run_tests_only() {
    echo -e "\n${YELLOW}Running security tool tests...${NC}"
    scp run-real-tool-tests.sh "${DROPLET_USER}@${DROPLET_IP}:/tmp/"
    ssh "${DROPLET_USER}@${DROPLET_IP}" "bash /tmp/run-real-tool-tests.sh"
    
    # Retrieve results
    echo -e "\n${YELLOW}Retrieving results...${NC}"
    mkdir -p ./results
    scp -r "${DROPLET_USER}@${DROPLET_IP}:/tmp/tool-test-results/*" ./results/ 2>/dev/null || true
}

# Function to run integration tests
run_integration_tests() {
    echo -e "\n${YELLOW}Running integration tests...${NC}"
    
    # Deploy test package
    TEMP_DIR=$(mktemp -d)
    tar -czf "$TEMP_DIR/agents-tests.tar.gz" \
        --exclude='node_modules' \
        --exclude='dist' \
        -C ../.. agents
    
    scp "$TEMP_DIR/agents-tests.tar.gz" "${DROPLET_USER}@${DROPLET_IP}:/tmp/"
    
    ssh "${DROPLET_USER}@${DROPLET_IP}" << 'EOF'
cd /opt
tar -xzf /tmp/agents-tests.tar.gz
cd agents
npm install
npm run build
NODE_ENV=production TOOL_MODE=strict npm test src/two-branch/tests/integration/real-tools-integration.test.ts
EOF
    
    rm -rf "$TEMP_DIR"
}

# Function to view results
view_results() {
    echo -e "\n${CYAN}Test Results${NC}"
    echo "═══════════════════════════════════════════════"
    
    # Check local results
    if [ -d "./results" ]; then
        echo -e "${GREEN}Local results found:${NC}"
        ls -la ./results/
        
        # Show latest report if exists
        LATEST_REPORT=$(ls -t ./results/test-report-*.json 2>/dev/null | head -1)
        if [ ! -z "$LATEST_REPORT" ]; then
            echo -e "\n${CYAN}Latest Report Summary:${NC}"
            if command -v jq &> /dev/null; then
                jq '.summary' "$LATEST_REPORT"
            else
                head -20 "$LATEST_REPORT"
            fi
        fi
    else
        echo -e "${YELLOW}No local results found. Fetching from droplet...${NC}"
        mkdir -p ./results
        scp -r "${DROPLET_USER}@${DROPLET_IP}:/tmp/tool-test-results/*" ./results/ 2>/dev/null || {
            echo -e "${RED}No results found on droplet${NC}"
        }
    fi
}

# Function to check health status
check_health() {
    echo -e "\n${CYAN}Checking tool health status...${NC}"
    
    ssh "${DROPLET_USER}@${DROPLET_IP}" << 'EOF'
#!/bin/bash

echo "Tool Installation Status:"
echo "========================="

tools=(
    "java:Java"
    "spotbugs:SpotBugs"
    "pmd:PMD"
    "checkstyle:Checkstyle"
    "php:PHP"
    "phpcs:PHP_CodeSniffer"
    "psalm:Psalm"
    "phpstan:PHPStan"
    "cppcheck:Cppcheck"
    "clang-tidy:Clang-tidy"
    "cargo:Rust/Cargo"
    "cargo-audit:cargo-audit"
    "bandit:Bandit"
    "pylint:PyLint"
    "safety:Safety"
    "go:Go"
    "gosec:gosec"
    "staticcheck:staticcheck"
    "golangci-lint:golangci-lint"
    "ruby:Ruby"
    "brakeman:Brakeman"
    "rubocop:RuboCop"
    "bundle-audit:bundler-audit"
    "eslint:ESLint"
    "semgrep:Semgrep"
)

installed=0
missing=0

for tool_pair in "${tools[@]}"; do
    IFS=':' read -r cmd name <<< "$tool_pair"
    if command -v "$cmd" >/dev/null 2>&1; then
        echo "✅ $name"
        ((installed++))
    else
        echo "❌ $name"
        ((missing++))
    fi
done

echo "========================="
echo "Total: $installed installed, $missing missing"
EOF
}

# Function to clean up
cleanup() {
    echo -e "\n${YELLOW}Cleaning up test environment...${NC}"
    
    ssh "${DROPLET_USER}@${DROPLET_IP}" << 'EOF'
# Remove test repositories
rm -rf /opt/test-repos

# Remove test results
rm -rf /tmp/tool-test-results

# Remove temporary files
rm -f /tmp/*.sh /tmp/*.tar.gz

# Clean npm cache
npm cache clean --force 2>/dev/null || true

echo "✅ Cleanup completed"
EOF
}

# Main loop
while true; do
    show_menu
    read -p "Enter your choice (1-9): " choice
    
    case $choice in
        1)
            run_full_setup
            ;;
        2)
            install_tools_only
            ;;
        3)
            create_test_repos
            ;;
        4)
            run_tests_only
            ;;
        5)
            run_integration_tests
            ;;
        6)
            view_results
            ;;
        7)
            check_health
            ;;
        8)
            cleanup
            ;;
        9)
            echo -e "\n${GREEN}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
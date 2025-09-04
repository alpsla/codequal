#!/bin/bash

# Comprehensive Tool Installation Script for CodeQual
# Date: 2025-09-03
# Purpose: Install all missing tools to achieve 100% coverage across 5 roles

set -e  # Exit on error

echo "🚀 Starting comprehensive tool installation for CodeQual..."
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install tool with status reporting
install_tool() {
    local tool_name=$1
    local install_command=$2
    
    echo -e "${YELLOW}Installing ${tool_name}...${NC}"
    if eval "$install_command"; then
        echo -e "${GREEN}✅ ${tool_name} installed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to install ${tool_name}${NC}"
        return 1
    fi
}

# Track installation stats
TOTAL_TOOLS=0
INSTALLED_TOOLS=0
FAILED_TOOLS=0

echo ""
echo "=== 1. PERFORMANCE TOOLS (Currently 0% coverage) ==="
echo "-----------------------------------------------------"

# Rust Performance Tools
if ! command_exists hyperfine; then
    ((TOTAL_TOOLS++))
    if install_tool "hyperfine (Rust benchmarking)" "cargo install hyperfine"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists flamegraph; then
    ((TOTAL_TOOLS++))
    if install_tool "flamegraph (Rust profiling)" "cargo install flamegraph"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists cargo-criterion; then
    ((TOTAL_TOOLS++))
    if install_tool "cargo-criterion (Rust benchmarking)" "cargo install cargo-criterion"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# JavaScript/Node Performance Tools
if ! command_exists lighthouse; then
    ((TOTAL_TOOLS++))
    if install_tool "lighthouse (JS performance)" "npm install -g lighthouse"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists webpack-bundle-analyzer; then
    ((TOTAL_TOOLS++))
    if install_tool "webpack-bundle-analyzer" "npm install -g webpack-bundle-analyzer"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Python Performance Tools
if ! command_exists py-spy; then
    ((TOTAL_TOOLS++))
    if install_tool "py-spy (Python profiling)" "pip3 install py-spy"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

((TOTAL_TOOLS++))
if install_tool "memory_profiler (Python)" "pip3 install memory-profiler"; then
    ((INSTALLED_TOOLS++))
else
    ((FAILED_TOOLS++))
fi

((TOTAL_TOOLS++))
if install_tool "line_profiler (Python)" "pip3 install line_profiler"; then
    ((INSTALLED_TOOLS++))
else
    ((FAILED_TOOLS++))
fi

# Go Performance Tools
if ! command_exists pprof; then
    ((TOTAL_TOOLS++))
    if install_tool "pprof (Go profiling)" "go install github.com/google/pprof@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=== 2. ARCHITECTURE TOOLS (Currently 0% coverage) ==="
echo "-----------------------------------------------------"

# Rust Architecture Tools
if ! command_exists cargo-deps; then
    ((TOTAL_TOOLS++))
    if install_tool "cargo-deps (Rust dependencies)" "cargo install cargo-deps"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists cargo-modules; then
    ((TOTAL_TOOLS++))
    if install_tool "cargo-modules (Rust modules)" "cargo install cargo-modules"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# JavaScript Architecture Tools
if ! command_exists madge; then
    ((TOTAL_TOOLS++))
    if install_tool "madge (JS dependencies)" "npm install -g madge"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists dependency-cruiser; then
    ((TOTAL_TOOLS++))
    if install_tool "dependency-cruiser (JS)" "npm install -g dependency-cruiser"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Python Architecture Tools
if ! command_exists pydeps; then
    ((TOTAL_TOOLS++))
    if install_tool "pydeps (Python dependencies)" "pip3 install pydeps"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

((TOTAL_TOOLS++))
if install_tool "import-linter (Python)" "pip3 install import-linter"; then
    ((INSTALLED_TOOLS++))
else
    ((FAILED_TOOLS++))
fi

# Go Architecture Tools
if ! command_exists go-callvis; then
    ((TOTAL_TOOLS++))
    if install_tool "go-callvis (Go call graph)" "go install github.com/ofabry/go-callvis@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists goda; then
    ((TOTAL_TOOLS++))
    if install_tool "goda (Go dependency analysis)" "go install github.com/loov/goda@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=== 3. SECURITY TOOLS (Missing languages) ==="
echo "----------------------------------------------"

# Go Security Tools
if ! command_exists gosec; then
    ((TOTAL_TOOLS++))
    if install_tool "gosec (Go security)" "go install github.com/securego/gosec/v2/cmd/gosec@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists staticcheck; then
    ((TOTAL_TOOLS++))
    if install_tool "staticcheck (Go)" "go install honnef.co/go/tools/cmd/staticcheck@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Java Security Tools
if ! command_exists spotbugs; then
    ((TOTAL_TOOLS++))
    echo -e "${YELLOW}Installing SpotBugs (Java)...${NC}"
    if wget -q https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz && \
       tar -xzf spotbugs-4.7.3.tgz && \
       sudo mv spotbugs-4.7.3 /opt/spotbugs && \
       sudo ln -sf /opt/spotbugs/bin/spotbugs /usr/local/bin/spotbugs && \
       rm spotbugs-4.7.3.tgz; then
        echo -e "${GREEN}✅ SpotBugs installed successfully${NC}"
        ((INSTALLED_TOOLS++))
    else
        echo -e "${RED}❌ Failed to install SpotBugs${NC}"
        ((FAILED_TOOLS++))
    fi
fi

# Ruby Security Tools
if ! command_exists brakeman; then
    ((TOTAL_TOOLS++))
    if install_tool "brakeman (Ruby security)" "gem install brakeman"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists bundler-audit; then
    ((TOTAL_TOOLS++))
    if install_tool "bundler-audit (Ruby)" "gem install bundler-audit"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# PHP Security Tools
if ! command_exists psalm; then
    ((TOTAL_TOOLS++))
    if install_tool "psalm (PHP security)" "composer global require vimeo/psalm"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists phpstan; then
    ((TOTAL_TOOLS++))
    if install_tool "phpstan (PHP static analysis)" "composer global require phpstan/phpstan"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# C++ Security Tools
if ! command_exists cppcheck; then
    ((TOTAL_TOOLS++))
    if install_tool "cppcheck (C++ security)" "brew install cppcheck || sudo apt-get install -y cppcheck"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=== 4. CODE QUALITY TOOLS (Missing languages) ==="
echo "-------------------------------------------------"

# Go Quality Tools
if ! command_exists golangci-lint; then
    ((TOTAL_TOOLS++))
    if install_tool "golangci-lint (Go)" "go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Java Quality Tools
if ! command_exists checkstyle; then
    ((TOTAL_TOOLS++))
    echo -e "${YELLOW}Installing Checkstyle (Java)...${NC}"
    if wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.5/checkstyle-10.12.5-all.jar -O /tmp/checkstyle.jar && \
       sudo mv /tmp/checkstyle.jar /opt/checkstyle.jar && \
       echo '#!/bin/bash' | sudo tee /usr/local/bin/checkstyle && \
       echo 'java -jar /opt/checkstyle.jar "$@"' | sudo tee -a /usr/local/bin/checkstyle && \
       sudo chmod +x /usr/local/bin/checkstyle; then
        echo -e "${GREEN}✅ Checkstyle installed successfully${NC}"
        ((INSTALLED_TOOLS++))
    else
        echo -e "${RED}❌ Failed to install Checkstyle${NC}"
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists pmd; then
    ((TOTAL_TOOLS++))
    echo -e "${YELLOW}Installing PMD (Java)...${NC}"
    if wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip && \
       unzip -q pmd-bin-6.55.0.zip && \
       sudo mv pmd-bin-6.55.0 /opt/pmd && \
       sudo ln -sf /opt/pmd/bin/run.sh /usr/local/bin/pmd && \
       rm pmd-bin-6.55.0.zip; then
        echo -e "${GREEN}✅ PMD installed successfully${NC}"
        ((INSTALLED_TOOLS++))
    else
        echo -e "${RED}❌ Failed to install PMD${NC}"
        ((FAILED_TOOLS++))
    fi
fi

# Ruby Quality Tools
if ! command_exists rubocop; then
    ((TOTAL_TOOLS++))
    if install_tool "rubocop (Ruby quality)" "gem install rubocop"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# PHP Quality Tools
if ! command_exists phpcs; then
    ((TOTAL_TOOLS++))
    if install_tool "PHP_CodeSniffer" "composer global require squizlabs/php_codesniffer"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Python Quality Tools (additional)
if ! command_exists pylint; then
    ((TOTAL_TOOLS++))
    if install_tool "pylint (Python quality)" "pip3 install pylint"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists mypy; then
    ((TOTAL_TOOLS++))
    if install_tool "mypy (Python type checking)" "pip3 install mypy"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists black; then
    ((TOTAL_TOOLS++))
    if install_tool "black (Python formatter)" "pip3 install black"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=== 5. DEPENDENCY TOOLS (Missing components) ==="
echo "------------------------------------------------"

# Rust Dependency Tools
if ! command_exists cargo-outdated; then
    ((TOTAL_TOOLS++))
    if install_tool "cargo-outdated (Rust)" "cargo install cargo-outdated"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

if ! command_exists cargo-license; then
    ((TOTAL_TOOLS++))
    if install_tool "cargo-license (Rust)" "cargo install cargo-license"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Python Dependency Tools
if ! command_exists pip-audit; then
    ((TOTAL_TOOLS++))
    if install_tool "pip-audit (Python)" "pip3 install pip-audit"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# Go Dependency Tools  
if ! command_exists nancy; then
    ((TOTAL_TOOLS++))
    if install_tool "nancy (Go dependency check)" "go install github.com/sonatype-nexus-community/nancy@latest"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=== 6. ATTEMPTING PROBLEMATIC TOOLS ==="
echo "---------------------------------------"

# Try cargo-geiger with updated dependencies
if ! command_exists cargo-geiger; then
    ((TOTAL_TOOLS++))
    echo -e "${YELLOW}Attempting cargo-geiger with OpenSSL fix...${NC}"
    # First ensure OpenSSL is installed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install openssl pkg-config
        export PKG_CONFIG_PATH="/usr/local/opt/openssl/lib/pkgconfig"
    else
        sudo apt-get update && sudo apt-get install -y libssl-dev pkg-config
    fi
    
    if install_tool "cargo-geiger (Rust unsafe detection)" "cargo install cargo-geiger"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=== 7. UNIVERSAL/CROSS-LANGUAGE TOOLS ==="
echo "-----------------------------------------"

# Semgrep (if not installed)
if ! command_exists semgrep; then
    ((TOTAL_TOOLS++))
    if install_tool "semgrep (universal SAST)" "pip3 install semgrep"; then
        ((INSTALLED_TOOLS++))
    else
        ((FAILED_TOOLS++))
    fi
fi

# SonarScanner
if ! command_exists sonar-scanner; then
    ((TOTAL_TOOLS++))
    echo -e "${YELLOW}Installing SonarScanner...${NC}"
    if wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006.zip && \
       unzip -q sonar-scanner-cli-5.0.1.3006.zip && \
       sudo mv sonar-scanner-5.0.1.3006 /opt/sonar-scanner && \
       sudo ln -sf /opt/sonar-scanner/bin/sonar-scanner /usr/local/bin/sonar-scanner && \
       rm sonar-scanner-cli-5.0.1.3006.zip; then
        echo -e "${GREEN}✅ SonarScanner installed successfully${NC}"
        ((INSTALLED_TOOLS++))
    else
        echo -e "${RED}❌ Failed to install SonarScanner${NC}"
        ((FAILED_TOOLS++))
    fi
fi

echo ""
echo "=================================================="
echo "📊 INSTALLATION SUMMARY"
echo "=================================================="
echo -e "${GREEN}✅ Successfully installed: ${INSTALLED_TOOLS}/${TOTAL_TOOLS} tools${NC}"
echo -e "${RED}❌ Failed installations: ${FAILED_TOOLS}/${TOTAL_TOOLS} tools${NC}"
echo ""

# Update PATH for current session
export PATH="$PATH:$HOME/go/bin:$HOME/.cargo/bin:$HOME/.composer/vendor/bin"

echo "📝 PATH updated for current session:"
echo "   Added: ~/go/bin (Go tools)"
echo "   Added: ~/.cargo/bin (Rust tools)"
echo "   Added: ~/.composer/vendor/bin (PHP tools)"
echo ""
echo "To make PATH changes permanent, add to your ~/.bashrc or ~/.zshrc:"
echo 'export PATH="$PATH:$HOME/go/bin:$HOME/.cargo/bin:$HOME/.composer/vendor/bin"'
echo ""

# Create verification script
cat > /tmp/verify-tools.sh << 'EOF'
#!/bin/bash
echo "Verifying installed tools..."
echo ""

# Performance Tools
echo "=== PERFORMANCE TOOLS ==="
command -v hyperfine >/dev/null 2>&1 && echo "✅ hyperfine" || echo "❌ hyperfine"
command -v flamegraph >/dev/null 2>&1 && echo "✅ flamegraph" || echo "❌ flamegraph"
command -v lighthouse >/dev/null 2>&1 && echo "✅ lighthouse" || echo "❌ lighthouse"
command -v py-spy >/dev/null 2>&1 && echo "✅ py-spy" || echo "❌ py-spy"

echo ""
echo "=== ARCHITECTURE TOOLS ==="
command -v cargo-deps >/dev/null 2>&1 && echo "✅ cargo-deps" || echo "❌ cargo-deps"
command -v cargo-modules >/dev/null 2>&1 && echo "✅ cargo-modules" || echo "❌ cargo-modules"
command -v madge >/dev/null 2>&1 && echo "✅ madge" || echo "❌ madge"
command -v dependency-cruiser >/dev/null 2>&1 && echo "✅ dependency-cruiser" || echo "❌ dependency-cruiser"

echo ""
echo "=== SECURITY TOOLS ==="
command -v gosec >/dev/null 2>&1 && echo "✅ gosec" || echo "❌ gosec"
command -v brakeman >/dev/null 2>&1 && echo "✅ brakeman" || echo "❌ brakeman"
command -v psalm >/dev/null 2>&1 && echo "✅ psalm" || echo "❌ psalm"
command -v cppcheck >/dev/null 2>&1 && echo "✅ cppcheck" || echo "❌ cppcheck"

echo ""
echo "=== QUALITY TOOLS ==="
command -v golangci-lint >/dev/null 2>&1 && echo "✅ golangci-lint" || echo "❌ golangci-lint"
command -v rubocop >/dev/null 2>&1 && echo "✅ rubocop" || echo "❌ rubocop"
command -v pylint >/dev/null 2>&1 && echo "✅ pylint" || echo "❌ pylint"
command -v mypy >/dev/null 2>&1 && echo "✅ mypy" || echo "❌ mypy"
EOF

chmod +x /tmp/verify-tools.sh

echo "✨ Installation complete!"
echo ""
echo "Run verification script to check all tools:"
echo "   /tmp/verify-tools.sh"
echo ""

if [ $FAILED_TOOLS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some tools failed to install. Please check the errors above.${NC}"
    echo "Common fixes:"
    echo "  - For Go tools: ensure GOPATH is set and go is installed"
    echo "  - For Ruby tools: ensure Ruby and gem are installed"
    echo "  - For PHP tools: ensure Composer is installed"
    echo "  - For Rust tools: ensure Rust toolchain is installed"
    exit 1
else
    echo -e "${GREEN}🎉 All tools installed successfully!${NC}"
    exit 0
fi
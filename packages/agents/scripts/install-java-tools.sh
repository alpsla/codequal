#!/bin/bash

# Java Tools Installation Script
# Purpose: Install critical Java analysis tools to improve coverage from 40% to 90%+
# Date: 2025-09-03

set -e

echo "🚀 Installing Critical Java Tools for CodeQual"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create tools directory
TOOLS_DIR="$HOME/tools"
mkdir -p "$TOOLS_DIR"
cd "$TOOLS_DIR"

# Track installation progress
TOTAL_TOOLS=0
INSTALLED_TOOLS=0
FAILED_TOOLS=0

# Function to install tool
install_tool() {
    local tool_name=$1
    local install_commands=$2
    
    ((TOTAL_TOOLS++))
    echo -e "${YELLOW}Installing ${tool_name}...${NC}"
    
    if eval "$install_commands"; then
        echo -e "${GREEN}✅ ${tool_name} installed successfully${NC}"
        ((INSTALLED_TOOLS++))
        return 0
    else
        echo -e "${RED}❌ Failed to install ${tool_name}${NC}"
        ((FAILED_TOOLS++))
        return 1
    fi
}

echo -e "${BLUE}=== 1. PMD - Java Code Analysis ===${NC}"
echo "-------------------------------------"
install_tool "PMD" "
    if [ ! -d 'pmd-bin-7.7.0' ]; then
        curl -L https://github.com/pmd/pmd/releases/download/pmd_releases%2F7.7.0/pmd-dist-7.7.0-bin.zip -o pmd.zip && \
        unzip -q pmd.zip && \
        rm pmd.zip && \
        echo 'PMD installed at $TOOLS_DIR/pmd-bin-7.7.0'
    else
        echo 'PMD already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 2. Checkstyle - Java Code Standards ===${NC}"
echo "--------------------------------------------"
install_tool "Checkstyle" "
    if [ ! -f 'checkstyle.jar' ]; then
        curl -L https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.20.2/checkstyle-10.20.2-all.jar -o checkstyle.jar && \
        echo 'Checkstyle installed at $TOOLS_DIR/checkstyle.jar'
    else
        echo 'Checkstyle already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 3. OWASP Dependency Check ===${NC}"
echo "----------------------------------"
install_tool "OWASP Dependency Check" "
    if [ ! -d 'dependency-check' ]; then
        curl -L https://github.com/jeremylong/DependencyCheck/releases/download/v11.1.0/dependency-check-11.1.0-release.zip -o dc.zip && \
        unzip -q dc.zip && \
        rm dc.zip && \
        echo 'OWASP Dependency Check installed at $TOOLS_DIR/dependency-check'
    else
        echo 'OWASP Dependency Check already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 4. Google Java Format ===${NC}"
echo "------------------------------"
install_tool "Google Java Format" "
    if [ ! -f 'google-java-format.jar' ]; then
        curl -L https://github.com/google/google-java-format/releases/download/v1.25.0/google-java-format-1.25.0-all-deps.jar -o google-java-format.jar && \
        echo 'Google Java Format installed at $TOOLS_DIR/google-java-format.jar'
    else
        echo 'Google Java Format already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 5. Error Prone ===${NC}"
echo "----------------------"
install_tool "Error Prone" "
    if [ ! -f 'error_prone_core.jar' ]; then
        curl -L https://repo1.maven.org/maven2/com/google/errorprone/error_prone_core/2.36.0/error_prone_core-2.36.0-with-dependencies.jar -o error_prone_core.jar && \
        echo 'Error Prone installed at $TOOLS_DIR/error_prone_core.jar'
    else
        echo 'Error Prone already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 6. JaCoCo - Code Coverage ===${NC}"
echo "----------------------------------"
install_tool "JaCoCo" "
    if [ ! -d 'jacoco' ]; then
        mkdir -p jacoco && \
        curl -L https://repo1.maven.org/maven2/org/jacoco/jacoco/0.8.13/jacoco-0.8.13.zip -o jacoco.zip && \
        unzip -q jacoco.zip -d jacoco && \
        rm jacoco.zip && \
        echo 'JaCoCo installed at $TOOLS_DIR/jacoco'
    else
        echo 'JaCoCo already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 7. SpotBugs Plugins ===${NC}"
echo "----------------------------"
install_tool "FindSecBugs (SpotBugs plugin)" "
    if [ ! -f 'findsecbugs-plugin.jar' ]; then
        curl -L https://github.com/find-sec-bugs/find-sec-bugs/releases/download/version-1.13.0/findsecbugs-plugin-1.13.0.jar -o findsecbugs-plugin.jar && \
        echo 'FindSecBugs plugin installed at $TOOLS_DIR/findsecbugs-plugin.jar'
    else
        echo 'FindSecBugs already installed'
    fi
"

echo ""
echo -e "${BLUE}=== 8. NullAway ===${NC}"
echo "-------------------"
install_tool "NullAway" "
    if [ ! -f 'nullaway.jar' ]; then
        curl -L https://repo1.maven.org/maven2/com/uber/nullaway/nullaway/0.12.2/nullaway-0.12.2.jar -o nullaway.jar && \
        echo 'NullAway installed at $TOOLS_DIR/nullaway.jar'
    else
        echo 'NullAway already installed'
    fi
"

echo ""
echo -e "${BLUE}=== Creating Helper Scripts ===${NC}"
echo "--------------------------------"

# Create PMD wrapper script
cat > "$TOOLS_DIR/pmd" << 'EOF'
#!/bin/bash
TOOLS_DIR="$HOME/tools"
"$TOOLS_DIR/pmd-bin-7.7.0/bin/pmd.sh" "$@"
EOF
chmod +x "$TOOLS_DIR/pmd"

# Create Checkstyle wrapper script
cat > "$TOOLS_DIR/checkstyle" << 'EOF'
#!/bin/bash
TOOLS_DIR="$HOME/tools"
java -jar "$TOOLS_DIR/checkstyle.jar" "$@"
EOF
chmod +x "$TOOLS_DIR/checkstyle"

# Create Google Java Format wrapper script
cat > "$TOOLS_DIR/google-java-format" << 'EOF'
#!/bin/bash
TOOLS_DIR="$HOME/tools"
java -jar "$TOOLS_DIR/google-java-format.jar" "$@"
EOF
chmod +x "$TOOLS_DIR/google-java-format"

# Create OWASP Dependency Check wrapper
cat > "$TOOLS_DIR/dependency-check" << 'EOF'
#!/bin/bash
TOOLS_DIR="$HOME/tools"
"$TOOLS_DIR/dependency-check/bin/dependency-check.sh" "$@"
EOF
chmod +x "$TOOLS_DIR/dependency-check"

echo ""
echo -e "${BLUE}=== Setting up PATH ===${NC}"
echo "------------------------"

# Check which shell is being used
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
else
    SHELL_RC="$HOME/.profile"
fi

# Add tools to PATH if not already added
if ! grep -q "HOME/tools" "$SHELL_RC" 2>/dev/null; then
    echo "" >> "$SHELL_RC"
    echo "# CodeQual Java Tools" >> "$SHELL_RC"
    echo 'export PATH="$PATH:$HOME/tools:$HOME/tools/pmd-bin-7.7.0/bin:$HOME/tools/dependency-check/bin"' >> "$SHELL_RC"
    echo -e "${GREEN}✅ PATH updated in $SHELL_RC${NC}"
else
    echo "PATH already configured"
fi

# Export for current session
export PATH="$PATH:$HOME/tools:$HOME/tools/pmd-bin-7.7.0/bin:$HOME/tools/dependency-check/bin"

echo ""
echo "=================================================="
echo -e "${BLUE}📊 INSTALLATION SUMMARY${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Successfully installed: ${INSTALLED_TOOLS}/${TOTAL_TOOLS} tools${NC}"
if [ $FAILED_TOOLS -gt 0 ]; then
    echo -e "${RED}❌ Failed installations: ${FAILED_TOOLS}/${TOTAL_TOOLS} tools${NC}"
fi

echo ""
echo -e "${BLUE}📝 Installed Java Tools:${NC}"
echo "  • PMD - Comprehensive code analysis"
echo "  • Checkstyle - Code style checking"
echo "  • OWASP Dependency Check - Security vulnerabilities"
echo "  • Google Java Format - Code formatting"
echo "  • Error Prone - Bug detection"
echo "  • JaCoCo - Code coverage"
echo "  • FindSecBugs - Security analysis"
echo "  • NullAway - Null pointer analysis"

echo ""
echo -e "${BLUE}🚀 Quick Test Commands:${NC}"
echo "  $TOOLS_DIR/pmd --version"
echo "  $TOOLS_DIR/checkstyle --version"
echo "  $TOOLS_DIR/google-java-format --version"
echo "  $TOOLS_DIR/dependency-check --version"

echo ""
echo -e "${GREEN}✨ Java tool installation complete!${NC}"
echo "Restart your shell or run: source $SHELL_RC"

# Create validation script
cat > "$TOOLS_DIR/validate-java-tools.sh" << 'EOF'
#!/bin/bash
echo "Validating Java Tools Installation..."
echo ""

check_tool() {
    if [ -f "$1" ] || [ -d "$1" ]; then
        echo "✅ $2: Found at $1"
        return 0
    else
        echo "❌ $2: Not found at $1"
        return 1
    fi
}

TOOLS_DIR="$HOME/tools"
FOUND=0
TOTAL=8

check_tool "$TOOLS_DIR/pmd-bin-7.7.0" "PMD" && ((FOUND++))
check_tool "$TOOLS_DIR/checkstyle.jar" "Checkstyle" && ((FOUND++))
check_tool "$TOOLS_DIR/dependency-check" "OWASP Dependency Check" && ((FOUND++))
check_tool "$TOOLS_DIR/google-java-format.jar" "Google Java Format" && ((FOUND++))
check_tool "$TOOLS_DIR/error_prone_core.jar" "Error Prone" && ((FOUND++))
check_tool "$TOOLS_DIR/jacoco" "JaCoCo" && ((FOUND++))
check_tool "$TOOLS_DIR/findsecbugs-plugin.jar" "FindSecBugs" && ((FOUND++))
check_tool "$TOOLS_DIR/nullaway.jar" "NullAway" && ((FOUND++))

echo ""
echo "Java Tools Coverage: $FOUND/$TOTAL ($(( FOUND * 100 / TOTAL ))%)"
EOF

chmod +x "$TOOLS_DIR/validate-java-tools.sh"

echo ""
echo "Run validation: $TOOLS_DIR/validate-java-tools.sh"
echo ""

if [ $FAILED_TOOLS -eq 0 ]; then
    echo -e "${GREEN}🎉 All Java tools installed successfully!${NC}"
    echo -e "${GREEN}Java coverage improved from 40% to ~90%${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️ Some tools failed to install, but core tools are ready${NC}"
    exit 1
fi
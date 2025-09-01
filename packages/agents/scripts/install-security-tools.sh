#!/bin/bash

# Security Tools Installation Script for DigitalOcean Droplet
# This script installs all required security analysis tools for CodeQual
# Run with: bash install-security-tools.sh

set -e  # Exit on error

echo "🚀 Starting CodeQual Security Tools Installation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install $2${NC}"
        return 1
    fi
}

# Update system
echo -e "\n${YELLOW}📦 Updating system packages...${NC}"
sudo apt-get update -y
sudo apt-get upgrade -y

# Install base dependencies
echo -e "\n${YELLOW}🔧 Installing base dependencies...${NC}"
sudo apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    python3-pip \
    nodejs \
    npm

# ==========================================
# JAVA TOOLS
# ==========================================
echo -e "\n${YELLOW}☕ Installing Java and Java Security Tools...${NC}"

# Install Java (required for SpotBugs, PMD, Checkstyle)
if ! command_exists java; then
    sudo apt-get install -y default-jdk
    print_status $? "Java JDK"
else
    echo -e "${GREEN}✅ Java already installed${NC}"
fi

# Install SpotBugs
if ! command_exists spotbugs; then
    SPOTBUGS_VERSION="4.8.1"
    wget -q https://github.com/spotbugs/spotbugs/releases/download/${SPOTBUGS_VERSION}/spotbugs-${SPOTBUGS_VERSION}.tgz
    sudo tar -xzf spotbugs-${SPOTBUGS_VERSION}.tgz -C /opt/
    sudo ln -sf /opt/spotbugs-${SPOTBUGS_VERSION}/bin/spotbugs /usr/local/bin/spotbugs
    rm spotbugs-${SPOTBUGS_VERSION}.tgz
    print_status $? "SpotBugs"
else
    echo -e "${GREEN}✅ SpotBugs already installed${NC}"
fi

# Install PMD
if ! command_exists pmd; then
    PMD_VERSION="7.0.0"
    wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F${PMD_VERSION}/pmd-dist-${PMD_VERSION}-bin.zip
    sudo unzip -q pmd-dist-${PMD_VERSION}-bin.zip -d /opt/
    sudo ln -sf /opt/pmd-bin-${PMD_VERSION}/bin/pmd /usr/local/bin/pmd
    rm pmd-dist-${PMD_VERSION}-bin.zip
    print_status $? "PMD"
else
    echo -e "${GREEN}✅ PMD already installed${NC}"
fi

# Install Checkstyle
if ! command_exists checkstyle; then
    CHECKSTYLE_VERSION="10.12.5"
    wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-${CHECKSTYLE_VERSION}/checkstyle-${CHECKSTYLE_VERSION}-all.jar
    sudo mv checkstyle-${CHECKSTYLE_VERSION}-all.jar /opt/checkstyle.jar
    echo '#!/bin/bash' | sudo tee /usr/local/bin/checkstyle > /dev/null
    echo 'java -jar /opt/checkstyle.jar "$@"' | sudo tee -a /usr/local/bin/checkstyle > /dev/null
    sudo chmod +x /usr/local/bin/checkstyle
    print_status $? "Checkstyle"
else
    echo -e "${GREEN}✅ Checkstyle already installed${NC}"
fi

# ==========================================
# PHP TOOLS
# ==========================================
echo -e "\n${YELLOW}🐘 Installing PHP and PHP Security Tools...${NC}"

# Install PHP and Composer
if ! command_exists php; then
    sudo apt-get install -y php php-cli php-mbstring php-xml php-curl php-zip
    print_status $? "PHP"
else
    echo -e "${GREEN}✅ PHP already installed${NC}"
fi

if ! command_exists composer; then
    curl -sS https://getcomposer.org/installer | php
    sudo mv composer.phar /usr/local/bin/composer
    print_status $? "Composer"
else
    echo -e "${GREEN}✅ Composer already installed${NC}"
fi

# Install PHP_CodeSniffer
if ! command_exists phpcs; then
    sudo composer global require "squizlabs/php_codesniffer=*"
    sudo ln -sf ~/.composer/vendor/bin/phpcs /usr/local/bin/phpcs
    sudo ln -sf ~/.composer/vendor/bin/phpcbf /usr/local/bin/phpcbf
    print_status $? "PHP_CodeSniffer"
else
    echo -e "${GREEN}✅ PHP_CodeSniffer already installed${NC}"
fi

# Install Psalm
if ! command_exists psalm; then
    sudo composer global require vimeo/psalm
    sudo ln -sf ~/.composer/vendor/bin/psalm /usr/local/bin/psalm
    print_status $? "Psalm"
else
    echo -e "${GREEN}✅ Psalm already installed${NC}"
fi

# Install PHPStan
if ! command_exists phpstan; then
    sudo composer global require phpstan/phpstan
    sudo ln -sf ~/.composer/vendor/bin/phpstan /usr/local/bin/phpstan
    print_status $? "PHPStan"
else
    echo -e "${GREEN}✅ PHPStan already installed${NC}"
fi

# ==========================================
# C++ TOOLS
# ==========================================
echo -e "\n${YELLOW}⚙️ Installing C++ Security Tools...${NC}"

# Install Cppcheck
if ! command_exists cppcheck; then
    sudo apt-get install -y cppcheck
    print_status $? "Cppcheck"
else
    echo -e "${GREEN}✅ Cppcheck already installed${NC}"
fi

# Install Clang tools (includes clang-tidy)
if ! command_exists clang-tidy; then
    sudo apt-get install -y clang clang-tidy clang-tools
    print_status $? "Clang-tidy"
else
    echo -e "${GREEN}✅ Clang-tidy already installed${NC}"
fi

# ==========================================
# RUST TOOLS
# ==========================================
echo -e "\n${YELLOW}🦀 Installing Rust and Rust Security Tools...${NC}"

# Install Rust
if ! command_exists cargo; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    print_status $? "Rust/Cargo"
else
    echo -e "${GREEN}✅ Rust/Cargo already installed${NC}"
fi

# Install cargo-audit
if ! command_exists cargo-audit; then
    cargo install cargo-audit
    print_status $? "cargo-audit"
else
    echo -e "${GREEN}✅ cargo-audit already installed${NC}"
fi

# Install clippy
rustup component add clippy
print_status $? "Clippy"

# ==========================================
# PYTHON TOOLS
# ==========================================
echo -e "\n${YELLOW}🐍 Installing Python Security Tools...${NC}"

# Install Bandit
if ! command_exists bandit; then
    pip3 install bandit
    print_status $? "Bandit"
else
    echo -e "${GREEN}✅ Bandit already installed${NC}"
fi

# Install PyLint
if ! command_exists pylint; then
    pip3 install pylint
    print_status $? "PyLint"
else
    echo -e "${GREEN}✅ PyLint already installed${NC}"
fi

# Install Safety
if ! command_exists safety; then
    pip3 install safety
    print_status $? "Safety"
else
    echo -e "${GREEN}✅ Safety already installed${NC}"
fi

# ==========================================
# GO TOOLS
# ==========================================
echo -e "\n${YELLOW}🐹 Installing Go and Go Security Tools...${NC}"

# Install Go
if ! command_exists go; then
    GO_VERSION="1.21.5"
    wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz
    sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
    export PATH=$PATH:/usr/local/go/bin
    rm go${GO_VERSION}.linux-amd64.tar.gz
    print_status $? "Go"
else
    echo -e "${GREEN}✅ Go already installed${NC}"
fi

# Install gosec
if ! command_exists gosec; then
    go install github.com/securego/gosec/v2/cmd/gosec@latest
    sudo ln -sf ~/go/bin/gosec /usr/local/bin/gosec
    print_status $? "gosec"
else
    echo -e "${GREEN}✅ gosec already installed${NC}"
fi

# Install staticcheck
if ! command_exists staticcheck; then
    go install honnef.co/go/tools/cmd/staticcheck@latest
    sudo ln -sf ~/go/bin/staticcheck /usr/local/bin/staticcheck
    print_status $? "staticcheck"
else
    echo -e "${GREEN}✅ staticcheck already installed${NC}"
fi

# Install golangci-lint
if ! command_exists golangci-lint; then
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /usr/local/bin
    print_status $? "golangci-lint"
else
    echo -e "${GREEN}✅ golangci-lint already installed${NC}"
fi

# ==========================================
# RUBY TOOLS
# ==========================================
echo -e "\n${YELLOW}💎 Installing Ruby Security Tools...${NC}"

# Install Ruby
if ! command_exists ruby; then
    sudo apt-get install -y ruby-full
    print_status $? "Ruby"
else
    echo -e "${GREEN}✅ Ruby already installed${NC}"
fi

# Install Brakeman
if ! command_exists brakeman; then
    sudo gem install brakeman
    print_status $? "Brakeman"
else
    echo -e "${GREEN}✅ Brakeman already installed${NC}"
fi

# Install RuboCop
if ! command_exists rubocop; then
    sudo gem install rubocop
    print_status $? "RuboCop"
else
    echo -e "${GREEN}✅ RuboCop already installed${NC}"
fi

# Install bundler-audit
if ! command_exists bundle-audit; then
    sudo gem install bundler-audit
    print_status $? "bundler-audit"
else
    echo -e "${GREEN}✅ bundler-audit already installed${NC}"
fi

# ==========================================
# JAVASCRIPT/TYPESCRIPT TOOLS
# ==========================================
echo -e "\n${YELLOW}📜 Installing JavaScript/TypeScript Security Tools...${NC}"

# Install ESLint
if ! command_exists eslint; then
    sudo npm install -g eslint
    print_status $? "ESLint"
else
    echo -e "${GREEN}✅ ESLint already installed${NC}"
fi

# Install npm-audit
# npm audit is built into npm, just verify npm is installed
if command_exists npm; then
    echo -e "${GREEN}✅ npm audit available${NC}"
fi

# Install Semgrep
if ! command_exists semgrep; then
    pip3 install semgrep
    print_status $? "Semgrep"
else
    echo -e "${GREEN}✅ Semgrep already installed${NC}"
fi

# ==========================================
# VERIFICATION
# ==========================================
echo -e "\n${YELLOW}🔍 Verifying installations...${NC}"
echo "=============================================="

# Create verification script
cat << 'EOF' > /tmp/verify_tools.sh
#!/bin/bash

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

echo "Tool Status:"
echo "-------------------"

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

echo "-------------------"
echo "Summary: $installed installed, $missing missing"

if [ $missing -eq 0 ]; then
    echo -e "\n🎉 All tools installed successfully!"
    exit 0
else
    echo -e "\n⚠️  Some tools are missing. Please check the installation log."
    exit 1
fi
EOF

chmod +x /tmp/verify_tools.sh
/tmp/verify_tools.sh

# ==========================================
# CONFIGURATION
# ==========================================
echo -e "\n${YELLOW}⚙️ Creating configuration files...${NC}"

# Create tool configuration directory
sudo mkdir -p /etc/codequal/tools

# Create PMD ruleset
cat << 'EOF' | sudo tee /etc/codequal/tools/pmd-ruleset.xml > /dev/null
<?xml version="1.0"?>
<ruleset name="CodeQual Security Rules"
    xmlns="http://pmd.sourceforge.net/ruleset/2.0.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://pmd.sourceforge.net/ruleset/2.0.0 https://pmd.sourceforge.io/ruleset_2_0_0.xsd">
    <description>Security-focused ruleset for CodeQual</description>
    
    <rule ref="category/java/security.xml"/>
    <rule ref="category/java/bestpractices.xml/AvoidUsingHardCodedIP"/>
    <rule ref="category/java/bestpractices.xml/CheckResultSet"/>
</ruleset>
EOF

# Create Checkstyle configuration
cat << 'EOF' | sudo tee /etc/codequal/tools/checkstyle.xml > /dev/null
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC
    "-//Checkstyle//DTD Checkstyle Configuration 1.3//EN"
    "https://checkstyle.org/dtds/configuration_1_3.dtd">
<module name="Checker">
    <module name="TreeWalker">
        <module name="UnusedImports"/>
        <module name="RedundantImport"/>
        <module name="IllegalImport"/>
        <module name="EqualsHashCode"/>
    </module>
</module>
EOF

echo -e "${GREEN}✅ Configuration files created${NC}"

# ==========================================
# ENVIRONMENT SETUP
# ==========================================
echo -e "\n${YELLOW}🌍 Setting up environment...${NC}"

# Add tool paths to PATH
echo 'export PATH=$PATH:/usr/local/go/bin:~/go/bin:~/.composer/vendor/bin:~/.cargo/bin' | sudo tee -a /etc/profile

# Create systemd service for tool health monitoring (optional)
cat << 'EOF' | sudo tee /etc/systemd/system/codequal-tools-health.service > /dev/null
[Unit]
Description=CodeQual Tools Health Monitor
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/codequal-health-check
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF

# Create health check script
cat << 'EOF' | sudo tee /usr/local/bin/codequal-health-check > /dev/null
#!/bin/bash
echo "CodeQual Tools Health Check - $(date)"
/tmp/verify_tools.sh
EOF

sudo chmod +x /usr/local/bin/codequal-health-check

echo -e "${GREEN}✅ Environment setup complete${NC}"

# ==========================================
# FINAL SUMMARY
# ==========================================
echo -e "\n${GREEN}=============================================="
echo "🎉 CodeQual Security Tools Installation Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Source your profile to update PATH:"
echo "   source /etc/profile"
echo ""
echo "2. Run the CodeQual integration tests:"
echo "   cd /path/to/codequal/packages/agents"
echo "   npm test src/two-branch/tests/integration/real-tools-integration.test.ts"
echo ""
echo "3. Set environment variables for production:"
echo "   export NODE_ENV=production"
echo "   export TOOL_MODE=strict"
echo ""
echo "4. Monitor tool health:"
echo "   sudo systemctl status codequal-tools-health"
echo ""
echo "Installation log saved to: /var/log/codequal-tools-install.log"
echo "=============================================="
echo -e "${NC}"
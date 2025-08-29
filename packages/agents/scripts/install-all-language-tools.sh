#!/bin/bash

# ================================================
# Complete Language Tools Installation Script
# Installs all missing tools for 16 language support
# Run on the cloud server (157.230.9.119)
# ================================================

set -e  # Exit on error

echo "🚀 Starting Complete Language Tools Installation"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
apt-get update -y

# ================================================
# JAVA TOOLS (Priority 1)
# ================================================
echo ""
echo "☕ Installing Java Tools..."
echo "------------------------"

# Java runtime and development kit
apt-get install -y default-jdk maven gradle

# SpotBugs for security/quality analysis
if ! command -v spotbugs &> /dev/null; then
    echo "Installing SpotBugs..."
    wget -q https://github.com/spotbugs/spotbugs/releases/download/4.7.3/spotbugs-4.7.3.tgz
    tar -xzf spotbugs-4.7.3.tgz -C /opt/
    ln -sf /opt/spotbugs-4.7.3/bin/spotbugs /usr/local/bin/spotbugs
    rm spotbugs-4.7.3.tgz
fi

# PMD for code quality
if ! command -v pmd &> /dev/null; then
    echo "Installing PMD..."
    wget -q https://github.com/pmd/pmd/releases/download/pmd_releases%2F6.55.0/pmd-bin-6.55.0.zip
    unzip -q pmd-bin-6.55.0.zip -d /opt/
    ln -sf /opt/pmd-bin-6.55.0/bin/run.sh /usr/local/bin/pmd
    rm pmd-bin-6.55.0.zip
fi

# Checkstyle
if ! command -v checkstyle &> /dev/null; then
    echo "Installing Checkstyle..."
    wget -q https://github.com/checkstyle/checkstyle/releases/download/checkstyle-10.12.5/checkstyle-10.12.5-all.jar -O /opt/checkstyle.jar
    echo '#!/bin/bash' > /usr/local/bin/checkstyle
    echo 'java -jar /opt/checkstyle.jar "$@"' >> /usr/local/bin/checkstyle
    chmod +x /usr/local/bin/checkstyle
fi

# OWASP Dependency Check
npm install -g @owasp/dependency-check

# ================================================
# GO TOOLS (Priority 2)
# ================================================
echo ""
echo "🐹 Installing Go Tools..."
echo "------------------------"

# Install Go if not present
if ! command -v go &> /dev/null; then
    snap install go --classic
fi

# Go security tools
go install github.com/securego/gosec/v2/cmd/gosec@latest
go install honnef.co/go/tools/cmd/staticcheck@latest

# Go linting
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b /usr/local/bin

# Go performance profiling
go install github.com/google/pprof@latest
go install github.com/uber/go-torch@latest

# ================================================
# RUBY TOOLS (Priority 3)
# ================================================
echo ""
echo "💎 Installing Ruby Tools..."
echo "------------------------"

# Ruby and gems
apt-get install -y ruby-full

# Security and quality tools
gem install brakeman rubocop bundler-audit solargraph

# ================================================
# PHP TOOLS (Priority 4)
# ================================================
echo ""
echo "🐘 Installing PHP Tools..."
echo "------------------------"

# PHP and composer
apt-get install -y php php-xml php-mbstring composer

# PHP analysis tools
composer global require vimeo/psalm phpstan/phpstan squizlabs/php_codesniffer

# Add composer bin to PATH
echo 'export PATH="$HOME/.composer/vendor/bin:$PATH"' >> ~/.bashrc

# ================================================
# .NET/C# TOOLS (Priority 5)
# ================================================
echo ""
echo "🔷 Installing .NET/C# Tools..."
echo "------------------------"

# Install .NET SDK
if ! command -v dotnet &> /dev/null; then
    wget https://dot.net/v1/dotnet-install.sh
    chmod +x dotnet-install.sh
    ./dotnet-install.sh --channel 7.0
    rm dotnet-install.sh
fi

# .NET security and quality tools
dotnet tool install --global security-scan
dotnet tool install --global dotnet-format
dotnet tool install --global roslynator.dotnet.cli

# ================================================
# RUST TOOLS (Priority 6)
# ================================================
echo ""
echo "🦀 Installing Rust Tools..."
echo "------------------------"

# Install Rust if not present
if ! command -v cargo &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Rust analysis tools
cargo install cargo-audit cargo-clippy cargo-outdated

# ================================================
# SWIFT TOOLS (Priority 7)
# ================================================
echo ""
echo "🦉 Installing Swift Tools (Linux)..."
echo "------------------------"

# Note: Swift on Linux has limited tooling compared to macOS
# SwiftLint and other tools require macOS, so we'll use alternatives

# Download Swift for Linux (if needed for basic analysis)
if ! command -v swift &> /dev/null; then
    echo "Swift installation for Linux is complex and optional"
    echo "Skipping Swift - will use Semgrep for Swift analysis"
fi

# ================================================
# KOTLIN TOOLS (Priority 8)
# ================================================
echo ""
echo "🟣 Installing Kotlin Tools..."
echo "------------------------"

# Kotlin compiler
if ! command -v kotlinc &> /dev/null; then
    snap install kotlin --classic
fi

# Detekt for Kotlin static analysis
curl -sSLO https://github.com/detekt/detekt/releases/download/v1.23.3/detekt-cli-1.23.3.zip
unzip -q detekt-cli-1.23.3.zip -d /opt/detekt
ln -sf /opt/detekt/bin/detekt-cli /usr/local/bin/detekt
rm detekt-cli-1.23.3.zip

# ================================================
# OBJECTIVE-C TOOLS (Priority 9)
# ================================================
echo ""
echo "📱 Installing Objective-C Tools (Linux alternatives)..."
echo "------------------------"

# OCLint for Objective-C (if available for Linux)
# Note: Most Objective-C tools are macOS-specific
# We'll rely on Semgrep and clang tools

apt-get install -y clang clang-tools

# ================================================
# C/C++ ADDITIONAL TOOLS
# ================================================
echo ""
echo "⚙️ Installing C/C++ Additional Tools..."
echo "------------------------"

# Valgrind for memory analysis
apt-get install -y valgrind

# Cppcheck is already installed, but ensure it's present
apt-get install -y cppcheck

# ================================================
# UNIVERSAL TOOLS
# ================================================
echo ""
echo "🌍 Installing Universal Tools..."
echo "------------------------"

# Ensure Semgrep is up to date
pip3 install --upgrade semgrep

# Install additional universal tools
npm install -g jscpd  # Duplicate code detection
npm install -g madge  # Dependency analysis
npm install -g dependency-cruiser  # Architecture analysis

# SonarScanner for comprehensive analysis
if ! command -v sonar-scanner &> /dev/null; then
    wget -q https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-5.0.1.3006-linux.zip
    unzip -q sonar-scanner-cli-5.0.1.3006-linux.zip -d /opt/
    ln -sf /opt/sonar-scanner-5.0.1.3006-linux/bin/sonar-scanner /usr/local/bin/sonar-scanner
    rm sonar-scanner-cli-5.0.1.3006-linux.zip
fi

# ================================================
# PERFORMANCE TOOLS
# ================================================
echo ""
echo "⚡ Installing Performance Tools..."
echo "------------------------"

# Python performance tools
pip3 install py-spy memory-profiler line-profiler

# Node.js performance tools
npm install -g clinic autocannon

# ================================================
# DEPENDENCY MANAGEMENT TOOLS
# ================================================
echo ""
echo "📚 Installing Dependency Management Tools..."
echo "------------------------"

# Python dependency tools
pip3 install safety pip-audit

# Ruby dependency tools (already installed with bundler-audit)

# Java dependency tools (OWASP already installed)

# ================================================
# VERIFICATION
# ================================================
echo ""
echo "✅ Verifying Installations..."
echo "------------------------"

# Function to check if command exists
check_tool() {
    if command -v $1 &> /dev/null; then
        echo "✓ $1 installed"
    else
        echo "✗ $1 NOT found"
    fi
}

# Java tools
check_tool "java"
check_tool "mvn"
check_tool "gradle"
check_tool "spotbugs"
check_tool "pmd"
check_tool "checkstyle"

# Go tools
check_tool "go"
check_tool "gosec"
check_tool "staticcheck"
check_tool "golangci-lint"

# Ruby tools
check_tool "ruby"
check_tool "brakeman"
check_tool "rubocop"

# PHP tools
check_tool "php"
check_tool "composer"

# .NET tools
check_tool "dotnet"

# Rust tools
check_tool "cargo"

# Kotlin tools
check_tool "kotlinc"
check_tool "detekt"

# C/C++ tools
check_tool "clang"
check_tool "cppcheck"
check_tool "valgrind"

# Universal tools
check_tool "semgrep"
check_tool "jscpd"
check_tool "sonar-scanner"

# Python tools (already verified earlier)
check_tool "bandit"
check_tool "pylint"
check_tool "mypy"
check_tool "safety"

# JavaScript/TypeScript tools (already verified earlier)
check_tool "eslint"
check_tool "tsc"

echo ""
echo "================================================"
echo "🎉 Installation Complete!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "- Java tools: SpotBugs, PMD, Checkstyle, OWASP"
echo "- Go tools: gosec, staticcheck, golangci-lint"
echo "- Ruby tools: Brakeman, RuboCop, bundler-audit"
echo "- PHP tools: Psalm, PHPStan, PHP_CodeSniffer"
echo "- .NET tools: security-scan, dotnet-format"
echo "- Rust tools: cargo-audit, cargo-clippy"
echo "- Kotlin tools: detekt"
echo "- C/C++ tools: clang, cppcheck, valgrind"
echo "- Universal tools: Semgrep, JSCPD, SonarScanner"
echo ""
echo "🔄 Please restart any services to pick up new tools"
echo "💡 Some tools may require additional configuration"
#!/bin/bash
#
# Tier 2 Native Fixer Tools Installation Script
# Session 104: Complete installation for CI/CD environments
#
# Usage:
#   ./install-tier2-tools.sh [--all | --python | --go | --java | --cpp | --csharp | --typescript]
#
# Supports: macOS (brew) and Linux (apt)

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ -f /etc/debian_version ]]; then
        echo "debian"
    elif [[ -f /etc/redhat-release ]]; then
        echo "redhat"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
log_info "Detected OS: $OS"

# Check if tool is installed
is_installed() {
    command -v "$1" &> /dev/null
}

# ============================================================================
# Python Tools
# ============================================================================
install_python_tools() {
    log_info "Installing Python tools..."

    # Check for pipx or pip
    if is_installed pipx; then
        PYTHON_INSTALL="pipx install"
    elif is_installed pip; then
        PYTHON_INSTALL="pip install --user"
    elif is_installed pip3; then
        PYTHON_INSTALL="pip3 install --user"
    else
        log_error "Neither pipx nor pip found. Please install Python first."
        return 1
    fi

    # Install ruff
    if ! is_installed ruff; then
        log_info "Installing ruff..."
        $PYTHON_INSTALL ruff || log_warn "Failed to install ruff"
    else
        log_info "ruff already installed"
    fi

    # Install black
    if ! is_installed black; then
        log_info "Installing black..."
        $PYTHON_INSTALL black || log_warn "Failed to install black"
    else
        log_info "black already installed"
    fi

    # Install isort
    if ! is_installed isort; then
        log_info "Installing isort..."
        $PYTHON_INSTALL isort || log_warn "Failed to install isort"
    else
        log_info "isort already installed"
    fi

    # Install autoflake (use pipx for this)
    if ! is_installed autoflake; then
        log_info "Installing autoflake..."
        if is_installed pipx; then
            pipx install autoflake || log_warn "Failed to install autoflake"
        else
            pip install --user autoflake || log_warn "Failed to install autoflake"
        fi
    else
        log_info "autoflake already installed"
    fi

    # Install pyupgrade (use pipx)
    if ! is_installed pyupgrade; then
        log_info "Installing pyupgrade..."
        if is_installed pipx; then
            pipx install pyupgrade || log_warn "Failed to install pyupgrade"
        else
            pip install --user pyupgrade || log_warn "Failed to install pyupgrade"
        fi
    else
        log_info "pyupgrade already installed"
    fi

    log_info "Python tools installation complete"
}

# ============================================================================
# Go Tools
# ============================================================================
install_go_tools() {
    log_info "Installing Go tools..."

    if ! is_installed go; then
        log_error "Go is not installed. Please install Go first."
        if [[ "$OS" == "macos" ]]; then
            log_info "Run: brew install go"
        else
            log_info "Run: apt install golang-go"
        fi
        return 1
    fi

    # gofmt comes with Go
    log_info "gofmt comes with Go installation"

    # Install goimports
    if ! is_installed goimports; then
        log_info "Installing goimports..."
        go install golang.org/x/tools/cmd/goimports@latest || log_warn "Failed to install goimports"
    else
        log_info "goimports already installed"
    fi

    # Install golangci-lint
    if ! is_installed golangci-lint; then
        log_info "Installing golangci-lint..."
        if [[ "$OS" == "macos" ]]; then
            brew install golangci-lint || log_warn "Failed to install golangci-lint"
        else
            # Linux installation
            curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.61.0 || log_warn "Failed to install golangci-lint"
        fi
    else
        log_info "golangci-lint already installed"
    fi

    # Remind about PATH
    log_info "Ensure GOPATH/bin is in PATH: export PATH=\$PATH:\$(go env GOPATH)/bin"

    log_info "Go tools installation complete"
}

# ============================================================================
# Java Tools
# ============================================================================
install_java_tools() {
    log_info "Installing Java tools..."

    if ! is_installed java; then
        log_warn "Java is not installed. Some tools may not work."
    fi

    # Install google-java-format
    if ! is_installed google-java-format; then
        log_info "Installing google-java-format..."
        if [[ "$OS" == "macos" ]]; then
            brew install google-java-format || log_warn "Failed to install google-java-format"
        else
            # Linux: download JAR
            log_info "Downloading google-java-format JAR..."
            mkdir -p ~/tools
            curl -L -o ~/tools/google-java-format.jar \
                https://github.com/google/google-java-format/releases/download/v1.21.0/google-java-format-1.21.0-all-deps.jar || log_warn "Failed to download"
            # Create wrapper script
            cat > ~/tools/google-java-format << 'EOF'
#!/bin/bash
java -jar ~/tools/google-java-format.jar "$@"
EOF
            chmod +x ~/tools/google-java-format
            log_info "Add ~/tools to PATH for google-java-format"
        fi
    else
        log_info "google-java-format already installed"
    fi

    # Install Sorald (JAR download)
    if [[ ! -f ~/tools/sorald.jar ]]; then
        log_info "Downloading Sorald JAR..."
        mkdir -p ~/tools
        curl -L -o ~/tools/sorald.jar \
            https://github.com/ASSERT-KTH/sorald/releases/download/sorald-0.8.6/sorald-0.8.6-jar-with-dependencies.jar || log_warn "Failed to download Sorald"
    else
        log_info "sorald.jar already exists"
    fi

    log_info "Java tools installation complete"
    log_info "Note: OpenRewrite requires Maven/Gradle plugin setup (see docs/OPENREWRITE_SETUP.md)"
}

# ============================================================================
# C/C++ Tools
# ============================================================================
install_cpp_tools() {
    log_info "Installing C/C++ tools..."

    # Install clang-format
    if ! is_installed clang-format; then
        log_info "Installing clang-format..."
        if [[ "$OS" == "macos" ]]; then
            # Usually comes with Xcode, but can install separately
            brew install clang-format || log_warn "Failed to install clang-format"
        else
            sudo apt-get update && sudo apt-get install -y clang-format || log_warn "Failed to install clang-format"
        fi
    else
        log_info "clang-format already installed"
    fi

    # Install LLVM for clang-tidy
    if [[ "$OS" == "macos" ]]; then
        if [[ ! -f /opt/homebrew/opt/llvm/bin/clang-tidy ]]; then
            log_info "Installing LLVM (for clang-tidy)..."
            brew install llvm || log_warn "Failed to install LLVM"
            log_info "Add to PATH: export PATH=\"/opt/homebrew/opt/llvm/bin:\$PATH\""
        else
            log_info "LLVM (clang-tidy) already installed"
        fi
    else
        if ! is_installed clang-tidy; then
            log_info "Installing clang-tidy..."
            sudo apt-get update && sudo apt-get install -y clang-tidy || log_warn "Failed to install clang-tidy"
        else
            log_info "clang-tidy already installed"
        fi
    fi

    log_info "C/C++ tools installation complete"
}

# ============================================================================
# C# Tools
# ============================================================================
install_csharp_tools() {
    log_info "Installing C# tools..."

    # Install .NET SDK
    if ! is_installed dotnet; then
        log_info "Installing .NET SDK..."
        if [[ "$OS" == "macos" ]]; then
            brew install dotnet || log_warn "Failed to install .NET SDK"
        else
            # Linux installation (Microsoft packages)
            log_info "Installing .NET SDK for Linux..."
            wget https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
            sudo dpkg -i packages-microsoft-prod.deb
            rm packages-microsoft-prod.deb
            sudo apt-get update && sudo apt-get install -y dotnet-sdk-8.0 || log_warn "Failed to install .NET SDK"
        fi
    else
        log_info ".NET SDK already installed (dotnet-format included)"
    fi

    log_info "C# tools installation complete"
}

# ============================================================================
# TypeScript/JavaScript Tools
# ============================================================================
install_typescript_tools() {
    log_info "Installing TypeScript/JavaScript tools..."

    if ! is_installed npm && ! is_installed yarn; then
        log_error "Neither npm nor yarn found. Please install Node.js first."
        return 1
    fi

    # ESLint is typically installed per-project
    log_info "ESLint should be installed per-project: npm install eslint --save-dev"
    log_info "Prettier should be installed per-project: npm install prettier --save-dev"

    log_info "TypeScript tools note complete"
}

# ============================================================================
# Main
# ============================================================================
print_usage() {
    echo "Usage: $0 [--all | --python | --go | --java | --cpp | --csharp | --typescript]"
    echo ""
    echo "Options:"
    echo "  --all         Install all tier 2 tools"
    echo "  --python      Install Python tools (ruff, black, isort, autoflake, pyupgrade)"
    echo "  --go          Install Go tools (goimports, golangci-lint)"
    echo "  --java        Install Java tools (google-java-format, sorald)"
    echo "  --cpp         Install C/C++ tools (clang-format, clang-tidy)"
    echo "  --csharp      Install C# tools (.NET SDK / dotnet-format)"
    echo "  --typescript  Install TypeScript tools (eslint, prettier info)"
    echo ""
    echo "Example:"
    echo "  $0 --all        # Install all tools"
    echo "  $0 --python --go # Install Python and Go tools"
}

main() {
    if [[ $# -eq 0 ]]; then
        print_usage
        exit 0
    fi

    for arg in "$@"; do
        case $arg in
            --all)
                install_python_tools
                install_go_tools
                install_java_tools
                install_cpp_tools
                install_csharp_tools
                install_typescript_tools
                ;;
            --python)
                install_python_tools
                ;;
            --go)
                install_go_tools
                ;;
            --java)
                install_java_tools
                ;;
            --cpp)
                install_cpp_tools
                ;;
            --csharp)
                install_csharp_tools
                ;;
            --typescript)
                install_typescript_tools
                ;;
            --help|-h)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $arg"
                print_usage
                exit 1
                ;;
        esac
    done

    echo ""
    log_info "============================================"
    log_info "Installation complete!"
    log_info "============================================"
    log_info "Run the availability check to verify:"
    log_info "  ./scripts/check-tier2-tools.sh"
}

main "$@"

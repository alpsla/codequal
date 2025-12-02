#!/bin/bash
# ============================================================================
# CodeQual Fixer Tools Installation Script
# Installs all fixer tools for 6 languages: Java, TypeScript, JavaScript, Python, Go, Rust
#
# Usage: ./install-all-fixers.sh [language]
#   language: java|typescript|javascript|python|go|rust|all (default: all)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/codequal-fixer-install.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[✓]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if a command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# ============================================================================
# JAVA FIXERS
# ============================================================================
install_java_fixers() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installing Java Fixers"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check Java
    if ! command_exists java; then
        error "Java not found. Please install JDK 11+ first."
        return 1
    fi
    log "Java: $(java -version 2>&1 | head -1)"

    # Install Google Java Format
    info "Installing Google Java Format..."
    GOOGLE_FORMAT_VERSION="1.18.0"
    GOOGLE_FORMAT_JAR="/opt/codequal/tools/google-java-format-${GOOGLE_FORMAT_VERSION}-all-deps.jar"
    if [ ! -f "$GOOGLE_FORMAT_JAR" ]; then
        sudo mkdir -p /opt/codequal/tools
        sudo curl -L -o "$GOOGLE_FORMAT_JAR" \
            "https://github.com/google/google-java-format/releases/download/v${GOOGLE_FORMAT_VERSION}/google-java-format-${GOOGLE_FORMAT_VERSION}-all-deps.jar"
        log "Google Java Format installed: $GOOGLE_FORMAT_JAR"
    else
        log "Google Java Format already installed"
    fi

    # Install Sorald (Java automatic repair)
    info "Installing Sorald..."
    SORALD_VERSION="0.8.0"
    SORALD_JAR="/opt/codequal/tools/sorald-${SORALD_VERSION}.jar"
    if [ ! -f "$SORALD_JAR" ]; then
        sudo curl -L -o "$SORALD_JAR" \
            "https://github.com/ASSERT-KTH/sorald/releases/download/sorald-${SORALD_VERSION}/sorald-${SORALD_VERSION}.jar"
        log "Sorald installed: $SORALD_JAR"
    else
        log "Sorald already installed"
    fi

    # Verify
    java -jar "$GOOGLE_FORMAT_JAR" --version &> /dev/null && log "Google Java Format verified"
    java -jar "$SORALD_JAR" --version &> /dev/null && log "Sorald verified"
}

# ============================================================================
# TYPESCRIPT/JAVASCRIPT FIXERS
# ============================================================================
install_ts_js_fixers() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installing TypeScript/JavaScript Fixers"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check Node.js
    if ! command_exists node; then
        error "Node.js not found. Please install Node.js 18+ first."
        return 1
    fi
    log "Node.js: $(node --version)"

    # Install npm packages globally
    info "Installing ESLint..."
    npm install -g eslint@8.56.0 2>/dev/null || npm install -g eslint@latest
    log "ESLint: $(eslint --version)"

    info "Installing Prettier..."
    npm install -g prettier@3.1.0 2>/dev/null || npm install -g prettier@latest
    log "Prettier: $(prettier --version)"

    info "Installing Biome..."
    npm install -g @biomejs/biome@1.4.0 2>/dev/null || npm install -g @biomejs/biome@latest
    log "Biome: $(npx biome --version 2>/dev/null || echo 'installed')"

    info "Installing TypeScript..."
    npm install -g typescript@5.3.0 2>/dev/null || npm install -g typescript@latest
    log "TypeScript: $(tsc --version)"
}

# ============================================================================
# PYTHON FIXERS
# ============================================================================
install_python_fixers() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installing Python Fixers"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check Python
    if ! command_exists python3; then
        error "Python 3 not found. Please install Python 3.9+ first."
        return 1
    fi
    log "Python: $(python3 --version)"

    # Install pip packages
    info "Installing Ruff (linter + formatter)..."
    pip3 install --upgrade ruff
    log "Ruff: $(ruff --version)"

    info "Installing Black (formatter)..."
    pip3 install --upgrade black
    log "Black: $(black --version | head -1)"

    info "Installing isort (import sorter)..."
    pip3 install --upgrade isort
    log "isort: $(isort --version | head -1)"

    info "Installing autoflake (unused imports remover)..."
    pip3 install --upgrade autoflake
    log "autoflake: $(autoflake --version)"

    info "Installing pyupgrade (syntax upgrader)..."
    pip3 install --upgrade pyupgrade
    log "pyupgrade installed"

    # Validators (for completeness)
    info "Installing Bandit (security)..."
    pip3 install --upgrade bandit
    log "Bandit: $(bandit --version | head -1)"

    info "Installing MyPy (type checker)..."
    pip3 install --upgrade mypy
    log "MyPy: $(mypy --version)"
}

# ============================================================================
# GO FIXERS
# ============================================================================
install_go_fixers() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installing Go Fixers"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check Go
    if ! command_exists go; then
        error "Go not found. Please install Go 1.20+ first."
        return 1
    fi
    log "Go: $(go version)"

    # Install Go tools
    info "Installing goimports..."
    go install golang.org/x/tools/cmd/goimports@latest
    log "goimports installed"

    info "Installing golangci-lint..."
    # Binary installation (faster)
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.0
    log "golangci-lint: $(golangci-lint --version | head -1)"

    info "Installing gosec (security)..."
    go install github.com/securego/gosec/v2/cmd/gosec@latest
    log "gosec installed"

    info "Installing staticcheck..."
    go install honnef.co/go/tools/cmd/staticcheck@latest
    log "staticcheck installed"

    # gofmt is included with Go installation
    log "gofmt: built-in with Go"
}

# ============================================================================
# RUST FIXERS
# ============================================================================
install_rust_fixers() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installing Rust Fixers"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Check Rust
    if ! command_exists rustc; then
        error "Rust not found. Please install Rust first (rustup.rs)."
        return 1
    fi
    log "Rust: $(rustc --version)"

    # Install Rust components
    info "Installing rustfmt (formatter)..."
    rustup component add rustfmt
    log "rustfmt: $(rustfmt --version)"

    info "Installing clippy (linter)..."
    rustup component add clippy
    log "clippy: $(cargo clippy --version)"

    info "Installing cargo-audit (security)..."
    cargo install cargo-audit
    log "cargo-audit installed"
}

# ============================================================================
# SEMGREP (All languages)
# ============================================================================
install_semgrep() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installing Semgrep (Security Scanner - All Languages)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if command_exists pip3; then
        pip3 install --upgrade semgrep
        log "Semgrep: $(semgrep --version)"
    elif command_exists brew; then
        brew install semgrep
        log "Semgrep: $(semgrep --version)"
    else
        warn "Could not install Semgrep - pip3 or brew required"
    fi
}

# ============================================================================
# MAIN
# ============================================================================
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║        CodeQual Fixer Tools Installation                          ║"
    echo "║        Languages: Java, TypeScript, JavaScript, Python, Go, Rust   ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Log file: $LOG_FILE"
    echo ""

    # Clear log file
    > "$LOG_FILE"

    LANGUAGE="${1:-all}"

    case "$LANGUAGE" in
        java)
            install_java_fixers
            ;;
        typescript|ts)
            install_ts_js_fixers
            ;;
        javascript|js)
            install_ts_js_fixers
            ;;
        python|py)
            install_python_fixers
            ;;
        go)
            install_go_fixers
            ;;
        rust|rs)
            install_rust_fixers
            ;;
        all)
            install_semgrep
            install_java_fixers
            install_ts_js_fixers
            install_python_fixers
            install_go_fixers
            install_rust_fixers
            ;;
        *)
            error "Unknown language: $LANGUAGE"
            echo "Usage: $0 [java|typescript|javascript|python|go|rust|all]"
            exit 1
            ;;
    esac

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Installation Complete!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    log "Installation completed successfully"
}

main "$@"

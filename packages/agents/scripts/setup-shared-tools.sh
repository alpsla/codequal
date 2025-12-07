#!/bin/bash
# CodeQual Unified Shared Tools Setup Script
# Extracts analysis tools from Docker images to shared location
#
# Usage:
#   ./setup-shared-tools.sh                # Install TypeScript (default)
#   ./setup-shared-tools.sh typescript     # Install TypeScript only
#   ./setup-shared-tools.sh python         # Install Python only
#   ./setup-shared-tools.sh all            # Install TypeScript + Python + Go
#
# Architecture:
#   - Java uses Docker containers (keep as-is)
#   - All other languages use shared tools from /opt/codequal-tools
#   - Supports: TypeScript, Python, Go, C#, C++, Ruby, PHP, Rust, Kotlin, Swift

set -e

TOOLS_DIR="/opt/codequal-tools"
PHASE="${1:-typescript}"  # Default to TypeScript

echo "=========================================="
echo "CodeQual Unified Shared Tools Setup"
echo "=========================================="
echo "Phase: $PHASE"
echo "Tools directory: $TOOLS_DIR"
echo ""

# Create directory structure
setup_directories() {
  echo "📁 Creating directory structure..."
  sudo mkdir -p $TOOLS_DIR/{bin,lib/{node_modules,python,go,dotnet,rust}}
  sudo chown -R $(whoami):$(id -gn) $TOOLS_DIR
  echo "✅ Directories created"
}

# Phase 1: TypeScript/JavaScript
setup_typescript() {
  echo ""
  echo "=========================================="
  echo "📦 Installing TypeScript/JavaScript Tools"
  echo "=========================================="

  docker run --rm \
    --entrypoint /bin/sh \
    -v $TOOLS_DIR:/output \
    iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-typescript-v4.6-arm \
    -c '
      echo "→ Extracting ESLint..."
      cp $(which eslint) /output/bin/ 2>/dev/null || \
      find /usr -name eslint -type f -executable 2>/dev/null | head -1 | xargs -I {} cp {} /output/bin/ || \
      echo "⚠️  ESLint binary not found"

      echo "→ Extracting TypeScript compiler..."
      cp $(which tsc) /output/bin/ 2>/dev/null || \
      find /usr -name tsc -type f -executable 2>/dev/null | head -1 | xargs -I {} cp {} /output/bin/ || \
      echo "⚠️  TSC binary not found"

      echo "→ Extracting node_modules..."
      if [ -d /usr/local/lib/node_modules ]; then
        echo "   Found in /usr/local/lib/node_modules"
        cp -r /usr/local/lib/node_modules/* /output/lib/node_modules/
      elif [ -d /node_modules ]; then
        echo "   Found in /node_modules"
        cp -r /node_modules/* /output/lib/node_modules/
      elif [ -d /usr/lib/node_modules ]; then
        echo "   Found in /usr/lib/node_modules"
        cp -r /usr/lib/node_modules/* /output/lib/node_modules/
      else
        echo "⚠️  node_modules not found in standard locations"
      fi

      echo "✅ TypeScript/JavaScript tools extracted"
    '

  # Verify
  echo ""
  echo "Verification:"
  if [ -f "$TOOLS_DIR/bin/eslint" ]; then
    echo "✅ ESLint: $(ls -lh $TOOLS_DIR/bin/eslint | awk '{print $5}')"
  else
    echo "❌ ESLint not found!"
  fi

  if [ -f "$TOOLS_DIR/bin/tsc" ]; then
    echo "✅ TSC: $(ls -lh $TOOLS_DIR/bin/tsc | awk '{print $5}')"
  else
    echo "❌ TSC not found!"
  fi

  if [ -d "$TOOLS_DIR/lib/node_modules/eslint" ]; then
    echo "✅ ESLint package: $(du -sh $TOOLS_DIR/lib/node_modules/eslint | awk '{print $1}')"
  else
    echo "❌ ESLint package not found!"
  fi
}

# Phase 2: Python
setup_python() {
  echo ""
  echo "=========================================="
  echo "📦 Installing Python Tools"
  echo "=========================================="

  docker run --rm \
    --entrypoint bash \
    -v $TOOLS_DIR:/output \
    iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-python-v3.2-arm \
    -c '
      echo "→ Extracting pylint..."
      cp $(which pylint) /output/bin/ 2>/dev/null || echo "⚠️  pylint not found"

      echo "→ Extracting mypy..."
      cp $(which mypy) /output/bin/ 2>/dev/null || echo "⚠️  mypy not found"

      echo "→ Extracting bandit..."
      cp $(which bandit) /output/bin/ 2>/dev/null || echo "⚠️  bandit not found"

      echo "→ Extracting ruff..."
      cp $(which ruff) /output/bin/ 2>/dev/null || echo "⚠️  ruff not found"

      echo "→ Extracting Python packages..."
      for pydir in /usr/local/lib/python*/site-packages /usr/lib/python*/site-packages; do
        if [ -d "$pydir" ]; then
          echo "   Found packages in $pydir"
          cp -r "$pydir"/* /output/lib/python/ 2>/dev/null || true
        fi
      done

      echo "✅ Python tools extracted"
    '

  echo ""
  echo "Verification:"
  ls -lh $TOOLS_DIR/bin/pylint $TOOLS_DIR/bin/mypy 2>/dev/null || echo "Some Python tools missing"
}

# Phase 3: Go
setup_go() {
  echo ""
  echo "=========================================="
  echo "📦 Installing Go Tools"
  echo "=========================================="

  docker run --rm \
    --entrypoint bash \
    -v $TOOLS_DIR:/output \
    iad.ocir.io/idzaw9ddo1h5/codequal/analyzer:lang-go-v2.1-arm \
    -c '
      echo "→ Extracting golangci-lint..."
      cp $(which golangci-lint) /output/bin/ 2>/dev/null || echo "⚠️  golangci-lint not found"

      echo "→ Extracting staticcheck..."
      cp $(which staticcheck) /output/bin/ 2>/dev/null || echo "⚠️  staticcheck not found"

      echo "→ Extracting gosec..."
      cp $(which gosec) /output/bin/ 2>/dev/null || echo "⚠️  gosec not found"

      echo "✅ Go tools extracted"
    '

  echo ""
  echo "Verification:"
  ls -lh $TOOLS_DIR/bin/golangci-lint 2>/dev/null || echo "Go tools missing"
}

# Universal tools (Semgrep)
setup_universal() {
  echo ""
  echo "=========================================="
  echo "📦 Installing Universal Tools (Semgrep)"
  echo "=========================================="

  docker run --rm \
    --entrypoint bash \
    -v $TOOLS_DIR:/output \
    returntocorp/semgrep:latest \
    -c '
      echo "→ Extracting Semgrep..."
      cp $(which semgrep) /output/bin/ 2>/dev/null || echo "⚠️  semgrep not found"
      echo "✅ Semgrep extracted"
    '

  if [ -f "$TOOLS_DIR/bin/semgrep" ]; then
    echo "✅ Semgrep: $(ls -lh $TOOLS_DIR/bin/semgrep | awk '{print $5}')"
  else
    echo "❌ Semgrep not found!"
  fi
}

# Configure environment
configure_environment() {
  echo ""
  echo "=========================================="
  echo "🔧 Configuring Environment"
  echo "=========================================="

  # Check if already configured
  if grep -q "CODEQUAL_TOOLS_PATH" ~/.bashrc; then
    echo "⚠️  Environment already configured in ~/.bashrc (skipping)"
  else
    cat >> ~/.bashrc << 'EOF'

# ================================================
# CodeQual Unified Shared Tools (All Languages)
# ================================================
export CODEQUAL_TOOLS_PATH="/opt/codequal-tools"
export PATH="$CODEQUAL_TOOLS_PATH/bin:$PATH"

# Language-specific paths
export NODE_PATH="$CODEQUAL_TOOLS_PATH/lib/node_modules:$NODE_PATH"
export PYTHONPATH="$CODEQUAL_TOOLS_PATH/lib/python:$PYTHONPATH"

EOF
    echo "✅ Environment configured in ~/.bashrc"
  fi

  # Also add to .env file if exists
  ENV_FILE="$(pwd)/.env"
  if [ -f "$ENV_FILE" ]; then
    if grep -q "SHARED_TOOLS_PATH" "$ENV_FILE"; then
      echo "⚠️  .env already configured (skipping)"
    else
      cat >> "$ENV_FILE" << 'EOF'

# Shared tools path (extracted from Docker)
SHARED_TOOLS_PATH=/opt/codequal-tools
PATH=/opt/codequal-tools/bin:$PATH
NODE_PATH=/opt/codequal-tools/lib/node_modules

EOF
      echo "✅ Environment configured in .env"
    fi
  fi

  # Apply to current session
  export CODEQUAL_TOOLS_PATH="/opt/codequal-tools"
  export PATH="$CODEQUAL_TOOLS_PATH/bin:$PATH"
  export NODE_PATH="$CODEQUAL_TOOLS_PATH/lib/node_modules:$NODE_PATH"
  export PYTHONPATH="$CODEQUAL_TOOLS_PATH/lib/python:$PYTHONPATH"
}

# Verify installation
verify_installation() {
  echo ""
  echo "=========================================="
  echo "✅ Verification Summary"
  echo "=========================================="

  echo ""
  echo "TypeScript/JavaScript:"
  which eslint && echo "✅ ESLint: $(eslint --version)" || echo "❌ ESLint not found in PATH"
  which tsc && echo "✅ TSC: $(tsc --version)" || echo "❌ TSC not found in PATH"

  if [ "$PHASE" = "all" ] || [ "$PHASE" = "python" ]; then
    echo ""
    echo "Python:"
    which pylint && echo "✅ pylint: $(pylint --version | head -1)" || echo "⚠️  pylint not installed"
    which mypy && echo "✅ mypy: $(mypy --version)" || echo "⚠️  mypy not installed"
  fi

  if [ "$PHASE" = "all" ] || [ "$PHASE" = "go" ]; then
    echo ""
    echo "Go:"
    which golangci-lint && echo "✅ golangci-lint: $(golangci-lint --version)" || echo "⚠️  golangci-lint not installed"
  fi

  echo ""
  echo "Universal:"
  which semgrep && echo "✅ Semgrep: $(semgrep --version)" || echo "❌ Semgrep not found"

  echo ""
  echo "📊 Disk Usage:"
  du -sh $TOOLS_DIR
  echo "   bin/: $(du -sh $TOOLS_DIR/bin | awk '{print $1}')"
  echo "   lib/: $(du -sh $TOOLS_DIR/lib | awk '{print $1}')"
}

# Main execution
main() {
  echo "Starting setup for phase: $PHASE"
  echo ""

  setup_directories

  case "$PHASE" in
    all)
      setup_typescript
      setup_python
      setup_go
      setup_universal
      ;;
    typescript)
      setup_typescript
      setup_universal
      ;;
    python)
      setup_python
      setup_universal
      ;;
    go)
      setup_go
      setup_universal
      ;;
    *)
      echo "❌ Unknown phase: $PHASE"
      echo ""
      echo "Usage: $0 [typescript|python|go|all]"
      echo ""
      echo "Examples:"
      echo "  $0              # Install TypeScript (default)"
      echo "  $0 typescript   # Install TypeScript only"
      echo "  $0 python       # Install Python only"
      echo "  $0 all          # Install TypeScript + Python + Go"
      exit 1
      ;;
  esac

  configure_environment
  verify_installation

  echo ""
  echo "=========================================="
  echo "🎉 Setup Complete!"
  echo "=========================================="
  echo ""
  echo "📝 Next Steps:"
  echo "1. Run: source ~/.bashrc"
  echo "2. Test: eslint --version"
  echo "3. Run CodeQual tests to verify ESLint detection"
  echo ""
  echo "📚 Documentation:"
  echo "   - Implementation Plan: docs/infrastructure/UNIFIED_SHARED_TOOLS_IMPLEMENTATION_PLAN.md"
  echo "   - ESLint Fix Summary: docs/next/ESLINT_DETECTION_FIX_SUMMARY.md"
  echo ""
}

main

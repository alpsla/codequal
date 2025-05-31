#!/bin/bash

# setup-git-hooks.sh
# Sets up git hooks to automatically run local CI/CD validation

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}==>${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✅${NC} ${1}"
}

print_info() {
    echo -e "${YELLOW}ℹ️${NC} ${1}"
}

# Check if we're in a git repository
if [[ ! -d .git ]]; then
    echo "❌ Not a git repository. Run this script from the project root."
    exit 1
fi

print_step "Setting up git hooks for local CI/CD validation..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Auto-generated pre-commit hook for local CI/CD validation

echo "🔍 Running local CI/CD validation before commit..."

# Get the directory of this script (should be .git/hooks)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Change to project root
cd "$PROJECT_ROOT"

# Run the validation script with appropriate settings for pre-commit
# Allow some warnings in pre-commit (can be made stricter)
MAX_WARNINGS=5 ./scripts/validate-ci-local.sh --max-warnings 5

if [[ $? -eq 0 ]]; then
    echo "✅ Local CI/CD validation passed! Safe to commit."
else
    echo "❌ Local CI/CD validation failed! Please fix issues before committing."
    echo ""
    echo "💡 Tips:"
    echo "  • Run './scripts/validate-ci-local.sh' for detailed output"
    echo "  • Use 'git commit --no-verify' to skip this check (not recommended)"
    echo "  • Run './scripts/validate-ci-local.sh --help' for options"
    exit 1
fi
EOF

# Make pre-commit hook executable
chmod +x .git/hooks/pre-commit

# Create pre-push hook for stricter validation
cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Auto-generated pre-push hook for strict CI/CD validation

echo "🚀 Running strict CI/CD validation before push..."

# Get the directory of this script (should be .git/hooks)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Change to project root
cd "$PROJECT_ROOT"

# Run the validation script with strict settings for pre-push
# Zero warnings allowed before push
./scripts/validate-ci-local.sh --max-warnings 0

if [[ $? -eq 0 ]]; then
    echo "✅ Strict CI/CD validation passed! Safe to push."
else
    echo "❌ Strict CI/CD validation failed! Please fix issues before pushing."
    echo ""
    echo "💡 Tips:"
    echo "  • Run './scripts/validate-ci-local.sh' for detailed output"
    echo "  • Use 'git push --no-verify' to skip this check (not recommended)"
    echo "  • Fix all ESLint warnings and errors before pushing"
    exit 1
fi
EOF

# Make pre-push hook executable
chmod +x .git/hooks/pre-push

print_success "Git hooks installed successfully!"
print_info "Created hooks:"
print_info "  • pre-commit: Runs validation with max 5 warnings"
print_info "  • pre-push: Runs strict validation with 0 warnings"
print_info ""
print_info "To disable hooks temporarily:"
print_info "  • git commit --no-verify"
print_info "  • git push --no-verify"
print_info ""
print_info "To run validation manually:"
print_info "  • ./scripts/validate-ci-local.sh"
print_info "  • ./scripts/validate-ci-local.sh --help"
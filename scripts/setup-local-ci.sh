#!/bin/bash

# setup-local-ci.sh
# One-time setup script for local CI/CD validation system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${PURPLE}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║           🛠️  Local CI/CD Validation Setup                  ║
║        One-time setup for development environment           ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_step() {
    echo -e "${BLUE}==>${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✅${NC} ${1}"
}

print_info() {
    echo -e "${CYAN}ℹ️${NC} ${1}"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} ${1}"
}

# Check if we're in the project root
check_project_root() {
    if [[ ! -f "package.json" ]] || [[ ! -f "turbo.json" ]]; then
        echo -e "${RED}❌${NC} Please run this script from the project root directory"
        exit 1
    fi
}

# Setup git hooks
setup_git_hooks() {
    print_step "Setting up git hooks..."
    
    if [[ -d .git ]]; then
        ./scripts/setup-git-hooks.sh
        print_success "Git hooks configured"
    else
        print_warning "Not a git repository, skipping git hooks setup"
    fi
}

# Create useful aliases and shortcuts
create_shortcuts() {
    print_step "Creating useful shortcuts..."
    
    # Create a quick validation script
    cat > ./validate-quick.sh << 'EOF'
#!/bin/bash
# Quick validation shortcut
echo "🚀 Running quick validation..."
./scripts/validate-ci-local.sh --max-warnings 5 --skip-tests
EOF
    chmod +x ./validate-quick.sh
    
    # Create a pre-push validation script
    cat > ./validate-strict.sh << 'EOF'
#!/bin/bash
# Strict validation shortcut (pre-push ready)
echo "🔍 Running strict validation..."
./scripts/validate-ci-local.sh --max-warnings 0
EOF
    chmod +x ./validate-strict.sh
    
    print_success "Shortcuts created: ./validate-quick.sh, ./validate-strict.sh"
}

# Verify all scripts are executable
verify_scripts() {
    print_step "Verifying script permissions..."
    
    local scripts=(
        "scripts/validate-ci-local.sh"
        "scripts/setup-git-hooks.sh"
        "validate-quick.sh"
        "validate-strict.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            chmod +x "$script"
            print_info "Made $script executable"
        fi
    done
    
    print_success "All scripts are executable"
}

# Test the validation system
test_validation() {
    print_step "Testing validation system..."
    
    print_info "Running validation in test mode..."
    if ./scripts/validate-ci-local.sh --no-clean --no-deps --skip-tests --skip-build; then
        print_success "Validation system test passed"
    else
        print_warning "Validation system test failed (this may be normal for first run)"
    fi
}

# Show usage instructions
show_instructions() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 Setup Complete!                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${GREEN}Available Commands:${NC}"
    echo -e "  ${CYAN}npm run validate${NC}         - Full validation"
    echo -e "  ${CYAN}npm run validate:strict${NC}  - Strict mode (0 warnings)"
    echo -e "  ${CYAN}npm run validate:fast${NC}    - Fast mode (skip tests)"
    echo -e "  ${CYAN}./validate-quick.sh${NC}      - Quick development check"
    echo -e "  ${CYAN}./validate-strict.sh${NC}     - Pre-push validation"
    echo ""
    
    echo -e "${GREEN}Git Integration:${NC}"
    echo -e "  ${CYAN}pre-commit hook${NC}          - Validates before each commit"
    echo -e "  ${CYAN}pre-push hook${NC}            - Strict validation before push"
    echo -e "  ${CYAN}git commit --no-verify${NC}   - Skip validation (emergency)"
    echo ""
    
    echo -e "${GREEN}Next Steps:${NC}"
    echo -e "  1. Run ${CYAN}npm run validate${NC} to test the system"
    echo -e "  2. Make a test commit to verify git hooks"
    echo -e "  3. Review ${CYAN}docs/local-ci-validation.md${NC} for details"
    echo ""
    
    echo -e "${GREEN}Troubleshooting:${NC}"
    echo -e "  ${CYAN}./scripts/validate-ci-local.sh --help${NC}  - See all options"
    echo -e "  ${CYAN}./scripts/validate-ci-local.sh --verbose${NC} - Detailed output"
    echo ""
}

# Main execution
main() {
    print_header
    
    check_project_root
    setup_git_hooks
    create_shortcuts
    verify_scripts
    test_validation
    show_instructions
}

# Run main function
main "$@"
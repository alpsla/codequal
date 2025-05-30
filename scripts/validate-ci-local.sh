#!/bin/bash

# validate-ci-local.sh
# Comprehensive local CI/CD validation script
# Simulates the exact CI/CD environment to catch issues before pushing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
MAX_WARNINGS=${MAX_WARNINGS:-0}  # Set to 0 for strict mode
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BUILD=${SKIP_BUILD:-false}
PACKAGE_FILTER=${PACKAGE_FILTER:-""}  # Filter specific packages
VERBOSE=${VERBOSE:-false}

# Function to print colored output
print_step() {
    echo -e "${BLUE}==>${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✅${NC} ${1}"
}

print_error() {
    echo -e "${RED}❌${NC} ${1}"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} ${1}"
}

print_info() {
    echo -e "${CYAN}ℹ️${NC} ${1}"
}

# Function to check if we're in the project root
check_project_root() {
    if [[ ! -f "package.json" ]] || [[ ! -f "turbo.json" ]]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if we have a clean git state (optional warning)
    if command -v git &> /dev/null && [[ -d .git ]]; then
        if [[ -n $(git status --porcelain) ]]; then
            print_warning "You have uncommitted changes. Consider committing or stashing them."
            read -p "Continue anyway? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
    
    print_success "Prerequisites check passed"
}

# Function to clean all build artifacts (simulate fresh CI environment)
clean_build_artifacts() {
    print_step "🧹 Cleaning build artifacts (simulating fresh CI environment)..."
    
    # Remove all TypeScript build outputs
    find . -name "dist" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.tsbuildinfo" -not -path "./node_modules/*" -delete 2>/dev/null || true
    
    # Remove Jest cache
    find . -name ".jest" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
    
    # Remove ESLint cache
    find . -name ".eslintcache" -not -path "./node_modules/*" -delete 2>/dev/null || true
    
    # Remove Turbo cache
    rm -rf .turbo 2>/dev/null || true
    
    # Remove any coverage directories
    find . -name "coverage" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
    
    # Remove any .next cache (for Next.js apps)
    find . -name ".next" -type d -not -path "./node_modules/*" -exec rm -rf {} + 2>/dev/null || true
    
    print_success "Build artifacts cleaned"
}

# Function to install dependencies (fresh like CI)
install_dependencies() {
    print_step "📦 Installing dependencies (fresh install)..."
    
    # Remove node_modules cache to simulate CI
    rm -rf node_modules/.cache 2>/dev/null || true
    
    # Fresh install (similar to CI)
    npm ci
    
    print_success "Dependencies installed"
}

# Function to validate TypeScript configuration
validate_typescript_config() {
    print_step "🔍 Validating TypeScript configuration..."
    
    # Check for problematic TypeScript settings that differ from CI
    local issues_found=false
    
    # Check all tsconfig.json files
    while IFS= read -r -d '' tsconfig; do
        if [[ $VERBOSE == "true" ]]; then
            print_info "Checking $tsconfig"
        fi
        
        # Check for skipLibCheck in non-test configs (warning only)
        if grep -q '"skipLibCheck": *true' "$tsconfig" && [[ ! "$tsconfig" =~ test ]]; then
            print_warning "Found skipLibCheck: true in $tsconfig (may mask import issues)"
        fi
        
        # Check for allowJs in strict configs
        if grep -q '"allowJs": *true' "$tsconfig" && grep -q '"strict": *true' "$tsconfig"; then
            print_warning "Found allowJs with strict mode in $tsconfig (may cause issues)"
        fi
        
    done < <(find . -name "tsconfig*.json" -not -path "./node_modules/*" -print0)
    
    print_success "TypeScript configuration validated"
}

# Function to run linting with strict settings
run_linting() {
    print_step "🔍 Running ESLint (strict mode, max warnings: $MAX_WARNINGS)..."
    
    local lint_failed=false
    local total_errors=0
    local total_warnings=0
    
    # Get all packages with package.json
    while IFS= read -r -d '' package_dir; do
        local package_name=$(basename "$package_dir")
        
        # Skip if package filter is set and doesn't match
        if [[ -n "$PACKAGE_FILTER" ]] && [[ "$package_name" != *"$PACKAGE_FILTER"* ]]; then
            continue
        fi
        
        # Check if package has lint script
        if [[ -f "$package_dir/package.json" ]] && grep -q '"lint"' "$package_dir/package.json"; then
            print_info "Linting $package_name..."
            
            cd "$package_dir"
            
            # Run lint and capture output
            if ! lint_output=$(npm run lint 2>&1); then
                print_error "Linting failed in $package_name"
                echo "$lint_output"
                lint_failed=true
                
                # Extract error and warning counts
                local errors=$(echo "$lint_output" | grep -o '[0-9]\+ error' | head -1 | grep -o '[0-9]\+' || echo "0")
                local warnings=$(echo "$lint_output" | grep -o '[0-9]\+ warning' | head -1 | grep -o '[0-9]\+' || echo "0")
                
                total_errors=$((total_errors + errors))
                total_warnings=$((total_warnings + warnings))
            else
                # Check for warnings even in successful runs
                local warnings=$(echo "$lint_output" | grep -o '[0-9]\+ warning' | head -1 | grep -o '[0-9]\+' || echo "0")
                total_warnings=$((total_warnings + warnings))
                
                if [[ $warnings -gt 0 ]] && [[ $MAX_WARNINGS -eq 0 ]]; then
                    print_error "Found $warnings warnings in $package_name (strict mode allows 0)"
                    echo "$lint_output"
                    lint_failed=true
                fi
            fi
            
            cd - > /dev/null
        fi
    done < <(find ./packages -maxdepth 1 -type d -print0 2>/dev/null || true)
    
    # Also run root level linting if available
    if [[ -f "package.json" ]] && grep -q '"lint"' "package.json"; then
        print_info "Running root level linting..."
        if ! npm run lint; then
            lint_failed=true
        fi
    fi
    
    if [[ $lint_failed == "true" ]]; then
        print_error "Linting failed with $total_errors errors and $total_warnings warnings"
        return 1
    else
        print_success "Linting passed ($total_warnings warnings, $total_errors errors)"
    fi
}

# Function to build all packages (strict mode)
build_packages() {
    if [[ $SKIP_BUILD == "true" ]]; then
        print_info "Skipping build (SKIP_BUILD=true)"
        return 0
    fi
    
    print_step "🔨 Building all packages (strict mode)..."
    
    # First, try building with Turbo if available
    if [[ -f "turbo.json" ]] && command -v turbo &> /dev/null; then
        print_info "Using Turbo for build..."
        if ! turbo run build --no-cache --force; then
            print_error "Turbo build failed"
            return 1
        fi
    else
        # Fall back to npm workspaces or individual package builds
        print_info "Building packages individually..."
        
        local build_failed=false
        
        # Build packages in dependency order (core first, then others)
        local build_order=("core" "database" "agents" "testing" "ui")
        
        for package_name in "${build_order[@]}"; do
            local package_dir="./packages/$package_name"
            
            if [[ -d "$package_dir" ]] && [[ -f "$package_dir/package.json" ]]; then
                # Skip if package filter is set and doesn't match
                if [[ -n "$PACKAGE_FILTER" ]] && [[ "$package_name" != *"$PACKAGE_FILTER"* ]]; then
                    continue
                fi
                
                print_info "Building $package_name..."
                cd "$package_dir"
                
                # Check if package has build script
                if grep -q '"build"' "package.json"; then
                    if ! npm run build; then
                        print_error "Build failed in $package_name"
                        build_failed=true
                        cd - > /dev/null
                        break
                    fi
                else
                    print_warning "No build script found in $package_name"
                fi
                
                cd - > /dev/null
            fi
        done
        
        # Build any remaining packages not in the ordered list
        while IFS= read -r -d '' package_dir; do
            local package_name=$(basename "$package_dir")
            
            # Skip if already built or filtered
            if [[ " ${build_order[@]} " =~ " ${package_name} " ]] || \
               [[ -n "$PACKAGE_FILTER" ]] && [[ "$package_name" != *"$PACKAGE_FILTER"* ]]; then
                continue
            fi
            
            if [[ -f "$package_dir/package.json" ]] && grep -q '"build"' "$package_dir/package.json"; then
                print_info "Building $package_name..."
                cd "$package_dir"
                
                if ! npm run build; then
                    print_error "Build failed in $package_name"
                    build_failed=true
                    cd - > /dev/null
                    break
                fi
                
                cd - > /dev/null
            fi
        done < <(find ./packages -maxdepth 1 -type d -print0 2>/dev/null || true)
        
        if [[ $build_failed == "true" ]]; then
            print_error "Package builds failed"
            return 1
        fi
    fi
    
    print_success "All packages built successfully"
}

# Function to run tests
run_tests() {
    if [[ $SKIP_TESTS == "true" ]]; then
        print_info "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi
    
    print_step "🧪 Running tests..."
    
    # Use Turbo if available
    if [[ -f "turbo.json" ]] && command -v turbo &> /dev/null; then
        print_info "Using Turbo for tests..."
        if ! turbo run test --no-cache; then
            print_error "Tests failed"
            return 1
        fi
    else
        # Run tests in each package
        local test_failed=false
        
        while IFS= read -r -d '' package_dir; do
            local package_name=$(basename "$package_dir")
            
            # Skip if package filter is set and doesn't match
            if [[ -n "$PACKAGE_FILTER" ]] && [[ "$package_name" != *"$PACKAGE_FILTER"* ]]; then
                continue
            fi
            
            if [[ -f "$package_dir/package.json" ]] && grep -q '"test"' "$package_dir/package.json"; then
                print_info "Testing $package_name..."
                cd "$package_dir"
                
                if ! npm run test; then
                    print_error "Tests failed in $package_name"
                    test_failed=true
                    cd - > /dev/null
                    break
                fi
                
                cd - > /dev/null
            fi
        done < <(find ./packages -maxdepth 1 -type d -print0 2>/dev/null || true)
        
        if [[ $test_failed == "true" ]]; then
            print_error "Tests failed"
            return 1
        fi
    fi
    
    print_success "All tests passed"
}

# Function to validate git hooks and commit setup
validate_git_setup() {
    if ! command -v git &> /dev/null || [[ ! -d .git ]]; then
        print_info "Not a git repository, skipping git validation"
        return 0
    fi
    
    print_step "🔧 Validating git setup..."
    
    # Check for pre-commit hooks
    if [[ ! -f ".git/hooks/pre-commit" ]] && [[ ! -f ".husky/pre-commit" ]]; then
        print_warning "No pre-commit hook found. Consider adding one to run this script automatically."
    fi
    
    # Check for recommended git settings
    local user_email=$(git config user.email 2>/dev/null || echo "")
    local user_name=$(git config user.name 2>/dev/null || echo "")
    
    if [[ -z "$user_email" ]] || [[ -z "$user_name" ]]; then
        print_warning "Git user.email or user.name not configured"
    fi
    
    print_success "Git setup validated"
}

# Function to check for known CI/CD differences
check_ci_differences() {
    print_step "🔍 Checking for known CI/CD differences..."
    
    # Check Node.js version consistency
    if [[ -f ".nvmrc" ]]; then
        local nvmrc_version=$(cat .nvmrc)
        local current_version=$(node --version)
        if [[ "$current_version" != *"$nvmrc_version"* ]]; then
            print_warning "Node.js version mismatch: using $current_version, .nvmrc specifies $nvmrc_version"
        fi
    fi
    
    # Check for package-lock.json consistency
    if [[ -f "package-lock.json" ]]; then
        local lockfile_age=$(find package-lock.json -mtime +7 2>/dev/null || echo "")
        if [[ -n "$lockfile_age" ]]; then
            print_warning "package-lock.json is older than 7 days, consider updating dependencies"
        fi
    fi
    
    # Check for TypeScript version consistency across packages
    local ts_versions=$(find . -name "package.json" -not -path "./node_modules/*" -exec grep -H '"typescript"' {} \; 2>/dev/null | grep -o '"[0-9][^"]*"' | sort -u | wc -l)
    if [[ $ts_versions -gt 1 ]]; then
        print_warning "Multiple TypeScript versions found across packages"
    fi
    
    print_success "CI/CD differences checked"
}

# Function to generate summary report
generate_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_step "📊 Validation Summary"
    echo -e "${PURPLE}====================${NC}"
    print_success "All validations completed successfully!"
    print_info "Total time: ${duration}s"
    print_info "Environment: $(node --version), npm $(npm --version)"
    
    if [[ -n "$PACKAGE_FILTER" ]]; then
        print_info "Package filter: $PACKAGE_FILTER"
    fi
    
    echo -e "${PURPLE}====================${NC}"
    print_success "✨ Ready to push to CI/CD! ✨"
}

# Function to show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Local CI/CD validation script that simulates the exact CI/CD environment.

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    -w, --max-warnings NUM  Maximum ESLint warnings allowed (default: 0)
    -s, --skip-tests        Skip running tests
    -b, --skip-build        Skip building packages
    -p, --package FILTER    Only validate packages matching FILTER
    --no-clean              Skip cleaning build artifacts
    --no-deps               Skip dependency installation

ENVIRONMENT VARIABLES:
    MAX_WARNINGS=N          Set maximum warnings (default: 0)
    SKIP_TESTS=true         Skip tests
    SKIP_BUILD=true         Skip builds
    PACKAGE_FILTER=name     Filter packages
    VERBOSE=true            Enable verbose mode

EXAMPLES:
    $0                                  # Full validation
    $0 --skip-tests                     # Skip tests
    $0 --package agents                 # Only validate agents package
    $0 --max-warnings 5                 # Allow 5 ESLint warnings
    MAX_WARNINGS=10 $0                  # Same as above via env var
    $0 --verbose                        # Detailed output

This script simulates CI/CD by:
  • Cleaning all build artifacts
  • Fresh dependency installation
  • Strict TypeScript compilation
  • Zero-warning ESLint checks
  • Complete test suite
  • Git setup validation
EOF
}

# Main execution function
main() {
    # Record start time
    start_time=$(date +%s)
    
    # Parse command line arguments
    local skip_clean=false
    local skip_deps=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -w|--max-warnings)
                MAX_WARNINGS="$2"
                shift 2
                ;;
            -s|--skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            -b|--skip-build)
                SKIP_BUILD=true
                shift
                ;;
            -p|--package)
                PACKAGE_FILTER="$2"
                shift 2
                ;;
            --no-clean)
                skip_clean=true
                shift
                ;;
            --no-deps)
                skip_deps=true
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Print header
    echo -e "${PURPLE}"
    cat << "EOF"
╔══════════════════════════════════════════════════════════════╗
║                   🚀 Local CI/CD Validator                  ║
║              Simulate CI/CD Environment Locally             ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    # Execute validation steps
    check_project_root
    check_prerequisites
    
    if [[ $skip_clean != "true" ]]; then
        clean_build_artifacts
    fi
    
    if [[ $skip_deps != "true" ]]; then
        install_dependencies
    fi
    
    validate_typescript_config
    run_linting
    build_packages
    run_tests
    validate_git_setup
    check_ci_differences
    generate_summary
}

# Error handling
trap 'print_error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"
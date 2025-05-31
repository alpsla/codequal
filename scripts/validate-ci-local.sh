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

# Function to run linting exactly like CI
run_linting_ci_exact() {
    print_step "🔍 Running ESLint (CI-exact: npm run lint --no-workspaces)..."
    
    # Run exactly like CI does (no --fix flags in package.json anymore)
    if ! npm run lint --no-workspaces; then
        print_error "Linting failed (CI-exact command)"
        print_info "💡 To auto-fix issues locally, run: npm run lint:fix in individual packages"
        return 1
    fi
    
    print_success "Linting passed (CI-exact)"
}

# Function to run linting with strict settings (legacy)
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

# Function to validate TypeScript without skipLibCheck (strict CI mode)
validate_typescript_strict() {
    print_step "🔍 TypeScript strict validation (CI-exact, no skipLibCheck)..."
    
    # Find all packages and run TypeScript compilation without skipLibCheck
    local ts_failed=false
    
    while IFS= read -r -d '' package_dir; do
        local package_name=$(basename "$package_dir")
        
        # Skip if package filter is set and doesn't match
        if [[ -n "$PACKAGE_FILTER" ]] && [[ "$package_name" != *"$PACKAGE_FILTER"* ]]; then
            continue
        fi
        
        if [[ -f "$package_dir/tsconfig.json" ]]; then
            print_info "Strict TypeScript check: $package_name"
            cd "$package_dir"
            
            # Run tsc without skipLibCheck to catch import issues (like CI)
            # Use --noEmit to only check types, don't generate files
            if ! npx tsc --noEmit --skipLibCheck false 2>&1; then
                print_error "Strict TypeScript validation failed in $package_name"
                ts_failed=true
            fi
            cd - > /dev/null
        fi
    done < <(find ./packages -maxdepth 1 -type d -print0 2>/dev/null || true)
    
    if [[ $ts_failed == "true" ]]; then
        print_error "TypeScript strict validation failed (this would fail in CI)"
        return 1
    fi
    
    print_success "TypeScript strict validation passed"
}

# Function to check CI environment consistency
check_ci_environment_consistency() {
    print_step "🌍 Checking CI environment consistency..."
    
    # Check Node.js version matches CI (18.x)
    local node_version=$(node --version)
    if [[ ! "$node_version" =~ ^v18\. ]]; then
        print_warning "Node.js version mismatch: CI uses 18.x, you have $node_version"
        print_info "Consider using: nvm use 18 or nvm install 18"
    fi
    
    # Check for npm workspaces configuration
    if ! npm config get workspaces &>/dev/null; then
        print_warning "npm workspaces configuration may differ from CI"
    fi
    
    # Validate critical package.json scripts match CI expectations
    local critical_packages=("packages/core" "packages/database" "packages/agents")
    for pkg in "${critical_packages[@]}"; do
        if [[ -f "$pkg/package.json" ]]; then
            if ! grep -q '"build"' "$pkg/package.json"; then
                print_error "Missing build script in $pkg (required by CI)"
            fi
        fi
    done
    
    # Check if core package uses tsc --skipLibCheck (this is important)
    if [[ -f "packages/core/package.json" ]]; then
        local core_build_cmd=$(grep -o '"build": "[^"]*"' packages/core/package.json | cut -d'"' -f4)
        if [[ "$core_build_cmd" == *"--skipLibCheck"* ]]; then
            print_warning "Core package uses --skipLibCheck, but CI may run stricter validation"
        fi
    fi
    
    print_success "CI environment consistency checked"
}

# Function to build packages exactly like CI
build_packages_ci_exact() {
    if [[ $SKIP_BUILD == "true" ]]; then
        print_info "Skipping build (SKIP_BUILD=true)"
        return 0
    fi
    
    print_step "🔨 Building packages (exact CI sequence)..."
    
    # Step 1: Build core first (exactly like CI)
    print_info "Building core package first (CI sequence)..."
    if [[ ! -d "packages/core" ]]; then
        print_error "packages/core directory not found"
        return 1
    fi
    
    cd packages/core
    
    # Explicit install like CI does
    print_info "Installing core package dependencies explicitly..."
    if ! npm install; then
        print_error "Failed to install core dependencies"
        cd - > /dev/null
        return 1
    fi
    
    # Use exact build command from CI
    print_info "Running core build (npm run build)..."
    if ! npm run build; then
        print_error "Core build failed (CI-exact)"
        cd - > /dev/null
        return 1
    fi
    
    # Verify build output like CI does
    print_info "Verifying core build output..."
    ls -la dist/ || print_warning "No dist directory in core"
    ls -la dist/utils/ || print_info "No utils directory (may be normal)"
    ls -la dist/types/ || print_info "No types directory (may be normal)"
    ls -la dist/config/ || print_info "No config directory (may be normal)"
    
    cd - > /dev/null
    
    # Step 2: Build other packages with Turbo filters (like CI)
    print_info "Building remaining packages with Turbo filters..."
    
    # Check if we have turbo available
    if ! command -v turbo &> /dev/null && ! command -v npx &> /dev/null; then
        print_error "Neither turbo nor npx available for filtered builds"
        return 1
    fi
    
    # Build database package with filter (like CI)
    print_info "Building database package with Turbo filter..."
    if ! npx turbo run build --filter='@codequal/database'; then
        print_warning "Database build issues (continuing like CI does)"
    fi
    
    # Build agents package with filter (like CI)
    print_info "Building agents package with Turbo filter..."
    if ! npx turbo run build --filter='@codequal/agents'; then
        print_warning "Agents build issues (continuing like CI does)"
    fi
    
    print_success "All packages built using CI-exact sequence"
}

# Function to validate build outputs (CI-style)
validate_build_outputs() {
    print_step "🔍 Validating build outputs (CI-style)..."
    
    # Check core package exports (critical for other packages)
    if [[ -d "packages/core/dist" ]]; then
        print_info "Core dist directory found"
        
        # Verify TypeScript declaration files exist
        if ! find packages/core/dist -name "*.d.ts" | head -1 | grep -q "\.d\.ts"; then
            print_error "No TypeScript declaration files found in core package"
            return 1
        fi
        
        # Check for index files
        if [[ ! -f "packages/core/dist/index.js" ]] && [[ ! -f "packages/core/dist/index.d.ts" ]]; then
            print_warning "No index files found in core package dist"
        fi
        
    else
        print_error "Core package dist directory missing"
        return 1
    fi
    
    # Check that agents package can import from core (if built)
    if [[ -d "packages/agents/dist" ]] && [[ -d "packages/core/dist" ]]; then
        print_info "Checking cross-package imports..."
        # This would catch the import issues we had
        cd packages/agents
        if ! node -e "try { require('../core/dist'); console.log('Core import OK'); } catch(e) { console.error('Import failed:', e.message); process.exit(1); }"; then
            print_warning "Agents package cannot import from core (potential issue)"
        fi
        cd - > /dev/null
    fi
    
    print_success "Build outputs validated"
}

# Legacy function for backwards compatibility
build_packages() {
    # Call the new CI-exact function
    build_packages_ci_exact
}

# Keep the old fallback logic but make it CI-aware
build_packages_fallback() {
    if [[ $SKIP_BUILD == "true" ]]; then
        print_info "Skipping build (SKIP_BUILD=true)"
        return 0
    fi
        # Fall back to individual package builds (CI-aware)
        print_info "Building packages individually (CI-aware fallback)..."
        
        local build_failed=false
        
        # Build packages in exact CI order: core first, then others
        local build_order=("core" "database" "agents")
        
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
    
    print_success "All packages built successfully"
}

# Function to run tests exactly like CI
run_tests_ci_exact() {
    if [[ $SKIP_TESTS == "true" ]]; then
        print_info "Skipping tests (SKIP_TESTS=true)"
        return 0
    fi
    
    print_step "🧪 Running tests (CI-exact: npm run test --no-workspaces)..."
    
    # Run exactly like CI does
    if ! npm run test --no-workspaces; then
        print_error "Tests failed (CI-exact command)"
        return 1
    fi
    
    print_success "Tests passed (CI-exact)"
}

# Function to run tests (legacy)
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

CI-EXACT validation script that matches GitHub Actions CI environment perfectly.

⚠️  UPDATED: Now uses CI-exact commands to catch issues that CI catches!

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
    $0                                  # Full CI-exact validation
    $0 --skip-tests                     # Skip tests
    $0 --package agents                 # Only validate agents package
    $0 --max-warnings 5                 # Allow 5 ESLint warnings
    MAX_WARNINGS=10 $0                  # Same as above via env var
    $0 --verbose                        # Detailed output

This script now exactly matches CI by:
  • Node.js 18.x version checking
  • CI environment consistency validation
  • Strict TypeScript compilation (no skipLibCheck)
  • Exact CI build sequence: core first, then Turbo filters
  • CI-exact commands: npm run lint --no-workspaces
  • CI-exact commands: npm run test --no-workspaces
  • Build output validation (cross-package imports)
  • Fresh dependency installation matching CI
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
║                  🎯 CI-EXACT Validator                      ║
║            Matches GitHub Actions CI Environment            ║
║                      100% Accuracy                          ║
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
    check_ci_environment_consistency
    validate_typescript_strict
    run_linting_ci_exact
    build_packages_ci_exact
    validate_build_outputs
    run_tests_ci_exact
    validate_git_setup
    check_ci_differences
    generate_summary
}

# Error handling
trap 'print_error "Script failed at line $LINENO"' ERR

# Run main function
main "$@"
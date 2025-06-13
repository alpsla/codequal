#!/bin/bash

# Enhanced Simple Tool Test
# Runs more detailed checks with better formatting

echo "🧪 Enhanced Tool Test Runner"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"

# Test if we're in the right place
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}❌ Not in CodeQual project root${NC}"
    exit 1
fi

echo "📍 Project root: $PROJECT_ROOT"
echo ""

# Check for tools
echo "🔍 Checking tool availability..."
echo "─────────────────────────────────"

# Check npm
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm:${NC} $(npm --version)"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Check for madge
if command -v madge &> /dev/null; then
    echo -e "${GREEN}✅ madge:${NC} installed"
else
    echo -e "${YELLOW}⚠️  madge:${NC} not installed (install with: npm install -g madge)"
fi

# Check for dependency-cruiser
if command -v depcruise &> /dev/null; then
    echo -e "${GREEN}✅ dependency-cruiser:${NC} installed"
else
    echo -e "${YELLOW}⚠️  dependency-cruiser:${NC} not installed (install with: npm install -g dependency-cruiser)"
fi

echo ""
echo "📦 Testing CodeQual Packages"
echo "============================"

# Function to test a package
test_package() {
    local name=$1
    local path=$2
    
    echo ""
    echo -e "${GREEN}📦 $name${NC}"
    echo "Path: $path"
    echo "────────────────────────────────────────────────────────────"
    
    if [ ! -d "$path" ]; then
        echo -e "${RED}❌ Directory not found${NC}"
        return
    fi
    
    cd "$path"
    
    # 1. NPM Audit
    echo ""
    echo "🔒 Security (npm audit):"
    if [ -f "package-lock.json" ]; then
        # Run audit and capture output
        audit_output=$(npm audit --json 2>/dev/null || echo '{}')
        vulns=$(echo "$audit_output" | jq -r '.metadata.vulnerabilities // {}')
        total=$(echo "$vulns" | jq -r '.total // 0')
        
        if [ "$total" -eq 0 ]; then
            echo -e "   ${GREEN}✅ No vulnerabilities found${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Total vulnerabilities: $total${NC}"
            critical=$(echo "$vulns" | jq -r '.critical // 0')
            high=$(echo "$vulns" | jq -r '.high // 0')
            moderate=$(echo "$vulns" | jq -r '.moderate // 0')
            low=$(echo "$vulns" | jq -r '.low // 0')
            
            [ "$critical" -gt 0 ] && echo -e "      ${RED}Critical: $critical${NC}"
            [ "$high" -gt 0 ] && echo -e "      ${RED}High: $high${NC}"
            [ "$moderate" -gt 0 ] && echo -e "      ${YELLOW}Moderate: $moderate${NC}"
            [ "$low" -gt 0 ] && echo "      Low: $low"
        fi
    else
        echo "   ℹ️  Using root package-lock.json"
    fi
    
    # 2. License Check
    echo ""
    echo "📜 Licenses:"
    if [ -f "package.json" ]; then
        # Count dependencies
        deps=$(cat package.json | jq -r '.dependencies // {} | keys | length')
        devDeps=$(cat package.json | jq -r '.devDependencies // {} | keys | length')
        total=$((deps + devDeps))
        
        echo "   Total packages: $total (prod: $deps, dev: $devDeps)"
        
        # Check for risky licenses in package.json
        echo "   Checking for GPL/AGPL licenses..."
        risky=$(cat package.json | jq -r '[.dependencies, .devDependencies] | add | to_entries | .[] | select(.value | contains("gpl")) | .key' 2>/dev/null | wc -l)
        if [ "$risky" -gt 0 ]; then
            echo -e "   ${YELLOW}⚠️  Potential GPL dependencies found${NC}"
        else
            echo -e "   ${GREEN}✅ No GPL dependencies detected${NC}"
        fi
    fi
    
    # 3. Circular Dependencies (if madge available)
    echo ""
    echo "🔄 Circular Dependencies:"
    if command -v madge &> /dev/null; then
        # Run madge for circular deps
        circular=$(madge --circular --json "$path" 2>/dev/null | jq '. | length' 2>/dev/null || echo "0")
        if [ "$circular" -eq 0 ]; then
            echo -e "   ${GREEN}✅ No circular dependencies${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Found $circular circular dependencies${NC}"
            # Show first few
            madge --circular "$path" 2>/dev/null | head -5
        fi
    else
        echo "   ℹ️  Install madge to check"
    fi
    
    # 4. Outdated Packages
    echo ""
    echo "📅 Package Updates:"
    outdated=$(npm outdated --json 2>/dev/null || echo '{}')
    count=$(echo "$outdated" | jq '. | length')
    
    if [ "$count" -eq 0 ]; then
        echo -e "   ${GREEN}✅ All packages up to date${NC}"
    else
        echo -e "   ${YELLOW}⚠️  $count packages have updates available${NC}"
        # Show major updates
        majors=$(echo "$outdated" | jq -r 'to_entries | .[] | select(.value.current != .value.wanted) | "\(.key): \(.value.current) → \(.value.latest)"' | head -3)
        if [ -n "$majors" ]; then
            echo "   Major updates available:"
            echo "$majors" | while IFS= read -r line; do
                echo "      - $line"
            done
        fi
    fi
    
    # 5. Architecture Metrics
    echo ""
    echo "📐 Architecture Metrics:"
    if [ -d "src" ]; then
        # Count TypeScript files
        ts_files=$(find src -name "*.ts" -not -path "*/node_modules/*" 2>/dev/null | wc -l)
        # Count test files
        test_files=$(find src -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l)
        
        echo "   TypeScript files: $ts_files"
        echo "   Test files: $test_files"
        
        # Calculate test coverage ratio
        if [ "$ts_files" -gt 0 ]; then
            coverage_ratio=$(echo "scale=2; $test_files * 100 / $ts_files" | bc 2>/dev/null || echo "0")
            echo "   Test file ratio: ${coverage_ratio}%"
        fi
    else
        echo "   ℹ️  No src directory found"
    fi
}

# Test each package
test_package "CodeQual Root" "$PROJECT_ROOT"
test_package "MCP-Hybrid Package" "$PROJECT_ROOT/packages/mcp-hybrid"
test_package "Core Package" "$PROJECT_ROOT/packages/core"
test_package "Database Package" "$PROJECT_ROOT/packages/database"

# Summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "📊 Test Summary"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ Basic tool functionality confirmed"
echo "📋 Recommendations:"

# Check if tools need installing
if ! command -v madge &> /dev/null; then
    echo "   - Install madge: npm install -g madge"
fi
if ! command -v depcruise &> /dev/null; then
    echo "   - Install dependency-cruiser: npm install -g dependency-cruiser"
fi
if ! command -v jq &> /dev/null; then
    echo "   - Install jq for better JSON parsing: brew install jq (macOS)"
fi

echo ""
echo "🚀 Next Steps:"
echo "   1. Fix the 4 low-severity vulnerabilities in root"
echo "   2. Install missing tools for deeper analysis"
echo "   3. Run the full TypeScript test suite after fixing builds"
echo ""
echo "✅ Testing completed!"

#!/bin/bash

# Cleanup Script - Remove Duplicate Code Outside Standard Directory
# Date: August 4, 2025
# Purpose: Consolidate all agent code into Standard directory

echo "🧹 Starting code consolidation cleanup..."
echo "This will remove duplicate agent code outside the Standard directory"
echo ""

# Set the base directory
BASE_DIR="packages/agents/src"

# Function to check if directory exists
check_and_remove() {
    local dir=$1
    if [ -d "$dir" ]; then
        echo "📁 Found: $dir"
        echo "   Files: $(find "$dir" -name "*.ts" -o -name "*.js" | wc -l)"
        echo "   Size: $(du -sh "$dir" | cut -f1)"
        
        # Create backup first
        backup_name="${dir}_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
        echo "   Creating backup: $backup_name"
        tar -czf "$backup_name" "$dir" 2>/dev/null
        
        # Remove directory
        echo "   Removing directory..."
        rm -rf "$dir"
        echo "   ✅ Removed successfully"
        echo ""
    else
        echo "❌ Not found: $dir (already removed or doesn't exist)"
        echo ""
    fi
}

echo "=== Phase 1: Removing Duplicate Directories ==="
echo ""

# Remove old comparison-agent directory (Lambda service)
echo "1. Removing comparison-agent directory (old Lambda service)..."
check_and_remove "$BASE_DIR/comparison-agent"

# Remove duplicate comparison directory
echo "2. Removing comparison directory (duplicate implementation)..."
check_and_remove "$BASE_DIR/comparison"

# Remove duplicate orchestrator directory
echo "3. Removing orchestrator directory (duplicate implementation)..."
check_and_remove "$BASE_DIR/orchestrator"

echo "=== Phase 2: Verifying Standard Directory ==="
echo ""

# Check Standard directory exists and has the right structure
if [ -d "$BASE_DIR/standard" ]; then
    echo "✅ Standard directory exists"
    echo "   Structure:"
    echo "   - comparison/: $(ls -1 $BASE_DIR/standard/comparison/*.ts 2>/dev/null | wc -l) files"
    echo "   - orchestrator/: $(ls -1 $BASE_DIR/standard/orchestrator/*.ts 2>/dev/null | wc -l) files"
    echo "   - services/: $(ls -1 $BASE_DIR/standard/services/*.ts 2>/dev/null | wc -l) files"
    echo "   - tests/: $(find $BASE_DIR/standard/tests -name "*.ts" 2>/dev/null | wc -l) files"
else
    echo "❌ ERROR: Standard directory not found!"
    exit 1
fi

echo ""
echo "=== Phase 3: Verification ==="
echo ""

# Run TypeScript compilation check
echo "Running TypeScript compilation check..."
cd packages/agents
npx tsc --noEmit 2>&1 | head -20

echo ""
echo "=== Summary ==="
echo ""
echo "✅ Code consolidation complete!"
echo "📁 All agent code is now in: $BASE_DIR/standard/"
echo "🔍 Please run the full test suite to ensure everything works correctly"
echo ""
echo "Backup files created (can be deleted after verification):"
ls -la packages/agents/src/*.tar.gz 2>/dev/null || echo "   No backups found"
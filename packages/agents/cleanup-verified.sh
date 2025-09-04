#!/bin/bash

# CodeQual Cleanup Script - Verified Files
# Date: 2025-09-03
# Purpose: Clean up outdated files after user confirmation

set -e

echo "🧹 CodeQual Cleanup Script"
echo "=========================="
echo ""
echo "This script will:"
echo "1. Archive old test files (92 files)"
echo "2. Remove outdated documentation"
echo "3. Archive old reports"
echo "4. Clean up duplicate scripts"
echo ""
read -p "⚠️  Proceed with cleanup? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

# Create archive directories
echo "📁 Creating archive directories..."
mkdir -p archive/{old-tests,old-reports,old-docs,old-scripts,old-matrices}

# Phase 1: Archive test files (92 test-*.ts files in root)
echo ""
echo "📦 Phase 1: Archiving test files..."
for file in test-*.ts; do
    if [ -f "$file" ]; then
        mv "$file" archive/old-tests/ 2>/dev/null || true
    fi
done
echo "✅ Moved test files to archive/old-tests/"

# Phase 2: Remove outdated matrices
echo ""
echo "📦 Phase 2: Archiving outdated matrix files..."
if [ -f "MCP_TOOLS_COVERAGE_MATRIX.md" ]; then
    mv MCP_TOOLS_COVERAGE_MATRIX.md archive/old-matrices/
    echo "  - Archived MCP_TOOLS_COVERAGE_MATRIX.md"
fi
if [ -f "MCP_TOOLS_COVERAGE_MATRIX_V2.md" ]; then
    mv MCP_TOOLS_COVERAGE_MATRIX_V2.md archive/old-matrices/
    echo "  - Archived MCP_TOOLS_COVERAGE_MATRIX_V2.md"
fi
if [ -f "MCP_TOOLS_COVERAGE_MATRIX_V3.md" ]; then
    mv MCP_TOOLS_COVERAGE_MATRIX_V3.md archive/old-matrices/
    echo "  - Archived MCP_TOOLS_COVERAGE_MATRIX_V3.md"
fi

# Phase 3: Archive old JSON reports
echo ""
echo "📦 Phase 3: Archiving old reports..."
for pattern in "complete-analysis-*.json" "monitoring-report-*.json" "execution-matrix-*.json" "orchestrator-report.json" "real-pr-analysis-report.json" "test-results-comprehensive.json"; do
    for file in $pattern; do
        if [ -f "$file" ]; then
            mv "$file" archive/old-reports/ 2>/dev/null || true
            echo "  - Archived $file"
        fi
    done
done

# Phase 4: Archive one-off TypeScript scripts
echo ""
echo "📦 Phase 4: Archiving one-off scripts..."
for file in agent-model-mapping.ts correct-weight-configuration.ts demo-comprehensive-pr-analysis.ts execute-model-research.ts fix-model-selection.ts orchestrator-comprehensive.ts parametrized-model-researcher.ts proper-model-research-example.ts researcher-agent-supabase.ts run-model-researcher.ts validate-issue-fields.ts validate-system-test.ts verify-timeout-config.ts; do
    if [ -f "$file" ]; then
        mv "$file" archive/old-scripts/ 2>/dev/null || true
        echo "  - Archived $file"
    fi
done

# Phase 5: Archive old SQL files
echo ""
echo "📦 Phase 5: Archiving SQL files..."
for file in add-rust-models.sql model-configurations.sql model-configurations-184.sql; do
    if [ -f "$file" ]; then
        mv "$file" archive/old-scripts/ 2>/dev/null || true
        echo "  - Archived $file"
    fi
done

# Phase 6: Archive duplicate documentation
echo ""
echo "📦 Phase 6: Archiving duplicate documentation..."
for file in AGENT_VALIDATION_SUMMARY.md COMPREHENSIVE_TEST_REPORT.md COMPREHENSIVE_TEST_RESULTS.md FINAL_TEST_SUMMARY.md IMPLEMENTATION_COMPLETE.md RUST_VALIDATION_FINAL_REPORT.md TIMEOUT_EXTENSION_COMPLETE.md TOOLS_EXECUTION_SUMMARY.md VALIDATION_REPORT.md; do
    if [ -f "$file" ]; then
        mv "$file" archive/old-docs/ 2>/dev/null || true
        echo "  - Archived $file"
    fi
done

# Phase 7: Clean duplicate scripts
echo ""
echo "📦 Phase 7: Cleaning duplicate scripts..."
cd scripts 2>/dev/null || true
if [ -f "install-all-tools.sh" ]; then
    mv install-all-tools.sh ../archive/old-scripts/
    echo "  - Archived install-all-tools.sh"
fi
if [ -f "install-analysis-tools.sh" ]; then
    mv install-analysis-tools.sh ../archive/old-scripts/
    echo "  - Archived install-analysis-tools.sh"
fi
if [ -f "install-rust-tools.sh" ]; then
    mv install-rust-tools.sh ../archive/old-scripts/
    echo "  - Archived install-rust-tools.sh"
fi
cd ..

# Phase 8: Archive comprehensive-analysis-reports directory
echo ""
echo "📦 Phase 8: Archiving analysis reports directory..."
if [ -d "comprehensive-analysis-reports" ]; then
    mv comprehensive-analysis-reports archive/
    echo "  - Archived comprehensive-analysis-reports/"
fi

# Summary
echo ""
echo "📊 Cleanup Summary"
echo "=================="
echo ""

# Count files in archive
TEST_COUNT=$(ls archive/old-tests/*.ts 2>/dev/null | wc -l | tr -d ' ')
REPORT_COUNT=$(ls archive/old-reports/*.json 2>/dev/null | wc -l | tr -d ' ')
DOC_COUNT=$(ls archive/old-docs/*.md 2>/dev/null | wc -l | tr -d ' ')
SCRIPT_COUNT=$(ls archive/old-scripts/* 2>/dev/null | wc -l | tr -d ' ')
MATRIX_COUNT=$(ls archive/old-matrices/*.md 2>/dev/null | wc -l | tr -d ' ')

echo "✅ Archived files:"
echo "  - Test files: $TEST_COUNT"
echo "  - Report files: $REPORT_COUNT"
echo "  - Documentation: $DOC_COUNT"
echo "  - Scripts: $SCRIPT_COUNT"
echo "  - Matrix files: $MATRIX_COUNT"
echo ""

# Calculate space saved
ARCHIVE_SIZE=$(du -sh archive 2>/dev/null | cut -f1)
echo "💾 Total archived: $ARCHIVE_SIZE"
echo ""

echo "📁 Archive location: ./archive/"
echo ""
echo "To permanently delete archived files:"
echo "  rm -rf archive/"
echo ""
echo "To restore any file:"
echo "  mv archive/old-tests/test-file.ts ."
echo ""
echo "✅ Cleanup complete!"
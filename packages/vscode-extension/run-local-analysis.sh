#!/bin/bash
# Run V9 analysis on local repository for extension testing

REPO_PATH="/Users/alpinro/CodePrjects/codequal"

echo "🚀 Running V9 analysis on local repository..."
echo "📁 Repository: $REPO_PATH"
echo ""

cd "$REPO_PATH/packages/agents"

# Run analysis with the local repo path
echo "Running analysis..."
REPO_PATH="$REPO_PATH" npx ts-node -e "
const { V9GroupedReportFormatter } = require('./src/two-branch/analyzers/v9-grouped-report-formatter');
const { TypeScriptToolOrchestrator } = require('./src/two-branch/orchestrators/typescript-tool-orchestrator');
const path = require('path');

async function runAnalysis() {
  const repoPath = '$REPO_PATH';
  
  console.log('🔧 Running tool orchestration...');
  const orchestrator = new TypeScriptToolOrchestrator();
  const results = await orchestrator.runAllTools(repoPath, 'main');
  
  console.log(\`✅ Tools complete: \${results.issues.length} issues found\`);
  
  console.log('📊 Generating V9 report...');
  const formatter = new V9GroupedReportFormatter();
  
  const metadata = {
    repoPath,
    baseBranch: 'main',
    prBranch: 'main',
    prNumber: 'local-test',
    prTitle: 'Local Test - Extension Testing',
    toolPerformance: results.toolPerformance || [],
  };
  
  const report = await formatter.generateGroupedReport(
    results.issues,
    [],
    metadata
  );
  
  console.log(\`✅ Report generated: \${report.length} bytes\`);
  console.log('💾 LSP file saved to: test-outputs/codequal-lsp-actions.json');
}

runAnalysis().catch(console.error);
"

echo ""
echo "✅ Analysis complete!"
echo "📄 LSP file: $REPO_PATH/packages/agents/test-outputs/codequal-lsp-actions.json"
echo ""
echo "Next steps:"
echo "1. Reload Extension Development Host (Cmd+R)"
echo "2. Load the new LSP file"
echo "3. Diagnostics should now appear!"

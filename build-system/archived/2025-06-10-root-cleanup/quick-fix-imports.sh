#!/bin/bash

echo "🔧 Quick Fix for Agent Import Errors"
echo "==================================="
echo ""

cd "/Users/alpinro/Code Prjects/codequal"

# Fix imports in agents package that are causing errors
echo "Fixing import statements..."

# Update agent.ts
cat > packages/agents/src/agent.ts << 'EOF'
// Base Agent interface for all types of agents
export interface Agent {
  /**
   * Analyze data and return insights, suggestions and recommendations.
   * @param data Data to analyze
   * @returns Analysis results
   */
  analyze(data: any): Promise<AnalysisResult>;
}

// Re-export AnalysisResult type
export interface AnalysisResult {
  id?: string;
  insights: Array<any>;
  suggestions: Array<any>;
  educationalContent?: Array<any>;
  resources?: Array<any>;
}
EOF

echo "✅ Fixed agent.ts"

# Update base-agent.ts to use local types
sed -i.bak "s|import { Agent, AnalysisResult } from '@codequal/core';|import { Agent, AnalysisResult } from '../agent';|" packages/agents/src/base/base-agent.ts
echo "✅ Fixed base-agent.ts"

# Update other files to use relative imports temporarily
find packages/agents/src -name "*.ts" -type f -exec sed -i.bak "s|from '@codequal/core/types/agent'|from '../agent'|g" {} \; 2>/dev/null || true
find packages/agents/src -name "*.ts" -type f -exec sed -i.bak "s|from '@codequal/core'|from '../../../core/src'|g" {} \; 2>/dev/null || true

echo ""
echo "Temporary fixes applied. Now run:"
echo "  bash scripts/build-packages.sh"
echo ""
echo "Or use npm:"
echo "  npm run build"

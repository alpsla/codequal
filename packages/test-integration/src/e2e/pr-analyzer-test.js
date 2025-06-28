const { PRContentAnalyzer } = require('./apps/api/dist/services/intelligence/pr-content-analyzer');

// Test Scenario 1: Docs-only PR (should skip most agents)
const DOCS_ONLY_PR = [
  {
    filename: 'README.md',
    additions: 50,
    deletions: 10,
    changes: 60,
    patch: `
+# CodeQual - AI-Powered Code Analysis
+
+## Getting Started
+CodeQual provides comprehensive code analysis...`
  },
  {
    filename: 'docs/api-reference.md',
    additions: 100,
    deletions: 0,
    changes: 100,
    patch: `+## API Reference`
  },
  {
    filename: 'docs/configuration.md',
    additions: 30,
    deletions: 5,
    changes: 35,
    patch: `+## Configuration Options`
  }
];

// Test Scenario 2: Security-focused PR (should prioritize security agent)
const SECURITY_PR = [
  {
    filename: 'src/auth/jwt-validator.ts',
    additions: 45,
    deletions: 20,
    changes: 65,
    patch: `-const JWT_SECRET = 'hardcoded-secret';
+const JWT_SECRET = process.env.JWT_SECRET;`
  },
  {
    filename: 'src/api/user-controller.ts',
    additions: 30,
    deletions: 10,
    changes: 40,
    patch: `+import { sanitizeInput } from '../utils/security';`
  },
  {
    filename: '.env.example',
    additions: 5,
    deletions: 0,
    changes: 5,
    patch: `+JWT_SECRET=your-secret-key-here`
  }
];

// Test Scenario 3: UI-only PR (should skip backend agents)
const UI_ONLY_PR = [
  {
    filename: 'src/components/Dashboard.tsx',
    additions: 80,
    deletions: 30,
    changes: 110,
    patch: `+import { useState } from 'react';`
  },
  {
    filename: 'src/styles/dashboard.css',
    additions: 50,
    deletions: 10,
    changes: 60,
    patch: `+.dashboard-grid { display: grid; }`
  },
  {
    filename: 'src/components/Card.tsx',
    additions: 40,
    deletions: 0,
    changes: 40,
    patch: `+export const Card = ({ data }) => { return <div>{data}</div>; };`
  }
];

// Test Scenario 4: Mixed changes (should run all relevant agents)
const MIXED_PR = [
  {
    filename: 'src/services/data-processor.ts',
    additions: 100,
    deletions: 50,
    changes: 150,
    patch: `+import { performance } from 'perf_hooks';
+private cache = new Map();`
  },
  {
    filename: 'src/utils/validation.ts',
    additions: 30,
    deletions: 10,
    changes: 40,
    patch: `+export function validateEmail(email) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email); }`
  },
  {
    filename: 'README.md',
    additions: 10,
    deletions: 2,
    changes: 12,
    patch: `-Processing time: ~5 seconds
+Processing time: ~2 seconds (with caching)`
  }
];

// Test runner
async function testPRScenarios() {
  const analyzer = new PRContentAnalyzer();
  
  console.log('🧪 Testing PR Content Analysis Scenarios\n');
  
  // Test 1: Docs-only PR
  console.log('📚 Scenario 1: Documentation-only PR');
  console.log('Expected: Skip most agents (security, performance, dependencies)');
  const docsAnalysis = await analyzer.analyzePR(DOCS_ONLY_PR);
  console.log('File categories:', docsAnalysis.fileCategories);
  console.log('Change types:', docsAnalysis.changeTypes);
  console.log('Agents to skip:', docsAnalysis.agentsToSkip);
  console.log('Agents to keep:', docsAnalysis.agentsToKeep);
  console.log('Skip reasons:', docsAnalysis.skipReasons);
  console.log('---\n');
  
  // Test 2: Security PR
  console.log('🔒 Scenario 2: Security-focused PR');
  console.log('Expected: Prioritize security agent, run all agents');
  const securityAnalysis = await analyzer.analyzePR(SECURITY_PR);
  console.log('File categories:', securityAnalysis.fileCategories);
  console.log('Change types:', securityAnalysis.changeTypes);
  console.log('Agents to skip:', securityAnalysis.agentsToSkip);
  console.log('Agents to keep:', securityAnalysis.agentsToKeep);
  console.log('Skip reasons:', securityAnalysis.skipReasons);
  console.log('---\n');
  
  // Test 3: UI-only PR
  console.log('🎨 Scenario 3: UI-only PR');
  console.log('Expected: Skip backend-focused agents');
  const uiAnalysis = await analyzer.analyzePR(UI_ONLY_PR);
  console.log('File categories:', uiAnalysis.fileCategories);
  console.log('Change types:', uiAnalysis.changeTypes);
  console.log('Agents to skip:', uiAnalysis.agentsToSkip);
  console.log('Agents to keep:', uiAnalysis.agentsToKeep);
  console.log('Skip reasons:', uiAnalysis.skipReasons);
  console.log('---\n');
  
  // Test 4: Mixed PR
  console.log('🔀 Scenario 4: Mixed changes PR');
  console.log('Expected: Run all relevant agents');
  const mixedAnalysis = await analyzer.analyzePR(MIXED_PR);
  console.log('File categories:', mixedAnalysis.fileCategories);
  console.log('Change types:', mixedAnalysis.changeTypes);
  console.log('Agents to skip:', mixedAnalysis.agentsToSkip);
  console.log('Agents to keep:', mixedAnalysis.agentsToKeep);
  console.log('Skip reasons:', mixedAnalysis.skipReasons);
  console.log('---\n');
  
  // Summary
  console.log('📊 Summary:');
  console.log('- Docs-only PR skips:', docsAnalysis.agentsToSkip.length, 'agents');
  console.log('- Security PR skips:', securityAnalysis.agentsToSkip.length, 'agents');
  console.log('- UI-only PR skips:', uiAnalysis.agentsToSkip.length, 'agents');
  console.log('- Mixed PR skips:', mixedAnalysis.agentsToSkip.length, 'agents');
}

// Run tests
testPRScenarios().catch(console.error);
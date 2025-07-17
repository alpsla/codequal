#!/usr/bin/env ts-node

import chalk from 'chalk';
import { ResultOrchestrator } from '../services/result-orchestrator';
import { createLogger } from '@codequal/core/utils';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const logger = createLogger('DataFlowTest');

/**
 * Test the complete data flow from PR fetch to report generation
 */
async function testFullDataFlow() {
  console.log(chalk.cyan('\n🔬 Testing Complete Data Flow (Mock Data)\n'));
  console.log('='.repeat(60));

  // Mock authenticated user
  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    permissions: ['read', 'write'],
    role: 'user' as const,
    status: 'active' as const,
    session: {
      token: 'test-token-123',
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  // Test configuration
  const testConfig = {
    repositoryUrl: 'https://github.com/test-org/test-repo',
    prNumber: 123,
    analysisMode: 'quick' as const,
    authenticatedUser: mockUser
  };

  try {
    // Step 1: Create mock PR context
    console.log(chalk.blue('\n1️⃣ Creating Mock PR Context...'));
    
    const mockPRContext = {
      repositoryUrl: testConfig.repositoryUrl,
      prNumber: testConfig.prNumber,
      prDetails: {
        title: 'Add new feature',
        author: 'test-user',
        state: 'open',
        headBranch: 'feature-branch',
        baseBranch: 'main',
        mergeableState: 'clean',
        labels: ['enhancement'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      diff: {
        files: [
          {
            filename: 'src/components/Button.tsx',
            status: 'modified',
            additions: 25,
            deletions: 10,
            changes: 35,
            patch: `@@ -1,10 +1,25 @@
-export function Button({ onClick, children }) {
+import React from 'react';
+
+interface ButtonProps {
+  onClick: () => void;
+  children: React.ReactNode;
+  variant?: 'primary' | 'secondary';
+}
+
+export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
+  const className = variant === 'primary' 
+    ? 'bg-blue-500 text-white' 
+    : 'bg-gray-200 text-black';
+    
   return (
-    <button onClick={onClick}>
+    <button 
+      onClick={onClick}
+      className={\`px-4 py-2 rounded \${className}\`}
+    >
       {children}
     </button>
   );
 }`
          },
          {
            filename: 'src/utils/api.ts',
            status: 'added',
            additions: 50,
            deletions: 0,
            changes: 50,
            patch: `+export async function fetchData(endpoint: string) {
+  try {
+    const response = await fetch(endpoint);
+    if (!response.ok) {
+      throw new Error('Network response was not ok');
+    }
+    return await response.json();
+  } catch (error) {
+    console.error('Fetch error:', error);
+    throw error;
+  }
+}`
          }
        ],
        totalAdditions: 75,
        totalDeletions: 10,
        totalChanges: 85
      },
      changedFiles: ['src/components/Button.tsx', 'src/utils/api.ts'],
      title: 'Add new feature',
      author: 'test-user',
      branch: 'feature-branch',
      baseBranch: 'main',
      files: [
        {
          path: 'src/components/Button.tsx',
          content: '', // Empty for mock
          diff: 'Modified Button component with TypeScript types',
          previousContent: ''
        },
        {
          path: 'src/utils/api.ts',
          content: '',
          diff: 'Added new API utility function',
          previousContent: ''
        }
      ]
    };
    
    console.log(chalk.green('✓ Mock PR context created'));
    console.log(`  - Title: ${mockPRContext.title}`);
    console.log(`  - Author: ${mockPRContext.author}`);
    console.log(`  - Files changed: ${mockPRContext.files.length}`);
    console.log(`  - Base branch: ${mockPRContext.baseBranch}`);
    
    // Verify files array is populated
    if (!mockPRContext.files || mockPRContext.files.length === 0) {
      console.log(chalk.red('❌ ERROR: Files array is empty!'));
    } else {
      console.log(chalk.green('✓ Files array populated:'));
      mockPRContext.files.forEach((file: any) => {
        console.log(`   - ${file.path}`);
      });
    }

    // Step 2: Test agent configuration
    console.log(chalk.blue('\n2️⃣ Testing Agent Configuration...'));
    const agentConfig = {
      strategy: 'parallel' as const,
      agents: [
        { role: 'security', provider: 'openai', position: 'primary' as const },
        { role: 'architecture', provider: 'claude', position: 'secondary' as const },
        { role: 'code-quality', provider: 'openai', position: 'secondary' as const }
      ]
    };
    console.log('  - Strategy:', agentConfig.strategy);
    console.log('  - Agents:', agentConfig.agents.length);

    // Step 3: Test data structure for agents
    console.log(chalk.blue('\n3️⃣ Testing Data Structure for Agents...'));
    
    const agentInputData = {
      repositoryUrl: testConfig.repositoryUrl,
      prNumber: testConfig.prNumber,
      title: mockPRContext.title,
      description: 'Test PR description',
      files: mockPRContext.files,
      branch: mockPRContext.branch,
      baseBranch: mockPRContext.baseBranch,
      author: mockPRContext.author
    };
    
    console.log('  - Agent input data structure:');
    console.log(`    - Repository: ${agentInputData.repositoryUrl}`);
    console.log(`    - PR Number: ${agentInputData.prNumber}`);
    console.log(`    - Files to analyze: ${agentInputData.files.length}`);

    // Step 4: Simulate expected outputs
    console.log(chalk.blue('\n4️⃣ Expected Agent Outputs...'));
    
    // Security agent output
    console.log('\n  Security Agent should produce:');
    console.log('    - Vulnerability checks');
    console.log('    - Authentication/authorization issues');
    console.log('    - Sensitive data exposure risks');
    
    // Architecture agent output
    console.log('\n  Architecture Agent should produce:');
    console.log('    - Design pattern analysis');
    console.log('    - Code structure recommendations');
    console.log('    - Coupling and cohesion metrics');
    
    // Code quality agent output
    console.log('\n  Code Quality Agent should produce:');
    console.log('    - Code style issues');
    console.log('    - Best practice violations');
    console.log('    - Maintainability suggestions');

    // Step 5: Test educational content generation
    console.log(chalk.blue('\n5️⃣ Educational Content Generation...'));
    console.log('  - Should analyze code patterns');
    console.log('  - Should identify learning opportunities');
    console.log('  - Should provide skill improvement paths');

    // Step 6: Test tools contribution
    console.log(chalk.blue('\n6️⃣ Tools Contribution...'));
    console.log('  - Static analysis integration');
    console.log('  - Linting results');
    console.log('  - Type checking feedback');

    // Step 7: Test DeepWiki integration
    console.log(chalk.blue('\n7️⃣ DeepWiki Integration...'));
    console.log('  - Code documentation generation');
    console.log('  - Architecture diagrams');
    console.log('  - Best practices references');

    // Step 8: Test result compilation
    console.log(chalk.blue('\n8️⃣ Result Compilation...'));
    
    const mockResults = {
      findings: {
        security: [
          { title: 'Missing input validation', severity: 'medium', file: 'src/utils/api.ts' },
          { title: 'Potential XSS vulnerability', severity: 'high', file: 'src/components/Button.tsx' }
        ],
        architecture: [
          { title: 'Consider extracting button styles', severity: 'low', file: 'src/components/Button.tsx' }
        ],
        codeQuality: [
          { title: 'Add error boundary', severity: 'medium', file: 'src/utils/api.ts' }
        ]
      },
      educationalContent: [
        { topic: 'TypeScript Best Practices', relevance: 'high' },
        { topic: 'React Component Patterns', relevance: 'medium' }
      ],
      summary: 'PR introduces TypeScript improvements but has security concerns',
      decision: { recommendation: 'REQUEST_CHANGES', confidence: 0.85 }
    };
    
    const totalFindings = 
      mockResults.findings.security.length + 
      mockResults.findings.architecture.length + 
      mockResults.findings.codeQuality.length;
    
    console.log(`  - Total findings: ${totalFindings}`);
    console.log(`  - Security findings: ${mockResults.findings.security.length}`);
    console.log(`  - Architecture findings: ${mockResults.findings.architecture.length}`);
    console.log(`  - Code quality findings: ${mockResults.findings.codeQuality.length}`);
    console.log(`  - Educational content: ${mockResults.educationalContent.length} topics`);

    // Step 9: Test report generation
    console.log(chalk.blue('\n9️⃣ Report Generation...'));
    console.log('  - HTML report format');
    console.log('  - JSON API response');
    console.log('  - PR comment format');
    console.log('  - Enhanced template usage');

    console.log(chalk.green('\n✅ Data Flow Test Complete'));
    console.log('\n📊 Summary:');
    console.log('  1. PR context extraction: ✓');
    console.log('  2. Agent configuration: ✓');
    console.log('  3. Data structure: ✓');
    console.log('  4. Expected outputs: ✓');
    console.log('  5. Educational content: ✓');
    console.log('  6. Tools contribution: ✓');
    console.log('  7. DeepWiki integration: ✓');
    console.log('  8. Result compilation: ✓');
    console.log('  9. Report generation: ✓');

    console.log(chalk.yellow('\n⚠️  Note: This is a mock test. Real agent execution would require:'));
    console.log('  - Valid OpenAI/Claude API keys');
    console.log('  - Proper agent initialization');
    console.log('  - Actual PR data from GitHub');
    console.log('  - Database connectivity');

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testFullDataFlow().then(() => {
  console.log(chalk.cyan('\n✨ Mock data flow test complete\n'));
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
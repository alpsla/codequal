#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Verify Tool Results in Final Report
 * 
 * This test ensures that:
 * 1. Agents execute their tools properly
 * 2. Tool results are captured and passed through the pipeline
 * 3. Tool data appears in the final report
 * 4. DeepWiki tool results are included
 */

import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { EnhancedMultiAgentExecutor } from '../../../../packages/agents/src/multi-agent/enhanced-executor';
import { ModelVersionSync, RepositorySizeCategory } from '../../../../packages/core/src/services/model-selection/ModelVersionSync';
import { VectorContextService } from '../../../../packages/agents/src/multi-agent/vector-context-service';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { AuthenticatedUser as AgentAuthenticatedUser, UserRole, UserStatus } from '../../../../packages/agents/src/multi-agent/types/auth';
import { AnalysisStrategy } from '../../../../packages/agents/src/multi-agent/types';
import { AuthenticatedUser as ApiAuthenticatedUser } from '../../../../apps/api/src/middleware/auth-middleware';
import { ReporterAgent, ReportFormat } from '../../../../packages/agents/src/multi-agent/reporter-agent';
// DeepWiki manager is now simplified and doesn't need importing for tests
import { PRContextService } from '../../../../apps/api/src/services/pr-context-service';
import { ResultProcessor } from '../../../../apps/api/src/services/result-processor';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('ToolResultsVerification');

// Type definitions
interface Finding {
  type: string;
  severity: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  tool?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

interface AgentResultDetails {
  agentId?: string;
  findings?: Finding[];
  metadata?: {
    toolsExecuted?: string[];
  };
}

async function main() {
  console.log(chalk.cyan('\n🔍 Verifying Tool Results in Final Report\n'));

  // Create agent authenticated user
  const agentAuthenticatedUser: AgentAuthenticatedUser = {
    id: 'test-tool-verification',
    email: 'test@example.com',
    name: 'Test User',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    permissions: {
      repositories: {
        'test-repo': { read: true, write: true, admin: false }
      },
      organizations: ['test-org'],
      globalPermissions: ['analyze'],
      quotas: {
        requestsPerHour: 100,
        maxConcurrentExecutions: 5,
        storageQuotaMB: 100
      }
    },
    session: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000),
      fingerprint: 'test-fingerprint',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    }
  };

  const _repositoryId = 'test-repo-with-tools';
  const _analysisId = `analysis-${Date.now()}`;

  // Create API authenticated user for DeepWiki
  const apiAuthenticatedUser: ApiAuthenticatedUser = {
    id: 'test-tool-verification',
    email: 'test@example.com',
    organizationId: 'test-org',
    permissions: ['analyze', 'view_reports'],
    role: 'user',
    status: 'active',
    session: {
      token: 'test-token',
      expiresAt: new Date(Date.now() + 3600000)
    }
  };

  try {
    // Test PR context with files that should trigger tool usage
    const prContext = {
      repositoryUrl: 'https://github.com/test/repo',
      prNumber: 123,
      prDetails: {
        title: 'Add authentication and API endpoints',
        description: 'This PR adds JWT authentication and new REST API endpoints',
        author: 'testuser',
        createdAt: new Date().toISOString()
      },
      diff: `
diff --git a/src/auth/jwt.ts b/src/auth/jwt.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/auth/jwt.ts
@@ -0,0 +1,20 @@
+import jwt from 'jsonwebtoken';
+
+export function generateToken(userId: string): string {
+  const secret = process.env.JWT_SECRET; // Potential security issue
+  return jwt.sign({ userId }, secret, { expiresIn: '1h' });
+}
+
+export function verifyToken(token: string): unknown {
+  const secret = process.env.JWT_SECRET;
+  return jwt.verify(token, secret); // No error handling
+}

diff --git a/src/api/users.ts b/src/api/users.ts
new file mode 100644
index 0000000..2345678
--- /dev/null
+++ b/src/api/users.ts
@@ -0,0 +1,15 @@
+import { Router } from 'express';
+
+const router = Router();
+
+router.get('/users/:id', async (req, res) => {
+  const userId = req.params.id;
+  // SQL injection vulnerability
+  const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
+  const result = await db.query(query);
+  res.json(result);
+});
      `,
      changedFiles: ['src/auth/jwt.ts', 'src/api/users.ts'],
      primaryLanguage: 'typescript',
      repositorySize: RepositorySizeCategory.MEDIUM,
      analysisMode: 'comprehensive',
      baseBranch: 'main',
      files: [
        {
          path: 'src/auth/jwt.ts',
          content: `import jwt from 'jsonwebtoken';

export function generateToken(userId: string): string {
  const secret = process.env.JWT_SECRET; // Potential security issue
  return jwt.sign({ userId }, secret, { expiresIn: '1h' });
}

export function verifyToken(token: string): unknown {
  const secret = process.env.JWT_SECRET;
  return jwt.verify(token, secret); // No error handling
}`,
          diff: '... diff content ...'
        },
        {
          path: 'src/api/users.ts',
          content: `import { Router } from 'express';

const router = Router();

router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;
  // SQL injection vulnerability
  const query = \`SELECT * FROM users WHERE id = '\${userId}'\`;
  const result = await db.query(query);
  res.json(result);
});`,
          diff: '... diff content ...'
        }
      ]
    };

    // Initialize services
    const _modelVersionSync = new ModelVersionSync(logger);
    const vectorContextService = new VectorContextService(apiAuthenticatedUser);
    // DeepWikiManager is now simplified - using singleton
    const deepWikiManager = require('../../../../apps/api/src/services/deepwiki-manager-simplified').deepWikiManager;
    const _prContextService = new PRContextService();
    const resultProcessor = new ResultProcessor();

    // Create executor with proper configuration
    const multiAgentConfig = {
      name: 'test-tool-verification',
      strategy: 'parallel' as AnalysisStrategy,
      agents: [],  // Will be auto-populated by executor
      fallbackEnabled: true
    };
    
    // Create repository data for the test
    const repositoryData = {
      owner: 'test',
      repo: 'repo',
      prNumber: 123,
      branch: 'main',
      files: prContext.files || []
    };
    
    const executor = new EnhancedMultiAgentExecutor(
      multiAgentConfig,
      repositoryData,
      vectorContextService,
      agentAuthenticatedUser,
      { debug: true },  // options
      {},  // toolResults
      undefined  // deepWikiReportRetriever
    );

    console.log(chalk.yellow('1. Executing agents with tool support...\n'));

    // Execute agents - they should use tools to analyze the code
    const executionResult = await executor.execute();

    const results = executionResult.results;

    console.log(chalk.yellow('\n2. Checking for tool execution evidence...\n'));

    // Check each agent's results for tool usage
    if (results && Array.isArray(results)) {
      results.forEach((result: AgentResultDetails, index: number) => {
        const agentName = result.agentId || `Agent ${index}`;
        console.log(chalk.blue(`${agentName}:`));
        
        // Check if agent has findings (should have found issues in the code)
        if (result.findings && result.findings.length > 0) {
          console.log(chalk.green(`  ✓ Found ${result.findings.length} issues`));
          
          // Check for tool references in findings
          const hasToolReferences = result.findings.some((f: Finding) => 
            f.tool || f.source || f.metadata?.tool || f.metadata?.source
          );
          console.log(hasToolReferences 
            ? chalk.green('  ✓ Tool references found in findings')
            : chalk.yellow('  ⚠️  No explicit tool references in findings')
          );
        } else {
          console.log(chalk.red('  ✗ No findings generated'));
        }

        // Check for tool results in metadata
        if (result.metadata?.toolsExecuted) {
          console.log(chalk.green(`  ✓ Tools executed: ${result.metadata.toolsExecuted.join(', ')}`));
        } else {
          console.log(chalk.yellow('  ⚠️  No tool execution metadata'));
        }
      });
    } else {
      console.log(chalk.red('  ✗ No results array returned'));
    }

    console.log(chalk.yellow('\n3. Processing results and checking DeepWiki...\n'));

    // Process results
    const processedResults = await resultProcessor.processAgentResults(results || []);
    
    // Get DeepWiki summary - wait for analysis if needed
    let deepWikiSummary = null;
    try {
      if (await deepWikiManager.checkRepositoryExists(prContext.repositoryUrl)) {
        deepWikiSummary = await deepWikiManager.waitForAnalysisCompletion(prContext.repositoryUrl);
      }
    } catch (e) {
      console.log(chalk.yellow('  ⚠️  Could not get DeepWiki analysis'));
    }

    console.log(chalk.blue('DeepWiki Summary:'));
    if (deepWikiSummary && Object.keys(deepWikiSummary).length > 0) {
      console.log(chalk.green('  ✓ DeepWiki data retrieved'));
      console.log(`  - Keys: ${Object.keys(deepWikiSummary).join(', ')}`);
      
      // Check for tool results in DeepWiki
      const hasToolData = deepWikiSummary.toolResults || 
                         deepWikiSummary.agentToolResults ||
                         deepWikiSummary.tools;
      console.log(hasToolData
        ? chalk.green('  ✓ Tool results found in DeepWiki')
        : chalk.yellow('  ⚠️  No tool results in DeepWiki summary')
      );
    } else {
      console.log(chalk.red('  ✗ No DeepWiki data available'));
    }

    console.log(chalk.yellow('\n4. Generating final report...\n'));

    // Create Reporter Agent with optional parameters
    const reporterAgent = new ReporterAgent(undefined, undefined);

    // Generate report with all data
    const reportData = {
      analysisResults: processedResults,
      deepWikiSummary: deepWikiSummary || {},
      prContext,
      format: { type: 'full-report', includeEducational: true, educationalDepth: 'detailed' } as ReportFormat
    };

    const finalReport = await reporterAgent.generateStandardReport(
      processedResults,
      deepWikiSummary || {},
      {},
      reportData.format
    );

    console.log(chalk.yellow('\n5. Verifying tool results in final report...\n'));

    // Check for tool results in the final report
    const reportChecks = {
      hasFindings: false,
      hasToolReferences: false,
      hasDeepWikiSection: false,
      hasToolMetadata: false,
      toolMentions: []
    };

    // Check the report content
    const reportContent = JSON.stringify(finalReport);
    
    // Check for findings in modules
    if (finalReport.modules?.findings) {
      reportChecks.hasFindings = true;
      
      // Count total findings
      const totalFindings = finalReport.modules.findings.totalCount || 0;
      console.log(chalk.green(`✓ Report contains ${totalFindings} findings`));
    }

    // Check for tool references
    const toolKeywords = ['tool', 'npm-audit', 'eslint', 'tsc', 'jest', 'semgrep', 'ast-grep'];
    toolKeywords.forEach(keyword => {
      if (reportContent.toLowerCase().includes(keyword)) {
        reportChecks.toolMentions.push(keyword);
      }
    });

    if (reportChecks.toolMentions.length > 0) {
      reportChecks.hasToolReferences = true;
      console.log(chalk.green(`✓ Tool references found: ${reportChecks.toolMentions.join(', ')}`));
    } else {
      console.log(chalk.red('✗ No tool references found in report'));
    }

    // Check for DeepWiki section
    if (reportContent.includes('deepwiki') || reportContent.includes('DeepWiki')) {
      reportChecks.hasDeepWikiSection = true;
      console.log(chalk.green('✓ DeepWiki section found in report'));
    } else {
      console.log(chalk.red('✗ No DeepWiki section in report'));
    }

    // Check metadata
    if (finalReport.metadata?.toolsExecuted) {
      reportChecks.hasToolMetadata = true;
      console.log(chalk.green(`✓ Tool execution metadata found: ${finalReport.metadata.toolsExecuted.join(', ')}`));
    } else {
      console.log(chalk.yellow('⚠️  No tool execution metadata in report'));
    }

    // Print sample of the report to inspect structure
    console.log(chalk.yellow('\n6. Report Structure Sample:\n'));
    console.log(chalk.gray('Report keys:'), Object.keys(finalReport));
    
    if (finalReport.modules) {
      console.log(chalk.gray('Report modules:'), Object.keys(finalReport.modules));
    }
    
    if (finalReport.metadata) {
      console.log(chalk.gray('Metadata keys:'), Object.keys(finalReport.metadata));
    }

    // Summary
    console.log(chalk.cyan('\n📊 Summary:\n'));
    
    const allChecksPassed = reportChecks.hasFindings && 
                           reportChecks.hasToolReferences && 
                           reportChecks.hasDeepWikiSection;

    if (allChecksPassed) {
      console.log(chalk.green('✅ All tool result verifications passed!'));
    } else {
      console.log(chalk.yellow('⚠️  Some tool result integrations may be missing:'));
      if (!reportChecks.hasFindings) console.log(chalk.red('  - No findings in report'));
      if (!reportChecks.hasToolReferences) console.log(chalk.red('  - No tool references in report'));
      if (!reportChecks.hasDeepWikiSection) console.log(chalk.red('  - No DeepWiki section in report'));
      if (!reportChecks.hasToolMetadata) console.log(chalk.yellow('  - No tool metadata in report'));
    }

    // Save report for manual inspection
    const fs = await import('fs');
    const reportPath = path.join(__dirname, 'tool-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
    console.log(chalk.gray(`\nFull report saved to: ${reportPath}`));

  } catch (error) {
    console.error(chalk.red('\n❌ Test failed:'), error);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
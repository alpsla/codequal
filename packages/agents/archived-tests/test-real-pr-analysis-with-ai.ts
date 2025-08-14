/**
 * Real PR Analysis Test with AI Impact Categorization
 * 
 * This test runs a complete PR analysis with the new AI-based impact categorization
 * to validate the integration and ensure quality reports are generated.
 */

import { ComparisonAgent } from './src/standard/comparison/comparison-agent';
import { ModelVersionSync } from '@codequal/core';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('test-real-pr-ai');

async function testRealPRAnalysisWithAI() {
  console.log('🚀 Running Real PR Analysis with AI Impact Categorization\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize model version sync
    const modelVersionSync = new ModelVersionSync(
      logger,
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    );
    
    // Create comparison agent with AI capabilities
    const agent = new ComparisonAgent(logger, modelVersionSync);
    
    // Initialize the agent with configuration for a large TypeScript project
    await agent.initialize({
      language: 'typescript',
      complexity: 'high',
      performance: 'balanced'
    });
    
    // Test data simulating real DeepWiki output for a PR
    const testComparison = {
      mainBranchResult: {
        issues: [
          {
            severity: 'high',
            category: 'security',
            message: 'Hardcoded API keys found in configuration',
            location: { file: 'config/settings.ts', line: 45 },
            codeSnippet: 'const API_KEY = "sk-1234567890abcdef";',
            suggestion: 'Use environment variables for sensitive data'
          },
          {
            severity: 'medium',
            category: 'performance',
            message: 'Inefficient array filtering in hot path',
            location: { file: 'utils/data-processor.ts', line: 234 },
            codeSnippet: 'items.filter(x => x.active).filter(x => x.type === "user")',
            suggestion: 'Combine filter operations for better performance'
          }
        ],
        metadata: {
          filesAnalyzed: 145,
          totalLines: 18500,
          testCoverage: 78
        },
        summary: { critical: 0, high: 1, medium: 1, low: 0 },
        scores: {
          overall: 75,
          security: 70,
          performance: 80,
          quality: 75
        }
      },
      featureBranchResult: {
        issues: [
          // New critical issues introduced
          {
            severity: 'critical',
            category: 'security',
            message: 'SQL injection vulnerability in user query endpoint',
            location: { file: 'api/users/search.ts', line: 89 },
            codeSnippet: 'db.query(`SELECT * FROM users WHERE name = "${req.query.name}"`)',
            suggestion: 'Use parameterized queries to prevent SQL injection',
            remediation: 'Replace with: db.query("SELECT * FROM users WHERE name = ?", [req.query.name])'
          },
          {
            severity: 'critical',
            category: 'security',
            message: 'Authentication bypass in admin panel',
            location: { file: 'middleware/auth.ts', line: 156 },
            codeSnippet: 'if (user.role === "admin" || req.headers["x-admin"]) { next(); }',
            suggestion: 'Remove header-based authentication bypass'
          },
          
          // High severity issues
          {
            severity: 'high',
            category: 'performance',
            message: 'Memory leak in WebSocket connection handler',
            location: { file: 'realtime/ws-handler.ts', line: 234 },
            codeSnippet: 'connections.push(socket); // Never removed',
            suggestion: 'Implement proper cleanup on disconnect'
          },
          {
            severity: 'high',
            category: 'architecture',
            message: 'Circular dependency between UserService and AuthService',
            location: { file: 'services/index.ts', line: 12 },
            suggestion: 'Refactor to break circular dependency'
          },
          
          // Medium issues
          {
            severity: 'medium',
            category: 'security',
            message: 'Sensitive data logged in production',
            location: { file: 'utils/logger.ts', line: 78 },
            codeSnippet: 'console.log("User login:", { email, password })',
            suggestion: 'Remove sensitive data from logs'
          },
          {
            severity: 'medium',
            category: 'performance',
            message: 'N+1 query problem in user listing',
            location: { file: 'api/users/list.ts', line: 145 },
            suggestion: 'Use eager loading or batch queries'
          },
          
          // Low issues
          {
            severity: 'low',
            category: 'code-quality',
            message: 'Unused imports detected',
            location: { file: 'components/Dashboard.tsx', line: 5 },
            suggestion: 'Remove unused imports'
          },
          
          // The old high severity issue still exists (not fixed)
          {
            severity: 'high',
            category: 'security',
            message: 'Hardcoded API keys found in configuration',
            location: { file: 'config/settings.ts', line: 45 },
            codeSnippet: 'const API_KEY = "sk-1234567890abcdef";',
            suggestion: 'Use environment variables for sensitive data'
          }
        ],
        metadata: {
          filesAnalyzed: 152,
          totalLines: 19200,
          testCoverage: 71  // Coverage decreased
        },
        summary: { critical: 2, high: 3, medium: 2, low: 1 },
        scores: {
          overall: 55,  // Score decreased due to new issues
          security: 40,  // Major security issues
          performance: 65,
          quality: 70
        }
      },
      prMetadata: {
        author: 'developer.test',
        prNumber: 'PR-789',
        title: 'feat: Add new user search and admin features',
        filesChanged: 25,
        linesAdded: 750,
        linesRemoved: 150,
        description: 'Implements new user search functionality and admin panel improvements'
      },
      isBreakingChange: false,
      affectedComponents: ['api', 'middleware', 'services', 'realtime']
    };
    
    console.log('📊 Generating report with AI-powered impact categorization...\n');
    
    // Generate the report (will use AI for impact categorization)
    const report = await agent.generateReport(testComparison as any);
    
    // Save the report
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = `./test-outputs/ai-analysis-${timestamp}.md`;
    
    // Ensure directory exists
    if (!fs.existsSync('./test-outputs')) {
      fs.mkdirSync('./test-outputs', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}\n`);
    
    // Extract and display AI-generated impacts
    console.log('✨ AI-Generated Impact Descriptions:\n');
    console.log('=' .repeat(60));
    
    const impactRegex = /\*\*Impact:\*\* ([^\n]+)/g;
    const impacts = [...report.matchAll(impactRegex)];
    
    if (impacts.length > 0) {
      impacts.forEach((match, index) => {
        console.log(`${index + 1}. ${match[1]}`);
      });
    } else {
      console.log('No impact descriptions found in report');
    }
    
    console.log('=' .repeat(60));
    
    // Verify the report contains expected sections
    const expectedSections = [
      'PR Decision',
      'Executive Summary',
      'Security Analysis',
      'Performance Analysis',
      'Code Quality Analysis',
      'Breaking Changes',
      'Issues Resolved',
      'PR Issues'
    ];
    
    console.log('\n📋 Report Validation:');
    expectedSections.forEach(section => {
      const hasSection = report.includes(section);
      console.log(`  ${hasSection ? '✅' : '❌'} ${section}`);
    });
    
    console.log('\n✅ Real PR Analysis with AI Impact Categorization completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testRealPRAnalysisWithAI().catch(console.error);
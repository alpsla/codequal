/**
 * ESLint MCP Integration Example
 * Demonstrates how the Code Quality agent uses ESLint MCP adapter
 */

import { eslintMCPAdapter } from '../src/adapters/mcp/eslint-mcp';
import { toolRegistry } from '../src/core/registry';
import { toolManager } from '../src/core/tool-manager';
import { ToolAwareAgent } from '../src/integration/tool-aware-agent';
import { AnalysisContext, FileData, AgentRole } from '../src/core/interfaces';

// Sample PR with various code quality issues
const samplePRFiles: FileData[] = [
  {
    path: 'src/api/user-service.js',
    content: `
// User service with various code quality issues
const axios = require('axios');

class UserService {
  constructor() {
    this.baseUrl = process.env.API_URL || "http://localhost:3000";  // quotes inconsistency
  }
  
  async getUser(id) {
    console.log("Fetching user: " + id);  // no-console
    
    if (id == null) {  // eqeqeq
      throw new Error("User ID is required");
    }
    
    try {
      var response = await axios.get(this.baseUrl + "/users/" + id);  // no-var, template literals
      return response.data;
    }
    catch(error) {  // inconsistent spacing
      console.error("Error fetching user:", error);  // no-console
      throw error
    }  // missing semicolon
  }
  
  async updateUser(id, data) {
    // TODO: Implement update logic
    var unused = "This variable is not used";  // no-var, no-unused-vars
  }
}

module.exports = UserService
`,
    language: 'javascript',
    changeType: 'modified'
  },
  {
    path: 'src/components/UserProfile.tsx',
    content: `
import React, { useState, useEffect } from 'react';
import UserService from '../api/user-service';

interface User {
  id: string;
  name: string;
  email: string;
}

const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userService = new UserService();  // Should be in useEffect or useMemo
  
  useEffect(() => {
    console.log('Fetching user profile');  // no-console
    
    userService.getUser(userId)
      .then(data => {
        setUser(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to load user:', error);  // no-console
        setLoading(false);
      });
  }, [userId]);  // Missing userService in dependencies
  
  if (loading) return <div>Loading...</div>;
  
  if (!user) return <div>User not found</div>;
  
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};

export default UserProfile;
`,
    language: 'typescript',
    changeType: 'added'
  },
  {
    path: '.eslintrc.json',
    content: `{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "plugins": [
    "react",
    "@typescript-eslint"
  ],
  "rules": {
    "no-console": "warn",
    "no-var": "error",
    "prefer-const": "warn",
    "eqeqeq": ["error", "always"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "@typescript-eslint/no-unused-vars": "warn"
  }
}`,
    language: 'json',
    changeType: 'added'
  }
];

// Create analysis context
const createAnalysisContext = (): AnalysisContext => ({
  agentRole: 'codeQuality',
  pr: {
    prNumber: 456,
    title: 'Add user profile component',
    description: 'Implements user profile display with API integration',
    baseBranch: 'main',
    targetBranch: 'feature/user-profile',
    author: 'developer123',
    files: samplePRFiles,
    commits: [
      {
        sha: 'def456',
        message: 'Add UserService API client',
        author: 'developer123'
      },
      {
        sha: 'ghi789',
        message: 'Implement UserProfile component',
        author: 'developer123'
      }
    ]
  },
  repository: {
    name: 'webapp',
    owner: 'acme-corp',
    languages: ['javascript', 'typescript'],
    frameworks: ['react', 'node'],
    primaryLanguage: 'typescript'
  },
  userContext: {
    userId: 'user-456',
    organizationId: 'acme-corp',
    permissions: ['read', 'write', 'admin']
  },
  vectorDBConfig: {
    enabledTools: ['eslint-mcp', 'prettier-direct'],
    toolConfigs: {
      'eslint-mcp': {
        autoFix: false,
        reportLevel: 'all'
      }
    }
  }
});

// Simulate Code Quality Agent using ESLint
class CodeQualityAgent extends ToolAwareAgent {
  constructor() {
    super(
      'codeQuality',
      {
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 2000
      }
    );
  }
  
  /**
   * Build prompt with ESLint findings
   */
  protected buildPromptWithToolResults(
    context: AnalysisContext,
    toolResults: any
  ): string {
    const eslintFindings = toolResults.findings.filter(
      (f: any) => f.toolId === 'eslint-mcp'
    );
    
    return `
You are a Code Quality expert analyzing a pull request.

PR Title: ${context.pr.title}
Files Changed: ${context.pr.files.length}
Primary Language: ${context.repository.primaryLanguage}

ESLint Analysis Results:
- Total Issues Found: ${eslintFindings.length}
- Critical/High Severity: ${eslintFindings.filter((f: any) => f.severity === 'high').length}
- Medium Severity: ${eslintFindings.filter((f: any) => f.severity === 'medium').length}
- Auto-fixable Issues: ${eslintFindings.filter((f: any) => f.autoFixable).length}

Key Issues by File:
${this.summarizeIssuesByFile(eslintFindings)}

Please provide:
1. Overall code quality assessment
2. Most critical issues that must be fixed
3. Suggestions for improving code consistency
4. Patterns observed that could be improved project-wide
5. Specific auto-fix recommendations

Focus on actionable feedback that improves code maintainability.
`;
  }
  
  private summarizeIssuesByFile(findings: any[]): string {
    const byFile = new Map<string, any[]>();
    
    findings.forEach(finding => {
      if (!byFile.has(finding.file)) {
        byFile.set(finding.file, []);
      }
      byFile.get(finding.file)!.push(finding);
    });
    
    let summary = '';
    byFile.forEach((issues, file) => {
      summary += `\n${file}: ${issues.length} issues\n`;
      const topIssues = issues.slice(0, 3);
      topIssues.forEach(issue => {
        summary += `  - Line ${issue.line}: ${issue.message} (${issue.ruleId})\n`;
      });
      if (issues.length > 3) {
        summary += `  ... and ${issues.length - 3} more issues\n`;
      }
    });
    
    return summary;
  }
}

// Main integration example
async function runIntegrationExample() {
  console.log('🚀 ESLint MCP Integration Example\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Register ESLint adapter with the registry
    console.log('\n1️⃣ Registering ESLint MCP adapter...');
    toolRegistry.register(eslintMCPAdapter);
    console.log('✅ ESLint MCP registered');
    
    // Step 2: Initialize tool manager
    console.log('\n2️⃣ Initializing tool manager...');
    await toolManager.initialize();
    console.log('✅ Tool manager initialized');
    
    // Step 3: Create analysis context
    console.log('\n3️⃣ Creating analysis context...');
    const context = createAnalysisContext();
    console.log(`✅ Context created for PR #${context.pr.prNumber}`);
    
    // Step 4: Check if ESLint can analyze this PR
    console.log('\n4️⃣ Checking ESLint compatibility...');
    const canAnalyze = eslintMCPAdapter.canAnalyze(context);
    console.log(`✅ Can analyze: ${canAnalyze}`);
    
    if (!canAnalyze) {
      console.log('❌ ESLint cannot analyze this PR');
      return;
    }
    
    // Step 5: Simulate ESLint analysis (mock results since server may not be running)
    console.log('\n5️⃣ Simulating ESLint analysis...');
    const mockResults = {
      success: true,
      toolId: 'eslint-mcp',
      executionTime: 1543,
      findings: [
        {
          type: 'issue',
          severity: 'high',
          category: 'code-quality',
          message: 'Unexpected var, use let or const instead',
          file: 'src/api/user-service.js',
          line: 17,
          column: 7,
          ruleId: 'no-var',
          documentation: 'https://eslint.org/docs/latest/rules/no-var',
          autoFixable: true
        },
        {
          type: 'issue',
          severity: 'high',
          category: 'code-quality',
          message: 'Expected \'===\' and instead saw \'==\'',
          file: 'src/api/user-service.js',
          line: 13,
          column: 12,
          ruleId: 'eqeqeq',
          documentation: 'https://eslint.org/docs/latest/rules/eqeqeq',
          autoFixable: true
        },
        {
          type: 'suggestion',
          severity: 'medium',
          category: 'code-quality',
          message: 'Unexpected console statement',
          file: 'src/api/user-service.js',
          line: 11,
          column: 5,
          ruleId: 'no-console',
          documentation: 'https://eslint.org/docs/latest/rules/no-console',
          autoFixable: false
        },
        {
          type: 'issue',
          severity: 'high',
          category: 'code-quality',
          message: 'Missing semicolon',
          file: 'src/api/user-service.js',
          line: 23,
          column: 17,
          ruleId: 'semi',
          documentation: 'https://eslint.org/docs/latest/rules/semi',
          autoFixable: true
        },
        {
          type: 'suggestion',
          severity: 'medium',
          category: 'code-quality',
          message: '\'unused\' is assigned a value but never used',
          file: 'src/api/user-service.js',
          line: 28,
          column: 9,
          ruleId: 'no-unused-vars',
          documentation: 'https://eslint.org/docs/latest/rules/no-unused-vars',
          autoFixable: false
        },
        {
          type: 'suggestion',
          severity: 'medium',
          category: 'code-quality',
          message: 'React Hook useEffect has a missing dependency: \'userService\'',
          file: 'src/components/UserProfile.tsx',
          line: 26,
          column: 6,
          ruleId: 'react-hooks/exhaustive-deps',
          documentation: 'https://github.com/facebook/react/tree/main/packages/eslint-plugin-react-hooks',
          autoFixable: true
        },
        {
          type: 'suggestion',
          severity: 'medium',
          category: 'code-quality',
          message: 'Unexpected console statement',
          file: 'src/components/UserProfile.tsx',
          line: 16,
          column: 5,
          ruleId: 'no-console',
          documentation: 'https://eslint.org/docs/latest/rules/no-console',
          autoFixable: false
        }
      ],
      metrics: {
        filesAnalyzed: 2,
        totalIssues: 7,
        errors: 3,
        warnings: 4,
        fixableIssues: 5,
        fixableErrors: 3,
        fixableWarnings: 2,
        filesWithErrors: 1,
        filesWithWarnings: 2,
        averageIssuesPerFile: 3.5
      }
    };
    
    console.log('✅ Analysis complete!');
    console.log(`   - Files analyzed: ${mockResults.metrics.filesAnalyzed}`);
    console.log(`   - Total issues: ${mockResults.metrics.totalIssues}`);
    console.log(`   - Auto-fixable: ${mockResults.metrics.fixableIssues}`);
    
    // Step 6: Create Code Quality Agent
    console.log('\n6️⃣ Creating Code Quality Agent...');
    const agent = new CodeQualityAgent();
    console.log('✅ Agent created');
    
    // Step 7: Generate agent analysis with tool results
    console.log('\n7️⃣ Generating agent analysis...');
    const prompt = agent['buildPromptWithToolResults'](context, {
      findings: mockResults.findings,
      toolsUsed: ['eslint-mcp']
    });
    
    console.log('\n📝 Generated Prompt:');
    console.log('-'.repeat(50));
    console.log(prompt);
    console.log('-'.repeat(50));
    
    // Step 8: Display actionable recommendations
    console.log('\n8️⃣ Actionable Recommendations:');
    console.log('\n🔧 Auto-fixable Issues (can be fixed automatically):');
    mockResults.findings
      .filter(f => f.autoFixable)
      .forEach(f => {
        console.log(`   - ${f.file}:${f.line} - ${f.message} (${f.ruleId})`);
      });
    
    console.log('\n⚠️  Manual Review Required:');
    mockResults.findings
      .filter(f => !f.autoFixable)
      .forEach(f => {
        console.log(`   - ${f.file}:${f.line} - ${f.message} (${f.ruleId})`);
      });
    
    // Step 9: Summary
    console.log('\n9️⃣ Summary:');
    console.log(`\n✨ ESLint MCP Integration Benefits:`);
    console.log('   1. Automated code quality checks on every PR');
    console.log('   2. Consistent coding standards enforcement');
    console.log('   3. Auto-fix suggestions for common issues');
    console.log('   4. Framework-aware analysis (React hooks, TypeScript)');
    console.log('   5. Integration with AI agent for contextual feedback');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Run "npm run install-tools" to install ESLint MCP');
    console.log('   2. Configure ESLint rules in .eslintrc.json');
    console.log('   3. Enable auto-fix in PR comments');
    console.log('   4. Monitor code quality metrics over time');
    
  } catch (error) {
    console.error('\n❌ Error during integration example:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await toolManager.shutdown();
    console.log('✅ Cleanup complete');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ ESLint MCP Integration Example Complete!');
}

// Run the example
if (require.main === module) {
  runIntegrationExample()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runIntegrationExample, CodeQualityAgent };

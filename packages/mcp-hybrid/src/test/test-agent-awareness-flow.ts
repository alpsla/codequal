/**
 * Test Agent Tool Awareness and Role-Specific Tavily Queries
 */

import { agentToolAwareness } from '../integration/agent-tool-awareness';
import { tavilyRoleQueryGenerator } from '../integration/tavily-role-queries';
import { AnalysisContext, AgentRole } from '../core/interfaces';

async function testAgentAwarenessFlow() {
  console.log('🧪 Testing Agent Tool Awareness & Role-Specific Tavily\n');
  console.log('=' .repeat(60) + '\n');
  
  // Test context
  const testContext: AnalysisContext = {
    agentRole: 'security',
    pr: {
      prNumber: 789,
      title: 'Add OAuth2 authentication',
      description: 'Implements OAuth2 with JWT tokens',
      baseBranch: 'main',
      targetBranch: 'feature/oauth',
      author: 'developer',
      files: [
        {
          path: 'src/auth/oauth.js',
          content: `
            const jwt = require('jsonwebtoken');
            const bcrypt = require('bcrypt');
            
            function authenticate(username, password) {
              // SQL query with potential injection
              const query = \`SELECT * FROM users WHERE username = '\${username}'\`;
              // More auth code...
            }
          `,
          language: 'javascript',
          changeType: 'added'
        },
        {
          path: 'src/server.js',
          content: `
            const express = require('express');
            const { authenticate } = require('./auth/oauth');
            
            const app = express();
            app.post('/login', authenticate);
          `,
          language: 'javascript',
          changeType: 'modified'
        }
      ],
      commits: []
    },
    repository: {
      name: 'oauth-app',
      owner: 'test-org',
      languages: ['javascript'],
      frameworks: ['express'],
      primaryLanguage: 'javascript'
    },
    userContext: {
      userId: 'test-user',
      permissions: ['read', 'write']
    }
  };
  
  try {
    // Step 1: Create feature branch workspace
    console.log('📁 Step 1: Creating feature branch workspace\n');
    const featureRepoPath = await agentToolAwareness.createFeatureBranchWorkspace(
      '/tmp/cloned-repo', // Simulated clone path
      789,
      'main',
      'feature/oauth'
    );
    console.log(`✓ Feature workspace created: ${featureRepoPath}\n`);
    
    // Step 2: Register tool execution start
    console.log('🚀 Step 2: Registering tool execution\n');
    await agentToolAwareness.registerToolExecutionStart(
      'oauth-app',
      789,
      'feature/oauth',
      featureRepoPath
    );
    console.log('✓ Tool execution registered\n');
    
    // Step 3: Test agent awareness check (should be executing)
    console.log('🔍 Step 3: Testing agent awareness checks\n');
    
    const roles: AgentRole[] = ['security', 'codeQuality', 'dependency'];
    for (const role of roles) {
      const availability = await agentToolAwareness.checkToolAvailability(
        'oauth-app',
        789,
        role
      );
      console.log(`${role} agent check:`, availability.message);
    }
    console.log('');
    
    // Step 4: Simulate tool execution progress
    console.log('⚡ Step 4: Simulating tool execution\n');
    
    // Security tools complete
    await agentToolAwareness.updateToolExecutionProgress(
      'oauth-app',
      789,
      'security',
      ['semgrep-mcp', 'tavily-mcp', 'sonarqube']
    );
    console.log('✓ Security tools completed');
    
    // Check availability again
    const securityCheck = await agentToolAwareness.checkToolAvailability(
      'oauth-app',
      789,
      'security'
    );
    console.log(`Security agent re-check: ${securityCheck.message}\n`);
    
    // Step 5: Test role-specific Tavily queries
    console.log('🔎 Step 5: Testing role-specific Tavily queries\n');
    
    const allRoles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'educational', 'reporting'];
    
    for (const role of allRoles) {
      console.log(`\n${role.toUpperCase()} Agent Queries:`);
      console.log('-'.repeat(40));
      
      const roleContext = { ...testContext, agentRole: role };
      const queries = tavilyRoleQueryGenerator.generateQueriesForRole(role, roleContext);
      
      queries.slice(0, 3).forEach((query, idx) => {
        console.log(`${idx + 1}. [${query.priority}] ${query.query}`);
        console.log(`   Intent: ${query.intent}`);
        console.log(`   Type: ${query.expectedType}`);
      });
      
      if (queries.length > 3) {
        console.log(`   ... and ${queries.length - 3} more queries`);
      }
    }
    
    // Step 6: Complete tool execution
    console.log('\n\n✅ Step 6: Completing tool execution\n');
    
    // Update remaining roles
    for (const role of ['codeQuality', 'dependency', 'performance', 'educational', 'reporting'] as AgentRole[]) {
      await agentToolAwareness.updateToolExecutionProgress(
        'oauth-app',
        789,
        role,
        ['eslint-mcp', 'tavily-mcp', 'sonarqube']
      );
    }
    
    await agentToolAwareness.registerToolExecutionComplete('oauth-app', 789);
    console.log('✓ All tool executions completed');
    
    // Final availability check
    const finalCheck = await agentToolAwareness.checkToolAvailability(
      'oauth-app',
      789,
      'security'
    );
    console.log(`\nFinal availability: ${finalCheck.message}`);
    
    // Step 7: Test feature branch file access
    console.log('\n📄 Step 7: Testing feature branch file access\n');
    
    const fileContent = await agentToolAwareness.getFeatureBranchFile(
      'oauth-app',
      789,
      'src/auth/oauth.js'
    );
    
    if (fileContent) {
      console.log('✓ Successfully retrieved feature branch file');
      console.log(`  File length: ${fileContent.length} characters`);
    }
    
    // Summary
    console.log('\n\n🎯 Key Insights:\n');
    console.log('1. Agents check tool availability before starting analysis');
    console.log('2. Feature branch workspace provides actual file state');
    console.log('3. Tavily generates different queries for each agent role:');
    console.log('   - Security: CVEs, vulnerabilities, OWASP');
    console.log('   - Code Quality: Style guides, best practices');
    console.log('   - Dependencies: Package security, alternatives');
    console.log('   - Performance: Optimization techniques');
    console.log('   - Educational: Tutorials, explanations');
    console.log('   - Reporting: Industry standards, trends');
    console.log('4. Each role gets targeted, relevant web search results');
    console.log('5. Results are stored separately with role-specific embeddings');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAgentAwarenessFlow();
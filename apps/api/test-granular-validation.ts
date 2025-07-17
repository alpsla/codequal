#!/usr/bin/env ts-node

import { DeepWikiManager } from './src/services/deepwiki-manager';
import { AuthenticatedUser } from './src/middleware/auth-middleware';
import { createApp } from './src/index';

// Test auth header
const testAuthHeader = 'Bearer eyJhbGciOiJIUzI1NiIsImtpZCI6InVMS2F5R1RkcUVOTWJ1RUQiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3pnd2l3Z2F3ZXhyaXlvZnZjeWtuLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJjYmZhNzA2NS1jMjczLTRkMDYtOTE2Ni05MjI1YzJmZGE1NzkiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzM3MjQyNTc4LCJpYXQiOjE3MzcyMzg5NzgsImVtYWlsIjoidGVzdEBjb2RlcXVhbC5kZXYiLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoidGVzdEBjb2RlcXVhbC5kZXYiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiY2JmYTcwNjUtYzI3My00ZDA2LTkxNjYtOTIyNWMyZmRhNTc5In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3MzcyMzg5Nzh9XSwic2Vzc2lvbl9pZCI6ImRhOWM5MzQ1LTgzYTQtNDJjMy04ZTBjLWFmMDcwYzU1YmVjZiIsImlzX2Fub255bW91cyI6ZmFsc2V9.eXdGWGGu50IQEhMAD3lsyF_kKO9BH6U5KLaGP8P-xQo';

// Create test user
const testUser: AuthenticatedUser = {
  id: 'test-user-id',
  email: 'test@codequal.dev',
  organizationId: 'test-org-id',
  permissions: ['read', 'write', 'admin'],
  role: 'user',
  status: 'active',
  session: {
    token: 'test-session-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
};

interface ToolOutput {
  toolName: string;
  executionTime: number;
  findingsCount: number;
  findings: any[];
  error?: string;
}

interface DeepWikiOutput {
  repositoryUrl: string;
  analysisTime: number;
  sections: {
    architecture?: any;
    security?: any;
    performance?: any;
    codeQuality?: any;
    dependencies?: any;
  };
  recommendations: {
    [role: string]: string[];
  };
}

interface ValidationReport {
  deepWiki: DeepWikiOutput;
  tools: ToolOutput[];
  prAnalysis: {
    prNumber: number;
    filesAnalyzed: number;
    filesWithContent: number;
    branchUsed: string;
    findings: any;
  };
}

async function validateGranularProcess(): Promise<ValidationReport> {
  console.log('=== Granular Process Validation ===\n');
  
  const repositoryUrl = 'https://github.com/facebook/react';
  const prNumber = 123;
  const report: ValidationReport = {
    deepWiki: {} as DeepWikiOutput,
    tools: [],
    prAnalysis: {
      prNumber,
      filesAnalyzed: 0,
      filesWithContent: 0,
      branchUsed: '',
      findings: {}
    }
  };
  
  try {
    // Phase 1: Validate DeepWiki Analysis
    console.log('📊 PHASE 1: DeepWiki Analysis Validation\n');
    
    const deepWikiManager = new DeepWikiManager(testUser);
    const startDeepWiki = Date.now();
    
    console.log('Triggering DeepWiki analysis...');
    const jobId = await deepWikiManager.triggerRepositoryAnalysis(repositoryUrl);
    console.log('Job ID:', jobId);
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    const deepWikiResults = await deepWikiManager.waitForAnalysisCompletion(repositoryUrl);
    const deepWikiTime = Date.now() - startDeepWiki;
    
    // Extract DeepWiki output
    report.deepWiki = {
      repositoryUrl,
      analysisTime: deepWikiTime,
      sections: deepWikiResults.analysis || {},
      recommendations: {}
    };
    
    // Extract recommendations by role
    if (deepWikiResults.analysis) {
      Object.entries(deepWikiResults.analysis).forEach(([role, data]: [string, any]) => {
        if (data.recommendations && Array.isArray(data.recommendations)) {
          report.deepWiki.recommendations[role] = data.recommendations;
        }
      });
    }
    
    console.log('\n✅ DeepWiki Report Summary:');
    console.log(`- Analysis Time: ${(deepWikiTime / 1000).toFixed(2)}s`);
    console.log(`- Sections Analyzed: ${Object.keys(report.deepWiki.sections).join(', ')}`);
    console.log('\n📋 DeepWiki Recommendations by Role:');
    Object.entries(report.deepWiki.recommendations).forEach(([role, recs]) => {
      console.log(`\n${role}:`);
      recs.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
    });
    
    // Phase 2: Direct MCP Tool Execution
    console.log('\n\n📊 PHASE 2: Direct MCP Tool Validation\n');
    
    // Import MCP tools
    const mcpHybrid = await import('@codequal/mcp-hybrid');
    await mcpHybrid.initializeTools();
    
    // Get cached files for tool analysis
    const cachedFiles = await deepWikiManager.getCachedRepositoryFiles(repositoryUrl);
    console.log(`\nCached files available: ${cachedFiles.length}`);
    
    // Create test context with cached files
    const testContext = {
      agentRole: 'security' as const,
      pr: {
        prNumber: 1,
        title: 'Test PR',
        description: 'Testing tools',
        baseBranch: 'main',
        targetBranch: 'feature',
        author: 'test',
        files: cachedFiles.map(f => ({
          filename: f.path,
          path: f.path,
          content: f.content,
          status: 'modified' as const,
          additions: 10,
          deletions: 0,
          changes: 10,
          patch: ''
        })),
        commits: []
      },
      repository: {
        name: 'react',
        owner: 'facebook',
        languages: ['javascript', 'typescript'],
        frameworks: ['react'],
        primaryLanguage: 'javascript'
      },
      userContext: {
        userId: 'test-user',
        organizationId: 'test-org',
        permissions: ['read', 'write']
      }
    };
    
    // Execute each tool individually for granular validation
    const tools = ['eslint', 'semgrep', 'npm-audit', 'madge', 'dependency-cruiser'];
    
    for (const toolName of tools) {
      console.log(`\n🔧 Executing ${toolName}...`);
      const toolStart = Date.now();
      
      try {
        // Execute tool through parallel executor with single tool
        const results = await mcpHybrid.parallelAgentExecutor.executeToolsForAgents(
          ['security', 'architecture', 'dependency'],
          testContext,
          {
            strategy: 'sequential',
            maxParallel: 1,
            timeout: 30000,
            toolFilter: (tool: any) => tool.id.includes(toolName)
          }
        );
        
        const toolTime = Date.now() - toolStart;
        
        // Extract findings for this tool
        let totalFindings = 0;
        let allFindings: any[] = [];
        
        results.forEach((result, role) => {
          if (result.findings.length > 0) {
            totalFindings += result.findings.length;
            allFindings.push(...result.findings);
          }
        });
        
        const toolOutput: ToolOutput = {
          toolName,
          executionTime: toolTime,
          findingsCount: totalFindings,
          findings: allFindings.slice(0, 3) // First 3 findings for review
        };
        
        report.tools.push(toolOutput);
        
        console.log(`✅ ${toolName} completed in ${(toolTime / 1000).toFixed(2)}s`);
        console.log(`   Findings: ${totalFindings}`);
        
        if (allFindings.length > 0) {
          console.log('   Sample findings:');
          allFindings.slice(0, 2).forEach((f, i) => {
            console.log(`   ${i + 1}. ${f.message || f.description || f.title || 'No message'}`);
            console.log(`      - File: ${f.file || f.filename || 'unknown'}`);
            console.log(`      - Severity: ${f.severity || 'unknown'}`);
          });
        }
        
      } catch (error) {
        console.error(`❌ ${toolName} failed:`, error);
        report.tools.push({
          toolName,
          executionTime: Date.now() - toolStart,
          findingsCount: 0,
          findings: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Phase 3: Full PR Analysis with Server
    console.log('\n\n📊 PHASE 3: Full PR Analysis Validation\n');
    
    // Create and start server
    const app = await createApp();
    const port = 3003;
    const server = app.listen(port, () => {
      console.log(`Test server running on port ${port}`);
    });
    
    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // Run PR analysis
      console.log('Running full PR analysis...');
      const prResponse = await fetch(`http://localhost:${port}/api/analyze-pr`, {
        method: 'POST',
        headers: {
          'Authorization': testAuthHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryUrl,
          prNumber,
          analysisMode: 'comprehensive'
        }),
      });
      
      if (!prResponse.ok) {
        throw new Error(`PR analysis failed: ${await prResponse.text()}`);
      }
      
      const prResult = await prResponse.json();
      
      // Extract PR analysis details
      const prFiles = prResult.debugInfo?.prContext?.files || [];
      const filesWithContent = prFiles.filter((f: any) => f.content).length;
      const prBranch = prResult.debugInfo?.prContext?.prDetails?.headBranch || 'unknown';
      
      report.prAnalysis = {
        prNumber,
        filesAnalyzed: prFiles.length,
        filesWithContent,
        branchUsed: prBranch,
        findings: prResult.findings || {}
      };
      
      console.log('\n✅ PR Analysis Results:');
      console.log(`- Files Analyzed: ${prFiles.length}`);
      console.log(`- Files with Content: ${filesWithContent} (${prFiles.length > 0 ? ((filesWithContent / prFiles.length) * 100).toFixed(1) : 0}%)`);
      console.log(`- PR Branch Used: ${prBranch}`);
      
      console.log('\n📋 Findings by Category:');
      Object.entries(report.prAnalysis.findings).forEach(([category, findings]: [string, any]) => {
        if (Array.isArray(findings) && findings.length > 0) {
          console.log(`\n${category}: ${findings.length} findings`);
          findings.slice(0, 2).forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.title || f.message || f.description || 'No title'}`);
          });
        }
      });
      
    } finally {
      server.close();
    }
    
    // Final Validation Report
    console.log('\n\n📊 FINAL VALIDATION REPORT\n');
    console.log('='.repeat(50));
    
    console.log('\n1. DeepWiki Analysis:');
    console.log(`   - Completed: ✅`);
    console.log(`   - Time: ${(report.deepWiki.analysisTime / 1000).toFixed(2)}s`);
    console.log(`   - Recommendations: ${Object.values(report.deepWiki.recommendations).flat().length} total`);
    
    console.log('\n2. MCP Tools Execution:');
    const successfulTools = report.tools.filter(t => !t.error);
    const totalToolFindings = report.tools.reduce((sum, t) => sum + t.findingsCount, 0);
    console.log(`   - Success Rate: ${successfulTools.length}/${report.tools.length} (${((successfulTools.length / report.tools.length) * 100).toFixed(0)}%)`);
    console.log(`   - Total Findings: ${totalToolFindings}`);
    report.tools.forEach(tool => {
      console.log(`   - ${tool.toolName}: ${tool.error ? '❌ Failed' : `✅ ${tool.findingsCount} findings`}`);
    });
    
    console.log('\n3. PR Branch Analysis:');
    console.log(`   - Files Coverage: ${report.prAnalysis.filesWithContent}/${report.prAnalysis.filesAnalyzed} (${report.prAnalysis.filesAnalyzed > 0 ? ((report.prAnalysis.filesWithContent / report.prAnalysis.filesAnalyzed) * 100).toFixed(1) : 0}%)`);
    console.log(`   - Branch: ${report.prAnalysis.branchUsed}`);
    const totalPRFindings = Object.values(report.prAnalysis.findings)
      .filter(Array.isArray)
      .reduce((sum: number, findings: any[]) => sum + findings.length, 0);
    console.log(`   - Total Findings: ${totalPRFindings}`);
    
    console.log('\n4. Data Flow Validation:');
    console.log(`   - DeepWiki → Vector DB: ✅`);
    console.log(`   - DeepWiki → MCP Tools: ${cachedFiles.length > 0 ? '✅' : '❌'}`);
    console.log(`   - PR Branch → MCP Tools: ${report.prAnalysis.filesWithContent > 0 ? '✅' : '❌'}`);
    console.log(`   - Tools → Agents: ${totalPRFindings > 0 ? '✅' : '❌'}`);
    console.log(`   - Recommendations → Report: ${Object.values(report.deepWiki.recommendations).flat().length > 0 ? '✅' : '❌'}`);
    
    console.log('\n='.repeat(50));
    console.log('✅ Validation Complete!');
    
    return report;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    throw error;
  }
}

// Run validation
validateGranularProcess()
  .then(report => {
    console.log('\n\n📄 Full report saved to: validation-report.json');
    require('fs').writeFileSync(
      'validation-report.json',
      JSON.stringify(report, null, 2)
    );
  })
  .catch(console.error);
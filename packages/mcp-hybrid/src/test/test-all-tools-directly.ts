/**
 * Test All Tools Directly
 * Runs each tool directly and captures their markdown outputs
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AnalysisContext, AgentRole, ToolResult } from '../core/interfaces';
import { toolRegistry } from '../core/registry';
import { exec } from 'child_process';
import { promisify } from 'util';

// Import all tools
import { SemgrepMCPAdapter } from '../adapters/mcp/semgrep-mcp';
import { tavilyMCPEnhanced } from '../adapters/mcp/tavily-mcp-enhanced';
import { ESLintDirectAdapter } from '../adapters/direct/eslint-direct';
import { SerenaMCPAdapter } from '../adapters/mcp/serena-mcp';
import { GitMCPAdapter } from '../adapters/mcp/missing-mcp-tools';
import { SonarJSDirectAdapter } from '../adapters/direct/sonarjs-direct';
import { DependencyCruiserDirectAdapter } from '../adapters/direct/dependency-cruiser-direct';
import { MadgeDirectAdapter } from '../adapters/direct/madge-direct';
import { NpmAuditDirectAdapter } from '../adapters/direct/npm-audit-direct';
import { LicenseCheckerDirectAdapter } from '../adapters/direct/license-checker-direct';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Output directory for markdown results
const OUTPUT_DIR = path.join(__dirname, '../../tool-markdown-outputs-direct');

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  // Clean previous outputs
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    for (const file of files) {
      if (file.endsWith('.md')) {
        await fs.unlink(path.join(OUTPUT_DIR, file));
      }
    }
  } catch (e) {
    // Directory might not exist
  }
}

async function saveToolOutput(toolId: string, role: AgentRole, result: ToolResult, executionTime: number) {
  const filename = `${toolId}-${role}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  let content = `# Tool: ${toolId}\n`;
  content += `## Role: ${role}\n`;
  content += `## Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
  content += `## Execution Time: ${executionTime}ms\n\n`;
  
  if (result.error) {
    content += `### Error\n\`\`\`\n${result.error.message}\n`;
    // Details not available in standard error interface
    content += `\`\`\`\n\n`;
  }
  
  if (result.findings && result.findings.length > 0) {
    content += `### Findings (${result.findings.length})\n\n`;
    
    // Group findings by severity
    const bySeverity = result.findings.reduce((acc, finding) => {
      const sev = finding.severity || 'info';
      if (!acc[sev]) acc[sev] = [];
      acc[sev].push(finding);
      return acc;
    }, {} as Record<string, typeof result.findings>);
    
    for (const [severity, findings] of Object.entries(bySeverity)) {
      content += `#### ${severity.toUpperCase()} (${findings.length})\n\n`;
      
      for (const finding of findings) {
        content += `**${finding.type.toUpperCase()} - ${finding.severity}**\n`;
        if (finding.file) content += `- File: \`${finding.file}\`\n`;
        if (finding.line) content += `- Line: ${finding.line}\n`;
        if (finding.category) content += `- Category: ${finding.category}\n`;
        content += `- Message: ${finding.message}\n`;
        
        // Code snippet not available in standard ToolFinding interface
        
        if (finding.documentation) {
          content += `\n**Documentation:**\n${finding.documentation}\n`;
        }
        
        if (finding.fix) {
          content += `\n**Suggested Fix:**\n${finding.fix.description}\n`;
        }
        
        content += '\n---\n\n';
      }
    }
  } else {
    content += `### No findings\n\n`;
  }
  
  if (result.metrics) {
    content += `### Metrics\n\`\`\`json\n${JSON.stringify(result.metrics, null, 2)}\n\`\`\`\n\n`;
  }
  
  // Summary not available in standard ToolResult interface
  
  await fs.writeFile(filepath, content);
  return filename;
}

async function runAllToolsDirectly(prUrl: string) {
  console.log('🚀 Running All Tools Directly');
  console.log(`📍 Analyzing: ${prUrl}\n`);
  
  await ensureOutputDir();
  
  // Parse PR URL
  const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!urlMatch) {
    throw new Error('Invalid GitHub PR URL format');
  }
  
  const [, owner, repo, prNumber] = urlMatch;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  
  // Clone repository
  console.log('📁 Step 1: Cloning repository...');
  const clonePath = `/tmp/direct-tools-test-${Date.now()}`;
  
  try {
    await execAsync(`git clone ${repoUrl} ${clonePath}`);
    console.log(`  ✅ Cloned to: ${clonePath}`);
    
    // Fetch PR
    await execAsync(`cd ${clonePath} && git fetch origin pull/${prNumber}/head:pr-${prNumber}`);
    await execAsync(`cd ${clonePath} && git checkout pr-${prNumber}`);
    
    // Detect default branch
    const { stdout: defaultBranch } = await execAsync(
      `cd ${clonePath} && git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
    );
    const baseBranch = defaultBranch.trim() || 'master';
    
    // Get changed files
    const { stdout: diffOutput } = await execAsync(
      `cd ${clonePath} && git diff --name-only ${baseBranch}...pr-${prNumber}`
    );
    const changedFiles = diffOutput.trim().split('\n').filter(f => f.length > 0);
    console.log(`\n📝 Found ${changedFiles.length} changed files:`, changedFiles);
    
    // Register all tools
    console.log('\n📦 Step 2: Registering tools...');
    
    const tools = [
      new SemgrepMCPAdapter(),
      tavilyMCPEnhanced,
      new ESLintDirectAdapter(),
      new SerenaMCPAdapter(),
      new GitMCPAdapter(),
      new SonarJSDirectAdapter(),
      new DependencyCruiserDirectAdapter(),
      new MadgeDirectAdapter(),
      new NpmAuditDirectAdapter(),
      new LicenseCheckerDirectAdapter()
    ];
    
    for (const tool of tools) {
      await toolRegistry.register(tool);
      console.log(`  ✅ Registered: ${tool.id}`);
    }
    
    // Create analysis context
    const context: AnalysisContext = {
      agentRole: 'security',
      pr: {
        prNumber: parseInt(prNumber),
        title: `PR #${prNumber}`,
        description: 'Direct tool test',
        baseBranch: baseBranch,
        targetBranch: `pr-${prNumber}`,
        author: 'unknown',
        files: changedFiles.map(f => ({
          path: f,
          content: '', // Empty content for test
          changeType: 'modified' as const
        })),
        commits: []
      },
      repository: {
        name: repo,
        owner: owner,
        languages: ['javascript', 'typescript'],
        frameworks: ['express'],
        clonedPath: clonePath
      },
      userContext: {
        userId: 'test-direct-tools',
        organizationId: 'codequal',
        permissions: ['read', 'write']
      }
    };
    
    // Run each tool directly
    console.log('\n🔧 Step 3: Running tools directly...\n');
    
    const outputFiles: string[] = [];
    const toolResults: Map<string, Map<AgentRole, { result: ToolResult, time: number }>> = new Map();
    
    for (const tool of tools) {
      console.log(`\n🔨 Testing ${tool.id}...`);
      toolResults.set(tool.id, new Map());
      
      // Test each role the tool supports
      const roles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture'];
      
      for (const role of roles) {
        try {
          // Update context with current role
          const roleContext = { ...context, agentRole: role };
          
          console.log(`  📋 Testing role: ${role}`);
          const startTime = Date.now();
          
          // Run the tool
          const result = await tool.analyze(roleContext);
          const executionTime = Date.now() - startTime;
          
          // Store result
          toolResults.get(tool.id)!.set(role, { result, time: executionTime });
          
          // Save output
          const filename = await saveToolOutput(tool.id, role, result, executionTime);
          outputFiles.push(filename);
          
          console.log(`    ${result.success ? '✅' : '❌'} ${filename} - ${result.findings?.length || 0} findings (${executionTime}ms)`);
          
        } catch (error: any) {
          console.log(`    ❌ Error for role ${role}: ${error.message}`);
          
          // Save error output
          const errorResult: ToolResult = {
            success: false,
            toolId: tool.id,
            error: { 
              message: error.message, 
              code: 'TOOL_ERROR',
              recoverable: false
            },
            executionTime: 0
          };
          const filename = await saveToolOutput(tool.id, role, errorResult, 0);
          outputFiles.push(filename);
        }
      }
    }
    
    // Create summary report
    console.log('\n📄 Creating summary report...');
    let summaryContent = `# Direct Tool Test Results\n\n`;
    summaryContent += `Generated from: ${prUrl}\n`;
    summaryContent += `Changed files: ${changedFiles.join(', ')}\n\n`;
    summaryContent += `## Tool Execution Summary\n\n`;
    
    // Create summary table
    summaryContent += `| Tool | Security | Code Quality | Dependency | Performance | Architecture |\n`;
    summaryContent += `|------|----------|--------------|------------|-------------|-------------|\n`;
    
    for (const [toolId, roleResults] of toolResults) {
      summaryContent += `| ${toolId} |`;
      
      for (const role of ['security', 'codeQuality', 'dependency', 'performance', 'architecture'] as AgentRole[]) {
        const result = roleResults.get(role);
        if (result) {
          const status = result.result.success ? '✅' : '❌';
          const findings = result.result.findings?.length || 0;
          summaryContent += ` ${status} (${findings}) |`;
        } else {
          summaryContent += ` - |`;
        }
      }
      summaryContent += '\n';
    }
    
    summaryContent += `\n## Output Files\n\n`;
    
    // Group by tool
    const byTool = outputFiles.reduce((acc, file) => {
      const [toolId] = file.split('-');
      if (!acc[toolId]) acc[toolId] = [];
      acc[toolId].push(file);
      return acc;
    }, {} as Record<string, string[]>);
    
    for (const [toolId, files] of Object.entries(byTool)) {
      summaryContent += `### ${toolId}\n`;
      for (const file of files.sort()) {
        summaryContent += `- [${file}](./${file})\n`;
      }
      summaryContent += '\n';
    }
    
    await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), summaryContent);
    
    console.log(`\n✅ All outputs saved to: ${OUTPUT_DIR}`);
    console.log(`📊 Total output files: ${outputFiles.length}`);
    
    // Cleanup
    await fs.rm(clonePath, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Failed to run tools:', error);
    throw error;
  }
}

// Get PR URL from command line or use default
const prUrl = process.argv[2] || 'https://github.com/expressjs/express/pull/5500';

// Run the test
runAllToolsDirectly(prUrl)
  .then(() => {
    console.log('\n✨ Direct tool test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Direct tool test failed:', error);
    process.exit(1);
  });
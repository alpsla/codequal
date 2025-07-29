/**
 * Capture Preprocessing Tool Outputs
 * Runs preprocessing and captures individual tool markdown outputs
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { preprocessingExecutor } from '../integration/preprocessing-executor';
import { AnalysisContext, AgentRole, ToolResult } from '../core/interfaces';
import { metricsReporter } from '../monitoring/supabase-metrics-reporter';
import { toolRegistry } from '../core/registry';
import { parallelToolExecutor } from '../integration/parallel-tool-executor';
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
const OUTPUT_DIR = path.join(__dirname, '../../tool-markdown-outputs');

// Store tool results as they execute
const toolOutputs = new Map<string, Map<AgentRole, ToolResult>>();

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  // Clean previous outputs
  const files = await fs.readdir(OUTPUT_DIR);
  for (const file of files) {
    if (file.endsWith('.md')) {
      await fs.unlink(path.join(OUTPUT_DIR, file));
    }
  }
}

async function saveToolOutput(toolId: string, role: AgentRole, result: ToolResult) {
  const filename = `${toolId}-${role}.md`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  let content = `# Tool: ${toolId}\n`;
  content += `## Role: ${role}\n`;
  content += `## Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
  content += `## Execution Time: ${result.executionTime}ms\n\n`;
  
  if (result.error) {
    content += `### Error\n\`\`\`\n${result.error.message}\n\`\`\`\n\n`;
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

async function capturePreprocessingOutputs(prUrl: string) {
  console.log('🚀 Capturing Preprocessing Tool Outputs');
  console.log(`📍 Analyzing: ${prUrl}\n`);
  
  await ensureOutputDir();
  
  // Parse PR URL
  const urlMatch = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!urlMatch) {
    throw new Error('Invalid GitHub PR URL format');
  }
  
  const [, owner, repo, prNumber] = urlMatch;
  const repoUrl = `https://github.com/${owner}/${repo}`;
  
  // Clone repository
  console.log('📁 Step 1: Cloning repository...');
  const clonePath = `/tmp/preprocessing-outputs-${Date.now()}`;
  
  // Store original executeToolsInParallel method
  const originalExecute = parallelToolExecutor.executeToolsInParallel;
  
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
        description: 'Tool output capture',
        baseBranch: baseBranch,
        targetBranch: `pr-${prNumber}`,
        author: 'unknown',
        files: [],
        commits: []
      },
      repository: {
        name: repo,
        owner: owner,
        languages: [],
        frameworks: [],
        clonedPath: clonePath
      },
      userContext: {
        userId: 'test-preprocessing-outputs',
        organizationId: 'codequal',
        permissions: ['read', 'write']
      }
    };
    
    // Intercept tool execution to capture outputs
    parallelToolExecutor.executeToolsInParallel = async (plans: any[], ctx: AnalysisContext) => {
      console.log('\n🔧 Intercepting tool execution...');
      
      // Call original method
      const results = await originalExecute.call(parallelToolExecutor, plans, ctx);
      
      // Capture outputs
      for (const [toolId, roleResults] of results) {
        if (!toolOutputs.has(toolId)) {
          toolOutputs.set(toolId, new Map());
        }
        
        for (const [role, result] of roleResults) {
          toolOutputs.get(toolId)!.set(role, result);
          console.log(`  📸 Captured: ${toolId} (${role}) - ${result.findings?.length || 0} findings`);
        }
      }
      
      return results;
    };
    
    // Run preprocessing
    console.log('\n⚡ Step 3: Running preprocessing pipeline...\n');
    await preprocessingExecutor.executePreprocessing(context);
    
    // Save all captured outputs
    console.log('\n💾 Step 4: Saving markdown outputs...\n');
    
    const outputFiles: string[] = [];
    
    for (const [toolId, roleResults] of toolOutputs) {
      for (const [role, result] of roleResults) {
        const filename = await saveToolOutput(toolId, role, result);
        outputFiles.push(filename);
        console.log(`  ✅ Saved: ${filename}`);
      }
    }
    
    // Create index file
    console.log('\n📄 Creating index file...');
    let indexContent = `# Preprocessing Tool Outputs\n\n`;
    indexContent += `Generated from: ${prUrl}\n\n`;
    indexContent += `## Summary\n\n`;
    indexContent += `- Total tools executed: ${toolOutputs.size}\n`;
    indexContent += `- Total role-specific outputs: ${outputFiles.length}\n\n`;
    indexContent += `## Output Files\n\n`;
    
    // Group by tool
    const byTool = outputFiles.reduce((acc, file) => {
      const [toolId] = file.split('-');
      if (!acc[toolId]) acc[toolId] = [];
      acc[toolId].push(file);
      return acc;
    }, {} as Record<string, string[]>);
    
    for (const [toolId, files] of Object.entries(byTool)) {
      indexContent += `### ${toolId}\n`;
      for (const file of files.sort()) {
        indexContent += `- [${file}](./${file})\n`;
      }
      indexContent += '\n';
    }
    
    await fs.writeFile(path.join(OUTPUT_DIR, 'README.md'), indexContent);
    
    console.log(`\n✅ All outputs saved to: ${OUTPUT_DIR}`);
    console.log(`📊 Total output files: ${outputFiles.length}`);
    
    // Cleanup
    await fs.rm(clonePath, { recursive: true, force: true });
    
  } catch (error) {
    console.error('❌ Failed to capture outputs:', error);
    throw error;
  } finally {
    // Restore original method
    parallelToolExecutor.executeToolsInParallel = originalExecute;
  }
}

// Get PR URL from command line or use default
const prUrl = process.argv[2] || 'https://github.com/expressjs/express/pull/5500';

// Run the capture
capturePreprocessingOutputs(prUrl)
  .then(() => {
    console.log('\n✨ Output capture completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Output capture failed:', error);
    process.exit(1);
  });
/**
 * Test Tool Markdown Outputs
 * Captures and saves the markdown results from each tool
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs/promises';
import { preprocessingExecutor } from '../integration/preprocessing-executor';
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
import { PrettierDirectAdapter } from '../adapters/direct/prettier-direct';

const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Output directory for markdown results
const OUTPUT_DIR = path.join(__dirname, '../../tool-markdown-outputs');

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

async function captureAllToolOutputs(prUrl: string) {
  console.log('🚀 Capturing Tool Markdown Outputs');
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
  const clonePath = `/tmp/tool-outputs-test-${Date.now()}`;
  
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
      new LicenseCheckerDirectAdapter(),
      new PrettierDirectAdapter()
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
        userId: 'test-tool-outputs',
        organizationId: 'codequal',
        permissions: ['read', 'write']
      }
    };
    
    // Get changed files
    const { stdout: diffOutput } = await execAsync(
      `cd ${clonePath} && git diff --name-only ${baseBranch}...pr-${prNumber}`
    );
    const changedFiles = diffOutput.trim().split('\n').filter(f => f.length > 0);
    console.log(`\n📝 Found ${changedFiles.length} changed files`);
    
    // Run each tool for each role
    console.log('\n🔧 Step 3: Running tools and capturing outputs...\n');
    
    const roles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational', 'reporting'];
    const outputFiles: string[] = [];
    
    for (const tool of tools) {
      console.log(`\n🔨 Running ${tool.id}...`);
      
      // Get the roles this tool supports
      const supportedRoles = tool.getMetadata().supportedRoles;
        
      if (supportedRoles.length === 0) {
        console.log(`  ⚠️  No roles enabled for ${tool.id}`);
        continue;
      }
      
      for (const role of supportedRoles) {
        
        try {
          console.log(`  📋 Role: ${role}`);
          const startTime = Date.now();
          
          // Create role-specific context
          const roleContext = { ...context, agentRole: role };
          
          // Analyze with the tool
          const result = await tool.analyze(roleContext);
          result.executionTime = Date.now() - startTime;
          
          // Save the output
          const outputFile = await saveToolOutput(tool.id, role, result);
          outputFiles.push(outputFile);
          
          console.log(`    ✅ Saved: ${outputFile} (${result.findings?.length || 0} findings)`);
        } catch (error: any) {
          console.log(`    ❌ Failed: ${error.message}`);
          
          // Save error output
          const errorResult: ToolResult = {
            success: false,
            toolId: tool.id,
            error: { message: error.message, code: 'TOOL_ERROR', recoverable: false },
            executionTime: 0
          };
          const outputFile = await saveToolOutput(tool.id, role, errorResult);
          outputFiles.push(outputFile);
        }
      }
    }
    
    // Create index file
    console.log('\n📄 Creating index file...');
    let indexContent = `# Tool Markdown Outputs\n\n`;
    indexContent += `Generated from: ${prUrl}\n\n`;
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
  }
}

// Get PR URL from command line or use default
const prUrl = process.argv[2] || 'https://github.com/expressjs/express/pull/5500';

// Run the capture
captureAllToolOutputs(prUrl)
  .then(() => {
    console.log('\n✨ Output capture completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Output capture failed:', error);
    process.exit(1);
  });
/**
 * Verify all tools are properly integrated in the execution flow
 */

import { toolRegistry } from '../core/registry';
import { parallelToolExecutor } from '../integration/parallel-tool-executor';
import { AgentRole } from '../core/interfaces';

// Import all MCP adapters to ensure they're registered
import '../adapters/mcp/semgrep-mcp';
import '../adapters/mcp/serena-mcp';
import '../adapters/mcp/eslint-mcp-fixed';
import '../adapters/mcp/ref-mcp-full';
import '../adapters/mcp/tavily-mcp-enhanced';
import '../adapters/mcp/context-retrieval-mcp';
import '../adapters/mcp/mcp-scan';
import '../adapters/mcp/missing-mcp-tools'; // Git, WebSearch, KnowledgeGraph, Memory, SonarQube
import '../adapters/mcp/chartjs-mcp';
import '../adapters/mcp/mermaid-mcp';
import '../adapters/mcp/markdown-pdf-mcp';

// Import direct tools
import '../adapters/direct/prettier-direct';
import '../adapters/direct/dependency-cruiser-direct';
import '../adapters/direct/madge-direct';
import '../adapters/direct/npm-audit-direct';
import '../adapters/direct/license-checker-direct';
import '../adapters/direct/npm-outdated-direct';
import '../adapters/direct/bundlephobia-direct';
import '../adapters/direct/jscpd-direct';
import '../adapters/direct/sonarjs-direct';
import '../adapters/direct/eslint-direct';
import '../adapters/direct/lighthouse-direct';
import '../adapters/direct/grafana-direct';

async function verifyAllToolsIntegration() {
  console.log('🔍 Verifying All Tools Integration\n');
  console.log('=' .repeat(60) + '\n');
  
  // Step 1: Check registry statistics
  console.log('📊 Tool Registry Statistics:\n');
  const stats = toolRegistry.getStatistics();
  console.log(`Total tools registered: ${stats.total}`);
  console.log(`  MCP tools: ${stats.byType.mcp}`);
  console.log(`  Direct tools: ${stats.byType.direct}`);
  console.log('\nTools by role:');
  Object.entries(stats.byRole).forEach(([role, count]) => {
    console.log(`  ${role}: ${count} tools`);
  });
  console.log('');
  
  // Step 2: List all tools by role
  console.log('🛠️  Tools Mapped to Each Role:\n');
  const roles: AgentRole[] = ['security', 'codeQuality', 'dependency', 'performance', 'architecture', 'educational', 'reporting'];
  
  for (const role of roles) {
    console.log(`${role.toUpperCase()} Agent:`);
    const tools = toolRegistry.getToolsForRole(role);
    
    if (tools.length === 0) {
      console.log('  ⚠️  NO TOOLS REGISTERED!');
    } else {
      tools.forEach(tool => {
        const metadata = tool.getMetadata();
        console.log(`  • ${tool.id} (${tool.type}) - ${metadata.description}`);
      });
    }
    console.log('');
  }
  
  // Step 3: Check for missing tools from registry
  console.log('🔎 Checking for Missing Tool Implementations:\n');
  const registryTools = new Set([
    'mcp-scan', 'semgrep-mcp', 'npm-audit-direct', 'ref-mcp', 'sonarqube',
    'eslint-direct', 'jscpd-direct', 'sonarjs-direct', 'prettier-direct', 'serena-mcp',
    'madge-direct', 'git-mcp',
    'lighthouse-direct', 'bundlephobia-direct',
    'license-checker-direct', 'npm-outdated-direct', 'dependency-cruiser-direct',
    'context-mcp', 'context7-mcp', 'working-examples-mcp', 'mcp-docs-service',
    'knowledge-graph-mcp', 'mcp-memory', 'web-search-mcp',
    'chartjs-mcp', 'mermaid-mcp', 'markdown-pdf-mcp', 'grafana-direct',
    'tavily-mcp' // Added Tavily
  ]);
  
  const missingTools: string[] = [];
  registryTools.forEach(toolId => {
    if (!toolRegistry.hasTool(toolId)) {
      missingTools.push(toolId);
    }
  });
  
  if (missingTools.length > 0) {
    console.log('⚠️  Missing tool implementations:');
    missingTools.forEach(id => console.log(`  - ${id}`));
  } else {
    console.log('✅ All tools from registry are implemented!');
  }
  console.log('');
  
  // Step 4: Check tool filtering logic
  console.log('🎯 Tool Filtering for Changed Files:\n');
  
  const testFiles = [
    { path: 'src/auth.js', language: 'javascript' },
    { path: 'src/styles.css', language: 'css' },
    { path: 'package.json', language: 'json' },
    { path: 'README.md', language: 'markdown' }
  ];
  
  console.log('Test files:');
  testFiles.forEach(f => console.log(`  - ${f.path} (${f.language})`));
  console.log('');
  
  // Check which tools would run for JS files
  const jsTools = toolRegistry.getToolsForLanguage('javascript');
  console.log(`Tools for JavaScript files: ${jsTools.length}`);
  jsTools.slice(0, 5).forEach(t => console.log(`  • ${t.id}`));
  if (jsTools.length > 5) console.log(`  ... and ${jsTools.length - 5} more`);
  console.log('');
  
  // Step 5: Verify global tools
  console.log('🌍 Global Tools (run regardless of files):\n');
  const globalTools = [
    'tavily-mcp', 'context-mcp', 'knowledge-graph-mcp', 'git-mcp',
    'web-search-mcp', 'mcp-memory', 'ref-mcp'
  ];
  
  globalTools.forEach(toolId => {
    const exists = toolRegistry.hasTool(toolId);
    console.log(`  ${exists ? '✅' : '❌'} ${toolId}`);
  });
  console.log('');
  
  // Step 6: Test execution priority
  console.log('🚀 Execution Priority Groups:\n');
  const priorityMap = {
    100: ['Security Tools', ['semgrep-mcp', 'mcp-scan']],
    90: ['Dependency Tools', ['npm-audit-direct', 'license-checker-direct']],
    80: ['Code Quality', ['eslint-direct', 'sonarjs-direct']],
    70: ['Global Analysis', ['tavily-mcp', 'context-mcp']],
    60: ['Performance', ['lighthouse-direct', 'bundlephobia-direct']]
  };
  
  Object.entries(priorityMap).forEach(([priority, [name, tools]]) => {
    console.log(`Priority ${priority} - ${name}:`);
    (tools as string[]).forEach(toolId => {
      const exists = toolRegistry.hasTool(toolId);
      console.log(`  ${exists ? '✅' : '❌'} ${toolId}`);
    });
  });
  
  // Summary
  console.log('\n\n📋 Summary:\n');
  console.log(`✓ Total tools available: ${stats.total}`);
  console.log(`✓ All roles have tools: ${Object.values(stats.byRole).every(count => count > 0) ? 'Yes' : 'No'}`);
  console.log(`✓ Missing implementations: ${missingTools.length}`);
  console.log(`✓ Security tools: ${stats.byRole.security || 0}`);
  console.log(`✓ Educational tools: ${stats.byRole.educational || 0}`);
  console.log(`✓ Tavily integrated: ${toolRegistry.hasTool('tavily-mcp') ? 'Yes' : 'No'}`);
  console.log(`✓ Serena integrated: ${toolRegistry.hasTool('serena-mcp') ? 'Yes' : 'No'}`);
  console.log(`✓ Semgrep integrated: ${toolRegistry.hasTool('semgrep-mcp') ? 'Yes' : 'No'}`);
  
  // Recommendations
  if (missingTools.length > 0) {
    console.log('\n⚠️  Action Required:');
    console.log('The following tools need implementation:');
    missingTools.forEach(id => {
      console.log(`  - Implement ${id} adapter`);
    });
  }
}

// Run verification
verifyAllToolsIntegration().catch(console.error);
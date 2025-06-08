#!/usr/bin/env node

/**
 * Fix TypeScript errors in mcp-hybrid package
 */

const fs = require('fs').promises;
const path = require('path');

async function fixImports() {
  console.log('🔧 Fixing logger imports...\n');

  const filesToFix = [
    'src/integration/agent-enhancer.ts',
    'src/integration/multi-agent-integration.ts',
    'src/integration/orchestrator-flow.ts',
    'src/integration/tool-aware-agent.ts'
  ];

  for (const file of filesToFix) {
    const filePath = path.join(__dirname, file);
    
    try {
      let content = await fs.readFile(filePath, 'utf8');
      
      // Replace the logger import with a more direct approach
      content = content.replace(
        /import { logging } from '@codequal\/core';\s*\n\s*const { createLogger } = logging;/,
        `import { logging } from '@codequal/core';`
      );
      
      // Replace createLogger calls with logging.createLogger
      content = content.replace(
        /= createLogger\(/g,
        '= logging.createLogger('
      );
      
      await fs.writeFile(filePath, content);
      console.log(`✓ Fixed ${file}`);
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error.message);
    }
  }
  
  console.log('\n✅ Import fixes applied!');
}

fixImports().catch(console.error);

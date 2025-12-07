import { TypeScriptToolOrchestrator } from './src/two-branch/tools/typescript/typescript-tool-orchestrator';
import * as fs from 'fs';
import * as path from 'path';

async function debugToolExecution() {
  console.log('🔍 Debugging Tool Execution...');
  const repoPath = '/Users/alpinro/CodePrjects/codequal';
  
  // Create a file with known issues
  const badFilePath = path.join(repoPath, 'packages/agents/src/bad-file.ts');
  const badContent = `
    // ESLint error: no-explicit-any
    const x: any = 'bad';
    
    // ESLint error: no-console
    console.log('debug');
    
    // Security issue (simulated)
    const password = 'hardcoded-password';
  `;
  fs.writeFileSync(badFilePath, badContent);
  console.log(`✅ Created bad file at: ${badFilePath}`);

  try {
    const orchestrator = new TypeScriptToolOrchestrator();
    // Force run on this specific file if possible, or run general orchestration
    // For now, running general orchestration to see if it picks up the new file
    const result = await orchestrator.orchestrate(repoPath, 'pr', { analysisMode: 'complete' });
    
    console.log('📊 Tool Results:');
    result.toolResults.forEach(r => {
      console.log(`   - ${r.tool}: ${r.issues?.length || 0} issues`);
      if (r.issues?.length > 0) {
        console.log(`     First issue: ${JSON.stringify(r.issues[0])}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // Cleanup
    if (fs.existsSync(badFilePath)) {
      fs.unlinkSync(badFilePath);
      console.log('🧹 Cleaned up bad file');
    }
  }
}

debugToolExecution().catch(console.error);

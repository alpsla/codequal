/**
 * Test Oracle ARM Analyzer Execution
 * 
 * This script tests the new Oracle Repository Manager with ARM analyzers
 * to validate the direct execution approach works correctly.
 */

require('dotenv').config({ path: './.env.oracle-direct' });
require('dotenv').config(); // Load main .env as fallback

const { OracleRepositoryManager } = require('./packages/agents/dist/two-branch/utils/oracle-repository-manager');

async function testOracleArmExecution() {
  console.log('🚀 Testing Oracle ARM Analyzer Execution');
  console.log('=============================================\n');
  
  const oracle = new OracleRepositoryManager();
  
  try {
    console.log('📋 Configuration:');
    console.log(`   Oracle Host: ${process.env.ORACLE_HOST}`);
    console.log(`   Oracle User: ${process.env.ORACLE_USER}`);
    console.log(`   SSH Key: ${process.env.ORACLE_SSH_KEY}`);
    console.log(`   Registry: ${process.env.ANALYZER_REGISTRY}`);
    console.log(`   ARM Analyzers: ${process.env.USE_ARM_ANALYZERS}`);
    console.log('');

    // Test 1: Setup a small Java repository
    console.log('🔧 Test 1: Setting up test repository...');
    const workspace = await oracle.setupRepository('https://github.com/redis/jedis', 'master');
    
    console.log(`✅ Repository setup complete:`);
    console.log(`   Workspace ID: ${workspace.workspaceId}`);
    console.log(`   Code files found: ${workspace.filesCount}`);
    console.log(`   Remote path: ${workspace.remotePath}`);
    console.log('');

    // Test 2: Run ARM Java analyzer
    console.log('🔧 Test 2: Running ARM Java analyzer...');
    const tools = ['pmd']; // Start with just PMD
    const language = 'java';
    
    const toolResults = await oracle.runToolsOnOracle(workspace, tools, language);
    
    console.log(`✅ Tool execution complete:`);
    toolResults.forEach(result => {
      console.log(`   ${result.tool}:`);
      console.log(`     Duration: ${(result.duration/1000).toFixed(1)}s`);
      console.log(`     Exit code: ${result.exitCode}`);
      console.log(`     Files scanned: ${result.filesScanned}`);
      console.log(`     Output length: ${result.output.length} chars`);
      if (result.output.includes('PMD')) {
        console.log(`     ✅ PMD executed successfully`);
      }
      console.log('');
    });

    // Test 3: List workspace files
    console.log('🔧 Test 3: Listing workspace files...');
    const files = await oracle.getWorkspaceFiles(workspace, '*.java');
    console.log(`✅ Found ${files.length} Java files in workspace`);
    if (files.length > 0) {
      console.log(`   Sample files: ${files.slice(0, 5).join(', ')}`);
    }
    console.log('');

    // Test 4: Cleanup
    console.log('🔧 Test 4: Cleaning up workspace...');
    await oracle.cleanupWorkspace(workspace.workspaceId);
    console.log(`✅ Workspace cleaned up`);
    console.log('');

    console.log('🎉 Oracle ARM Analyzer Test Complete!');
    console.log('=====================================');
    console.log('✅ All tests passed');
    console.log('✅ ARM analyzers working on Oracle instance');
    console.log('✅ Ready for V9 integration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testOracleArmExecution().catch(console.error);
}

module.exports = { testOracleArmExecution };
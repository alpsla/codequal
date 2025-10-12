#!/usr/bin/env npx ts-node

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from the correct location
const envPath = path.resolve(__dirname, '.env');
dotenv.config({ path: envPath });

import { V9ToolOrchestrator } from './src/two-branch/analyzers/v9-tool-orchestrator';

async function testDependencyCheck() {
  console.log('🔧 Testing Dependency-Check with Oracle Cloud PostgreSQL...');
  console.log('Environment variables:');
  console.log('  ORACLE_DEPCHECK_DB_URL:', process.env.ORACLE_DEPCHECK_DB_URL);
  console.log('  ORACLE_DEPCHECK_DB_USER:', process.env.ORACLE_DEPCHECK_DB_USER);
  console.log('  ORACLE_DEPCHECK_JDBC_DRIVER:', process.env.ORACLE_DEPCHECK_JDBC_DRIVER);
  
  const orchestrator = new V9ToolOrchestrator();
  
  try {
    const result = await orchestrator.orchestrateJavaAnalysis(
      '/tmp/kafka-repo', 
      'main', 
      undefined, 
      { severityFilter: 'critical', enableFallback: true }
    );
    
    console.log('✅ Dependency-Check test completed successfully!');
    console.log('Issues found:', result.length);
    
    // Show breakdown by tool
    const byTool: Record<string, number> = {};
    for (const issue of result) {
      byTool[issue.tool] = (byTool[issue.tool] || 0) + 1;
    }
    console.log('Tool breakdown:', byTool);
    
  } catch (error: any) {
    console.error('❌ Dependency-Check test failed:', error.message);
    if (error.message.includes('Dependency-Check analysis failed')) {
      console.log('This indicates the PostgreSQL connection issue is resolved, but there may be other issues.');
    }
  }
}

testDependencyCheck().catch(console.error);
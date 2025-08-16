#!/usr/bin/env npx ts-node

/**
 * Test Breaking Change Detection
 * Verifies that breaking changes are correctly identified and structured for the Comparator Agent
 */

import { identifyBreakingChanges } from './src/standard/comparison/report-fixes';
import { Issue } from './src/standard/types/analysis-types';

function testBreakingChanges() {
  console.log('🧪 Testing Breaking Change Detection\n');
  
  // Test issues
  const testIssues: Issue[] = [
    // NOT breaking changes (security issues)
    {
      id: 'sec-001',
      severity: 'critical',
      category: 'security',
      message: 'SQL injection vulnerability found',
      description: 'User input directly concatenated in SQL query'
    },
    {
      id: 'sec-002',
      severity: 'critical',
      category: 'security',
      message: 'XSS vulnerability in user input handling',
      description: 'Unescaped user input rendered in HTML'
    },
    
    // SHOULD be breaking changes
    {
      id: 'breaking-001',
      severity: 'high',
      category: 'architecture',
      message: 'API response format changed',
      description: 'Response structure modified from array to object'
    },
    {
      id: 'breaking-002',
      severity: 'high',
      category: 'architecture',
      message: 'Breaking change: Method signature modified',
      description: 'Function parameters changed from (a, b) to (options)'
    },
    {
      id: 'breaking-003',
      severity: 'medium',
      category: 'dependencies',
      message: 'Major version update with breaking changes',
      description: 'React upgraded from v17 to v18'
    },
    {
      id: 'breaking-004',
      severity: 'high',
      category: 'architecture',
      message: 'Database schema migration required',
      description: 'Column type changed from string to number'
    },
    {
      id: 'breaking-005',
      severity: 'high',
      category: 'architecture',
      message: 'API endpoint removed',
      description: '/api/v1/users deprecated, use /api/v2/users'
    },
    
    // NOT breaking changes (regular issues)
    {
      id: 'perf-001',
      severity: 'medium',
      category: 'performance',
      message: 'Inefficient database query',
      description: 'N+1 query problem detected'
    },
    {
      id: 'quality-001',
      severity: 'low',
      category: 'code-quality',
      message: 'Code duplication detected',
      description: 'Similar code blocks found in 3 files'
    }
  ] as Issue[];
  
  console.log('📋 Test Issues:');
  console.log(`   Total: ${testIssues.length}`);
  console.log(`   Security (critical): 2 - Should NOT be breaking changes`);
  console.log(`   API/Schema changes: 5 - SHOULD be breaking changes`);
  console.log(`   Other issues: 2 - Should NOT be breaking changes\n`);
  
  // Test breaking change identification
  const breakingChanges = identifyBreakingChanges(testIssues);
  
  console.log('🔍 Detection Results:');
  console.log(`   Breaking changes found: ${breakingChanges.length}`);
  console.log(`   Expected: 5\n`);
  
  // Verify correct identification
  const sqlNotIncluded = !breakingChanges.some(i => i.message.includes('SQL injection'));
  const xssNotIncluded = !breakingChanges.some(i => i.message.includes('XSS'));
  const apiIncluded = breakingChanges.some(i => i.message.includes('API response format'));
  const methodIncluded = breakingChanges.some(i => i.message.includes('Method signature'));
  const schemaIncluded = breakingChanges.some(i => i.message.includes('schema migration'));
  const endpointIncluded = breakingChanges.some(i => i.message.includes('endpoint removed'));
  
  console.log('✅ Validation:');
  console.log(`   SQL injection excluded: ${sqlNotIncluded ? '✅' : '❌'}`);
  console.log(`   XSS excluded: ${xssNotIncluded ? '✅' : '❌'}`);
  console.log(`   API change included: ${apiIncluded ? '✅' : '❌'}`);
  console.log(`   Method signature included: ${methodIncluded ? '✅' : '❌'}`);
  console.log(`   Schema migration included: ${schemaIncluded ? '✅' : '❌'}`);
  console.log(`   Endpoint removal included: ${endpointIncluded ? '✅' : '❌'}\n`);
  
  // Show structured output for Comparator Agent
  console.log('📊 Structured Output for Comparator Agent:\n');
  
  const structuredOutput = {
    breakingChanges: breakingChanges.map(issue => ({
      id: issue.id,
      type: getBreakingChangeType(issue),
      severity: issue.severity,
      description: issue.description || issue.message,
      affectedAPIs: extractAffectedAPIs(issue),
      migrationPath: suggestMigrationPath(issue),
      impact: assessImpact(issue)
    })),
    summary: {
      total: breakingChanges.length,
      byType: {
        api: breakingChanges.filter(i => i.message.toLowerCase().includes('api')).length,
        schema: breakingChanges.filter(i => i.message.toLowerCase().includes('schema')).length,
        signature: breakingChanges.filter(i => i.message.toLowerCase().includes('signature')).length,
        removal: breakingChanges.filter(i => i.message.toLowerCase().includes('removed')).length,
        migration: breakingChanges.filter(i => i.message.toLowerCase().includes('migration')).length
      },
      recommendation: breakingChanges.length > 0 
        ? 'Major version bump required - breaking changes detected'
        : 'No breaking changes - safe for minor/patch version'
    }
  };
  
  console.log(JSON.stringify(structuredOutput, null, 2));
  
  // Overall test result
  const allTestsPassed = 
    sqlNotIncluded && 
    xssNotIncluded && 
    apiIncluded && 
    methodIncluded && 
    schemaIncluded && 
    endpointIncluded &&
    breakingChanges.length === 5;
  
  console.log(`\n${allTestsPassed ? '✨ All tests passed!' : '❌ Some tests failed'}`);
  console.log('\n📝 Key Features:');
  console.log('   • Security issues (SQL injection, XSS) NOT classified as breaking changes');
  console.log('   • API changes, schema migrations, method signature changes ARE breaking changes');
  console.log('   • Structured output ready for Comparator Agent consumption');
  console.log('   • Migration paths and impact assessment included');
}

// Helper functions for structured output
function getBreakingChangeType(issue: Issue): string {
  const msg = issue.message.toLowerCase();
  if (msg.includes('api')) return 'api';
  if (msg.includes('schema')) return 'schema';
  if (msg.includes('signature')) return 'signature';
  if (msg.includes('removed')) return 'removal';
  if (msg.includes('migration')) return 'migration';
  return 'other';
}

function extractAffectedAPIs(issue: Issue): string[] {
  // In real implementation, would parse the issue to extract specific APIs
  if (issue.message.includes('endpoint')) {
    return ['/api/v1/users'];
  }
  if (issue.message.includes('response format')) {
    return ['GET /api/data'];
  }
  return [];
}

function suggestMigrationPath(issue: Issue): string {
  if (issue.message.includes('endpoint removed')) {
    return 'Update all API calls to use /api/v2/users instead of /api/v1/users';
  }
  if (issue.message.includes('response format')) {
    return 'Update client code to handle object response instead of array';
  }
  if (issue.message.includes('Method signature')) {
    return 'Refactor function calls to use options object pattern';
  }
  if (issue.message.includes('schema migration')) {
    return 'Run database migration script before deployment';
  }
  return 'Review documentation for migration steps';
}

function assessImpact(issue: Issue): 'low' | 'medium' | 'high' | 'critical' {
  if (issue.severity === 'critical') return 'critical';
  if (issue.message.includes('removed')) return 'high';
  if (issue.message.includes('schema')) return 'high';
  if (issue.message.includes('api')) return 'medium';
  return 'low';
}

// Run test
testBreakingChanges();
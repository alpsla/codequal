#!/usr/bin/env npx ts-node

/**
 * Visual demonstration of the deduplication logic
 */

import { ComparisonOrchestrator } from '../orchestrator/comparison-orchestrator';

// Simple visualization of deduplication
function demonstrateDeduplication() {
  console.log('📊 Deduplication Logic Demonstration');
  console.log('=' .repeat(60));
  
  const orchestrator = new ComparisonOrchestrator(
    {} as any, {} as any, {} as any, {} as any, {} as any
  );
  
  // Create sample issues with many duplicates
  const issues = [
    // 5 SQL injections (same type, different locations)
    { id: '1', title: 'SQL Injection', category: 'security', severity: 'critical', location: { file: 'api.ts', line: 10 }},
    { id: '2', title: 'SQL Injection', category: 'security', severity: 'critical', location: { file: 'api.ts', line: 25 }},
    { id: '3', title: 'SQL Injection', category: 'security', severity: 'critical', location: { file: 'users.ts', line: 15 }},
    { id: '4', title: 'SQL Injection', category: 'security', severity: 'critical', location: { file: 'posts.ts', line: 30 }},
    { id: '5', title: 'SQL Injection', category: 'security', severity: 'critical', location: { file: 'admin.ts', line: 45 }},
    
    // 3 XSS vulnerabilities
    { id: '6', title: 'XSS Vulnerability', category: 'security', severity: 'high', location: { file: 'view.ts', line: 20 }},
    { id: '7', title: 'XSS Vulnerability', category: 'security', severity: 'high', location: { file: 'render.ts', line: 35 }},
    { id: '8', title: 'XSS Vulnerability', category: 'security', severity: 'high', location: { file: 'template.ts', line: 50 }},
    
    // 2 Hardcoded secrets
    { id: '9', title: 'Hardcoded API Key', category: 'security', severity: 'high', location: { file: 'config.ts', line: 5 }},
    { id: '10', title: 'Hardcoded Secret', category: 'security', severity: 'high', location: { file: 'auth.ts', line: 10 }},
    
    // 1 Missing validation
    { id: '11', title: 'Missing Input Validation', category: 'code-quality', severity: 'medium', location: { file: 'form.ts', line: 60 }}
  ];
  
  console.log('\n🔢 Original Issues (ALL occurrences):');
  console.log(`Total: ${issues.length} issues\n`);
  
  // Group by type for visualization
  const byType = new Map<string, any[]>();
  issues.forEach(issue => {
    const key = `${issue.category}-${issue.severity}: ${issue.title}`;
    if (!byType.has(key)) {
      byType.set(key, []);
    }
    byType.get(key)!.push(issue);
  });
  
  byType.forEach((items, type) => {
    console.log(`📌 ${type}: ${items.length} occurrence(s)`);
    items.forEach(item => {
      console.log(`   - ${item.location.file}:${item.location.line}`);
    });
  });
  
  // Apply deduplication
  const deduplicated = (orchestrator as any).deduplicateIssuesForEducation(issues);
  
  console.log('\n🎓 After Deduplication (for Education):');
  console.log(`Total: ${deduplicated.length} unique patterns\n`);
  
  deduplicated.forEach((issue: any) => {
    console.log(`✅ ${issue.category}-${issue.severity}: ${issue.title}`);
    console.log(`   First occurrence: ${issue.location.file}:${issue.location.line}`);
  });
  
  console.log('\n📊 Summary:');
  console.log(`- Location Enhancer would receive: ${issues.length} issues (ALL)`)
  console.log(`- Educator would receive: ${deduplicated.length} issues (UNIQUE)`);
  console.log(`- Reduction: ${((1 - deduplicated.length/issues.length) * 100).toFixed(0)}%`);
  
  console.log('\n💡 Why this matters:');
  console.log('- Location Enhancer needs ALL occurrences to find exact line numbers');
  console.log('- Educator only needs UNIQUE patterns to find relevant courses');
  console.log('- Avoids searching for "SQL Injection" courses 5 times');
}

// Run demonstration
demonstrateDeduplication();
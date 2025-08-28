/**
 * Test Type A/B Fix Distinction
 * 
 * Demonstrates proper categorization of fixes as:
 * - Type A: Direct copy-paste (same signature)
 * - Type B: Requires adjustments (different signature)
 */

import { FixSuggestionAgentV3 } from './src/standard/services/fix-suggestion-agent-v3';

// Test cases with different fix types
const testIssues = [
  {
    // Type A: Simple fix, same signature
    title: 'Missing null check',
    severity: 'medium',
    category: 'bug',
    location: { file: 'src/utils.ts', line: 45 },
    codeSnippet: `function getValue(obj, key) {
  return obj[key];
}`,
    description: 'Function may throw error if obj is null'
  },
  {
    // Type B: Adding parameter, signature changes
    title: 'SQL Injection vulnerability',
    severity: 'critical',
    category: 'security',
    location: { file: 'src/db.ts', line: 100 },
    codeSnippet: `function queryUser(userId) {
  return db.query("SELECT * FROM users WHERE id = " + userId);
}`,
    description: 'Direct string concatenation in SQL query'
  },
  {
    // Type B: Async change
    title: 'Synchronous file operation blocking event loop',
    severity: 'high',
    category: 'performance',
    location: { file: 'src/fileops.ts', line: 20 },
    codeSnippet: `function readConfig(path) {
  const data = fs.readFileSync(path);
  return JSON.parse(data);
}`,
    description: 'Using synchronous file read'
  },
  {
    // Type A: Logic fix, same signature
    title: 'Off-by-one error in loop',
    severity: 'medium',
    category: 'bug',
    location: { file: 'src/array.ts', line: 15 },
    codeSnippet: `function getLastElement(arr) {
  return arr[arr.length];
}`,
    description: 'Array index out of bounds'
  }
];

async function demonstrateFixTypes() {
  console.log('🔍 Testing Type A/B Fix Distinction\n');
  console.log('=' .repeat(60));
  
  const agent = new FixSuggestionAgentV3();
  
  for (const issue of testIssues) {
    console.log(`\n📋 Issue: ${issue.title}`);
    console.log(`   Severity: ${issue.severity} | Category: ${issue.category}`);
    console.log(`   Location: ${issue.location.file}:${issue.location.line}`);
    console.log('-'.repeat(40));
    
    // Generate fix suggestion
    const suggestions = await agent.generateSuggestions([issue], { 
      maxSuggestions: 1,
      useAI: false // Use templates for predictable test
    });
    
    if (suggestions.length > 0) {
      const fix = suggestions[0];
      
      // Display fix type with clear indication
      if (fix.fixType === 'A') {
        console.log('\n🟢 TYPE A FIX - Direct Copy-Paste');
        console.log('   ✅ Same function signature');
        console.log('   ✅ No changes needed to callers');
        console.log('   ✅ Safe to apply directly');
      } else {
        console.log('\n🟡 TYPE B FIX - Requires Adjustments');
        console.log('   ⚠️ Function signature changed');
        console.log('   ⚠️ Callers need updates');
        if (fix.breakingChange) {
          console.log('   ❗ Breaking change detected');
        }
        if (fix.adjustmentNotes) {
          console.log(`   📝 Required: ${fix.adjustmentNotes}`);
        }
      }
      
      console.log(`\n   Confidence: ${fix.confidence}`);
      console.log(`   Estimated Time: ${fix.estimatedMinutes} minutes`);
      
      // Show original code
      console.log('\n   Original Code:');
      console.log('   ```' + fix.language);
      fix.originalCode.split('\n').forEach(line => {
        if (line.trim()) console.log(`   ${line}`);
      });
      console.log('   ```');
      
      // Show fixed code with appropriate label
      if (fix.fixType === 'A') {
        console.log('\n   Fixed Code (copy-paste ready):');
      } else {
        console.log('\n   Fixed Code (adjust before applying):');
      }
      console.log('   ```' + fix.language);
      fix.fixedCode.split('\n').forEach(line => {
        if (line.trim()) console.log(`   ${line}`);
      });
      console.log('   ```');
      
      // Show formatted suggestion
      console.log('\n   📄 Formatted for Report:');
      console.log('   ' + '-'.repeat(35));
      const formatted = agent.formatSuggestion(fix);
      formatted.split('\n').forEach(line => {
        console.log('   ' + line);
      });
      
    } else {
      console.log('   ❌ No fix suggestion generated');
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Type A/B Distinction Summary:\n');
  console.log('TYPE A (Direct Copy-Paste):');
  console.log('  ✅ Function signature unchanged');
  console.log('  ✅ Return type unchanged');
  console.log('  ✅ Parameter count unchanged');
  console.log('  ✅ Safe to apply directly');
  console.log('  → Example: Adding null checks, fixing array indices');
  
  console.log('\nTYPE B (Requires Adjustments):');
  console.log('  ⚠️ Function signature changed');
  console.log('  ⚠️ Parameters added/removed');
  console.log('  ⚠️ Async/sync changes');
  console.log('  ⚠️ Return type changes');
  console.log('  → Example: Adding parameters for SQL injection fix, converting to async');
  
  console.log('\n✨ Benefits:');
  console.log('  • Developers know exactly what to expect');
  console.log('  • Type A can be applied quickly and safely');
  console.log('  • Type B warns about breaking changes');
  console.log('  • Clear migration steps for Type B fixes');
}

// Run demonstration
demonstrateFixTypes().catch(console.error);
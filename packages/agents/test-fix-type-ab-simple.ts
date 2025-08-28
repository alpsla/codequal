/**
 * Simple Test for Type A/B Fix Distinction
 * Tests the core logic of distinguishing between:
 * - Type A: Direct copy-paste (same signature)
 * - Type B: Requires adjustments (different signature)
 */

// Test the signature analysis logic
class SignatureAnalyzer {
  /**
   * Extract function signature from code
   */
  extractSignature(code: string): string | null {
    const patterns = [
      /function\s+(\w+)\s*\(([^)]*)\)/,
      /const\s+(\w+)\s*=\s*\(([^)]*)\)/,
      /(\w+)\s*\(([^)]*)\)\s*[{:]/,
      /async\s+function\s+(\w+)\s*\(([^)]*)\)/,
      /async\s+(\w+)\s*\(([^)]*)\)/
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        return `${match[1]}(${match[2]})`;
      }
    }
    
    return null;
  }

  /**
   * Analyze if a fix changes the function signature
   */
  analyzeSignatureChange(original: string, fixed: string): {
    signatureChanged: boolean;
    breakingChange: boolean;
    fixType: 'A' | 'B';
    adjustmentNotes?: string;
  } {
    const originalSig = this.extractSignature(original);
    const fixedSig = this.extractSignature(fixed);
    
    if (!originalSig || !fixedSig) {
      return { 
        signatureChanged: false, 
        breakingChange: false,
        fixType: 'A'
      };
    }
    
    const signatureChanged = originalSig !== fixedSig;
    
    // Check for async/sync changes
    const originalAsync = /async\s+/.test(original);
    const fixedAsync = /async\s+/.test(fixed);
    const asyncChanged = originalAsync !== fixedAsync;
    
    // Count parameters
    const originalParams = (original.match(/\(([^)]*)\)/) || ['', ''])[1]
      .split(',').filter(p => p.trim()).length;
    const fixedParams = (fixed.match(/\(([^)]*)\)/) || ['', ''])[1]
      .split(',').filter(p => p.trim()).length;
    const paramsChanged = originalParams !== fixedParams;
    
    const breakingChange = signatureChanged || asyncChanged || paramsChanged;
    
    let adjustmentNotes: string | undefined;
    if (paramsChanged) {
      if (fixedParams > originalParams) {
        adjustmentNotes = `Add ${fixedParams - originalParams} new parameter(s) to all function calls`;
      } else {
        adjustmentNotes = `Remove ${originalParams - fixedParams} parameter(s) from all function calls`;
      }
    }
    if (asyncChanged) {
      if (fixedAsync && !originalAsync) {
        adjustmentNotes = (adjustmentNotes ? adjustmentNotes + '. ' : '') + 
                         'Function is now async - add await to all calls';
      } else {
        adjustmentNotes = (adjustmentNotes ? adjustmentNotes + '. ' : '') + 
                         'Function is no longer async - remove await from calls';
      }
    }
    
    return {
      signatureChanged,
      breakingChange,
      fixType: breakingChange ? 'B' : 'A',
      adjustmentNotes
    };
  }
}

// Test cases
const testCases = [
  {
    name: 'Type A: Adding null check (same signature)',
    original: `function getValue(obj, key) {
  return obj[key];
}`,
    fixed: `function getValue(obj, key) {
  if (!obj) return undefined;
  return obj[key];
}`,
    expectedType: 'A' as const
  },
  {
    name: 'Type B: Adding parameter for SQL injection fix',
    original: `function queryUser(userId) {
  return db.query("SELECT * FROM users WHERE id = " + userId);
}`,
    fixed: `function queryUser(userId, connection) {
  return connection.query("SELECT * FROM users WHERE id = ?", [userId]);
}`,
    expectedType: 'B' as const
  },
  {
    name: 'Type B: Converting to async',
    original: `function readConfig(path) {
  const data = fs.readFileSync(path);
  return JSON.parse(data);
}`,
    fixed: `async function readConfig(path) {
  const data = await fs.readFile(path);
  return JSON.parse(data);
}`,
    expectedType: 'B' as const
  },
  {
    name: 'Type A: Fixing array index (same signature)',
    original: `function getLastElement(arr) {
  return arr[arr.length];
}`,
    fixed: `function getLastElement(arr) {
  return arr[arr.length - 1];
}`,
    expectedType: 'A' as const
  },
  {
    name: 'Type A: Adding validation (same signature)',
    original: `function divide(a, b) {
  return a / b;
}`,
    fixed: `function divide(a, b) {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}`,
    expectedType: 'A' as const
  },
  {
    name: 'Type B: Removing parameter',
    original: `function processData(data, config, options) {
  return transform(data, config);
}`,
    fixed: `function processData(data, config) {
  return transform(data, config);
}`,
    expectedType: 'B' as const
  }
];

// Run tests
console.log('🔍 Testing Type A/B Fix Distinction\n');
console.log('='.repeat(60));

const analyzer = new SignatureAnalyzer();
let passCount = 0;
let failCount = 0;

for (const testCase of testCases) {
  console.log(`\n📋 ${testCase.name}`);
  console.log('-'.repeat(40));
  
  const result = analyzer.analyzeSignatureChange(testCase.original, testCase.fixed);
  
  const passed = result.fixType === testCase.expectedType;
  if (passed) {
    passCount++;
    console.log(`✅ PASSED - Correctly identified as Type ${result.fixType}`);
  } else {
    failCount++;
    console.log(`❌ FAILED - Expected Type ${testCase.expectedType}, got Type ${result.fixType}`);
  }
  
  if (result.fixType === 'A') {
    console.log('   🟢 Direct copy-paste fix');
    console.log('   • Same function signature');
    console.log('   • No changes needed to callers');
  } else {
    console.log('   🟡 Requires adjustments');
    console.log('   • Function signature changed:', result.signatureChanged);
    console.log('   • Breaking change:', result.breakingChange);
    if (result.adjustmentNotes) {
      console.log(`   • Required: ${result.adjustmentNotes}`);
    }
  }
  
  // Show signatures
  const originalSig = analyzer.extractSignature(testCase.original);
  const fixedSig = analyzer.extractSignature(testCase.fixed);
  if (originalSig && fixedSig && originalSig !== fixedSig) {
    console.log(`\n   Signature change:`);
    console.log(`   - Original: ${originalSig}`);
    console.log(`   + Fixed:    ${fixedSig}`);
  }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Results Summary:\n');
console.log(`   ✅ Passed: ${passCount}/${testCases.length}`);
console.log(`   ❌ Failed: ${failCount}/${testCases.length}`);

if (failCount === 0) {
  console.log('\n🎉 All tests passed! Type A/B distinction is working correctly.');
} else {
  console.log('\n⚠️ Some tests failed. Review the signature analysis logic.');
}

// Demonstrate the distinction clearly
console.log('\n' + '='.repeat(60));
console.log('📚 Type A/B Fix Distinction Guide:\n');
console.log('TYPE A - Direct Copy-Paste:');
console.log('  ✅ Function signature unchanged');
console.log('  ✅ Return type unchanged');
console.log('  ✅ Parameter count unchanged');
console.log('  ✅ Safe to apply directly');
console.log('  → Examples: null checks, validation, fixing indices');

console.log('\nTYPE B - Requires Adjustments:');
console.log('  ⚠️ Function signature changed');
console.log('  ⚠️ Parameters added/removed');
console.log('  ⚠️ Async/sync changes');
console.log('  ⚠️ Return type changes');
console.log('  → Examples: SQL injection fixes (add param), async conversions');

console.log('\n✨ Benefits:');
console.log('  • Developers know exactly what to expect');
console.log('  • Type A fixes can be applied quickly and safely');
console.log('  • Type B fixes come with migration guidance');
console.log('  • Prevents breaking changes from being blindly applied');
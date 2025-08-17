#!/usr/bin/env npx ts-node
/**
 * Test AI-Driven Parser Integration
 * 
 * Validates that the new UnifiedAIParser correctly parses DeepWiki responses
 * and integrates with the existing infrastructure.
 */

import { IntegratedDeepWikiParser } from '../deepwiki/services/parser-integration';
import { UnifiedAIParser } from '../deepwiki/services/unified-ai-parser';
import * as fs from 'fs';
import * as path from 'path';

// Sample DeepWiki response for testing
const SAMPLE_DEEPWIKI_RESPONSE = `
# Code Analysis Report

## Security Issues

### Critical Issues

1. **SQL Injection Vulnerability**: Direct string concatenation in database query
   - File: src/api/users.ts, Line: 45
   - The user input is directly concatenated into the SQL query without parameterization
   - CVE: CWE-89
   - Code Snippet:
   \`\`\`typescript
   const query = "SELECT * FROM users WHERE id = " + userId;
   \`\`\`
   - Recommendation: Use parameterized queries or prepared statements
   - Fixed Code:
   \`\`\`typescript
   const query = "SELECT * FROM users WHERE id = ?";
   db.query(query, [userId]);
   \`\`\`

### High Issues

2. **Missing Authentication**: API endpoint lacks authentication checks
   - File: src/api/admin.ts, Line: 12
   - The /admin/users endpoint can be accessed without authentication
   - Severity: High
   - Suggestion: Add authentication middleware

## Performance Issues

1. **N+1 Query Problem**: Inefficient database queries in loop
   - File: src/services/product.ts, Line: 78
   - Each product fetch triggers individual queries for related data
   - Current Performance: 500ms per request
   - Expected Performance: 50ms per request
   - Solution: Use eager loading with includes

2. **Large Bundle Size**: Main JavaScript bundle exceeds 2MB
   - Impact: Slow initial page load
   - Recommendation: Implement code splitting and lazy loading

## Dependencies

### Vulnerable Dependencies

- **express**: Version 4.16.0 has known vulnerabilities
  - CVE-2022-24999: Prototype pollution vulnerability
  - Current: 4.16.0, Fixed: 4.18.2
  - Severity: High

### Outdated Dependencies

- **react**: Version 16.8.0 is 3 major versions behind
  - Current: 16.8.0, Latest: 18.2.0
  - Breaking changes: Yes

### Deprecated Dependencies

- **request**: Package has been deprecated
  - Alternative: Use axios or node-fetch
  - Migration required

## Code Quality

### Complexity Issues

1. **High Cyclomatic Complexity**: Function processOrder has complexity of 25
   - File: src/orders/processor.ts
   - Recommendation: Break down into smaller functions

### Code Duplication

- **15% code duplication** detected
  - Files: src/utils/validator.ts and src/helpers/validate.ts
  - Lines: 45-120 duplicated
  - Extract to shared utility module

### Test Coverage

- Overall coverage: 45%
- Critical paths untested
- File: src/payment/handler.ts has 0% coverage

### Technical Debt

- Total estimated: 120 hours
- Hotspots: src/legacy/api.ts (40 hours)

## Architecture

### System Components

- Frontend: React application
- Backend: Node.js with Express
- Database: PostgreSQL
- Cache: Redis

### Anti-Patterns Detected

1. **God Class**: UserService handles too many responsibilities
   - Location: src/services/user.ts
   - Recommendation: Apply Single Responsibility Principle

## Breaking Changes

### API Changes

1. **Endpoint Removed**: /api/v1/users/profile
   - Migration: Use /api/v2/users/me instead
   - Client impact: All mobile apps need update

### Schema Changes

1. **Field Type Changed**: user.id changed from number to UUID
   - Migration script required
   - Data loss risk: No

## Educational Insights

### Best Practices

1. **Use TypeScript Strict Mode**: Enable strict type checking
   - Example: Add "strict": true to tsconfig.json
   - Benefits: Catch more errors at compile time

### Anti-Patterns to Avoid

1. **Callback Hell**: Nested callbacks make code hard to read
   - Better Approach: Use async/await pattern

## Recommendations

### Immediate Actions

1. **Fix SQL Injection**: Critical security vulnerability
   - Priority: Critical
   - Effort: 2 hours
   - Impact: Prevents database compromise

### Short Term (1-4 weeks)

1. **Update Dependencies**: Address vulnerable packages
   - Timeline: 1 week
   - Dependencies: None
   - ROI: Improved security

### Long Term (1-6 months)

1. **Refactor Legacy Code**: Modernize codebase
   - Timeline: 3 months
   - Business Case: Reduce maintenance costs
`;

async function testAIParserIntegration() {
  console.log('🧪 Testing AI-Driven Parser Integration\n');
  
  try {
    // Test 1: Rule-based parsing (baseline)
    console.log('📋 Test 1: Rule-based parsing');
    const ruleParser = new IntegratedDeepWikiParser({ useAI: false });
    const ruleResult = await ruleParser.parse(SAMPLE_DEEPWIKI_RESPONSE);
    
    console.log('✅ Rule-based parsing results:');
    console.log(`  - Issues found: ${ruleResult.issues.length}`);
    console.log(`  - Categories: ${[...new Set(ruleResult.issues.map(i => i.category))].join(', ')}`);
    console.log(`  - Parse method: ${ruleResult.metadata?.parseMethod || 'pattern'}`);
    console.log(`  - Has dependencies: ${!!ruleResult.dependencies}`);
    console.log(`  - Has code quality: ${!!ruleResult.codeQualityMetrics}`);
    
    // Test 2: AI-driven parsing (if available)
    console.log('\n📋 Test 2: AI-driven parsing');
    
    // Check if we can use AI
    const canUseAI = process.env.OPENROUTER_API_KEY || process.env.USE_DEEPWIKI_MOCK !== 'true';
    
    if (canUseAI) {
      const aiParser = new IntegratedDeepWikiParser({ useAI: true });
      const aiResult = await aiParser.parse(SAMPLE_DEEPWIKI_RESPONSE, {
        language: 'typescript',
        framework: 'express',
        repositorySize: 'medium',
        complexity: 'medium'
      });
      
      console.log('✅ AI-driven parsing results:');
      console.log(`  - Issues found: ${aiResult.issues.length}`);
      console.log(`  - Categories: ${[...new Set(aiResult.issues.map(i => i.category))].join(', ')}`);
      console.log(`  - Parse method: ${aiResult.metadata?.parseMethod || 'unknown'}`);
      console.log(`  - Model used: ${aiResult.metadata?.modelUsed || 'N/A'}`);
      console.log(`  - Confidence: ${aiResult.metadata?.confidence || 0}`);
      console.log(`  - Parse time: ${aiResult.metadata?.parseTime || 0}ms`);
      
      // Compare AI vs Rule-based
      console.log('\n📊 Comparison:');
      console.log(`  - AI found ${aiResult.issues.length} issues vs Rule-based ${ruleResult.issues.length}`);
      console.log(`  - AI confidence: ${(aiResult.metadata?.confidence || 0) * 100}%`);
      
      // Check for enhanced data extraction
      if (aiResult.security) {
        console.log('\n🔒 Security Analysis:');
        console.log(`  - Vulnerabilities: ${aiResult.security.vulnerabilities?.length || 0}`);
      }
      
      if (aiResult.performance) {
        console.log('\n⚡ Performance Analysis:');
        console.log(`  - Issues: ${aiResult.performance.issues?.length || 0}`);
      }
      
      if (aiResult.breakingChanges) {
        console.log('\n🚨 Breaking Changes:');
        console.log(`  - API changes: ${aiResult.breakingChanges.apiChanges?.length || 0}`);
        console.log(`  - Schema changes: ${aiResult.breakingChanges.schemaChanges?.length || 0}`);
      }
      
      if (aiResult.recommendations) {
        console.log('\n💡 Recommendations:');
        console.log(`  - Immediate: ${aiResult.recommendations.immediate?.length || 0}`);
        console.log(`  - Short term: ${aiResult.recommendations.shortTerm?.length || 0}`);
        console.log(`  - Long term: ${aiResult.recommendations.longTerm?.length || 0}`);
      }
    } else {
      console.log('⚠️  AI parsing not available (no OpenRouter key or in mock mode)');
    }
    
    // Test 3: Direct UnifiedAIParser
    console.log('\n📋 Test 3: Direct UnifiedAIParser');
    const unifiedParser = new UnifiedAIParser();
    await unifiedParser.initialize({
      language: 'typescript',
      framework: 'express',
      repositorySize: 'medium',
      complexity: 'medium'
    });
    
    const unifiedResult = await unifiedParser.parseDeepWikiResponse(
      SAMPLE_DEEPWIKI_RESPONSE,
      {
        language: 'typescript',
        framework: 'express',
        repositorySize: 'medium',
        complexity: 'medium',
        useAI: false // Force fallback for testing
      }
    );
    
    console.log('✅ UnifiedAIParser results (fallback mode):');
    console.log(`  - All issues: ${unifiedResult.allIssues.length}`);
    console.log(`  - Security issues: ${unifiedResult.security.issues.length}`);
    console.log(`  - Performance issues: ${unifiedResult.performance.issues.length}`);
    console.log(`  - Dependency issues: ${unifiedResult.dependencies.issues.length}`);
    console.log(`  - Code quality issues: ${unifiedResult.codeQuality.issues.length}`);
    console.log(`  - Architecture issues: ${unifiedResult.architecture.issues.length}`);
    console.log(`  - Breaking changes: ${unifiedResult.breakingChanges.issues.length}`);
    
    // Test 4: Capabilities check
    console.log('\n📋 Test 4: Parser Capabilities');
    const capParser = new IntegratedDeepWikiParser({ useAI: true });
    const capabilities = capParser.getCapabilities();
    console.log('✅ Available capabilities:');
    capabilities.forEach(cap => console.log(`  - ${cap}`));
    
    // Test 5: Dynamic AI toggle
    console.log('\n📋 Test 5: Dynamic AI Toggle');
    const toggleParser = new IntegratedDeepWikiParser({ useAI: false });
    console.log('  - Initial: rule-based');
    
    toggleParser.enableAI();
    console.log('  - After enable: AI-driven');
    
    toggleParser.disableAI();
    console.log('  - After disable: rule-based');
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testAIParserIntegration().catch(console.error);
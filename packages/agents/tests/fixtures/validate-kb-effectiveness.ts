/**
 * Session 94: Validate KB Effectiveness
 *
 * Tests that the newly added KB patterns are:
 * 1. Successfully loaded by the fix guidance service
 * 2. Improving AI fixer prompts with guidance
 * 3. Available for future fix attempts
 */

import {
  getFixGuidance,
  formatGuidanceForPrompt,
} from '../../src/fix-agent/fix-pattern-registry/fix-pattern-guidance';

// Patterns added in Session 94
const SESSION_94_PATTERNS = [
  { ruleId: 'FieldDeclarationsShouldBeAtStartOfClass', language: 'java', tool: 'pmd' },
  { ruleId: 'CommentDefaultAccessModifier', language: 'java', tool: 'pmd' },
  { ruleId: 'CallSuperInConstructor', language: 'java', tool: 'pmd' },
  { ruleId: 'ShortVariable', language: 'java', tool: 'pmd' },
  { ruleId: 'UnnecessaryConstructor', language: 'java', tool: 'pmd' },
];

// Patterns that existed before Session 94
const EXISTING_PATTERNS = [
  { ruleId: 'UseUtilityClass', language: 'java', tool: 'pmd' },
  { ruleId: 'LooseCoupling', language: 'java', tool: 'pmd' },
  { ruleId: 'MissingOverride', language: 'java', tool: 'pmd' },
];

interface ValidationResult {
  ruleId: string;
  found: boolean;
  hasGuidanceText: boolean;
  hasPromptAdditions: boolean;
  hasAntiPatterns: boolean;
  hasCorrectPatterns: boolean;
  formattedPromptLength: number;
}

async function validateKBEffectiveness(): Promise<void> {
  console.log('=== KB Effectiveness Validation ===\n');
  console.log('Testing that Session 94 patterns are properly loaded...\n');

  const results: ValidationResult[] = [];

  // Test Session 94 patterns (newly added)
  console.log('--- Session 94 Patterns (Newly Added) ---');
  for (const pattern of SESSION_94_PATTERNS) {
    const guidance = await getFixGuidance(pattern.ruleId, pattern.language, pattern.tool);
    const formattedPrompt = await formatGuidanceForPrompt(pattern.ruleId, pattern.language, pattern.tool);

    const result: ValidationResult = {
      ruleId: pattern.ruleId,
      found: !!guidance,
      hasGuidanceText: !!(guidance?.guidanceText),
      hasPromptAdditions: !!(guidance?.promptAdditions),
      hasAntiPatterns: (guidance?.antiPatterns?.length || 0) > 0,
      hasCorrectPatterns: (guidance?.correctPatterns?.length || 0) > 0,
      formattedPromptLength: formattedPrompt.length,
    };

    results.push(result);

    const status = result.found ? '✅' : '❌';
    console.log(`${status} ${pattern.ruleId}`);
    if (result.found) {
      console.log(`   - Guidance text: ${result.hasGuidanceText ? 'Yes' : 'No'}`);
      console.log(`   - Prompt additions: ${result.hasPromptAdditions ? 'Yes' : 'No'}`);
      console.log(`   - Anti-patterns: ${guidance?.antiPatterns?.length || 0}`);
      console.log(`   - Correct patterns: ${guidance?.correctPatterns?.length || 0}`);
      console.log(`   - Formatted prompt length: ${result.formattedPromptLength} chars`);
    }
    console.log();
  }

  // Test existing patterns (should still work)
  console.log('\n--- Existing Patterns (Pre-Session 94) ---');
  for (const pattern of EXISTING_PATTERNS) {
    const guidance = await getFixGuidance(pattern.ruleId, pattern.language, pattern.tool);
    const status = guidance ? '✅' : '❌';
    console.log(`${status} ${pattern.ruleId}`);
    if (guidance) {
      console.log(`   - Prompt additions: ${guidance.promptAdditions ? 'Yes' : 'No'}`);
    }
  }

  // Calculate metrics
  const session94Found = results.filter(r => r.found).length;
  const session94WithPrompt = results.filter(r => r.hasPromptAdditions).length;
  const session94WithAntiPatterns = results.filter(r => r.hasAntiPatterns).length;

  console.log('\n=== VALIDATION SUMMARY ===');
  console.log(`Session 94 Patterns Found: ${session94Found}/${SESSION_94_PATTERNS.length}`);
  console.log(`With Prompt Additions: ${session94WithPrompt}/${SESSION_94_PATTERNS.length}`);
  console.log(`With Anti-Patterns: ${session94WithAntiPatterns}/${SESSION_94_PATTERNS.length}`);

  // Test sample prompt formatting
  console.log('\n=== SAMPLE FORMATTED PROMPT ===');
  const samplePrompt = await formatGuidanceForPrompt('ShortVariable', 'java', 'pmd');
  console.log('ShortVariable guidance for AI prompt:');
  console.log('---');
  console.log(samplePrompt);
  console.log('---');

  // Overall validation
  const allPatternsFound = session94Found === SESSION_94_PATTERNS.length;
  const allHavePrompts = session94WithPrompt === SESSION_94_PATTERNS.length;

  console.log('\n=== FINAL RESULT ===');
  if (allPatternsFound && allHavePrompts) {
    console.log('✅ PASS: All Session 94 patterns loaded and ready for AI fixer');
    console.log('   - KB will now provide guidance for these 5 PMD rules');
    console.log('   - Future AI fixes will include anti-patterns to avoid');
    console.log('   - Future AI fixes will include correct patterns to use');
  } else {
    console.log('❌ FAIL: Some patterns not properly loaded');
    const missing = results.filter(r => !r.found).map(r => r.ruleId);
    if (missing.length > 0) {
      console.log(`   Missing: ${missing.join(', ')}`);
    }
  }

  // Output JSON summary
  const summary = {
    validatedAt: new Date().toISOString(),
    session94Patterns: {
      total: SESSION_94_PATTERNS.length,
      found: session94Found,
      withPromptAdditions: session94WithPrompt,
      withAntiPatterns: session94WithAntiPatterns,
    },
    existingPatternsWorking: EXISTING_PATTERNS.length,
    totalKBPatterns: session94Found + EXISTING_PATTERNS.length,
    validationPassed: allPatternsFound && allHavePrompts,
    results,
  };

  console.log('\n=== JSON Summary ===');
  console.log(JSON.stringify(summary, null, 2));
}

// Run if executed directly
if (require.main === module) {
  validateKBEffectiveness()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Validation failed:', e);
      process.exit(1);
    });
}

export { validateKBEffectiveness };

/**
 * Session 98: Analyze failures and create manual patterns for Supabase
 *
 * This script:
 * 1. Queries fix_failure_tracking table for all failures
 * 2. Analyzes each failure to understand the context
 * 3. Creates appropriate guidance patterns
 * 4. Stores them in fix_pattern_guidance table
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface FailureRecord {
  id: string;
  rule_id: string;
  language: string;
  tool: string;
  failure_type: string;
  regression_rules: string[] | null;
  failure_message: string | null;
  original_code: string | null;
  attempted_fix: string | null;
  code_context: string | null;
  failure_count: number;
  review_status: string;
  created_at: string;
}

interface GuidancePattern {
  rule_id: string;
  language: string;
  tool: string;
  anti_patterns: Array<{ pattern: string; why: string }>;
  correct_patterns: Array<{ pattern: string; example: string }>;
  related_rules: string[];
  guidance_text: string;
  prompt_additions: string;
  success_rate: number;
  usage_count: number;
}

async function analyzeFailuresAndCreatePatterns() {
  console.log('=== Session 98: Analyze Failures and Create Patterns ===\n');

  // Step 1: Query all failures
  console.log('Step 1: Querying fix_failure_tracking table...');
  const { data: failures, error: failErr } = await supabase
    .from('fix_failure_tracking')
    .select('*')
    .order('failure_count', { ascending: false });

  if (failErr) {
    console.error('Error querying failures:', failErr.message);
    return;
  }

  console.log(`Found ${failures?.length || 0} failure records\n`);

  if (!failures || failures.length === 0) {
    console.log('No failures to analyze.');
    return;
  }

  // Step 2: Group failures by rule
  const failuresByRule = new Map<string, FailureRecord[]>();
  for (const f of failures as FailureRecord[]) {
    const key = `${f.rule_id}:${f.language}`;
    if (!failuresByRule.has(key)) {
      failuresByRule.set(key, []);
    }
    failuresByRule.get(key)!.push(f);
  }

  console.log('Failures by rule:');
  for (const [key, records] of failuresByRule.entries()) {
    const totalCount = records.reduce((sum, r) => sum + r.failure_count, 0);
    console.log(`  ${key}: ${records.length} records, ${totalCount} total failures`);
  }
  console.log('');

  // Step 3: Create guidance patterns for each failed rule
  console.log('Step 3: Creating guidance patterns...\n');

  const patternsToCreate: GuidancePattern[] = [];

  // Pattern 1: UnusedPrivateMethod - Already exists in fallback, but needs refinement
  const unusedPrivateMethodPattern: GuidancePattern = {
    rule_id: 'UnusedPrivateMethod',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'commenting out the method', why: 'Dead code should be removed, not commented' },
      { pattern: 'making method public/protected', why: 'Does not fix the issue, method is still unused' },
      { pattern: 'adding @SuppressWarnings', why: 'Hides the real problem instead of fixing it' },
      { pattern: 'keeping method "for future use"', why: 'YAGNI principle - add when actually needed' }
    ],
    correct_patterns: [
      { pattern: 'delete the entire method', example: '// Simply remove the unused private method entirely' },
      { pattern: 'add actual usage if needed', example: 'this.unusedMethod(); // Call from appropriate location' },
      { pattern: 'check for reflection usage', example: '// If used via reflection, add @SuppressWarnings("PMD.UnusedPrivateMethod")' }
    ],
    related_rules: ['UnusedLocalVariable', 'UnusedPrivateField', 'UnusedFormalParameter'],
    guidance_text: 'Unused private methods increase code complexity and maintenance burden. Delete them unless they are used via reflection (rare).',
    prompt_additions: `CRITICAL for UnusedPrivateMethod:
- PREFERRED FIX: Delete the entire method completely
- DO NOT comment out the method
- DO NOT change visibility (public/protected)
- DO NOT add @SuppressWarnings unless there's proven reflection usage
- If the method IS needed somewhere, add an actual call to it
- Trust that tests will catch if deletion breaks something`,
    success_rate: 60, // Based on 4 failures out of 10 attempts
    usage_count: 10
  };
  patternsToCreate.push(unusedPrivateMethodPattern);

  // Pattern 2: PreserveStackTrace
  const preserveStackTracePattern: GuidancePattern = {
    rule_id: 'PreserveStackTrace',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'throw new Exception(e.getMessage())', why: 'Loses the original stack trace, making debugging impossible' },
      { pattern: 'throw new RuntimeException("error")', why: 'Loses both stack trace and original message' },
      { pattern: 'catch and rethrow without cause', why: 'Breaks the exception chain' }
    ],
    correct_patterns: [
      { pattern: 'pass original exception as cause', example: 'throw new RuntimeException("Failed to process", originalException);' },
      { pattern: 'use exception chaining', example: 'catch (IOException e) { throw new ProcessingException("Context info", e); }' },
      { pattern: 'wrap with initCause if needed', example: 'Exception wrapped = new Exception("msg"); wrapped.initCause(original); throw wrapped;' }
    ],
    related_rules: ['AvoidCatchingGenericException', 'AvoidThrowingRawExceptionTypes'],
    guidance_text: 'Always preserve the original exception as the cause when wrapping exceptions. This maintains the stack trace for debugging.',
    prompt_additions: `CRITICAL for PreserveStackTrace:
- ALWAYS pass original exception as second parameter: throw new XException("message", originalException)
- For custom exceptions, ensure constructor accepts Throwable cause
- Use exception.initCause(original) if constructor doesn't accept cause
- NEVER throw new Exception(e.getMessage()) - this LOSES the stack trace
- NEVER throw new RuntimeException() without the cause parameter`,
    success_rate: 0, // Based on 1 failure
    usage_count: 1
  };
  patternsToCreate.push(preserveStackTracePattern);

  // Pattern 3: ControlStatementBraces
  const controlStatementBracesPattern: GuidancePattern = {
    rule_id: 'ControlStatementBraces',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'if without braces', why: 'Easy to introduce bugs when adding statements' },
      { pattern: 'for/while without braces', why: 'Same risk - dangling statements' },
      { pattern: 'else without braces', why: 'Especially dangerous with else-if chains' }
    ],
    correct_patterns: [
      { pattern: 'always use braces for if', example: 'if (condition) {\n    doSomething();\n}' },
      { pattern: 'always use braces for loops', example: 'for (int i = 0; i < n; i++) {\n    process(i);\n}' },
      { pattern: 'always use braces for else', example: 'if (x) {\n    a();\n} else {\n    b();\n}' }
    ],
    related_rules: [],
    guidance_text: 'Always use braces for control statements (if, else, for, while, do) even for single-line bodies.',
    prompt_additions: `CRITICAL for ControlStatementBraces:
- Add opening brace { on same line as control statement
- Add closing brace } on its own line
- Apply to: if, else, else if, for, while, do-while
- Even single-line bodies MUST have braces
- Format: if (condition) {\\n    statement;\\n}`,
    success_rate: 75, // Based on 1 failure out of 4 attempts
    usage_count: 4
  };
  patternsToCreate.push(controlStatementBracesPattern);

  // Pattern 4: LooseCoupling - already has a pattern but may need refinement
  // Check if guidance already exists
  const { data: existingLoose } = await supabase
    .from('fix_pattern_guidance')
    .select('rule_id')
    .eq('rule_id', 'LooseCoupling')
    .eq('language', 'java')
    .single();

  if (!existingLoose) {
    const looseCouplingPattern: GuidancePattern = {
      rule_id: 'LooseCoupling',
      language: 'java',
      tool: 'pmd',
      anti_patterns: [
        { pattern: 'ArrayList as type', why: 'Ties code to specific implementation' },
        { pattern: 'HashMap as type', why: 'Prevents using TreeMap, LinkedHashMap, etc.' },
        { pattern: 'HashSet as type', why: 'Prevents using TreeSet, LinkedHashSet, etc.' },
        { pattern: 'concrete type in public API', why: 'Makes API rigid and hard to change' }
      ],
      correct_patterns: [
        { pattern: 'use List interface', example: 'public List<String> getItems() { return new ArrayList<>(); }' },
        { pattern: 'use Map interface', example: 'private Map<String, Object> cache = new HashMap<>();' },
        { pattern: 'use Set interface', example: 'public Set<User> getActiveUsers()' },
        { pattern: 'use Collection for maximum flexibility', example: 'public Collection<Item> getAllItems()' }
      ],
      related_rules: [],
      guidance_text: 'Use interface types (List, Map, Set, Collection) instead of concrete implementations (ArrayList, HashMap, HashSet) in variable declarations, method parameters, and return types.',
      prompt_additions: `CRITICAL for LooseCoupling:
- Change ArrayList to List in declarations
- Change HashMap to Map in declarations
- Change HashSet to Set in declarations
- Keep concrete type ONLY in new expression: List<X> list = new ArrayList<>();
- For fields: private List<X> items = new ArrayList<>();
- For params: public void process(List<X> items)
- For returns: public List<X> getItems()
- EXCEPTION: If specific implementation behavior is needed (e.g., LinkedHashMap for order)`,
      success_rate: 96, // Based on 1 failure out of 25 attempts
      usage_count: 25
    };
    patternsToCreate.push(looseCouplingPattern);
  }

  // Pattern 5: UnnecessaryImport
  const unnecessaryImportPattern: GuidancePattern = {
    rule_id: 'UnnecessaryImport',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'import java.lang.*', why: 'java.lang is automatically imported' },
      { pattern: 'importing same-package classes', why: 'Classes in same package are automatically visible' },
      { pattern: 'duplicate imports', why: 'Redundant, may indicate copy-paste error' },
      { pattern: 'unused imports', why: 'Adds noise, may cause confusion' }
    ],
    correct_patterns: [
      { pattern: 'remove unnecessary imports', example: '// Simply delete the import statement' },
      { pattern: 'use IDE organize imports', example: '// Ctrl+Shift+O in Eclipse, Ctrl+Alt+O in IntelliJ' },
      { pattern: 'only import what is used', example: 'import java.util.List; // Only if List is actually used' }
    ],
    related_rules: ['DuplicateImports', 'UnusedImports'],
    guidance_text: 'Remove imports that are unnecessary: java.lang.*, same-package classes, duplicate imports, and unused imports.',
    prompt_additions: `CRITICAL for UnnecessaryImport:
- DELETE the entire import statement
- DO NOT comment it out
- Check if import is from java.lang.* (auto-imported)
- Check if import is from same package (auto-visible)
- Check if imported class is actually used in the file
- When in doubt, delete and let compiler tell you if needed`,
    success_rate: 98, // Based on 1 failure out of 45 attempts
    usage_count: 45
  };
  patternsToCreate.push(unnecessaryImportPattern);

  // Pattern 6: UseUtilityClass - Already exists but adding PMD-specific guidance
  const useUtilityClassPattern: GuidancePattern = {
    rule_id: 'UseUtilityClass',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'public default constructor', why: 'Allows instantiation of utility class' },
      { pattern: 'no constructor at all', why: 'Java adds default public constructor' },
      { pattern: 'non-final utility class', why: 'Allows subclassing which defeats the purpose' },
      { pattern: 'instance methods in utility class', why: 'Should be static' }
    ],
    correct_patterns: [
      { pattern: 'private constructor', example: 'private ClassName() {\n    throw new UnsupportedOperationException("Utility class");\n}' },
      { pattern: 'final class', example: 'public final class Utils { ... }' },
      { pattern: 'all static methods', example: 'public static String format(String s) { ... }' }
    ],
    related_rules: ['UnnecessaryConstructor'],
    guidance_text: 'Utility classes should have a private constructor, be final, and have only static methods.',
    prompt_additions: `CRITICAL for UseUtilityClass:
- Add private constructor that throws UnsupportedOperationException
- Make the class final
- Ensure all methods are static
- Format: private ClassName() { throw new UnsupportedOperationException("Utility class"); }
- If class has instance methods, they need to be converted to static first`,
    success_rate: 50, // Based on failures
    usage_count: 26
  };
  patternsToCreate.push(useUtilityClassPattern);

  // Pattern 7: AvoidDollarSigns
  const avoidDollarSignsPattern: GuidancePattern = {
    rule_id: 'AvoidDollarSigns',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: '$varName', why: 'Dollar signs are used internally by compiler for inner classes' },
      { pattern: 'field$name', why: 'Confuses with compiler-generated names' },
      { pattern: 'Dollar in method names', why: 'May conflict with bytecode manipulation tools' }
    ],
    correct_patterns: [
      { pattern: 'camelCase names', example: 'private String userName;' },
      { pattern: 'underscore for constants', example: 'private static final int MAX_VALUE = 100;' },
      { pattern: 'rename to descriptive name', example: 'String dollarAmount → String amount' }
    ],
    related_rules: ['VariableNamingConventions', 'MethodNamingConventions'],
    guidance_text: 'Avoid dollar signs in variable, method, and class names. Rename to camelCase equivalents.',
    prompt_additions: `CRITICAL for AvoidDollarSigns:
- Remove $ from identifier names completely
- Rename $foo → foo or relevant descriptive name
- For variables like dollar$amount → dollarAmount or just amount
- Ensure renamed identifier is used consistently throughout the file
- If $ was used as separator, switch to camelCase`,
    success_rate: 0, // Multiple failures
    usage_count: 6
  };
  patternsToCreate.push(avoidDollarSignsPattern);

  // Pattern 8: UselessParentheses
  const uselessParenthesesPattern: GuidancePattern = {
    rule_id: 'UselessParentheses',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'return (value)', why: 'Parentheses around simple return value are unnecessary' },
      { pattern: '((a + b))', why: 'Double parentheses are redundant' },
      { pattern: 'x = (y)', why: 'Parentheses around simple assignment value are unnecessary' }
    ],
    correct_patterns: [
      { pattern: 'remove outer parentheses', example: 'return value;' },
      { pattern: 'keep only necessary grouping', example: 'return (a + b) * c; // Keep for precedence' },
      { pattern: 'simple assignment', example: 'x = y;' }
    ],
    related_rules: [],
    guidance_text: 'Remove unnecessary parentheses that do not affect operator precedence or clarify complex expressions.',
    prompt_additions: `CRITICAL for UselessParentheses:
- Remove outer parentheses from simple expressions
- Keep parentheses that clarify precedence: (a + b) * c
- Remove double parentheses: ((x)) → x
- Remove parentheses from simple returns: return (x); → return x;
- Remove from simple assignments: x = (y); → x = y;`,
    success_rate: 0, // 1 failure
    usage_count: 1
  };
  patternsToCreate.push(uselessParenthesesPattern);

  // Pattern 9: UnnecessaryAnnotationValueElement
  const unnecessaryAnnotationPattern: GuidancePattern = {
    rule_id: 'UnnecessaryAnnotationValueElement',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: '@Annotation(value = "x")', why: 'value= is unnecessary when using single default element' },
      { pattern: '@SuppressWarnings(value = {"x"})', why: 'Can use shorthand without value=' }
    ],
    correct_patterns: [
      { pattern: 'shorthand syntax', example: '@Annotation("x")' },
      { pattern: 'array shorthand', example: '@SuppressWarnings("x") // Single value, no array' },
      { pattern: 'named elements only when multiple', example: '@Annotation(value = "x", other = "y")' }
    ],
    related_rules: [],
    guidance_text: 'Use annotation shorthand syntax when only the value element is specified.',
    prompt_additions: `CRITICAL for UnnecessaryAnnotationValueElement:
- Change @Annotation(value = "x") → @Annotation("x")
- Change @SuppressWarnings(value = {"x"}) → @SuppressWarnings("x")
- Keep value= only when multiple elements are specified
- Single-element arrays can omit braces: {"x"} → "x"`,
    success_rate: 0, // 1 failure
    usage_count: 1
  };
  patternsToCreate.push(unnecessaryAnnotationPattern);

  // Step 4: Store patterns in Supabase
  console.log('Step 4: Storing patterns in fix_pattern_guidance table...\n');

  for (const pattern of patternsToCreate) {
    console.log(`Creating pattern for ${pattern.rule_id}...`);

    const { error: upsertErr } = await supabase
      .from('fix_pattern_guidance')
      .upsert(pattern, {
        onConflict: 'rule_id,language,tool'
      });

    if (upsertErr) {
      console.error(`  Error: ${upsertErr.message}`);
    } else {
      console.log(`  ✓ Pattern created/updated for ${pattern.rule_id}`);
    }
  }

  // Step 5: Mark failures as reviewed
  console.log('\nStep 5: Marking failures as reviewed...\n');

  const rulesProcessed = [
    'UnusedPrivateMethod',
    'PreserveStackTrace',
    'ControlStatementBraces',
    'LooseCoupling',
    'UnnecessaryImport',
    'UseUtilityClass',
    'AvoidDollarSigns',
    'UselessParentheses',
    'UnnecessaryAnnotationValueElement'
  ];

  for (const ruleId of rulesProcessed) {
    const { error: updateErr } = await supabase
      .from('fix_failure_tracking')
      .update({
        review_status: 'guidance_added',
        reviewed_by: 'Session 98 - Manual Pattern Creation',
        reviewed_at: new Date().toISOString()
      })
      .eq('rule_id', ruleId)
      .eq('language', 'java');

    if (updateErr) {
      console.error(`  Error updating ${ruleId}: ${updateErr.message}`);
    } else {
      console.log(`  ✓ Marked ${ruleId} failures as reviewed`);
    }
  }

  // Step 6: Verify results
  console.log('\nStep 6: Verifying results...\n');

  const { data: guidanceCount } = await supabase
    .from('fix_pattern_guidance')
    .select('rule_id')
    .eq('language', 'java');

  const { data: remainingFailures } = await supabase
    .from('fix_failure_tracking')
    .select('rule_id, failure_count')
    .eq('review_status', 'pending');

  console.log('=== Summary ===');
  console.log(`Guidance patterns for Java: ${guidanceCount?.length || 0}`);
  console.log(`Remaining pending failures: ${remainingFailures?.length || 0}`);

  if (remainingFailures && remainingFailures.length > 0) {
    console.log('\nPending failures:');
    for (const f of remainingFailures) {
      console.log(`  ${f.rule_id}: ${f.failure_count} failures`);
    }
  }

  console.log('\n✓ Pattern creation complete!');
}

analyzeFailuresAndCreatePatterns().catch(console.error);

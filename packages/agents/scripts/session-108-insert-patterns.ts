/**
 * Session 108: Insert 6 guidance patterns into Supabase
 *
 * This script:
 * 1. Inserts/updates 6 patterns in fix_pattern_guidance table
 * 2. Removes corresponding entries from fix_failure_tracking
 * 3. Verifies the patterns are active
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - try multiple locations
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// The 6 patterns to insert
const patterns = [
  {
    rule_id: 'UselessParentheses',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'return (value);', why: 'Parentheses around single return value are unnecessary' },
      { pattern: 'if ((a == b))', why: 'Double parentheses in conditions add no value' },
      { pattern: 'int x = (5 + 3);', why: 'Parentheses around simple expressions are redundant' },
      { pattern: '(variable)', why: 'Single variable wrapped in parentheses is always unnecessary' }
    ],
    correct_patterns: [
      { pattern: 'return value;', example: 'return calculatedResult;' },
      { pattern: 'if (a == b)', example: 'if (status == Status.ACTIVE) { ... }' },
      { pattern: 'preserve precedence parentheses', example: 'int x = (a + b) * c; // These ARE needed' },
      { pattern: 'preserve cast parentheses', example: '((String) obj).length(); // Cast parentheses needed' }
    ],
    related_rules: [],
    guidance_text: 'Remove parentheses that do not affect operator precedence or clarity. Keep parentheses needed for casts, method calls, or complex expressions.',
    prompt_additions: `CRITICAL for UselessParentheses:
- Remove parentheses around single variables: (x) → x
- Remove parentheses around return values: return (x); → return x;
- Remove double parentheses: if ((x)) → if (x)
- KEEP parentheses that clarify precedence: (a + b) * c
- KEEP parentheses for casts: ((String) obj).method()
- KEEP parentheses for ternary clarity: (a ? b : c)`,
    success_rate: 0,
    usage_count: 0
  },
  {
    rule_id: 'F632',
    language: 'python',
    tool: 'ruff',
    anti_patterns: [
      { pattern: 'x is ""', why: '`is` checks identity, not equality - empty string literals may not be interned' },
      { pattern: 'x is 0', why: 'Integer identity is only guaranteed for -5 to 256 in CPython' },
      { pattern: 'x is "literal"', why: 'String interning is implementation-dependent' },
      { pattern: 'x is 3.14', why: 'Float identity is never guaranteed' }
    ],
    correct_patterns: [
      { pattern: 'x == ""', example: 'if name == "": print("Empty name")' },
      { pattern: 'x == 0', example: 'if count == 0: return early' },
      { pattern: 'x is None', example: 'if result is None: # This IS correct - None is singleton' },
      { pattern: 'x is True / x is False', example: 'if flag is True: # Correct for boolean identity' }
    ],
    related_rules: ['E711', 'E712'],
    guidance_text: 'Use == for comparing to string/number literals. Use `is` only for None, True, False singletons.',
    prompt_additions: `CRITICAL for F632:
- Replace 'is ""' with '== ""'
- Replace 'is 0' with '== 0'
- Replace 'is "string"' with '== "string"'
- DO NOT change 'is None' - that is correct
- DO NOT change 'is True' or 'is False' - those are correct
- The 'is' operator checks object identity, == checks value equality`,
    success_rate: 0,
    usage_count: 0
  },
  {
    rule_id: '@typescript-eslint/no-explicit-any',
    language: 'typescript',
    tool: 'eslint',
    anti_patterns: [
      { pattern: 'function foo(x: any)', why: 'Loses all type safety, defeats purpose of TypeScript' },
      { pattern: 'const data: any = ...', why: 'Any propagates and infects other types' },
      { pattern: 'as any', why: 'Type assertion to any bypasses all checking' },
      { pattern: 'Record<string, any>', why: 'Allows any value type, should be more specific' }
    ],
    correct_patterns: [
      { pattern: 'unknown for truly unknown types', example: 'function parse(input: unknown): Result { ... }' },
      { pattern: 'generics for flexible types', example: 'function identity<T>(value: T): T { return value; }' },
      { pattern: 'specific types when known', example: 'interface ApiResponse { data: User[]; status: number; }' },
      { pattern: 'union types for multiple options', example: 'type Result = Success | Failure | Pending;' }
    ],
    related_rules: ['@typescript-eslint/no-unsafe-any', '@typescript-eslint/no-unsafe-assignment'],
    guidance_text: 'Replace `any` with `unknown` for truly unknown types, generics for flexible types, or specific interfaces/types when the shape is known.',
    prompt_additions: `CRITICAL for @typescript-eslint/no-explicit-any:
- Use 'unknown' when type is truly unknown (requires type guards to use)
- Use generics <T> when type should be flexible but consistent
- Use specific interfaces/types when structure is known
- Use union types (A | B) when multiple specific types are valid
- Record<string, unknown> instead of Record<string, any>
- For callback params, infer from usage or use specific function types`,
    success_rate: 0,
    usage_count: 0
  },
  {
    rule_id: 'AvoidDollarSigns',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'int $count', why: '$ is reserved for compiler-generated code' },
      { pattern: 'String my$var', why: '$ in identifiers causes confusion with inner class references' },
      { pattern: 'void $method()', why: 'Method names should not contain $' },
      { pattern: 'class My$Class', why: 'Compiler uses $ for inner class naming (Outer$Inner)' }
    ],
    correct_patterns: [
      { pattern: 'camelCase naming', example: 'int itemCount;' },
      { pattern: 'descriptive names', example: 'String myVariable;' },
      { pattern: 'underscore for constants', example: 'static final int MAX_COUNT = 100;' }
    ],
    related_rules: ['LocalVariableNamingConventions', 'FieldNamingConventions'],
    guidance_text: 'Rename identifiers to remove $ character. Use standard Java naming conventions: camelCase for variables/methods, PascalCase for classes.',
    prompt_additions: `CRITICAL for AvoidDollarSigns:
- Remove $ from variable names: $count → count, my$var → myVar
- Remove $ from method names: $init() → init()
- Remove $ from class names: My$Class → MyClass
- $ is reserved for: inner class references (Outer$Inner), generated code
- Use camelCase for variables and methods
- Use SCREAMING_SNAKE_CASE for constants`,
    success_rate: 0,
    usage_count: 0
  },
  {
    rule_id: 'UnnecessaryAnnotationValueElement',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: '@SuppressWarnings(value="unchecked")', why: 'value= is redundant when it is the only element' },
      { pattern: '@RequestMapping(value="/api")', why: 'Single element annotations can omit value=' },
      { pattern: '@Autowired(required=true)', why: 'true is the default, no need to specify' }
    ],
    correct_patterns: [
      { pattern: '@SuppressWarnings("unchecked")', example: '@SuppressWarnings("unchecked")' },
      { pattern: '@RequestMapping("/api")', example: '@RequestMapping("/api/users")' },
      { pattern: 'keep value= with multiple elements', example: '@RequestMapping(value="/api", method=GET)' }
    ],
    related_rules: [],
    guidance_text: 'Remove explicit value= when it is the only annotation element. Keep value= when multiple elements are present.',
    prompt_additions: `CRITICAL for UnnecessaryAnnotationValueElement:
- Remove 'value=' when single element: @Foo(value="x") → @Foo("x")
- KEEP 'value=' with multiple elements: @Foo(value="x", other=y)
- Common annotations: @SuppressWarnings, @RequestMapping, @GetMapping
- Check if removing value= is valid (some annotations require explicit naming)
- @Autowired(required=true) → @Autowired (true is default)`,
    success_rate: 0,
    usage_count: 0
  },
  {
    rule_id: 'UseUtilityClass',
    language: 'java',
    tool: 'pmd',
    anti_patterns: [
      { pattern: 'Adding private constructor to Spring @Configuration classes', why: 'Breaks Spring bean instantiation' },
      { pattern: 'Adding private constructor to @Component classes', why: 'Spring needs to instantiate these' },
      { pattern: 'Adding private constructor to classes meant to be instantiated', why: 'Breaks normal instantiation' }
    ],
    correct_patterns: [
      { pattern: 'Add private constructor only to true utility classes', example: 'public final class StringUtils {\n    private StringUtils() { throw new UnsupportedOperationException(); }\n    public static String trim(String s) { ... }\n}' },
      { pattern: 'Suppress for Spring beans', example: '@SuppressWarnings("PMD.UseUtilityClass")\n@Configuration\npublic class AppConfig { ... }' },
      { pattern: 'Make class final', example: 'public final class Utils { ... }' }
    ],
    related_rules: ['UnnecessaryConstructor'],
    guidance_text: 'Check if class is a Spring bean (@Component, @Service, @Configuration) - if so, suppress warning. Only add private constructor to pure utility classes with all static methods.',
    prompt_additions: `CRITICAL for UseUtilityClass:
- CHECK for Spring annotations: @Component, @Service, @Configuration, @Repository, @Controller
- If Spring bean: ADD @SuppressWarnings("PMD.UseUtilityClass") instead of private constructor
- If true utility class (all static methods): ADD private constructor with throw
- Private constructor format: private ClassName() { throw new UnsupportedOperationException("Utility class"); }
- ALSO make the class final when adding private constructor`,
    success_rate: 0,
    usage_count: 0
  }
];

async function insertPatterns() {
  console.log('='.repeat(60));
  console.log('Session 108: Inserting 6 guidance patterns');
  console.log('='.repeat(60));

  let successCount = 0;

  for (const pattern of patterns) {
    console.log(`\nInserting: ${pattern.rule_id} (${pattern.tool}/${pattern.language})`);

    const { data, error } = await supabase
      .from('fix_pattern_guidance')
      .upsert(pattern, { onConflict: 'rule_id,language,tool' })
      .select();

    if (error) {
      console.error(`  ❌ Failed: ${error.message}`);
    } else {
      console.log(`  ✅ Success`);
      successCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Inserted ${successCount}/${patterns.length} patterns`);

  return successCount;
}

async function cleanupFailureTracking() {
  console.log('\n' + '='.repeat(60));
  console.log('Cleaning up fix_failure_tracking table');
  console.log('='.repeat(60));

  const ruleIds = patterns.map(p => p.rule_id);

  // Get current failures
  const { data: failures, error: fetchError } = await supabase
    .from('fix_failure_tracking')
    .select('*')
    .in('rule_id', ruleIds);

  if (fetchError) {
    console.error(`Failed to fetch failures: ${fetchError.message}`);
    return 0;
  }

  console.log(`\nFound ${failures?.length || 0} failure tracking entries for these rules:`);
  for (const f of failures || []) {
    console.log(`  - ${f.rule_id} (${f.tool}/${f.language}): ${f.failure_count} failures`);
  }

  if (!failures || failures.length === 0) {
    console.log('\nNo entries to delete.');
    return 0;
  }

  // Delete failures for rules that now have guidance
  const { error: deleteError, count } = await supabase
    .from('fix_failure_tracking')
    .delete()
    .in('rule_id', ruleIds);

  if (deleteError) {
    console.error(`Failed to delete failures: ${deleteError.message}`);
    return 0;
  }

  console.log(`\n✅ Deleted ${count || failures.length} failure tracking entries`);
  return count || failures.length;
}

async function verifyPatterns() {
  console.log('\n' + '='.repeat(60));
  console.log('Verifying patterns in database');
  console.log('='.repeat(60));

  const { data, error } = await supabase
    .from('fix_pattern_guidance')
    .select('rule_id, language, tool, success_rate, usage_count')
    .order('rule_id');

  if (error) {
    console.error(`Failed to verify: ${error.message}`);
    return;
  }

  console.log(`\nTotal guidance patterns: ${data?.length || 0}`);
  console.log('\nRecently added patterns:');

  const ruleIds = patterns.map(p => p.rule_id);
  for (const row of data || []) {
    if (ruleIds.includes(row.rule_id)) {
      console.log(`  ✅ ${row.rule_id} (${row.tool}/${row.language})`);
    }
  }
}

async function main() {
  try {
    const insertedCount = await insertPatterns();
    const deletedCount = await cleanupFailureTracking();
    await verifyPatterns();

    console.log('\n' + '='.repeat(60));
    console.log('Session 108 Summary');
    console.log('='.repeat(60));
    console.log(`Patterns inserted: ${insertedCount}`);
    console.log(`Failure entries cleaned: ${deletedCount}`);
    console.log('='.repeat(60));

    if (insertedCount === patterns.length) {
      console.log('\n✅ All patterns successfully inserted!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some patterns failed to insert');
      process.exit(1);
    }
  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  }
}

main();

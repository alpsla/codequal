/**
 * Fix Pattern Guidance Service
 *
 * SESSION 80: Knowledge base for AI fix generation guidance.
 * Stores anti-patterns to avoid and correct patterns to use,
 * reducing reliance on growing prompt size.
 *
 * Key features:
 * - Lazy initialization (only connect when needed)
 * - In-memory caching for performance
 * - Graceful fallback to in-memory only when Supabase unavailable
 * - Guidance lookup before AI generation
 * - Success rate tracking for pattern refinement
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface AntiPattern {
  pattern: string;      // Description of the anti-pattern
  why: string;          // Why it's bad
}

export interface CorrectPattern {
  pattern: string;      // Description of the correct pattern
  example: string;      // Code example
}

export interface FixGuidance {
  ruleId: string;
  language: string;
  tool: string;
  antiPatterns: AntiPattern[];
  correctPatterns: CorrectPattern[];
  relatedRules: string[];
  guidanceText: string;
  promptAdditions: string;
  successRate: number;
  usageCount: number;
}

interface SupabaseGuidanceRow {
  id: string;
  rule_id: string;
  language: string;
  tool: string;
  anti_patterns: AntiPattern[];
  correct_patterns: CorrectPattern[];
  related_rules: string[];
  guidance_text: string | null;
  prompt_additions: string | null;
  success_rate: number;
  usage_count: number;
  last_failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Constants
// ============================================================================

const TABLE_NAME = 'fix_pattern_guidance';

// In-memory fallback guidance for common patterns
// Used when Supabase is unavailable or table doesn't exist yet
const FALLBACK_GUIDANCE: Map<string, FixGuidance> = new Map([
  ['CloseResource:java:any', {
    ruleId: 'CloseResource',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'empty catch block', why: 'Swallows exceptions, hides bugs and resource leaks' },
      { pattern: 'catch (Throwable)', why: 'Catches Errors that should crash the JVM' },
      { pattern: 'manual close() calls', why: 'Error-prone, may not run if exception thrown earlier' }
    ],
    correctPatterns: [
      { pattern: 'try-with-resources', example: 'try (var stream = new FileInputStream(file)) { ... }' },
      { pattern: 'log and rethrow', example: 'catch(IOException e) { log.error("Failed", e); throw new RuntimeException(e); }' }
    ],
    relatedRules: ['EmptyCatchBlock', 'AvoidCatchingThrowable'],
    guidanceText: 'When fixing CloseResource, ALWAYS use try-with-resources. This ensures automatic cleanup even if exceptions occur.',
    promptAdditions: `CRITICAL for CloseResource:
- MUST use try-with-resources (try (var x = new Resource()) { })
- NEVER generate empty catch blocks - log and rethrow or handle specifically
- NEVER catch Throwable - catch specific exceptions like IOException`,
    successRate: 0,
    usageCount: 0
  }],
  ['EmptyCatchBlock:java:any', {
    ruleId: 'EmptyCatchBlock',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'empty catch block', why: 'Silently swallows exceptions, making debugging impossible' },
      { pattern: 'catch with only comment', why: 'Still swallows the exception' }
    ],
    correctPatterns: [
      { pattern: 'log and rethrow', example: 'catch(IOException e) { log.error("Failed to read file", e); throw new RuntimeException(e); }' },
      { pattern: 'handle with fallback', example: 'catch(IOException e) { log.warn("Using default", e); return defaultValue; }' }
    ],
    relatedRules: ['CloseResource', 'AvoidCatchingGenericException'],
    guidanceText: 'Empty catch blocks hide bugs. Always log the exception and either rethrow or handle with a fallback.',
    promptAdditions: `CRITICAL for EmptyCatchBlock:
- ALWAYS log the exception with log.error() or log.warn()
- Either rethrow as RuntimeException OR provide meaningful fallback
- Include exception in log: log.error("message", exception)`,
    successRate: 0,
    usageCount: 0
  }],
  ['AvoidCatchingThrowable:java:any', {
    ruleId: 'AvoidCatchingThrowable',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'catch (Throwable)', why: 'Catches Error types like OutOfMemoryError that should crash the JVM' },
      { pattern: 'catch (Exception)', why: 'Too broad, catches unchecked exceptions unexpectedly' }
    ],
    correctPatterns: [
      { pattern: 'catch specific exceptions', example: 'catch(IOException | SQLException e) { ... }' },
      { pattern: 'multi-catch for related', example: 'try { ... } catch(FileNotFoundException e) { ... } catch(IOException e) { ... }' }
    ],
    relatedRules: ['EmptyCatchBlock', 'CloseResource'],
    guidanceText: 'Catch specific exception types. Throwable includes Error types that should not be caught.',
    promptAdditions: `CRITICAL for AvoidCatchingThrowable:
- NEVER catch Throwable or Exception unless absolutely necessary
- Catch specific exceptions: IOException, SQLException, etc.
- Use multi-catch for related: catch(IOException | SQLException e)`,
    successRate: 0,
    usageCount: 0
  }],
  ['UseUtilityClass:java:any', {
    ruleId: 'UseUtilityClass',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'public default constructor', why: 'Allows instantiation of utility class' },
      { pattern: 'no constructor', why: 'Java adds default public constructor' }
    ],
    correctPatterns: [
      { pattern: 'private constructor', example: 'private ClassName() { throw new UnsupportedOperationException("Utility class"); }' },
      { pattern: 'final class', example: 'public final class Utils { private Utils() {} ... }' }
    ],
    relatedRules: [],
    guidanceText: 'Utility classes should have private constructor and be final.',
    promptAdditions: `CRITICAL for UseUtilityClass:
- Add private constructor that throws UnsupportedOperationException
- Make the class final to prevent extension
- All methods should be static`,
    successRate: 0,
    usageCount: 0
  }],
  // SESSION 84: New patterns based on cloud test results
  ['UnnecessarySemicolon:java:any', {
    ruleId: 'UnnecessarySemicolon',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'semicolon after class body', why: 'Unnecessary, adds visual clutter' },
      { pattern: 'double semicolon', why: 'Redundant, likely copy-paste error' }
    ],
    correctPatterns: [
      { pattern: 'remove unnecessary semicolon', example: 'class Foo { } // No semicolon after closing brace' },
      { pattern: 'keep only required semicolons', example: 'statement; // Only at end of statements' }
    ],
    relatedRules: [],
    guidanceText: 'Remove unnecessary semicolons after class/interface/enum bodies.',
    promptAdditions: `CRITICAL for UnnecessarySemicolon:
- Remove semicolons after closing braces of class/interface/enum bodies
- Keep semicolons only at end of statements
- Do NOT remove semicolons from for-loop structure`,
    successRate: 0,
    usageCount: 0
  }],
  ['UseLocaleWithCaseConversions:java:any', {
    ruleId: 'UseLocaleWithCaseConversions',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'toLowerCase() without locale', why: 'Uses default locale, may produce wrong results in Turkish/other locales' },
      { pattern: 'toUpperCase() without locale', why: 'Same locale-sensitivity issue' }
    ],
    correctPatterns: [
      { pattern: 'explicit Locale.ROOT', example: 'str.toLowerCase(Locale.ROOT)' },
      { pattern: 'explicit Locale.ENGLISH', example: 'str.toUpperCase(Locale.ENGLISH)' }
    ],
    relatedRules: [],
    guidanceText: 'Always specify Locale for case conversions to ensure consistent behavior.',
    promptAdditions: `CRITICAL for UseLocaleWithCaseConversions:
- Use Locale.ROOT for machine-readable strings (IDs, keys, constants)
- Use Locale.ENGLISH for user-facing English text
- Use Locale.getDefault() only when locale-sensitive behavior is intended
- Import java.util.Locale if not already imported`,
    successRate: 0,
    usageCount: 0
  }],
  ['DoubleBraceInitialization:java:any', {
    ruleId: 'DoubleBraceInitialization',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'new HashMap<>() {{ put(...); }}', why: 'Creates anonymous class, memory leak potential, serialization issues' },
      { pattern: 'new ArrayList<>() {{ add(...); }}', why: 'Same issues - anonymous inner class' }
    ],
    correctPatterns: [
      { pattern: 'Map.of()', example: 'Map.of("key1", "value1", "key2", "value2")' },
      { pattern: 'List.of()', example: 'List.of("a", "b", "c")' },
      { pattern: 'static initialization block', example: 'static { map.put("key", "value"); }' }
    ],
    relatedRules: [],
    guidanceText: 'Use factory methods (Map.of, List.of, Set.of) instead of double brace initialization.',
    promptAdditions: `CRITICAL for DoubleBraceInitialization:
- Replace new HashMap<>() {{ ... }} with Map.of() or Map.ofEntries()
- Replace new ArrayList<>() {{ ... }} with List.of() or new ArrayList<>(List.of(...))
- For mutable collections: new HashMap<>(Map.of(...))
- Use Arrays.asList() for mutable list from array`,
    successRate: 0,
    usageCount: 0
  }],
  ['LooseCoupling:java:any', {
    ruleId: 'LooseCoupling',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'ArrayList as return/param type', why: 'Ties to implementation, prevents using other List types' },
      { pattern: 'HashMap as field type', why: 'Same coupling issue' }
    ],
    correctPatterns: [
      { pattern: 'List interface', example: 'public List<String> getItems()' },
      { pattern: 'Map interface', example: 'private Map<String, Object> cache;' },
      { pattern: 'Set interface', example: 'public Set<User> findUsers()' }
    ],
    relatedRules: [],
    guidanceText: 'Use interface types (List, Map, Set) instead of concrete implementations.',
    promptAdditions: `CRITICAL for LooseCoupling:
- Change ArrayList to List in method signatures
- Change HashMap to Map in field/parameter types
- Change HashSet to Set
- Keep concrete type only in new expression: List<String> list = new ArrayList<>();`,
    successRate: 0,
    usageCount: 0
  }],
  ['MissingOverride:java:any', {
    ruleId: 'MissingOverride',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'overriding method without @Override', why: 'Compiler cannot catch signature mismatches' }
    ],
    correctPatterns: [
      { pattern: '@Override annotation', example: '@Override\\npublic String toString() { ... }' },
      { pattern: '@Override on interface methods', example: '@Override\\npublic void onClick(View v) { ... }' }
    ],
    relatedRules: [],
    guidanceText: 'Add @Override annotation to all methods that override superclass or implement interface methods.',
    promptAdditions: `CRITICAL for MissingOverride:
- Add @Override annotation on line BEFORE method declaration
- Apply to ALL methods overriding parent class methods
- Apply to ALL methods implementing interface methods
- Import not needed - @Override is in java.lang`,
    successRate: 0,
    usageCount: 0
  }],
  ['UnusedPrivateMethod:java:any', {
    ruleId: 'UnusedPrivateMethod',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'commenting out the method', why: 'Dead code should be removed' },
      { pattern: 'making method public', why: 'Does not fix the issue, method is still unused' }
    ],
    correctPatterns: [
      { pattern: 'delete unused method', example: '// Remove the entire method' },
      { pattern: 'call the method if needed', example: 'this.unusedMethod(); // If actually needed' }
    ],
    relatedRules: ['UnusedLocalVariable', 'UnusedPrivateField'],
    guidanceText: 'Remove unused private methods to reduce code complexity and maintenance burden.',
    promptAdditions: `CRITICAL for UnusedPrivateMethod:
- PREFERRED: Delete the entire method (not just comment it out)
- Verify no reflection-based usage before deleting
- If method IS needed, add a call to it
- If deleting breaks something, the test will catch it`,
    successRate: 0,
    usageCount: 0
  }],
  // SESSION 94: Patterns extracted from successful AI fixes without KB guidance
  ['FieldDeclarationsShouldBeAtStartOfClass:java:any', {
    ruleId: 'FieldDeclarationsShouldBeAtStartOfClass',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'field declarations scattered throughout class', why: 'Reduces readability, violates convention that fields are declared at top' },
      { pattern: 'constants declared after methods', why: 'Hard to find class constants when not grouped at top' }
    ],
    correctPatterns: [
      { pattern: 'all fields at top of class', example: 'public class Foo {\n    private static final int CONSTANT = 1;\n    private String field1;\n    private int field2;\n\n    public void method() { ... }\n}' }
    ],
    relatedRules: [],
    guidanceText: 'Move all field declarations to the start of the class, before any methods. Group static final constants first, then instance fields.',
    promptAdditions: `CRITICAL for FieldDeclarationsShouldBeAtStartOfClass:
- Move ALL field declarations to the top of the class body
- Order: static final constants, static fields, instance fields
- Place fields BEFORE any methods
- Keep field order consistent (public, protected, package, private)`,
    successRate: 80,
    usageCount: 1
  }],
  ['CommentDefaultAccessModifier:java:any', {
    ruleId: 'CommentDefaultAccessModifier',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'package-private members without comment', why: 'Ambiguous intent - unclear if default access was intentional or oversight' }
    ],
    correctPatterns: [
      { pattern: '/* package */ comment before package-private members', example: '/* package */ String internalValue;' },
      { pattern: '// intentionally package-private comment', example: '// intentionally package-private\nString sharedField;' }
    ],
    relatedRules: [],
    guidanceText: 'Add /* package */ comment before members with default (package-private) access to indicate the access level is intentional.',
    promptAdditions: `CRITICAL for CommentDefaultAccessModifier:
- Add /* package */ BEFORE the type declaration
- Format: /* package */ TypeName memberName;
- Apply to fields, methods, and nested classes with default access
- DO NOT change the access modifier, just add the comment`,
    successRate: 80,
    usageCount: 1
  }],
  ['CallSuperInConstructor:java:any', {
    ruleId: 'CallSuperInConstructor',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'constructor without explicit super() call', why: 'While Java adds implicit super(), explicit call improves clarity' },
      { pattern: 'exception constructor not passing message to parent', why: 'Loses exception message chain' }
    ],
    correctPatterns: [
      { pattern: 'explicit super() as first statement', example: 'public MyException(String message) {\n    super(message);\n    this.details = message;\n}' },
      { pattern: 'super with appropriate arguments', example: 'public MyClass(int value) {\n    super(value);\n}' }
    ],
    relatedRules: [],
    guidanceText: 'Add explicit super() or super(args) as the first statement in constructors. For exceptions, pass the message to the parent constructor.',
    promptAdditions: `CRITICAL for CallSuperInConstructor:
- Add super() or super(message) as FIRST statement in constructor
- For Exception subclasses, pass message to parent: super(message)
- If parent has only parameterized constructors, use appropriate super(args)
- super() must be the FIRST statement, before any other code`,
    successRate: 80,
    usageCount: 1
  }],
  ['ShortVariable:java:any', {
    ruleId: 'ShortVariable',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'single-letter variable names (i, j, k outside loops)', why: 'Unclear purpose, poor readability' },
      { pattern: 'cryptic abbreviations (idx, pos, buf)', why: 'Requires mental translation' }
    ],
    correctPatterns: [
      { pattern: 'descriptive names based on purpose', example: 'int extensionIndex = filename.lastIndexOf(\'.\');' },
      { pattern: 'i, j, k acceptable only in simple for loops', example: 'for (int i = 0; i < items.length; i++) { ... }' }
    ],
    relatedRules: ['LongVariable', 'LinguisticNaming'],
    guidanceText: 'Rename short variables to descriptive names that explain their purpose. Exception: loop counters i, j, k in simple for loops.',
    promptAdditions: `CRITICAL for ShortVariable:
- Rename to describe PURPOSE not type (extensionIndex not intIndex)
- Common patterns:
  - 'i' for index → 'extensionIndex', 'startIndex', 'itemIndex'
  - 'f' for file → 'sourceFile', 'tempFile'
  - 'n' for count → 'itemCount', 'retryCount'
- Keep loop counters (i, j, k) in simple for loops
- Min 3 characters for variable names`,
    successRate: 90,
    usageCount: 1
  }],
  ['UnnecessaryConstructor:java:any', {
    ruleId: 'UnnecessaryConstructor',
    language: 'java',
    tool: 'any',
    antiPatterns: [
      { pattern: 'empty default constructor', why: 'Redundant - Java provides implicit default constructor' },
      { pattern: 'constructor that only calls super()', why: 'Redundant - implicit super() is called automatically' }
    ],
    correctPatterns: [
      { pattern: 'remove empty constructor entirely', example: 'public class MyClass {\n    private String field;\n\n    public void doSomething() { ... }\n}' },
      { pattern: 'keep constructor if it has documentation', example: '/** Creates a new instance with default settings. */\npublic MyClass() {\n    // Default constructor required for serialization\n}' }
    ],
    relatedRules: ['UseUtilityClass'],
    guidanceText: 'Remove empty default constructors as Java provides them implicitly. Keep only if there\'s documentation explaining why it\'s explicit.',
    promptAdditions: `CRITICAL for UnnecessaryConstructor:
- DELETE the empty constructor entirely, don't comment it out
- Exception: Keep if it has meaningful Javadoc
- Exception: Keep if required for framework (Spring, serialization)
- After removal, ensure no other code depends on explicit constructor`,
    successRate: 80,
    usageCount: 1
  }]
]);

// ============================================================================
// Service Class
// ============================================================================

export class FixPatternGuidanceService {
  private static instance: FixPatternGuidanceService | null = null;
  private supabase: SupabaseClient | null = null;
  private initialized = false;
  private cache: Map<string, FixGuidance> = new Map();
  private failureCache: Map<string, number> = new Map(); // SESSION 81: In-memory failure tracking
  private supabaseAvailable = false;

  private constructor() {
    // Initialize cache with fallback guidance
    FALLBACK_GUIDANCE.forEach((guidance, key) => {
      this.cache.set(key, guidance);
    });
  }

  static getInstance(): FixPatternGuidanceService {
    if (!FixPatternGuidanceService.instance) {
      FixPatternGuidanceService.instance = new FixPatternGuidanceService();
    }
    return FixPatternGuidanceService.instance;
  }

  /**
   * Lazily initialize Supabase connection
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('[FixGuidance] Supabase not configured, using in-memory fallback');
      this.initialized = true;
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);

      // Test if table exists by querying it
      const { error } = await this.supabase
        .from(TABLE_NAME)
        .select('id')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log('[FixGuidance] Table does not exist yet, using in-memory fallback');
        } else {
          console.log('[FixGuidance] Supabase query error:', error.message);
        }
        this.supabaseAvailable = false;
      } else {
        console.log('[FixGuidance] Supabase connected successfully');
        this.supabaseAvailable = true;
        // Load all guidance into cache
        await this.loadAllGuidance();
      }
    } catch (e: any) {
      console.log('[FixGuidance] Failed to connect to Supabase:', e.message);
      this.supabaseAvailable = false;
    }

    this.initialized = true;
  }

  /**
   * Load all guidance from Supabase into cache
   */
  private async loadAllGuidance(): Promise<void> {
    if (!this.supabase || !this.supabaseAvailable) return;

    try {
      const { data, error } = await this.supabase
        .from(TABLE_NAME)
        .select('*');

      if (error) {
        console.log('[FixGuidance] Failed to load guidance:', error.message);
        return;
      }

      for (const row of (data || []) as SupabaseGuidanceRow[]) {
        const key = `${row.rule_id}:${row.language}:${row.tool}`;
        this.cache.set(key, this.rowToGuidance(row));
      }

      console.log(`[FixGuidance] Loaded ${data?.length || 0} guidance entries`);
    } catch (e: any) {
      console.log('[FixGuidance] Error loading guidance:', e.message);
    }
  }

  /**
   * Convert Supabase row to FixGuidance
   */
  private rowToGuidance(row: SupabaseGuidanceRow): FixGuidance {
    return {
      ruleId: row.rule_id,
      language: row.language,
      tool: row.tool,
      antiPatterns: row.anti_patterns || [],
      correctPatterns: row.correct_patterns || [],
      relatedRules: row.related_rules || [],
      guidanceText: row.guidance_text || '',
      promptAdditions: row.prompt_additions || '',
      successRate: row.success_rate || 0,
      usageCount: row.usage_count || 0
    };
  }

  /**
   * Get guidance for a specific rule
   *
   * Lookup order:
   * 1. rule_id + language + tool (exact match)
   * 2. rule_id + language + 'any' (tool-agnostic)
   * 3. rule_id + 'any' + 'any' (fully generic)
   */
  async getGuidance(ruleId: string, language: string, tool = 'any'): Promise<FixGuidance | null> {
    await this.ensureInitialized();

    // Normalize inputs
    const normalizedRule = ruleId.replace(/[^a-zA-Z]/g, '');
    const normalizedLang = language.toLowerCase();
    const normalizedTool = tool.toLowerCase();

    // Try exact match first
    const exactKey = `${normalizedRule}:${normalizedLang}:${normalizedTool}`;
    if (this.cache.has(exactKey)) {
      return this.cache.get(exactKey)!;
    }

    // Try tool-agnostic
    const langKey = `${normalizedRule}:${normalizedLang}:any`;
    if (this.cache.has(langKey)) {
      return this.cache.get(langKey)!;
    }

    // Try fully generic
    const genericKey = `${normalizedRule}:any:any`;
    if (this.cache.has(genericKey)) {
      return this.cache.get(genericKey)!;
    }

    // Try case-insensitive search in cache
    for (const [key, guidance] of this.cache) {
      if (key.toLowerCase().startsWith(normalizedRule.toLowerCase() + ':')) {
        return guidance;
      }
    }

    return null;
  }

  /**
   * Add or update guidance
   */
  async addGuidance(guidance: FixGuidance): Promise<void> {
    await this.ensureInitialized();

    const key = `${guidance.ruleId}:${guidance.language}:${guidance.tool}`;
    this.cache.set(key, guidance);

    if (!this.supabase || !this.supabaseAvailable) {
      console.log('[FixGuidance] Saved to cache only (Supabase unavailable)');
      return;
    }

    try {
      const { error } = await this.supabase
        .from(TABLE_NAME)
        .upsert({
          rule_id: guidance.ruleId,
          language: guidance.language,
          tool: guidance.tool,
          anti_patterns: guidance.antiPatterns,
          correct_patterns: guidance.correctPatterns,
          related_rules: guidance.relatedRules,
          guidance_text: guidance.guidanceText,
          prompt_additions: guidance.promptAdditions,
          success_rate: guidance.successRate,
          usage_count: guidance.usageCount
        }, {
          onConflict: 'rule_id,language,tool'
        });

      if (error) {
        console.log('[FixGuidance] Failed to save guidance:', error.message);
      } else {
        console.log(`[FixGuidance] Saved guidance for ${key}`);
      }
    } catch (e: any) {
      console.log('[FixGuidance] Error saving guidance:', e.message);
    }
  }

  /**
   * Record a fix attempt result for success rate tracking
   */
  async recordFixAttempt(ruleId: string, language: string, tool: string, success: boolean, failureReason?: string): Promise<void> {
    await this.ensureInitialized();

    const key = `${ruleId}:${language}:${tool}`;
    const guidance = this.cache.get(key);

    if (!guidance) return;

    // Update local cache
    guidance.usageCount++;
    if (success) {
      const totalSuccesses = Math.round(guidance.successRate * (guidance.usageCount - 1) / 100) + 1;
      guidance.successRate = (totalSuccesses / guidance.usageCount) * 100;
    } else {
      const totalSuccesses = Math.round(guidance.successRate * (guidance.usageCount - 1) / 100);
      guidance.successRate = (totalSuccesses / guidance.usageCount) * 100;
    }

    if (!this.supabase || !this.supabaseAvailable) return;

    try {
      const updateData: Record<string, unknown> = {
        usage_count: guidance.usageCount,
        success_rate: guidance.successRate
      };

      if (!success && failureReason) {
        updateData.last_failure_reason = failureReason;
      }

      await this.supabase
        .from(TABLE_NAME)
        .update(updateData)
        .eq('rule_id', ruleId)
        .eq('language', language)
        .eq('tool', tool);
    } catch (e: any) {
      console.log('[FixGuidance] Error recording fix attempt:', e.message);
    }
  }

  /**
   * Get prompt additions for a rule (for injection into AI prompts)
   */
  async getPromptAdditions(ruleId: string, language: string, tool = 'any'): Promise<string | null> {
    const guidance = await this.getGuidance(ruleId, language, tool);
    return guidance?.promptAdditions || null;
  }

  /**
   * Get all related rules that might conflict
   */
  async getRelatedRules(ruleId: string, language: string): Promise<string[]> {
    const guidance = await this.getGuidance(ruleId, language);
    return guidance?.relatedRules || [];
  }

  /**
   * Format guidance for inclusion in AI prompt
   */
  async formatForPrompt(ruleId: string, language: string, tool = 'any'): Promise<string> {
    const guidance = await this.getGuidance(ruleId, language, tool);
    if (!guidance) return '';

    let prompt = '';

    if (guidance.promptAdditions) {
      prompt += `\n${guidance.promptAdditions}\n`;
    }

    if (guidance.antiPatterns.length > 0) {
      prompt += '\nAVOID these anti-patterns:\n';
      for (const anti of guidance.antiPatterns) {
        prompt += `- ${anti.pattern}: ${anti.why}\n`;
      }
    }

    if (guidance.correctPatterns.length > 0) {
      prompt += '\nUSE these correct patterns:\n';
      for (const correct of guidance.correctPatterns) {
        prompt += `- ${correct.pattern}\n  Example: ${correct.example}\n`;
      }
    }

    if (guidance.relatedRules.length > 0) {
      prompt += `\nWATCH OUT for these related rules that may trigger: ${guidance.relatedRules.join(', ')}\n`;
    }

    return prompt;
  }

  // ==========================================================================
  // SESSION 81: Failure Tracking for Learning Loop
  // ==========================================================================

  /**
   * Record a fix failure for the learning loop.
   * Tracks patterns that fail repeatedly so they can be reviewed and
   * converted into knowledge base entries.
   */
  async trackFixFailure(params: {
    ruleId: string;
    language: string;
    tool: string;
    failureType: 'regression' | 'validation_error' | 'parse_error';
    regressionRules?: string[];
    failureMessage?: string;
    originalCode?: string;
    attemptedFix?: string;
    codeContext?: string;
  }): Promise<{ isNew: boolean; failureCount: number }> {
    await this.ensureInitialized();

    // Always track in memory for session-level stats
    const key = `${params.ruleId}:${params.language}:${params.tool}:${params.failureType}`;
    const existingCount = this.failureCache.get(key) || 0;
    this.failureCache.set(key, existingCount + 1);

    if (!this.supabase || !this.supabaseAvailable) {
      console.log(`[FixGuidance] Tracked failure locally: ${key} (count: ${existingCount + 1})`);
      return { isNew: existingCount === 0, failureCount: existingCount + 1 };
    }

    try {
      // Check if this pattern already exists
      const { data: existing } = await this.supabase
        .from(FAILURE_TABLE_NAME)
        .select('id, failure_count')
        .eq('rule_id', params.ruleId)
        .eq('language', params.language)
        .eq('tool', params.tool)
        .eq('failure_type', params.failureType)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await this.supabase
          .from(FAILURE_TABLE_NAME)
          .update({
            failure_count: existing.failure_count + 1,
            regression_rules: params.regressionRules || [],
            failure_message: params.failureMessage,
            // Keep original code from first failure, update with latest attempted fix
            attempted_fix: params.attemptedFix
          })
          .eq('id', existing.id);

        if (error) {
          console.log(`[FixGuidance] Failed to update failure tracking: ${error.message}`);
        } else {
          const newCount = existing.failure_count + 1;
          if (newCount === 3) {
            console.log(`[FixGuidance] ⚠️ Pattern ${params.ruleId} has failed 3+ times - flagged for review`);
          }
        }
        return { isNew: false, failureCount: existing.failure_count + 1 };
      } else {
        // Insert new record
        const { error } = await this.supabase
          .from(FAILURE_TABLE_NAME)
          .insert({
            rule_id: params.ruleId,
            language: params.language,
            tool: params.tool,
            failure_type: params.failureType,
            regression_rules: params.regressionRules || [],
            failure_message: params.failureMessage,
            original_code: params.originalCode,
            attempted_fix: params.attemptedFix,
            code_context: params.codeContext,
            failure_count: 1,
            review_status: 'pending'
          });

        if (error) {
          console.log(`[FixGuidance] Failed to insert failure tracking: ${error.message}`);
        }
        return { isNew: true, failureCount: 1 };
      }
    } catch (e: any) {
      console.log(`[FixGuidance] Error tracking failure: ${e.message}`);
      return { isNew: existingCount === 0, failureCount: existingCount + 1 };
    }
  }

  /**
   * Get failures needing review (failed 3+ times)
   */
  async getFailuresNeedingReview(limit = 20): Promise<FailureRecord[]> {
    await this.ensureInitialized();

    if (!this.supabase || !this.supabaseAvailable) {
      console.log('[FixGuidance] Supabase not available for failure review');
      return [];
    }

    try {
      const { data, error } = await this.supabase
        .from(FAILURE_TABLE_NAME)
        .select('*')
        .eq('review_status', 'pending')
        .gte('failure_count', 3)
        .order('failure_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.log(`[FixGuidance] Failed to get failures: ${error.message}`);
        return [];
      }

      return (data || []).map(row => ({
        id: row.id,
        ruleId: row.rule_id,
        language: row.language,
        tool: row.tool,
        failureType: row.failure_type,
        regressionRules: row.regression_rules || [],
        failureMessage: row.failure_message,
        originalCode: row.original_code,
        attemptedFix: row.attempted_fix,
        codeContext: row.code_context,
        failureCount: row.failure_count,
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
        reviewStatus: row.review_status,
        priority: row.failure_count >= 10 ? 'critical' : row.failure_count >= 5 ? 'high' : 'medium'
      }));
    } catch (e: any) {
      console.log(`[FixGuidance] Error getting failures: ${e.message}`);
      return [];
    }
  }

  /**
   * Mark a failure as reviewed
   */
  async markFailureReviewed(
    failureId: string,
    status: 'reviewed' | 'guidance_added' | 'ignored',
    reviewedBy: string,
    notes?: string,
    guidanceId?: string
  ): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.supabase || !this.supabaseAvailable) {
      console.log('[FixGuidance] Supabase not available for marking review');
      return false;
    }

    try {
      const { error } = await this.supabase
        .from(FAILURE_TABLE_NAME)
        .update({
          review_status: status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          guidance_id: guidanceId
        })
        .eq('id', failureId);

      if (error) {
        console.log(`[FixGuidance] Failed to mark failure reviewed: ${error.message}`);
        return false;
      }

      console.log(`[FixGuidance] Marked failure ${failureId} as ${status}`);
      return true;
    } catch (e: any) {
      console.log(`[FixGuidance] Error marking failure reviewed: ${e.message}`);
      return false;
    }
  }

  /**
   * Generate suggested guidance from a failure pattern
   * This creates a draft that can be reviewed and edited before adding to KB
   */
  generateGuidanceFromFailure(failure: FailureRecord): Partial<FixGuidance> {
    const antiPatterns: AntiPattern[] = [];
    const relatedRules: string[] = [...(failure.regressionRules || [])];

    // Generate anti-patterns from regression rules
    for (const rule of failure.regressionRules || []) {
      const ruleLower = rule.toLowerCase();

      if (ruleLower.includes('emptycatch')) {
        antiPatterns.push({
          pattern: 'empty catch block',
          why: 'Swallows exceptions silently, making debugging impossible'
        });
      } else if (ruleLower.includes('throwable')) {
        antiPatterns.push({
          pattern: 'catching Throwable or Exception',
          why: 'Too broad - catches errors that should crash the JVM'
        });
      } else {
        antiPatterns.push({
          pattern: `pattern that triggers ${rule}`,
          why: `Causes ${rule} violation - review and refine this description`
        });
      }
    }

    return {
      ruleId: failure.ruleId,
      language: failure.language,
      tool: failure.tool,
      antiPatterns,
      correctPatterns: [], // Human needs to fill these in
      relatedRules,
      guidanceText: `[DRAFT] When fixing ${failure.ruleId}, avoid patterns that trigger: ${relatedRules.join(', ')}`,
      promptAdditions: `CRITICAL for ${failure.ruleId}:\n- AVOID: ${antiPatterns.map(a => a.pattern).join(', ')}\n- [Add correct patterns here]`,
      successRate: 0,
      usageCount: 0
    };
  }
}

// ============================================================================
// Types for Failure Tracking
// ============================================================================

export interface FailureRecord {
  id: string;
  ruleId: string;
  language: string;
  tool: string;
  failureType: 'regression' | 'validation_error' | 'parse_error';
  regressionRules: string[];
  failureMessage?: string;
  originalCode?: string;
  attemptedFix?: string;
  codeContext?: string;
  failureCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  reviewStatus: 'pending' | 'reviewed' | 'guidance_added' | 'ignored';
  priority: 'critical' | 'high' | 'medium';
}

// ============================================================================
// Constants
// ============================================================================

const FAILURE_TABLE_NAME = 'fix_failure_tracking';

// Singleton export
export const fixPatternGuidance = FixPatternGuidanceService.getInstance();

// Convenience functions
export async function getFixGuidance(ruleId: string, language: string, tool?: string): Promise<FixGuidance | null> {
  return fixPatternGuidance.getGuidance(ruleId, language, tool);
}

export async function addFixGuidance(guidance: FixGuidance): Promise<void> {
  return fixPatternGuidance.addGuidance(guidance);
}

export async function getPromptAdditions(ruleId: string, language: string, tool?: string): Promise<string | null> {
  return fixPatternGuidance.getPromptAdditions(ruleId, language, tool);
}

export async function formatGuidanceForPrompt(ruleId: string, language: string, tool?: string): Promise<string> {
  return fixPatternGuidance.formatForPrompt(ruleId, language, tool);
}

// SESSION 81: Failure tracking convenience functions
export async function trackFixFailure(params: Parameters<typeof fixPatternGuidance.trackFixFailure>[0]) {
  return fixPatternGuidance.trackFixFailure(params);
}

export async function getFailuresNeedingReview(limit?: number): Promise<FailureRecord[]> {
  return fixPatternGuidance.getFailuresNeedingReview(limit);
}

export async function markFailureReviewed(
  failureId: string,
  status: 'reviewed' | 'guidance_added' | 'ignored',
  reviewedBy: string,
  notes?: string,
  guidanceId?: string
): Promise<boolean> {
  return fixPatternGuidance.markFailureReviewed(failureId, status, reviewedBy, notes, guidanceId);
}

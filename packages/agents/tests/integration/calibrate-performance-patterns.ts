/**
 * Calibrate Performance Patterns for Supabase
 *
 * Generates AI-based fix patterns for common performance issues
 * and stores them in the fix_patterns table.
 *
 * Performance patterns are language-specific but many concepts are universal:
 * - String concatenation in loops → Use StringBuilder/strings.Builder/join()
 * - Unclosed resources → Use try-with-resources/context managers/defer
 * - Object creation in loops → Move outside or use pooling
 * - No preallocation → Preallocate with known capacity
 */

import { v4 as uuidv4 } from 'uuid';
import { SupabasePatternStore } from '../../src/fix-agent/fix-pattern-registry/supabase-pattern-store';
import { FixPattern } from '../../src/fix-agent/fix-pattern-registry/types';

// Performance patterns with known fixes
const PERFORMANCE_PATTERNS: Array<{
  tool: string;
  rule: string;
  language: string;
  title: string;
  description: string;
  exampleBefore: string;
  exampleAfter: string;
  fixStrategy: string;
  fileTypes: string[];
}> = [
  // ============================================================
  // PYTHON PERFORMANCE PATTERNS
  // ============================================================
  {
    tool: 'ruff',
    rule: 'PERF401',
    language: 'python',
    title: 'Use list comprehension instead of for loop with append',
    description: 'List comprehensions are more efficient than for loops with append',
    exampleBefore: `result = []
for item in items:
    result.append(item.upper())`,
    exampleAfter: `result = [item.upper() for item in items]`,
    fixStrategy: 'Convert for loop with append to list comprehension',
    fileTypes: ['.py']
  },
  {
    tool: 'ruff',
    rule: 'PERF403',
    language: 'python',
    title: 'Use dict comprehension instead of for loop',
    description: 'Dict comprehensions are more efficient than for loops building dicts',
    exampleBefore: `result = {}
for key, value in items:
    result[key] = value`,
    exampleAfter: `result = {key: value for key, value in items}`,
    fixStrategy: 'Convert for loop to dict comprehension',
    fileTypes: ['.py']
  },
  {
    tool: 'memory-pattern',
    rule: 'mutable-default-argument',
    language: 'python',
    title: 'Avoid mutable default arguments',
    description: 'Mutable default arguments are shared across all calls, causing unexpected behavior',
    exampleBefore: `def add_item(items=[]):
    items.append("new")
    return items`,
    exampleAfter: `def add_item(items=None):
    if items is None:
        items = []
    items.append("new")
    return items`,
    fixStrategy: 'Use None as default and create new list inside function',
    fileTypes: ['.py']
  },
  {
    tool: 'memory-pattern',
    rule: 'unclosed-resource',
    language: 'python',
    title: 'Use context manager for resources',
    description: 'Resources should be opened with context managers to ensure proper cleanup',
    exampleBefore: `f = open("file.txt", "r")
content = f.read()
# f.close() might not be called on exception`,
    exampleAfter: `with open("file.txt", "r") as f:
    content = f.read()
# Automatically closed`,
    fixStrategy: 'Wrap resource in with statement (context manager)',
    fileTypes: ['.py']
  },
  {
    tool: 'memory-pattern',
    rule: 'string-concat-in-loop-python',
    language: 'python',
    title: 'Use join() for string concatenation in loops',
    description: 'String concatenation creates new objects; use join() for efficiency',
    exampleBefore: `result = ""
for s in strings:
    result += s`,
    exampleAfter: `result = "".join(strings)`,
    fixStrategy: 'Collect strings in list and use join()',
    fileTypes: ['.py']
  },

  // ============================================================
  // JAVA PERFORMANCE PATTERNS
  // ============================================================
  {
    tool: 'pmd',
    rule: 'UseStringBufferForStringAppends',
    language: 'java',
    title: 'Use StringBuilder for string concatenation in loops',
    description: 'String concatenation in loops creates many intermediate objects',
    exampleBefore: `String result = "";
for (String s : strings) {
    result += s;
}`,
    exampleAfter: `StringBuilder sb = new StringBuilder();
for (String s : strings) {
    sb.append(s);
}
String result = sb.toString();`,
    fixStrategy: 'Replace string concatenation with StringBuilder',
    fileTypes: ['.java']
  },
  {
    tool: 'pmd',
    rule: 'AvoidInstantiatingObjectsInLoops',
    language: 'java',
    title: 'Move object creation outside loops',
    description: 'Creating objects inside loops causes unnecessary GC pressure',
    exampleBefore: `for (int i = 0; i < n; i++) {
    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
    dates.add(sdf.parse(dateStrings[i]));
}`,
    exampleAfter: `SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
for (int i = 0; i < n; i++) {
    dates.add(sdf.parse(dateStrings[i]));
}`,
    fixStrategy: 'Move object instantiation before the loop',
    fileTypes: ['.java']
  },
  {
    tool: 'pmd',
    rule: 'AvoidFileStream',
    language: 'java',
    title: 'Use try-with-resources for file streams',
    description: 'FileInputStream/FileOutputStream should use try-with-resources',
    exampleBefore: `FileInputStream fis = new FileInputStream(file);
// read data
fis.close();`,
    exampleAfter: `try (FileInputStream fis = new FileInputStream(file)) {
    // read data
} // Automatically closed`,
    fixStrategy: 'Wrap in try-with-resources block',
    fileTypes: ['.java']
  },
  {
    tool: 'memory-pattern',
    rule: 'static-collection-growth',
    language: 'java',
    title: 'Use bounded cache for static collections',
    description: 'Static collections can grow unbounded causing memory leaks',
    exampleBefore: `private static List<String> cache = new ArrayList<>();

public void addToCache(String item) {
    cache.add(item);
}`,
    exampleAfter: `private static final int MAX_CACHE_SIZE = 1000;
private static List<String> cache = new ArrayList<>();

public void addToCache(String item) {
    if (cache.size() >= MAX_CACHE_SIZE) {
        cache.remove(0);
    }
    cache.add(item);
}`,
    fixStrategy: 'Add size limit to static collection or use LRU cache',
    fileTypes: ['.java']
  },

  // ============================================================
  // GO PERFORMANCE PATTERNS
  // ============================================================
  {
    tool: 'memory-pattern',
    rule: 'string-concat-in-loop-go',
    language: 'go',
    title: 'Use strings.Builder for string concatenation',
    description: 'String concatenation in loops is inefficient in Go',
    exampleBefore: `result := ""
for _, s := range strings {
    result += s
}`,
    exampleAfter: `var sb strings.Builder
for _, s := range strings {
    sb.WriteString(s)
}
result := sb.String()`,
    fixStrategy: 'Replace string concatenation with strings.Builder',
    fileTypes: ['.go']
  },
  {
    tool: 'memory-pattern',
    rule: 'no-prealloc',
    language: 'go',
    title: 'Preallocate slices with known capacity',
    description: 'Preallocating slices avoids multiple reallocations during append',
    exampleBefore: `items := make([]string, 0)
for i := 0; i < n; i++ {
    items = append(items, fmt.Sprintf("item-%d", i))
}`,
    exampleAfter: `items := make([]string, 0, n)  // Preallocate with capacity n
for i := 0; i < n; i++ {
    items = append(items, fmt.Sprintf("item-%d", i))
}`,
    fixStrategy: 'Add capacity parameter to make() call',
    fileTypes: ['.go']
  },
  {
    tool: 'memory-pattern',
    rule: 'defer-in-loop',
    language: 'go',
    title: 'Move defer outside loop or use closure',
    description: 'Deferred functions accumulate until the enclosing function returns',
    exampleBefore: `for _, path := range paths {
    f, _ := os.Open(path)
    defer f.Close()  // All closes happen at function end!
    // process file
}`,
    exampleAfter: `for _, path := range paths {
    func() {
        f, _ := os.Open(path)
        defer f.Close()  // Closes at end of anonymous function
        // process file
    }()
}`,
    fixStrategy: 'Wrap in anonymous function or close explicitly in loop',
    fileTypes: ['.go']
  },
  {
    tool: 'memory-pattern',
    rule: 'map-no-size-hint',
    language: 'go',
    title: 'Provide size hint for maps populated in loops',
    description: 'Maps without size hints may need multiple reallocations',
    exampleBefore: `m := make(map[string]int)
for i, item := range items {
    m[item] = i
}`,
    exampleAfter: `m := make(map[string]int, len(items))  // Size hint
for i, item := range items {
    m[item] = i
}`,
    fixStrategy: 'Add size parameter to make() for map',
    fileTypes: ['.go']
  },
  {
    tool: 'memory-pattern',
    rule: 'goroutine-without-context',
    language: 'go',
    title: 'Pass context to goroutines for cancellation',
    description: 'Goroutines without context cannot be cancelled, causing leaks',
    exampleBefore: `go func() {
    for {
        doWork()
    }
}()`,
    exampleAfter: `go func(ctx context.Context) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            doWork()
        }
    }
}(ctx)`,
    fixStrategy: 'Add context parameter and check for cancellation',
    fileTypes: ['.go']
  },
  {
    tool: 'memory-pattern',
    rule: 'json-in-loop',
    language: 'go',
    title: 'Use JSON encoder/decoder for streaming',
    description: 'Repeated Marshal/Unmarshal in loops is inefficient',
    exampleBefore: `for _, record := range records {
    data, _ := json.Marshal(record)
    results = append(results, string(data))
}`,
    exampleAfter: `var buf bytes.Buffer
enc := json.NewEncoder(&buf)
for _, record := range records {
    enc.Encode(record)
}`,
    fixStrategy: 'Use json.Encoder/Decoder instead of Marshal/Unmarshal',
    fileTypes: ['.go']
  }
];

/**
 * Convert a simple pattern definition to a full FixPattern object
 */
function createFixPattern(pattern: typeof PERFORMANCE_PATTERNS[0]): FixPattern {
  const now = new Date().toISOString();

  return {
    id: uuidv4(),
    ruleId: pattern.rule,
    tool: pattern.tool,
    name: pattern.title,
    description: pattern.description,
    transformationType: 'replace',
    fileTypes: pattern.fileTypes,
    detection: {
      regex: undefined,
      astPattern: undefined,
      context: {
        pathPattern: pattern.fileTypes.map(ft => `*${ft}`).join(',')
      }
    },
    fixTemplate: {
      template: pattern.exampleAfter,
      indentation: 'preserve',
      requiredVariables: [],
      defaultVariables: {}
    },
    examples: [{
      description: pattern.fixStrategy,
      before: pattern.exampleBefore,
      after: pattern.exampleAfter
    }],
    confidence: 95,  // High confidence for well-known patterns (0-100 scale)
    safeForAutoApply: true,
    status: 'active',
    metadata: {
      createdBy: 'calibration-performance',
      createdAt: now,
      applyCount: 0,
      successCount: 0,
      revertCount: 0,
      source: 'codequal_team',
      tags: ['performance', pattern.language, 'calibration']
    }
  };
}

async function calibratePerformancePatterns(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     PERFORMANCE PATTERN CALIBRATION                          ║');
  console.log('║                                                              ║');
  console.log('║  Storing performance fix patterns in Supabase                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const store = new SupabasePatternStore();

  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const patternDef of PERFORMANCE_PATTERNS) {
    try {
      // Check if pattern already exists
      const existingPattern = await store.lookupPattern(
        patternDef.rule,
        patternDef.tool,
        true  // activeOnly
      );

      if (existingPattern) {
        console.log(`⏭️  Pattern exists: [${patternDef.language}] ${patternDef.tool}/${patternDef.rule}`);
        existing++;
        continue;
      }

      // Create the full FixPattern object
      const fixPattern = createFixPattern(patternDef);

      // Store the pattern
      const saved = await store.savePattern(fixPattern);

      if (saved) {
        console.log(`✅ Created: [${patternDef.language}] ${patternDef.tool}/${patternDef.rule} - ${patternDef.title}`);
        created++;
      } else {
        console.log(`⚠️  Not saved: [${patternDef.language}] ${patternDef.tool}/${patternDef.rule} - may already exist`);
        existing++;
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed: [${patternDef.language}] ${patternDef.tool}/${patternDef.rule} - ${errorMessage}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('                    CALIBRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Created: ${created} patterns`);
  console.log(`⏭️  Existing: ${existing} patterns`);
  console.log(`❌ Failed: ${failed} patterns`);
  console.log(`📊 Total: ${PERFORMANCE_PATTERNS.length} patterns`);
  console.log('='.repeat(60));
}

// Run calibration
calibratePerformancePatterns().catch(console.error);

/**
 * Session 94: Test AI Fixer on Tier 1/2 Failures
 *
 * Tests the AI fixer's ability to fix issues that dedicated tools cannot fix.
 * Measures success rate and extracts patterns for KB improvement.
 */

import {
  getAIFixerAgent,
  AIFixerIssue,
  EnrichedIssue,
} from '../../src/fix-agent/agents/ai-fixer-agent';
import {
  getFixGuidance,
  formatGuidanceForPrompt,
  trackFixFailure,
  FailureRecord,
} from '../../src/fix-agent/fix-pattern-registry/fix-pattern-guidance';
import * as fs from 'fs';
import * as path from 'path';

// Sample failures from PMD that Sorald cannot fix
const PMD_UNFIXED_SAMPLES: AIFixerIssue[] = [
  {
    id: 'pmd-1',
    validatorToolId: 'pmd',
    ruleId: 'FieldDeclarationsShouldBeAtStartOfClass',
    file: 'org/apache/commons/io/FileUtils.java',
    line: 150,
    message: 'Field declarations should be at start of class',
    severity: 'medium',
    codeContext: `public class FileUtils {
    public static final File[] EMPTY_FILE_ARRAY = {};

    public static void copyFile(File src, File dest) {
        // ... method code
    }

    private static final int BUFFER_SIZE = 8192; // Should be at top

    public static void deleteDirectory(File dir) {
        // ... method code
    }
}`,
    language: 'java',
    originalConfidence: 30,
  },
  {
    id: 'pmd-2',
    validatorToolId: 'pmd',
    ruleId: 'CommentDefaultAccessModifier',
    file: 'org/apache/commons/io/IOUtils.java',
    line: 200,
    message: 'To be explicit about intention, add /* package */ comment',
    severity: 'low',
    codeContext: `class IOConstants {
    static final int DEFAULT_BUFFER_SIZE = 8192;
    String internalValue;  // Missing /* package */ comment
}`,
    language: 'java',
    originalConfidence: 20,
  },
  {
    id: 'pmd-3',
    validatorToolId: 'pmd',
    ruleId: 'CallSuperInConstructor',
    file: 'org/apache/commons/io/FileSystemUtils.java',
    line: 45,
    message: 'Call super() in constructor',
    severity: 'low',
    codeContext: `public class FileSystemException extends IOException {
    private final String reason;

    public FileSystemException(String message) {
        // Missing super() call
        this.reason = message;
    }
}`,
    language: 'java',
    originalConfidence: 25,
  },
  {
    id: 'pmd-4',
    validatorToolId: 'pmd',
    ruleId: 'ShortVariable',
    file: 'org/apache/commons/io/FilenameUtils.java',
    line: 300,
    message: 'Variable name is too short: i',
    severity: 'low',
    codeContext: `public static String getExtension(String filename) {
    if (filename == null) return null;
    int i = filename.lastIndexOf('.');  // 'i' is too short
    if (i == -1) return "";
    return filename.substring(i + 1);
}`,
    language: 'java',
    originalConfidence: 15,
    toolContext: {
      toolSuggestion: 'Rename variable to be more descriptive',
    },
  },
  {
    id: 'pmd-5',
    validatorToolId: 'pmd',
    ruleId: 'UnnecessaryConstructor',
    file: 'org/apache/commons/io/FileCleaningTracker.java',
    line: 50,
    message: 'Unnecessary constructor - use default',
    severity: 'low',
    codeContext: `public class FileCleaningTracker {
    private final ReferenceQueue<Object> queue;

    public FileCleaningTracker() {
        // Empty constructor
    }

    public void track(File file, Object marker) {
        // ...
    }
}`,
    language: 'java',
    originalConfidence: 20,
  },
  {
    id: 'pmd-6',
    validatorToolId: 'pmd',
    ruleId: 'UseUtilityClass',
    file: 'org/apache/commons/io/EndianUtils.java',
    line: 30,
    message: 'This class has only static methods but is missing a private constructor',
    severity: 'medium',
    codeContext: `public class EndianUtils {
    public static int swapInteger(int value) {
        return Integer.reverseBytes(value);
    }

    public static long swapLong(long value) {
        return Long.reverseBytes(value);
    }
}`,
    language: 'java',
    originalConfidence: 30,
  },
  {
    id: 'pmd-7',
    validatorToolId: 'pmd',
    ruleId: 'LooseCoupling',
    file: 'org/apache/commons/io/FileUtils.java',
    line: 100,
    message: 'Use interface type instead of implementation',
    severity: 'medium',
    codeContext: `public class FileUtils {
    public static ArrayList<File> listFiles(File dir) {
        ArrayList<File> result = new ArrayList<>();
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                result.add(f);
            }
        }
        return result;
    }
}`,
    language: 'java',
    originalConfidence: 40,
  },
  {
    id: 'pmd-8',
    validatorToolId: 'pmd',
    ruleId: 'MissingOverride',
    file: 'org/apache/commons/io/input/NullInputStream.java',
    line: 80,
    message: 'Missing @Override annotation',
    severity: 'low',
    codeContext: `public class NullInputStream extends InputStream {
    private long position = 0;

    public int read() {
        position++;
        return -1;
    }

    public long skip(long n) {
        position += n;
        return n;
    }
}`,
    language: 'java',
    originalConfidence: 25,
  },
];

// Results structure
interface AIFixerTestResult {
  issueId: string;
  ruleId: string;
  aiFixAttempted: boolean;
  validationPassed: boolean;
  confidence: number;
  hasKBGuidance: boolean;
  kbGuidanceUsed: string | null;
  fixCode: string | null;
  originalCode: string;
  regressions: string[];
  error: string | null;
  processingTimeMs: number;
}

async function testAIFixerOnSample(issue: AIFixerIssue): Promise<AIFixerTestResult> {
  const startTime = Date.now();
  const result: AIFixerTestResult = {
    issueId: issue.id,
    ruleId: issue.ruleId,
    aiFixAttempted: false,
    validationPassed: false,
    confidence: 0,
    hasKBGuidance: false,
    kbGuidanceUsed: null,
    fixCode: null,
    originalCode: issue.codeContext || '',
    regressions: [],
    error: null,
    processingTimeMs: 0,
  };

  try {
    // Check for KB guidance
    const guidance = await getFixGuidance(issue.ruleId, issue.language, issue.validatorToolId);
    if (guidance) {
      result.hasKBGuidance = true;
      result.kbGuidanceUsed = guidance.promptAdditions || guidance.guidanceText;
      console.log(`  Found KB guidance for ${issue.ruleId}`);
    }

    // Get AI fixer with auto-learning enabled (default: true)
    // Successful fixes will be automatically added to KB
    const agent = getAIFixerAgent();

    // Process the issue
    result.aiFixAttempted = true;
    const enriched = await agent.processIssue(issue);

    result.confidence = enriched.fixRecommendation.confidence;
    result.fixCode = enriched.fixRecommendation.correctedCode;

    // Check if fix looks valid (basic validation)
    if (result.fixCode && result.fixCode !== issue.codeContext) {
      // Has a different fix code
      if (result.confidence >= 60) {
        result.validationPassed = true;
      }
    }

    // Check for manual review flag
    if (enriched.fixRecommendation.manualReview?.required) {
      result.validationPassed = false;
      result.error = enriched.fixRecommendation.manualReview.reason;
    }

  } catch (e: any) {
    result.error = e.message;
    console.error(`  Error processing ${issue.ruleId}: ${e.message}`);
  }

  result.processingTimeMs = Date.now() - startTime;
  return result;
}

async function runAIFixerTest(): Promise<void> {
  console.log('=== AI Fixer Test on Tier 1/2 Failures ===\n');

  const results: AIFixerTestResult[] = [];
  const maxSamples = parseInt(process.env.MAX_SAMPLES || '8');

  const samples = PMD_UNFIXED_SAMPLES.slice(0, maxSamples);
  console.log(`Testing ${samples.length} samples...\n`);

  for (const issue of samples) {
    console.log(`Processing: ${issue.ruleId} (${issue.file}:${issue.line})`);
    const result = await testAIFixerOnSample(issue);
    results.push(result);
    console.log(`  Confidence: ${result.confidence}%, Passed: ${result.validationPassed}\n`);
  }

  // Calculate metrics
  const attempted = results.filter(r => r.aiFixAttempted).length;
  const passed = results.filter(r => r.validationPassed).length;
  const withKB = results.filter(r => r.hasKBGuidance).length;
  const passedWithKB = results.filter(r => r.validationPassed && r.hasKBGuidance).length;
  const passedWithoutKB = results.filter(r => r.validationPassed && !r.hasKBGuidance).length;

  const summary = {
    testDate: new Date().toISOString(),
    totalSamples: samples.length,
    aiAttempted: attempted,
    validationPassed: passed,
    aiSuccessRate: attempted > 0 ? ((passed / attempted) * 100).toFixed(1) : '0',
    withKBGuidance: withKB,
    passedWithKB,
    passedWithoutKB,
    avgConfidence: results.reduce((sum, r) => sum + r.confidence, 0) / results.length,
    totalProcessingMs: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
    results,
  };

  console.log('\n=== SUMMARY ===');
  console.log(`AI Attempted: ${attempted}/${samples.length}`);
  console.log(`Validation Passed: ${passed}/${attempted} (${summary.aiSuccessRate}%)`);
  console.log(`With KB Guidance: ${withKB}`);
  console.log(`  - Passed with KB: ${passedWithKB}`);
  console.log(`  - Passed without KB: ${passedWithoutKB}`);
  console.log(`Avg Confidence: ${summary.avgConfidence.toFixed(1)}%`);
  console.log(`Total Time: ${(summary.totalProcessingMs / 1000).toFixed(1)}s`);

  // Save results
  const outputPath = path.join(__dirname, 'ai-fixer-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

// Run if executed directly
if (require.main === module) {
  runAIFixerTest()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Test failed:', e);
      process.exit(1);
    });
}

export { runAIFixerTest, PMD_UNFIXED_SAMPLES, AIFixerTestResult };

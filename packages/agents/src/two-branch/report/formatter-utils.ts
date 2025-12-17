/**
 * Formatter Utilities
 * 
 * Pure utility functions for report formatting.
 * Extracted from v9-grouped-report-formatter.ts for better modularity.
 */

/**
 * Format date string to human-readable format
 */
export function formatDate(dateString?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  };
  
  if (!dateString) {
    return new Date().toLocaleString('en-US', options);
  }
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleString('en-US', options);
    }
    return date.toLocaleString('en-US', options);
  } catch {
    return new Date().toLocaleString('en-US', options);
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(durationMs?: number): string {
  if (!durationMs) return '0s';
  
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } else if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Template patterns that indicate AI error responses (not actual code)
 * These patterns are checked case-insensitively
 */
const AI_ERROR_PATTERNS = [
  /should be:/i,
  /change to:/i,
  /replace with:/i,
  /instead of:/i,
  /the fix is:/i,
  /could you (?:please )?provide/i,
  /can you (?:please )?(?:provide|share|show)/i,
  /I (?:need|would need|require)/i,
  /please (?:provide|share|show)/i,
  /you haven't provided/i,
  /I don't have/i,
  /without (?:seeing|the actual)/i,
  /I cannot/i,
  /the actual code/i,
  /the complete code/i,
  /code snippet.*provided/i,
  /wasn't provided/i,
];

/**
 * Check if content contains AI error patterns
 */
export function containsAIErrorPatterns(content: string): boolean {
  if (!content) return false;
  return AI_ERROR_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Clean AI-generated content by removing think tags, bug references, etc.
 * Also rejects content that contains AI error patterns (returns empty string)
 */
export function cleanAIContent(content: string | string[] | any): string {
  if (!content) return '';

  // BUG-090 FIX: Handle arrays by joining them into a string
  let cleaned: string;
  if (Array.isArray(content)) {
    cleaned = content.join('\n');
  } else if (typeof content !== 'string') {
    // Handle objects or other types
    cleaned = JSON.stringify(content);
  } else {
    cleaned = content;
  }
  
  // BUG-LSP-001 FIX: Check for AI error patterns FIRST
  // If content contains template-style text like "should be:", reject it entirely
  if (containsAIErrorPatterns(cleaned)) {
    console.log(`[cleanAIContent] Rejecting AI error response: "${cleaned.substring(0, 60)}..."`);
    return '';  // Return empty to indicate no valid content
  }
  
  // Remove <think> blocks (with or without closing tags)
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');    // <think>...</think>
  cleaned = cleaned.replace(/<think>[\s\S]*?(?=\n\n|$)/gi, '');   // <think>... (no closing tag)
  
  // BUG FIX #46 CORRECTED: Only remove VERY specific AI thinking patterns
  // DO NOT remove generic sentences that could be in code comments!
  cleaned = cleaned.replace(/^\/\/ Apply this fix to your code:?\s*$/gm, ''); // "// Apply this fix to your code:"
  cleaned = cleaned.replace(/^First, I need to figure out what the original code is doing\..*$/gm, ''); // Very specific thinking pattern
  cleaned = cleaned.replace(/^Since the line is using.*?maybe they're using.*$/gm, ''); // Specific incomplete thought
  
  // Remove bug tracking references
  cleaned = cleaned.replace(/\*\*BUG-\d+.*?:\*\*/g, '');          // **BUG-XXX FIX:**
  cleaned = cleaned.replace(/\(BUG-\d+.*?\)/g, '');                // (BUG-XXX FIX - ...)
  
  // Remove AI fallback/helper messages (very specific)
  cleaned = cleaned.replace(/^\/\/\s*⚠️\s*AI-generated fix not available.*$/gm, '');
  cleaned = cleaned.replace(/^\/\/\s*Issue: This needs manual review.*$/gm, '');
  
  // Remove standalone line numbers
  cleaned = cleaned.replace(/^\s*\d+:\s*$/gm, '');
  
  // Remove empty lines caused by removals (but keep intentional spacing)
  cleaned = cleaned.replace(/\n\n\n+/g, '\n\n');
  
  // SESSION 26: Strip license headers - users have their own
  cleaned = stripLicenseHeaders(cleaned);
  
  return cleaned.trim();
}

/**
 * SESSION 26: Strip license headers from code content
 * These are repository-specific and shouldn't be included in fix suggestions
 */
function stripLicenseHeaders(code: string): string {
  if (!code) return '';
  
  let cleaned = code.trim();
  
  // Find license block: starts with /* and contains Copyright/License within first 30 lines
  const lines = cleaned.split('\n');
  let licenseStartLine = -1;
  let licenseEndLine = -1;
  
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    
    // Track where the comment block starts
    if (line.startsWith('/*') && licenseStartLine === -1) {
      licenseStartLine = i;
    }
    
    // If we're in a comment block and find license-related content
    if (licenseStartLine !== -1 && (line.includes('Copyright') || line.includes('Licensed') || line.includes('Apache License'))) {
      // Find the end of this license block
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('*/')) {
          licenseEndLine = j;
          break;
        }
      }
      break;
    }
    
    // If comment block ended without finding license content, reset
    if (line.includes('*/') && licenseStartLine !== -1 && licenseEndLine === -1) {
      const commentContent = lines.slice(licenseStartLine, i + 1).join(' ');
      if (!commentContent.includes('Copyright') && !commentContent.includes('Licensed')) {
        licenseStartLine = -1;
      }
    }
  }
  
  if (licenseEndLine > 0 && licenseStartLine >= 0) {
    cleaned = lines.slice(licenseEndLine + 1).join('\n').trim();
  }
  
  // If code is still too long (full file), truncate to relevant portion
  const codeLines = cleaned.split('\n');
  if (codeLines.length > 50) {
    const firstCodeLine = codeLines.findIndex((line, idx) => 
      idx > 0 && 
      !line.trim().startsWith('import ') && 
      !line.trim().startsWith('package ') &&
      !line.trim().startsWith('//') &&
      line.trim().length > 0
    );
    
    if (firstCodeLine > 5) {
      const packageLine = codeLines.find(l => l.trim().startsWith('package ')) || '';
      const importSummary = `// ... imports ...`;
      const relevantCode = codeLines.slice(firstCodeLine, firstCodeLine + 30);
      cleaned = [packageLine, importSummary, '', ...relevantCode, '\n// ... rest of file ...'].join('\n');
    }
  }
  
  return cleaned.trim();
}

/**
 * Get category from tool name
 */
export function getCategoryFromTool(tool: string): string {
  if (tool === 'semgrep') return 'Security';
  if (tool === 'dependency-check') return 'Dependencies';
  if (tool === 'spotbugs') return 'Code Quality';
  if (tool === 'checkstyle') return 'Code Quality';
  // PMD can be multiple categories - use generic
  return 'Code Quality';
}

/**
 * Format rule name to human-readable title
 */
export function formatRuleTitle(rule: string): string {
  // Handle dotted names like "java.lang.security.audit.crypto.weak-random.weak-random"
  if (rule.includes('.')) {
    const parts = rule.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  // Handle camelCase like "SystemPrintln" → "System Println"
  return rule.replace(/([A-Z])/g, ' $1').trim();
}

/**
 * Get programming language from file extension
 */
export function getLanguageFromFile(file: string): string {
  if (file.endsWith('.java')) return 'java';
  if (file.endsWith('.scala')) return 'scala';
  if (file.endsWith('.gradle')) return 'gradle';
  if (file.endsWith('.kt') || file.endsWith('.kts')) return 'kotlin';
  if (file.endsWith('.py')) return 'python';
  if (file.endsWith('.js')) return 'javascript';
  if (file.endsWith('.jsx')) return 'jsx';
  if (file.endsWith('.ts')) return 'typescript';
  if (file.endsWith('.tsx')) return 'tsx';
  if (file.endsWith('.go')) return 'go';
  if (file.endsWith('.rs')) return 'rust';
  if (file.endsWith('.rb')) return 'ruby';
  if (file.endsWith('.php')) return 'php';
  if (file.endsWith('.c')) return 'c';
  if (file.endsWith('.cpp') || file.endsWith('.cc') || file.endsWith('.cxx')) return 'cpp';
  if (file.endsWith('.cs')) return 'csharp';
  if (file.endsWith('.swift')) return 'swift';
  if (file.endsWith('.sh')) return 'bash';
  if (file.endsWith('.yml') || file.endsWith('.yaml')) return 'yaml';
  if (file.endsWith('.json')) return 'json';
  if (file.endsWith('.xml')) return 'xml';
  if (file.endsWith('.sql')) return 'sql';
  return 'text';
}

/**
 * Get user-friendly title for a rule
 * Converts technical rule names to plain English
 */
export function getUserFriendlyTitle(rule: string, tool: string): string {
  // Common patterns in rule names
  const friendlyTitles: Record<string, string> = {
    // ===== PMD Rules =====
    // Exception Handling
    'AvoidThrowingRawExceptionTypes': 'Throwing Generic Exception Types',
    'AvoidThrowingNullPointerException': 'Throwing NullPointerException',
    'AvoidCatchingThrowable': 'Catching Throwable or Error',
    'AvoidCatchingNPE': 'Catching NullPointerException',
    'ExceptionAsFlowControl': 'Using Exceptions for Flow Control',
    'AvoidRethrowingException': 'Rethrowing Exception Without Context',
    'DoNotThrowExceptionInFinally': 'Throwing Exception in Finally Block',
    
    // Logging & Debugging
    'SystemPrintln': 'Using System.out.println for Logging',
    'GuardLogStatement': 'Unguarded Log Statements',
    'MoreThanOneLogger': 'Multiple Logger Declarations',
    'AvoidPrintStackTrace': 'Using printStackTrace()',
    'ProperLogger': 'Incorrect Logger Declaration',
    
    // Concurrency
    'AvoidUsingVolatile': 'Using Volatile Variables',
    'AvoidSynchronizedAtMethodLevel': 'Method-Level Synchronization',
    'UnsynchronizedStaticDateFormatter': 'Unsynchronized Static DateFormat',
    'UseConcurrentHashMap': 'Using Hashtable Instead of ConcurrentHashMap',
    'DoubleCheckedLocking': 'Broken Double-Checked Locking',
    'AvoidThreadGroup': 'Using ThreadGroup',
    'DontCallThreadRun': 'Calling Thread.run() Instead of start()',
    
    // Code Quality
    'ClassWithOnlyPrivateConstructorsShouldBeFinal': 'Utility Class Not Marked Final',
    'AvoidReassigningParameters': 'Reassigning Method Parameters',
    'ReturnEmptyCollectionRatherThanNull': 'Returning Null Instead of Empty Collection',
    'AvoidFileStream': 'Using FileInputStream/FileOutputStream',
    'ConstructorCallsOverridableMethod': 'Constructor Calls Overridable Method',
    'UseProperClassLoader': 'Improper ClassLoader Usage',
    'SimplifyBooleanReturns': 'Complex Boolean Return Logic',
    'SimplifyBooleanExpressions': 'Unnecessarily Complex Boolean Expressions',
    'CollapsibleIfStatements': 'Nested If Statements That Can Be Combined',
    'AvoidDeeplyNestedIfStmts': 'Deeply Nested If Statements',
    'SwitchStmtsShouldHaveDefault': 'Switch Statement Missing Default Case',
    'AvoidBranchingStatementAsLastInLoop': 'Break/Continue as Last Statement in Loop',
    'ForLoopCanBeForeach': 'For Loop Can Use Enhanced For-Each',
    
    // Resource Management
    'CloseResource': 'Resource Not Properly Closed',
    'UseProperJDBCClose': 'JDBC Resources Not Properly Closed',
    'UseTryWithResources': 'Not Using Try-With-Resources',
    
    // Performance
    'UseStringBufferForStringAppends': 'String Concatenation in Loop',
    'ConsecutiveLiteralAppends': 'Multiple Consecutive String Appends',
    'InefficientStringBuffering': 'Inefficient StringBuffer Usage',
    'AppendCharacterWithChar': 'Appending String Instead of Char',
    'AvoidInstantiatingObjectsInLoops': 'Object Creation in Loops',
    'UseArraysAsList': 'Not Using Arrays.asList()',
    'OptimizableToArrayCall': 'Non-Optimized toArray() Call',
    
    // ===== Semgrep Security Rules =====
    'java.lang.security.audit.command-injection': 'Command Injection Vulnerability',
    'java.lang.security.audit.command-injection-process-builder': 'Command Injection via ProcessBuilder',
    'java.lang.security.audit.command-injection-process-builder.command-injection-process-builder': 'Command Injection via ProcessBuilder',
    'java.lang.security.audit.unsafe-reflection': 'Unsafe Reflection Usage',
    'java.lang.security.audit.sql-injection': 'SQL Injection Vulnerability',
    'java.lang.security.audit.xpath-injection': 'XPath Injection Vulnerability',
    'java.lang.security.audit.xxe': 'XML External Entity (XXE) Injection',
    'java.lang.security.audit.crypto.weak-cipher': 'Weak Cryptographic Cipher',
    'java.lang.security.audit.crypto.weak-hash': 'Weak Hashing Algorithm',
    'java.lang.security.audit.crypto.weak-rsa': 'Weak RSA Key Size',
    'java.lang.security.audit.crypto.insecure-randomness': 'Insecure Random Number Generator',
    'java.lang.security.audit.path-traversal': 'Path Traversal Vulnerability',
    'java.lang.security.audit.ldap-injection': 'LDAP Injection Vulnerability',
    'java.lang.security.audit.deserialization': 'Unsafe Deserialization',
    'java.lang.security.audit.cookie-missing-httponly': 'Cookie Missing HttpOnly Flag',
    'java.lang.security.audit.cookie-missing-secure': 'Cookie Missing Secure Flag',
    'java.lang.security.audit.hardcoded-credentials': 'Hard-Coded Credentials',
    'java.lang.security.audit.jwt-exposed-credentials': 'JWT Credentials Exposed',
    
    // ===== Checkstyle Rules =====
    'LineLength': 'Line Too Long',
    'MagicNumber': 'Magic Numbers in Code',
    'MissingJavadocMethod': 'Missing Method Documentation',
    'MissingJavadocType': 'Missing Class Documentation',
    'WhitespaceAround': 'Incorrect Whitespace',
    'WhitespaceAfter': 'Missing Whitespace After Token',
    'EmptyBlock': 'Empty Code Block',
    'NeedBraces': 'Missing Braces Around Code Block',
    'LeftCurly': 'Incorrect Left Curly Brace Placement',
    'RightCurly': 'Incorrect Right Curly Brace Placement',
    'AvoidStarImport': 'Using Wildcard Imports',
    'UnusedImports': 'Unused Import Statements',
    'RedundantImport': 'Redundant Import Statements',
    'IllegalImport': 'Importing Forbidden Package',
    'ParameterName': 'Parameter Name Convention Violation',
    'LocalVariableName': 'Local Variable Name Convention Violation',
    'MemberName': 'Member Variable Name Convention Violation',
    'MethodName': 'Method Name Convention Violation',
    'TypeName': 'Class/Interface Name Convention Violation',
    'PackageName': 'Package Name Convention Violation',
    'ConstantName': 'Constant Name Convention Violation',
    
    // ===== SpotBugs Rules =====
    'NP_NULL_ON_SOME_PATH': 'Potential Null Pointer Dereference',
    'NP_ALWAYS_NULL': 'Null Pointer Dereference (Always Null)',
    'NP_NULL_PARAM_DEREF': 'Null Parameter Passed to Method',
    'RCN_REDUNDANT_NULLCHECK_OF_NONNULL_VALUE': 'Redundant Null Check',
    'DLS_DEAD_LOCAL_STORE': 'Dead Store to Local Variable',
    'UC_USELESS_CONDITION': 'Useless Condition',
    'UC_USELESS_OBJECT': 'Useless Object Created',
    'RV_RETURN_VALUE_IGNORED': 'Return Value Ignored',
    'RV_RETURN_VALUE_IGNORED_BAD_PRACTICE': 'Important Return Value Ignored',
    'SQL_PREPARED_STATEMENT_GENERATED_FROM_NONCONSTANT_STRING': 'Dynamic SQL Query Construction',
    'DMI_CONSTANT_DB_PASSWORD': 'Hard-Coded Database Password',
    'DMI_EMPTY_DB_PASSWORD': 'Empty Database Password',
    'SE_BAD_FIELD': 'Non-Serializable Field in Serializable Class',
    'EQ_COMPARETO_USE_OBJECT_EQUALS': 'compareTo() Inconsistent with equals()',
    'HE_EQUALS_USE_HASHCODE': 'equals() Defined Without hashCode()',
    'CO_COMPARETO_INCORRECT_FLOATING': 'Incorrect Floating Point Comparison in compareTo()',
    
    // ===== Dependency Check Rules =====
    'CVE': 'Known Security Vulnerability (CVE)',
    'high-severity-vulnerability': 'High Severity Dependency Vulnerability',
    'critical-severity-vulnerability': 'Critical Severity Dependency Vulnerability',
    'outdated-dependency': 'Outdated Dependency Version'
  };
  
  // Normalize rule name - remove duplicate suffix (e.g., "command-injection.command-injection" → "command-injection")
  let normalizedRule = rule;
  const parts = rule.split('.');
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 2]) {
    // Remove duplicate suffix
    normalizedRule = parts.slice(0, -1).join('.');
  }
  
  // Check direct mapping with normalized rule first
  if (friendlyTitles[normalizedRule]) {
    return friendlyTitles[normalizedRule];
  }
  
  // Check direct mapping with original rule
  if (friendlyTitles[rule]) {
    return friendlyTitles[rule];
  }
  
  // Try lowercase match for case-insensitive rules (especially Semgrep)
  const ruleLower = normalizedRule.toLowerCase();
  const matchingKey = Object.keys(friendlyTitles).find(key => key.toLowerCase() === ruleLower);
  if (matchingKey) {
    return friendlyTitles[matchingKey];
  }
  
  // Clean up technical rule names (especially for Semgrep with long prefixes)
  const cleaned = normalizedRule
    .replace(/^java\.lang\.security\.audit\./gi, '') // Remove Semgrep Java security prefix
    .replace(/^java\.lang\./gi, '')                   // Remove Java lang prefix
    .replace(/\./g, ' ')                              // Replace dots with spaces
    .replace(/-/g, ' ')                               // Replace hyphens with spaces
    .replace(/_/g, ' ')                               // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Title case
    .join(' ')
    .trim();
  
  return cleaned;
}


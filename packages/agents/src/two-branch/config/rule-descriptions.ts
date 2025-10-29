/**
 * Human-Readable Rule Descriptions
 *
 * Maps technical rule IDs to user-friendly titles and descriptions.
 * Used to improve report readability and provide context for issues.
 */

export interface RuleDescription {
  title: string;
  description: string;
  why: string;
  category: 'Security' | 'Performance' | 'Code Quality' | 'Architecture' | 'Dependencies';
  fix?: string; // Generic fix recommendation
}

export const RULE_DESCRIPTIONS: Record<string, RuleDescription> = {
  // Checkstyle Rules
  'LineLengthCheck': {
    title: 'Line Length Exceeds Maximum',
    description: 'Lines exceed the maximum allowed length (typically 120 or 140 characters).',
    why: 'Long lines are harder to read on smaller screens and difficult to see in side-by-side diffs during code review.',
    category: 'Code Quality',
    fix: 'Break long lines using proper formatting. For method signatures, break at parameter boundaries. For long strings, use string concatenation or multi-line strings.'
  },

  'MissingJavadocMethodCheck': {
    title: 'Missing Method Documentation',
    description: 'Public methods lack Javadoc comments explaining their purpose, parameters, and return values.',
    why: 'Undocumented code is harder for other developers to understand and maintain correctly.',
    category: 'Code Quality',
    fix: 'Add Javadoc comments above public methods describing what they do, their parameters (@param), return values (@return), and any exceptions (@throws).'
  },

  'MissingJavadocTypeCheck': {
    title: 'Missing Class Documentation',
    description: 'Public classes lack Javadoc comments explaining their purpose and usage.',
    why: 'Class-level documentation helps developers understand the role and responsibility of the class.',
    category: 'Code Quality',
    fix: 'Add Javadoc comments above public classes describing their purpose, key responsibilities, and usage examples if complex.'
  },

  'JavadocVariableCheck': {
    title: 'Missing Field Documentation',
    description: 'Public fields lack Javadoc comments.',
    why: 'Field documentation clarifies the purpose and constraints of public fields.',
    category: 'Code Quality',
    fix: 'Add brief Javadoc comments above public fields explaining what they represent.'
  },

  'JavadocStyleCheck': {
    title: 'Javadoc Formatting Issue',
    description: 'Javadoc comments have formatting problems (missing periods, incomplete sentences, etc.).',
    why: 'Properly formatted documentation is easier to read and looks more professional.',
    category: 'Code Quality',
    fix: 'Ensure Javadoc comments are complete sentences ending with periods. Check for proper HTML tag closure and formatting.'
  },

  'JavadocMethodCheck': {
    title: 'Incomplete Method Documentation',
    description: 'Method Javadoc is present but incomplete (missing @param, @return, or @throws tags).',
    why: 'Complete documentation helps developers use methods correctly without reading implementation.',
    category: 'Code Quality',
    fix: 'Add @param tags for all parameters, @return for non-void methods, and @throws for checked exceptions.'
  },

  'JavadocPackageCheck': {
    title: 'Missing Package Documentation',
    description: 'Package lacks package-info.java file with documentation.',
    why: 'Package-level documentation explains the purpose and organization of related classes.',
    category: 'Code Quality',
    fix: 'Create package-info.java with Javadoc explaining the package purpose and key classes.'
  },

  'HiddenFieldCheck': {
    title: 'Local Variable Shadows Class Field',
    description: 'A local variable or parameter has the same name as a class field, hiding the field.',
    why: 'This can lead to bugs where you think you\'re using the field but you\'re actually using the local variable.',
    category: 'Code Quality',
    fix: 'Rename the local variable or parameter to a different name, or use "this." to explicitly reference the field.'
  },

  'MagicNumberCheck': {
    title: 'Magic Number in Code',
    description: 'Numeric literals appear directly in code without explanation.',
    why: 'Magic numbers make code less readable and harder to maintain. Their meaning is unclear without context.',
    category: 'Code Quality',
    fix: 'Replace magic numbers with named constants (static final fields) that explain their meaning.'
  },

  'FinalParametersCheck': {
    title: 'Parameter Not Declared Final',
    description: 'Method parameters are not declared as final.',
    why: 'Final parameters prevent accidental reassignment and make code intent clearer.',
    category: 'Code Quality',
    fix: 'Add "final" keyword to method parameters unless they need to be reassigned (which is rare).'
  },

  'DesignForExtensionCheck': {
    title: 'Method Not Designed for Extension',
    description: 'Non-private methods in non-final classes should be abstract, final, or have empty implementation.',
    why: 'Methods that can be overridden should be explicitly designed for inheritance to prevent unexpected behavior.',
    category: 'Architecture',
    fix: 'Either make the method final, make the class final, document the extension contract, or make it abstract.'
  },

  'VisibilityModifierCheck': {
    title: 'Public Field Instead of Accessor',
    description: 'Class has public or protected fields instead of using accessor methods.',
    why: 'Public fields expose internal implementation and make it impossible to add validation or change representation later.',
    category: 'Architecture',
    fix: 'Make fields private and provide public getter/setter methods if needed.'
  },

  'HideUtilityClassConstructorCheck': {
    title: 'Utility Class Has Public Constructor',
    description: 'Utility class (all static methods) has an accessible constructor.',
    why: 'Utility classes should not be instantiated as they only provide static methods.',
    category: 'Architecture',
    fix: 'Add a private constructor that throws an exception or use a private constructor with no body.'
  },

  'FinalClassCheck': {
    title: 'Class Should Be Final',
    description: 'Class with only private constructors should be declared final.',
    why: 'Classes that cannot be instantiated externally should be final to make this intent clear.',
    category: 'Architecture',
    fix: 'Add "final" keyword to the class declaration.'
  },

  'RedundantModifierCheck': {
    title: 'Redundant Modifier',
    description: 'Code contains redundant modifiers (e.g., public in interface methods, final in final classes).',
    why: 'Redundant modifiers add noise without value and can be confusing.',
    category: 'Code Quality',
    fix: 'Remove the redundant modifier. Interface methods are implicitly public, final class methods are implicitly final, etc.'
  },

  'FileTabCharacterCheck': {
    title: 'Tab Character in File',
    description: 'File contains tab characters instead of spaces.',
    why: 'Tabs display differently in different editors, causing inconsistent formatting.',
    category: 'Code Quality',
    fix: 'Replace tabs with spaces (typically 2 or 4 spaces per indentation level). Configure your IDE to use spaces.'
  },

  'WhitespaceAfterCheck': {
    title: 'Missing Whitespace After Token',
    description: 'Missing space after comma, semicolon, or typecast.',
    why: 'Consistent whitespace improves readability.',
    category: 'Code Quality',
    fix: 'Add a space after commas, semicolons, and typecasts.'
  },

  'WhitespaceAroundCheck': {
    title: 'Missing Whitespace Around Operator',
    description: 'Missing space around operators (=, +, -, etc.).',
    why: 'Spaces around operators improve readability and follow standard conventions.',
    category: 'Code Quality',
    fix: 'Add spaces before and after operators (e.g., "a = b + c" instead of "a=b+c").'
  },

  'NoWhitespaceBeforeCheck': {
    title: 'Unnecessary Whitespace Before Token',
    description: 'Unnecessary space before semicolon, comma, or other punctuation.',
    why: 'Consistent whitespace formatting improves code appearance.',
    category: 'Code Quality',
    fix: 'Remove unnecessary spaces before semicolons and commas.'
  },

  'ParenPadCheck': {
    title: 'Incorrect Padding in Parentheses',
    description: 'Incorrect spacing inside parentheses.',
    why: 'Consistent parentheses formatting improves readability.',
    category: 'Code Quality',
    fix: 'Follow team convention: either "method( arg )" or "method(arg)", but be consistent.'
  },

  'OperatorWrapCheck': {
    title: 'Operator on Wrong Line',
    description: 'Operator appears on the wrong line when wrapping long expressions.',
    why: 'Operators should appear at the start of continuation lines for readability.',
    category: 'Code Quality',
    fix: 'When breaking long expressions, place operators at the start of the new line.'
  },

  'AvoidStarImportCheck': {
    title: 'Wildcard Import Used',
    description: 'Code uses wildcard imports (import java.util.*).',
    why: 'Wildcard imports hide where classes come from and can cause conflicts.',
    category: 'Code Quality',
    fix: 'Replace wildcard imports with specific imports for each class used.'
  },

  'UnusedImportsCheck': {
    title: 'Unused Import Statement',
    description: 'Import statement for a class that is not used.',
    why: 'Unused imports add clutter and can confuse readers.',
    category: 'Code Quality',
    fix: 'Remove the unused import statement.'
  },

  'NewlineAtEndOfFileCheck': {
    title: 'Missing Newline at End of File',
    description: 'File does not end with a newline character.',
    why: 'POSIX standard requires files to end with newline. Some tools may not work correctly without it.',
    category: 'Code Quality',
    fix: 'Add a newline character at the end of the file. Most IDEs can do this automatically.'
  },

  'ArrayTypeStyleCheck': {
    title: 'Incorrect Array Declaration Style',
    description: 'Array brackets in wrong location (e.g., String args[] instead of String[] args).',
    why: 'Consistent array declaration style improves readability.',
    category: 'Code Quality',
    fix: 'Place brackets with the type, not the variable: "String[] args" instead of "String args[]".'
  },

  'RightCurlyCheck': {
    title: 'Right Brace Placement Issue',
    description: 'Closing brace is in the wrong location.',
    why: 'Consistent brace placement improves code structure visibility.',
    category: 'Code Quality',
    fix: 'Follow team convention for brace placement (same line vs. new line).'
  },

  'TranslationCheck': {
    title: 'Missing Translation Keys',
    description: 'Translation/properties files have missing or extra keys.',
    why: 'Inconsistent translation files can cause missing text or errors at runtime.',
    category: 'Code Quality',
    fix: 'Ensure all translation files have the same keys. Add missing keys or remove extras.'
  },

  'RegexpSinglelineCheck': {
    title: 'Line Matches Prohibited Pattern',
    description: 'Line matches a pattern that should not be present in code.',
    why: 'Certain patterns may indicate outdated code, debugging statements, or violations of team standards.',
    category: 'Code Quality',
    fix: 'Review the specific pattern being flagged and remove or refactor the offending code.'
  },

  'FileLengthCheck': {
    title: 'File Too Long',
    description: 'File exceeds maximum number of lines.',
    why: 'Very long files are hard to navigate and maintain. They often indicate a class with too many responsibilities.',
    category: 'Architecture',
    fix: 'Refactor the class into smaller, more focused classes. Extract related methods into separate classes.'
  },

  // PMD Rules
  'CollapsibleIfStatements': {
    title: 'Nested If Statements Can Be Combined',
    description: 'Two nested if statements with no else can be combined into one.',
    why: 'Reduces nesting depth and improves readability.',
    category: 'Code Quality',
    fix: 'Combine "if (a) { if (b) { ... } }" into "if (a && b) { ... }".'
  },

  'AvoidDuplicateLiterals': {
    title: 'Duplicate String Literal',
    description: 'Same string literal appears multiple times in code.',
    why: 'Duplicate literals make maintenance harder. If the value needs to change, you must change it everywhere.',
    category: 'Code Quality',
    fix: 'Extract the string literal to a named constant.'
  },

  'SimplifyBooleanReturns': {
    title: 'Boolean Return Can Be Simplified',
    description: 'Boolean return can be simplified (e.g., "if (x) return true; else return false;" → "return x;").',
    why: 'Simpler code is easier to read and maintain.',
    category: 'Code Quality',
    fix: 'Return the boolean expression directly instead of using if-else.'
  },

  // Semgrep Security Rules
  'yaml.docker-compose.security.no-new-privileges.no-new-privileges': {
    title: 'Docker Container Missing Security Restriction',
    description: 'Docker container does not have "security_opt: no-new-privileges" enabled.',
    why: 'Without this option, processes can gain additional privileges through setuid binaries, increasing attack surface.',
    category: 'Security',
    fix: 'Add "security_opt: [no-new-privileges:true]" to the service definition in docker-compose.yml.'
  },

  'yaml.docker-compose.security.writable-filesystem-service.writable-filesystem-service': {
    title: 'Docker Container Has Writable Filesystem',
    description: 'Docker container filesystem is writable, allowing runtime modifications.',
    why: 'If an attacker gains access, they could modify binaries or inject malicious code. Read-only filesystems prevent this.',
    category: 'Security',
    fix: 'Add "read_only: true" to the service definition and use volumes for data that must be writable.'
  },

  'html.security.audit.missing-integrity.missing-integrity': {
    title: 'External Script Missing Integrity Check',
    description: 'External scripts loaded via CDN without Subresource Integrity (SRI) verification.',
    why: 'If the CDN is compromised or serves malicious content, your site could execute untrusted code.',
    category: 'Security',
    fix: 'Add integrity="sha384-..." and crossorigin="anonymous" attributes to <script> and <link> tags for external resources.'
  },

  'html.security.plaintext-http-link.plaintext-http-link': {
    title: 'HTTP Link in HTML',
    description: 'HTML contains links using HTTP instead of HTTPS.',
    why: 'HTTP connections can be intercepted and modified by attackers (man-in-the-middle attacks).',
    category: 'Security',
    fix: 'Change HTTP links to HTTPS. If the resource doesn\'t support HTTPS, consider self-hosting or finding an alternative.'
  },

  'javascript.lang.security.detect-insecure-websocket.detect-insecure-websocket': {
    title: 'Insecure WebSocket Connection',
    description: 'WebSocket connection uses ws:// instead of wss:// (encrypted).',
    why: 'Unencrypted WebSocket connections can be intercepted and modified.',
    category: 'Security',
    fix: 'Change ws:// to wss:// to use encrypted WebSocket connections.'
  },

  'generic.secrets.security.detected-bcrypt-hash.detected-bcrypt-hash': {
    title: 'Hardcoded Bcrypt Hash Detected',
    description: 'Code contains what appears to be a hardcoded bcrypt password hash.',
    why: 'Hardcoded credentials in code are a security risk. Hashes should be stored in databases or secure configuration.',
    category: 'Security',
    fix: 'Remove the hardcoded hash. Store password hashes in a database or secure configuration system.'
  },

  'java.spring.security.audit.spring-actuator-fully-enabled.spring-actuator-fully-enabled': {
    title: 'Spring Actuator Endpoints Fully Exposed',
    description: 'Spring Actuator endpoints are enabled without authentication.',
    why: 'Actuator endpoints expose sensitive information about your application (health, metrics, environment variables).',
    category: 'Security',
    fix: 'Restrict actuator endpoints using Spring Security. Only expose necessary endpoints and require authentication.'
  },

  'python.django.security.django-no-csrf-token.django-no-csrf-token': {
    title: 'Django Form Missing CSRF Token',
    description: 'Django form does not include {% csrf_token %} template tag.',
    why: 'Without CSRF protection, forms are vulnerable to Cross-Site Request Forgery attacks.',
    category: 'Security',
    fix: 'Add {% csrf_token %} inside the <form> tag in your Django template.'
  },

  // SpotBugs Rules
  'DM_EXIT': {
    title: 'System.exit() Called',
    description: 'Code calls System.exit() which terminates the entire JVM.',
    why: 'In server applications, System.exit() can bring down the entire server. Use proper exception handling instead.',
    category: 'Architecture',
    fix: 'Remove System.exit() calls. Throw exceptions to signal errors and let the framework handle them.'
  },

  'RCN_REDUNDANT_NULLCHECK_WOULD_HAVE_BEEN_A_NPE': {
    title: 'Redundant Null Check',
    description: 'Code checks for null after dereferencing, which would have thrown NullPointerException already.',
    why: 'This indicates a logic error - the null check is unreachable.',
    category: 'Code Quality',
    fix: 'Move the null check before the first use of the variable.'
  },

  'NP_NULL_ON_SOME_PATH': {
    title: 'Possible Null Pointer Dereference',
    description: 'Code may dereference a null value on some execution path.',
    why: 'Null pointer exceptions crash applications and provide poor user experience.',
    category: 'Code Quality',
    fix: 'Add null checks before dereferencing, or use Optional<T> to make null explicit.'
  }
};

/**
 * Get user-friendly title for a rule
 */
export function getUserFriendlyTitle(rule: string, tool: string): string {
  const desc = RULE_DESCRIPTIONS[rule];
  if (desc) {
    return desc.title;
  }

  // Fallback: convert rule name to human-readable
  // Handle Checkstyle format: SomeRuleNameCheck → Some Rule Name
  let readable = rule
    .replace(/Check$/, '')  // Remove "Check" suffix
    .replace(/([A-Z])/g, ' $1')  // Add space before capitals
    .replace(/\./g, ' › ')  // Replace dots with arrows
    .trim();

  // Capitalize first letter
  readable = readable.charAt(0).toUpperCase() + readable.slice(1);

  return readable;
}

/**
 * Get full description for a rule
 */
export function getRuleDescription(rule: string, tool: string): RuleDescription {
  return RULE_DESCRIPTIONS[rule] || {
    title: getUserFriendlyTitle(rule, tool),
    description: `This rule checks for ${rule.toLowerCase().replace(/check$/, '')} violations in your code.`,
    why: 'Following this rule improves code quality, maintainability, and reduces potential bugs.',
    category: 'Code Quality',
    fix: 'Review the specific violation and refactor the code to comply with the rule.'
  };
}

/**
 * Guess file language from extension
 */
export function guessLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'java': 'java',
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'yml': 'yaml',
    'yaml': 'yaml',
    'json': 'json',
    'xml': 'xml',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sh': 'bash',
    'sql': 'sql'
  };

  return languageMap[ext || ''] || '';
}

/**
 * Issue Classifier Module
 *
 * Maps tool rule IDs to issue types deterministically.
 * Provides AI fallback for unknown rules via Researcher agent.
 *
 * Part of the Three-Tier Fix System (P0 Priority)
 *
 * Now uses comprehensive rule definitions from ./rules/ for:
 * - ESLint: 200+ core rules
 * - TypeScript-ESLint: 130+ rules
 * - Plus existing Ruff, PMD, Checkstyle, Semgrep rules
 */

import { lookupESLintRule, getRuleCoverageStats } from './rules';

// Issue types that determine which fixer to use
export type IssueType =
  | 'style'           // Formatting, naming conventions
  | 'quality'         // Code quality, complexity, unused code
  | 'security'        // Security vulnerabilities
  | 'performance'     // Performance issues
  | 'maintainability' // Maintainability, documentation
  | 'compatibility'   // API compatibility, deprecation
  | 'dependency'      // Dependency issues, vulnerabilities
  | 'unknown';        // Requires AI classification

export interface ClassifiedIssue {
  ruleId: string;
  tool: string;
  issueType: IssueType;
  confidence: number;  // 0-100, 100 = deterministic match
  fixable: boolean;    // Whether a fix is available
  fixTier: 1 | 2 | 3;  // Which tier handles this
}

// Legacy ESLint rules (kept for backwards compatibility, comprehensive rules in ./rules/)
const ESLINT_RULES: Record<string, { type: IssueType; fixable: boolean }> = {
  // Style rules (Tier 1 - eslint --fix)
  'indent': { type: 'style', fixable: true },
  'quotes': { type: 'style', fixable: true },
  'semi': { type: 'style', fixable: true },
  'comma-dangle': { type: 'style', fixable: true },
  'no-trailing-spaces': { type: 'style', fixable: true },
  'eol-last': { type: 'style', fixable: true },
  'no-multiple-empty-lines': { type: 'style', fixable: true },
  'object-curly-spacing': { type: 'style', fixable: true },
  'array-bracket-spacing': { type: 'style', fixable: true },
  'space-before-blocks': { type: 'style', fixable: true },
  'space-in-parens': { type: 'style', fixable: true },
  'keyword-spacing': { type: 'style', fixable: true },
  'arrow-spacing': { type: 'style', fixable: true },
  'prefer-const': { type: 'quality', fixable: true },
  'no-var': { type: 'quality', fixable: true },

  // Quality rules (Tier 1/2 - some fixable)
  'no-unused-vars': { type: 'quality', fixable: false },
  'no-undef': { type: 'quality', fixable: false },
  'no-console': { type: 'quality', fixable: false },
  'no-debugger': { type: 'quality', fixable: true },
  'no-alert': { type: 'quality', fixable: false },
  'eqeqeq': { type: 'quality', fixable: true },
  'curly': { type: 'style', fixable: true },
  'no-else-return': { type: 'style', fixable: true },
  'no-lonely-if': { type: 'style', fixable: true },
  'prefer-arrow-callback': { type: 'style', fixable: true },
  'arrow-body-style': { type: 'style', fixable: true },
  'object-shorthand': { type: 'style', fixable: true },
  'prefer-template': { type: 'style', fixable: true },
  'prefer-destructuring': { type: 'style', fixable: true },

  // Security rules (Tier 2/3 - need review)
  'no-eval': { type: 'security', fixable: false },
  'no-implied-eval': { type: 'security', fixable: false },
  'no-new-func': { type: 'security', fixable: false },

  // @typescript-eslint rules
  '@typescript-eslint/no-unused-vars': { type: 'quality', fixable: false },
  '@typescript-eslint/no-explicit-any': { type: 'quality', fixable: true },
  '@typescript-eslint/explicit-function-return-type': { type: 'maintainability', fixable: false },
  '@typescript-eslint/no-non-null-assertion': { type: 'quality', fixable: false },
  '@typescript-eslint/prefer-nullish-coalescing': { type: 'style', fixable: true },
  '@typescript-eslint/prefer-optional-chain': { type: 'style', fixable: true },
  '@typescript-eslint/no-floating-promises': { type: 'quality', fixable: false },
  '@typescript-eslint/await-thenable': { type: 'quality', fixable: false },
  '@typescript-eslint/consistent-type-imports': { type: 'style', fixable: true },
};

// Ruff rule mappings (Python - subset)
const RUFF_RULES: Record<string, { type: IssueType; fixable: boolean }> = {
  // Style (E - pycodestyle errors)
  'E101': { type: 'style', fixable: true },  // Indentation contains mixed spaces and tabs
  'E111': { type: 'style', fixable: true },  // Indentation is not a multiple of four
  'E117': { type: 'style', fixable: true },  // Over-indented
  'E201': { type: 'style', fixable: true },  // Whitespace after '('
  'E202': { type: 'style', fixable: true },  // Whitespace before ')'
  'E203': { type: 'style', fixable: true },  // Whitespace before ':'
  'E211': { type: 'style', fixable: true },  // Whitespace before '('
  'E225': { type: 'style', fixable: true },  // Missing whitespace around operator
  'E231': { type: 'style', fixable: true },  // Missing whitespace after ','
  'E251': { type: 'style', fixable: true },  // Unexpected spaces around keyword
  'E261': { type: 'style', fixable: true },  // At least two spaces before inline comment
  'E262': { type: 'style', fixable: true },  // Inline comment should start with '# '
  'E265': { type: 'style', fixable: true },  // Block comment should start with '# '
  'E266': { type: 'style', fixable: true },  // Too many leading '#' for block comment
  'E271': { type: 'style', fixable: true },  // Multiple spaces after keyword
  'E301': { type: 'style', fixable: true },  // Expected 1 blank line
  'E302': { type: 'style', fixable: true },  // Expected 2 blank lines
  'E303': { type: 'style', fixable: true },  // Too many blank lines
  'E304': { type: 'style', fixable: true },  // Blank lines after function decorator
  'E305': { type: 'style', fixable: true },  // Expected 2 blank lines after class or function
  'E401': { type: 'style', fixable: true },  // Multiple imports on one line
  'E501': { type: 'style', fixable: false }, // Line too long (not always fixable)
  'E701': { type: 'style', fixable: true },  // Multiple statements on one line (colon)
  'E702': { type: 'style', fixable: true },  // Multiple statements on one line (semicolon)
  'E703': { type: 'style', fixable: true },  // Statement ends with semicolon
  'E711': { type: 'quality', fixable: true }, // Comparison to None
  'E712': { type: 'quality', fixable: true }, // Comparison to True/False
  'E713': { type: 'quality', fixable: true }, // Test for membership should be 'not in'
  'E714': { type: 'quality', fixable: true }, // Test for object identity should be 'is not'
  'E721': { type: 'quality', fixable: true }, // Do not compare types, use isinstance()
  'E722': { type: 'quality', fixable: false }, // Do not use bare except
  'E731': { type: 'quality', fixable: true }, // Do not assign a lambda expression
  'E741': { type: 'quality', fixable: false }, // Ambiguous variable name
  'E999': { type: 'quality', fixable: false }, // Syntax error

  // F - Pyflakes
  'F401': { type: 'quality', fixable: true },  // Imported but unused
  'F402': { type: 'quality', fixable: false }, // Import shadowed by loop variable
  'F403': { type: 'quality', fixable: false }, // Star import used
  'F404': { type: 'quality', fixable: false }, // Future import not at beginning
  'F405': { type: 'quality', fixable: false }, // Name may be undefined from star import
  'F406': { type: 'quality', fixable: false }, // __future__ import not at beginning
  'F407': { type: 'quality', fixable: false }, // Invalid __future__ import
  'F501': { type: 'quality', fixable: false }, // Invalid % format string
  'F502': { type: 'quality', fixable: false }, // % format expected mapping
  'F503': { type: 'quality', fixable: false }, // % format expected sequence
  'F504': { type: 'quality', fixable: true },  // % format unused named arguments
  'F505': { type: 'quality', fixable: true },  // % format missing named arguments
  'F506': { type: 'quality', fixable: false }, // % format mixed positional and named
  'F507': { type: 'quality', fixable: false }, // % format mismatch
  'F508': { type: 'quality', fixable: false }, // % format * specifier requires sequence
  'F509': { type: 'quality', fixable: false }, // % format unsupported format character
  'F521': { type: 'quality', fixable: false }, // .format() invalid format string
  'F522': { type: 'quality', fixable: true },  // .format() unused named arguments
  'F523': { type: 'quality', fixable: true },  // .format() unused positional arguments
  'F524': { type: 'quality', fixable: false }, // .format() missing argument
  'F525': { type: 'quality', fixable: false }, // .format() mixing automatic and manual
  'F601': { type: 'quality', fixable: true },  // Dictionary key literal repeated
  'F602': { type: 'quality', fixable: true },  // Dictionary key variable repeated
  'F621': { type: 'quality', fixable: false }, // Too many expressions in star assignment
  'F622': { type: 'quality', fixable: false }, // Multiple starred expressions
  'F631': { type: 'quality', fixable: false }, // Assert test is a non-empty tuple
  'F632': { type: 'quality', fixable: true },  // Use == to compare constant literals
  'F633': { type: 'quality', fixable: false }, // Invalid print syntax
  'F634': { type: 'quality', fixable: false }, // If test is a constant tuple
  'F701': { type: 'quality', fixable: false }, // Break outside loop
  'F702': { type: 'quality', fixable: false }, // Continue outside loop
  'F704': { type: 'quality', fixable: false }, // Yield outside function
  'F706': { type: 'quality', fixable: false }, // Return outside function
  'F707': { type: 'quality', fixable: false }, // Default except not last
  'F811': { type: 'quality', fixable: true },  // Redefinition of unused name
  'F821': { type: 'quality', fixable: false }, // Undefined name
  'F822': { type: 'quality', fixable: false }, // Undefined name in __all__
  'F823': { type: 'quality', fixable: false }, // Local variable referenced before assignment
  'F841': { type: 'quality', fixable: true },  // Local variable assigned but never used
  'F842': { type: 'quality', fixable: true },  // Local variable annotated but never used
  'F901': { type: 'quality', fixable: false }, // Raise without exception

  // I - isort
  'I001': { type: 'style', fixable: true },    // Import block unsorted
  'I002': { type: 'style', fixable: true },    // Missing required import

  // UP - pyupgrade
  'UP001': { type: 'compatibility', fixable: true }, // __metaclass__ = type
  'UP003': { type: 'compatibility', fixable: true }, // Use {} instead of type()
  'UP004': { type: 'compatibility', fixable: true }, // Class inherits from object
  'UP005': { type: 'compatibility', fixable: true }, // Deprecated mock import
  'UP006': { type: 'compatibility', fixable: true }, // Use {} instead of typing.Dict
  'UP007': { type: 'compatibility', fixable: true }, // Use X | Y instead of Union
  'UP008': { type: 'compatibility', fixable: true }, // Use super() instead of super(__class__)
  'UP009': { type: 'compatibility', fixable: true }, // UTF-8 encoding declaration
  'UP010': { type: 'compatibility', fixable: true }, // Unnecessary __future__ import
  'UP011': { type: 'compatibility', fixable: true }, // Unnecessary parentheses after class
  'UP012': { type: 'compatibility', fixable: true }, // Unnecessary utf-8 encoding
  'UP013': { type: 'compatibility', fixable: true }, // Convert typed Dict to class
  'UP014': { type: 'compatibility', fixable: true }, // Convert NamedTuple to class
  'UP015': { type: 'compatibility', fixable: true }, // Redundant open modes
  'UP017': { type: 'compatibility', fixable: true }, // Use datetime.UTC alias
  'UP018': { type: 'compatibility', fixable: true }, // Unnecessary call to str/bytes/int
  'UP019': { type: 'compatibility', fixable: true }, // Use typing.TypedDict
  'UP020': { type: 'compatibility', fixable: true }, // Use builtin open
  'UP021': { type: 'compatibility', fixable: true }, // Replace universal newlines
  'UP022': { type: 'compatibility', fixable: true }, // Replace stdout/stderr capture
  'UP023': { type: 'compatibility', fixable: true }, // Replace cElementTree
  'UP024': { type: 'compatibility', fixable: true }, // Replace aliased errors with OSError
  'UP025': { type: 'compatibility', fixable: true }, // Remove unicode literal prefix
  'UP026': { type: 'compatibility', fixable: true }, // Replace mock imports
  'UP027': { type: 'compatibility', fixable: true }, // Unpack list comprehension
  'UP028': { type: 'compatibility', fixable: true }, // Replace yield in for loop
  'UP029': { type: 'compatibility', fixable: true }, // Use builtin types for type hints
  'UP030': { type: 'compatibility', fixable: true }, // Use implicit references in format
  'UP031': { type: 'compatibility', fixable: true }, // Use f-string instead of format
  'UP032': { type: 'compatibility', fixable: true }, // Use f-string instead of %
  'UP033': { type: 'compatibility', fixable: true }, // Use @functools.cache
  'UP034': { type: 'compatibility', fixable: true }, // Extraneous parentheses
  'UP035': { type: 'compatibility', fixable: true }, // Import from typing instead
  'UP036': { type: 'compatibility', fixable: true }, // Version block outdated
  'UP037': { type: 'compatibility', fixable: true }, // Remove quotes from annotation
  'UP038': { type: 'compatibility', fixable: true }, // Use X | Y in isinstance
  'UP039': { type: 'compatibility', fixable: true }, // Unnecessary parentheses after class
  'UP040': { type: 'compatibility', fixable: true }, // Use TypeAlias annotation

  // S - Bandit (security)
  'S101': { type: 'quality', fixable: false },     // Assert used
  'S102': { type: 'security', fixable: false },    // exec() used
  'S103': { type: 'security', fixable: false },    // bad file permissions
  'S104': { type: 'security', fixable: false },    // Possible binding to all interfaces
  'S105': { type: 'security', fixable: false },    // Possible hardcoded password
  'S106': { type: 'security', fixable: false },    // Possible hardcoded password
  'S107': { type: 'security', fixable: false },    // Possible hardcoded password
  'S108': { type: 'security', fixable: false },    // Probable insecure usage of tmp file
  'S110': { type: 'security', fixable: false },    // try-except-pass detected
  'S112': { type: 'security', fixable: false },    // try-except-continue detected
  'S113': { type: 'security', fixable: false },    // Probable use of requests without timeout
  'S301': { type: 'security', fixable: false },    // Pickle and modules unsafe
  'S302': { type: 'security', fixable: false },    // Use of marshal
  'S303': { type: 'security', fixable: false },    // Use of MD5/SHA1 for security
  'S304': { type: 'security', fixable: false },    // Use of insecure cipher
  'S305': { type: 'security', fixable: false },    // Use of insecure cipher mode
  'S306': { type: 'security', fixable: false },    // Use of mktemp
  'S307': { type: 'security', fixable: false },    // eval() used
  'S308': { type: 'security', fixable: false },    // Mark_safe detected
  'S310': { type: 'security', fixable: false },    // Audit urlopen for permitted schemes
  'S311': { type: 'security', fixable: false },    // Standard pseudo-random generators
  'S312': { type: 'security', fixable: false },    // Telnetlib usage
  'S313': { type: 'security', fixable: false },    // xml.etree usage
  'S314': { type: 'security', fixable: false },    // xml.sax usage
  'S315': { type: 'security', fixable: false },    // xml.expat usage
  'S316': { type: 'security', fixable: false },    // xml.dom.minidom usage
  'S317': { type: 'security', fixable: false },    // xml.dom.pulldom usage
  'S318': { type: 'security', fixable: false },    // xml.sax.expatreader usage
  'S319': { type: 'security', fixable: false },    // xml.sax.saxutils.XMLGenerator usage
  'S320': { type: 'security', fixable: false },    // lxml usage
  'S321': { type: 'security', fixable: false },    // FTP usage
  'S323': { type: 'security', fixable: false },    // Unverified SSL context
  'S324': { type: 'security', fixable: false },    // Insecure hash function
  'S501': { type: 'security', fixable: false },    // Request with cert verification disabled
  'S502': { type: 'security', fixable: false },    // SSL with bad version
  'S503': { type: 'security', fixable: false },    // SSL with bad defaults
  'S504': { type: 'security', fixable: false },    // SSL with no version
  'S505': { type: 'security', fixable: false },    // Weak cryptographic key
  'S506': { type: 'security', fixable: false },    // Unsafe YAML load
  'S507': { type: 'security', fixable: false },    // Missing host key verification
  'S508': { type: 'security', fixable: false },    // SNMP insecure version
  'S509': { type: 'security', fixable: false },    // SNMP weak crypto
  'S601': { type: 'security', fixable: false },    // Paramiko with no host key verification
  'S602': { type: 'security', fixable: false },    // subprocess call with shell=True
  'S603': { type: 'security', fixable: false },    // subprocess without shell
  'S604': { type: 'security', fixable: false },    // Function call with shell=True
  'S605': { type: 'security', fixable: false },    // Starting a process with a shell
  'S606': { type: 'security', fixable: false },    // Starting a process without a shell
  'S607': { type: 'security', fixable: false },    // Starting a process with partial path
  'S608': { type: 'security', fixable: false },    // SQL injection
  'S609': { type: 'security', fixable: false },    // Possible wildcard injection
  'S610': { type: 'security', fixable: false },    // Django extra usage
  'S611': { type: 'security', fixable: false },    // Django RawSQL usage
  'S612': { type: 'security', fixable: false },    // Logging sensitive data
  'S701': { type: 'security', fixable: false },    // Jinja2 autoescape disabled
  'S702': { type: 'security', fixable: false },    // Mako template syntax
};

// Semgrep rule mappings (security-focused)
const SEMGREP_RULES: Record<string, { type: IssueType; fixable: boolean }> = {
  // Generic security patterns
  'generic.secrets.security.detected-generic-secret': { type: 'security', fixable: false },
  'generic.secrets.security.detected-private-key': { type: 'security', fixable: false },
  'generic.secrets.security.detected-aws-secret-access-key': { type: 'security', fixable: false },

  // JavaScript/TypeScript security
  'javascript.express.security.audit.xss.mustache-escape': { type: 'security', fixable: false },
  'javascript.express.security.audit.xss.pug-unescaped-input': { type: 'security', fixable: false },
  'javascript.browser.security.insufficient-postmessage-origin-validation': { type: 'security', fixable: false },
  'javascript.lang.security.audit.path-traversal.path-join-resolve-traversal': { type: 'security', fixable: false },
  'javascript.lang.security.detect-child-process': { type: 'security', fixable: false },
  'javascript.lang.security.detect-non-literal-fs-filename': { type: 'security', fixable: false },
  'javascript.lang.security.detect-non-literal-regexp': { type: 'security', fixable: false },
  'javascript.lang.security.detect-non-literal-require': { type: 'security', fixable: false },
  'javascript.lang.security.detect-object-injection': { type: 'security', fixable: false },
  'javascript.lang.security.detect-possible-timing-attacks': { type: 'security', fixable: false },
  'javascript.lang.security.detect-pseudorandomness': { type: 'security', fixable: false },

  // Python security
  'python.django.security.audit.xss.template-autoescape-off': { type: 'security', fixable: false },
  'python.django.security.injection.command.subprocess-injection': { type: 'security', fixable: false },
  'python.django.security.injection.sql.sql-injection-using-raw': { type: 'security', fixable: false },
  'python.flask.security.audit.app-run-security-config': { type: 'security', fixable: false },
  'python.lang.security.audit.dangerous-subprocess-use': { type: 'security', fixable: false },
  'python.lang.security.audit.exec-detected': { type: 'security', fixable: false },
  'python.lang.security.audit.insecure-hash-algorithms': { type: 'security', fixable: false },

  // Java security
  'java.lang.security.audit.command-injection': { type: 'security', fixable: false },
  'java.lang.security.audit.crypto-weak-cipher': { type: 'security', fixable: false },
  'java.lang.security.audit.formatted-sql-string': { type: 'security', fixable: false },
  'java.lang.security.audit.ldap-injection': { type: 'security', fixable: false },
  'java.lang.security.audit.sqli.jdbc-sqli': { type: 'security', fixable: false },
  'java.lang.security.audit.xss.jsp-xss': { type: 'security', fixable: false },
  'java.lang.security.audit.xxe.xml-parser-xxe': { type: 'security', fixable: false },
};

// PMD rule mappings (Java)
const PMD_RULES: Record<string, { type: IssueType; fixable: boolean }> = {
  // Best Practices
  'AvoidReassigningLoopVariables': { type: 'quality', fixable: false },
  'AvoidReassigningParameters': { type: 'quality', fixable: false },
  'AvoidStringBufferField': { type: 'quality', fixable: false },
  'AvoidUsingHardCodedIP': { type: 'security', fixable: false },
  'CheckResultSet': { type: 'quality', fixable: false },
  'ConstantsInInterface': { type: 'quality', fixable: false },
  'DefaultLabelNotLastInSwitchStmt': { type: 'quality', fixable: false },
  'ForLoopCanBeForeach': { type: 'quality', fixable: false },  // Could be Tier 2
  'ForLoopVariableCount': { type: 'quality', fixable: false },
  'GuardLogStatement': { type: 'performance', fixable: false },
  'JUnit4SuitesShouldUseSuiteAnnotation': { type: 'quality', fixable: false },
  'JUnit4TestShouldUseAfterAnnotation': { type: 'quality', fixable: false },
  'JUnit4TestShouldUseBeforeAnnotation': { type: 'quality', fixable: false },
  'JUnit4TestShouldUseTestAnnotation': { type: 'quality', fixable: false },
  'JUnitAssertionsShouldIncludeMessage': { type: 'quality', fixable: false },
  'JUnitTestContainsTooManyAsserts': { type: 'quality', fixable: false },
  'JUnitTestsShouldIncludeAssert': { type: 'quality', fixable: false },
  'JUnitUseExpected': { type: 'quality', fixable: false },
  'LooseCoupling': { type: 'quality', fixable: false },
  'MethodReturnsInternalArray': { type: 'quality', fixable: false },
  'MissingOverride': { type: 'quality', fixable: true },  // Tier 2 - Sorald can fix
  'OneDeclarationPerLine': { type: 'style', fixable: false },
  'PreserveStackTrace': { type: 'quality', fixable: false },
  'ReplaceEnumerationWithIterator': { type: 'compatibility', fixable: false },
  'ReplaceHashtableWithMap': { type: 'compatibility', fixable: false },
  'ReplaceVectorWithList': { type: 'compatibility', fixable: false },
  'SwitchStmtsShouldHaveDefault': { type: 'quality', fixable: false },
  'SystemPrintln': { type: 'quality', fixable: false },
  'UnusedAssignment': { type: 'quality', fixable: false },
  'UnusedFormalParameter': { type: 'quality', fixable: false },
  'UnusedLocalVariable': { type: 'quality', fixable: false },
  'UnusedPrivateField': { type: 'quality', fixable: false },
  'UnusedPrivateMethod': { type: 'quality', fixable: false },
  'UseAssertEqualsInsteadOfAssertTrue': { type: 'quality', fixable: false },
  'UseAssertNullInsteadOfAssertTrue': { type: 'quality', fixable: false },
  'UseAssertSameInsteadOfAssertTrue': { type: 'quality', fixable: false },
  'UseAssertTrueInsteadOfAssertEquals': { type: 'quality', fixable: false },
  'UseCollectionIsEmpty': { type: 'quality', fixable: false },
  'UseTryWithResources': { type: 'quality', fixable: false },  // Tier 2 - Sorald can fix
  'UseVarargs': { type: 'quality', fixable: false },

  // Code Style
  'AtLeastOneConstructor': { type: 'style', fixable: false },
  'AvoidDollarSigns': { type: 'style', fixable: false },
  'AvoidProtectedFieldInFinalClass': { type: 'quality', fixable: false },
  'AvoidProtectedMethodInFinalClassNotExtending': { type: 'quality', fixable: false },
  'BooleanGetMethodName': { type: 'style', fixable: false },
  'CallSuperInConstructor': { type: 'quality', fixable: false },
  'ClassNamingConventions': { type: 'style', fixable: false },
  'CommentDefaultAccessModifier': { type: 'maintainability', fixable: false },
  'ConfusingTernary': { type: 'quality', fixable: false },
  'ControlStatementBraces': { type: 'style', fixable: false },
  'DefaultPackage': { type: 'quality', fixable: false },
  'EmptyMethodInAbstractClassShouldBeAbstract': { type: 'quality', fixable: false },
  'ExtendsObject': { type: 'quality', fixable: true },  // Tier 1 - simple removal
  'FieldDeclarationsShouldBeAtStartOfClass': { type: 'style', fixable: false },
  'FieldNamingConventions': { type: 'style', fixable: false },
  'FinalParameterInAbstractMethod': { type: 'quality', fixable: false },
  'ForLoopShouldBeWhileLoop': { type: 'style', fixable: false },
  'FormalParameterNamingConventions': { type: 'style', fixable: false },
  'GenericsNaming': { type: 'style', fixable: false },
  'IdenticalCatchBranches': { type: 'quality', fixable: false },  // Tier 2
  'LinguisticNaming': { type: 'maintainability', fixable: false },
  'LocalHomeNamingConvention': { type: 'style', fixable: false },
  'LocalInterfaceSessionNamingConvention': { type: 'style', fixable: false },
  'LocalVariableCouldBeFinal': { type: 'quality', fixable: false },
  'LocalVariableNamingConventions': { type: 'style', fixable: false },
  'LongVariable': { type: 'style', fixable: false },
  'MDBAndSessionBeanNamingConvention': { type: 'style', fixable: false },
  'MethodArgumentCouldBeFinal': { type: 'quality', fixable: false },
  'MethodNamingConventions': { type: 'style', fixable: false },
  'NoPackage': { type: 'quality', fixable: false },
  'OnlyOneReturn': { type: 'quality', fixable: false },
  'PackageCase': { type: 'style', fixable: false },
  'PrematureDeclaration': { type: 'quality', fixable: false },
  'RemoteInterfaceNamingConvention': { type: 'style', fixable: false },
  'RemoteSessionInterfaceNamingConvention': { type: 'style', fixable: false },
  'ShortClassName': { type: 'style', fixable: false },
  'ShortMethodName': { type: 'style', fixable: false },
  'ShortVariable': { type: 'style', fixable: false },
  'TooManyStaticImports': { type: 'style', fixable: false },
  'UnnecessaryAnnotationValueElement': { type: 'quality', fixable: true },
  'UnnecessaryCast': { type: 'quality', fixable: true },  // Tier 2
  'UnnecessaryConstructor': { type: 'quality', fixable: true },  // Tier 2
  'UnnecessaryFullyQualifiedName': { type: 'style', fixable: true },  // Tier 2
  'UnnecessaryImport': { type: 'quality', fixable: true },  // Tier 2
  'UnnecessaryLocalBeforeReturn': { type: 'quality', fixable: false },
  'UnnecessaryModifier': { type: 'quality', fixable: true },  // Tier 2
  'UnnecessaryReturn': { type: 'quality', fixable: true },  // Tier 2
  'UnnecessarySemicolon': { type: 'style', fixable: true },  // Tier 1
  'UseDiamondOperator': { type: 'quality', fixable: true },  // Tier 2 - Sorald
  'UselessParentheses': { type: 'style', fixable: true },  // Tier 1
  'UselessQualifiedThis': { type: 'quality', fixable: true },
  'UseShortArrayInitializer': { type: 'style', fixable: false },
  'UseUnderscoresInNumericLiterals': { type: 'style', fixable: false },

  // Security
  'HardCodedCryptoKey': { type: 'security', fixable: false },
  'InsecureCryptoIv': { type: 'security', fixable: false },

  // Performance
  'AddEmptyString': { type: 'performance', fixable: true },
  'AppendCharacterWithChar': { type: 'performance', fixable: true },
  'AvoidArrayLoops': { type: 'performance', fixable: false },
  'AvoidCalendarDateCreation': { type: 'performance', fixable: false },
  'AvoidFileStream': { type: 'performance', fixable: false },
  'AvoidInstantiatingObjectsInLoops': { type: 'performance', fixable: false },
  'BigIntegerInstantiation': { type: 'performance', fixable: true },
  'BooleanInstantiation': { type: 'performance', fixable: true },
  'ByteInstantiation': { type: 'performance', fixable: true },
  'ConsecutiveAppendsShouldReuse': { type: 'performance', fixable: false },
  'ConsecutiveLiteralAppends': { type: 'performance', fixable: false },
  'InefficientEmptyStringCheck': { type: 'performance', fixable: true },
  'InefficientStringBuffering': { type: 'performance', fixable: false },
  'InsufficientStringBufferDeclaration': { type: 'performance', fixable: false },
  'IntegerInstantiation': { type: 'performance', fixable: true },
  'LongInstantiation': { type: 'performance', fixable: true },
  'OptimizableToArrayCall': { type: 'performance', fixable: true },
  'RedundantFieldInitializer': { type: 'performance', fixable: true },
  'ShortInstantiation': { type: 'performance', fixable: true },
  'SimplifyStartsWith': { type: 'performance', fixable: true },
  'StringInstantiation': { type: 'performance', fixable: true },
  'StringToString': { type: 'performance', fixable: true },
  'TooFewBranchesForASwitchStatement': { type: 'quality', fixable: false },
  'UnnecessaryWrapperObjectCreation': { type: 'performance', fixable: true },
  'UseArrayListInsteadOfVector': { type: 'performance', fixable: false },
  'UseArraysAsList': { type: 'performance', fixable: false },
  'UseIndexOfChar': { type: 'performance', fixable: true },
  'UselessStringValueOf': { type: 'performance', fixable: true },
  'UseStringBufferForStringAppends': { type: 'performance', fixable: false },
  'UseStringBufferLength': { type: 'performance', fixable: true },
};

// Checkstyle rule mappings
const CHECKSTYLE_RULES: Record<string, { type: IssueType; fixable: boolean }> = {
  // Javadoc
  'JavadocMethod': { type: 'maintainability', fixable: false },
  'JavadocType': { type: 'maintainability', fixable: false },
  'JavadocVariable': { type: 'maintainability', fixable: false },
  'JavadocStyle': { type: 'maintainability', fixable: false },
  'MissingJavadocMethod': { type: 'maintainability', fixable: false },
  'MissingJavadocType': { type: 'maintainability', fixable: false },

  // Naming
  'AbstractClassName': { type: 'style', fixable: false },
  'ClassTypeParameterName': { type: 'style', fixable: false },
  'ConstantName': { type: 'style', fixable: false },
  'InterfaceTypeParameterName': { type: 'style', fixable: false },
  'LocalFinalVariableName': { type: 'style', fixable: false },
  'LocalVariableName': { type: 'style', fixable: false },
  'MemberName': { type: 'style', fixable: false },
  'MethodName': { type: 'style', fixable: false },
  'MethodTypeParameterName': { type: 'style', fixable: false },
  'PackageName': { type: 'style', fixable: false },
  'ParameterName': { type: 'style', fixable: false },
  'StaticVariableName': { type: 'style', fixable: false },
  'TypeName': { type: 'style', fixable: false },

  // Imports
  'AvoidStarImport': { type: 'style', fixable: false },
  'AvoidStaticImport': { type: 'style', fixable: false },
  'IllegalImport': { type: 'quality', fixable: false },
  'ImportOrder': { type: 'style', fixable: false },
  'RedundantImport': { type: 'quality', fixable: true },  // Tier 2
  'UnusedImports': { type: 'quality', fixable: true },  // Tier 2

  // Size Violations
  'AnonInnerLength': { type: 'quality', fixable: false },
  'ExecutableStatementCount': { type: 'quality', fixable: false },
  'FileLength': { type: 'quality', fixable: false },
  'LineLength': { type: 'style', fixable: false },
  'MethodCount': { type: 'quality', fixable: false },
  'MethodLength': { type: 'quality', fixable: false },
  'OuterTypeNumber': { type: 'quality', fixable: false },
  'ParameterNumber': { type: 'quality', fixable: false },
  'RecordComponentNumber': { type: 'quality', fixable: false },

  // Whitespace
  'EmptyForInitializerPad': { type: 'style', fixable: true },
  'EmptyForIteratorPad': { type: 'style', fixable: true },
  'EmptyLineSeparator': { type: 'style', fixable: true },
  'GenericWhitespace': { type: 'style', fixable: true },
  'MethodParamPad': { type: 'style', fixable: true },
  'NoLineWrap': { type: 'style', fixable: false },
  'NoWhitespaceAfter': { type: 'style', fixable: true },
  'NoWhitespaceBefore': { type: 'style', fixable: true },
  'NoWhitespaceBeforeCaseDefaultColon': { type: 'style', fixable: true },
  'OperatorWrap': { type: 'style', fixable: false },
  'ParenPad': { type: 'style', fixable: true },
  'SeparatorWrap': { type: 'style', fixable: false },
  'SingleSpaceSeparator': { type: 'style', fixable: true },
  'TypecastParenPad': { type: 'style', fixable: true },
  'WhitespaceAfter': { type: 'style', fixable: true },
  'WhitespaceAround': { type: 'style', fixable: true },

  // Coding
  'ArrayTrailingComma': { type: 'style', fixable: true },
  'AvoidDoubleBraceInitialization': { type: 'quality', fixable: false },
  'AvoidInlineConditionals': { type: 'style', fixable: false },
  'AvoidNoArgumentSuperConstructorCall': { type: 'quality', fixable: true },
  'CovariantEquals': { type: 'quality', fixable: false },
  'DeclarationOrder': { type: 'style', fixable: false },
  'DefaultComesLast': { type: 'quality', fixable: false },
  'EmptyStatement': { type: 'quality', fixable: true },
  'EqualsAvoidNull': { type: 'quality', fixable: false },
  'EqualsHashCode': { type: 'quality', fixable: false },
  'ExplicitInitialization': { type: 'quality', fixable: true },
  'FallThrough': { type: 'quality', fixable: false },
  'FinalLocalVariable': { type: 'quality', fixable: false },
  'HiddenField': { type: 'quality', fixable: false },
  'IllegalCatch': { type: 'quality', fixable: false },
  'IllegalInstantiation': { type: 'quality', fixable: false },
  'IllegalThrows': { type: 'quality', fixable: false },
  'IllegalToken': { type: 'quality', fixable: false },
  'IllegalType': { type: 'quality', fixable: false },
  'InnerAssignment': { type: 'quality', fixable: false },
  'MagicNumber': { type: 'quality', fixable: false },
  'MissingCtor': { type: 'quality', fixable: false },
  'MissingSwitchDefault': { type: 'quality', fixable: false },
  'ModifiedControlVariable': { type: 'quality', fixable: false },
  'MultipleStringLiterals': { type: 'quality', fixable: false },
  'MultipleVariableDeclarations': { type: 'style', fixable: false },
  'NestedForDepth': { type: 'quality', fixable: false },
  'NestedIfDepth': { type: 'quality', fixable: false },
  'NestedTryDepth': { type: 'quality', fixable: false },
  'NoArrayTrailingComma': { type: 'style', fixable: true },
  'NoClone': { type: 'quality', fixable: false },
  'NoEnumTrailingComma': { type: 'style', fixable: true },
  'NoFinalizer': { type: 'quality', fixable: false },
  'OneStatementPerLine': { type: 'style', fixable: false },
  'OverloadMethodsDeclarationOrder': { type: 'style', fixable: false },
  'PackageDeclaration': { type: 'quality', fixable: false },
  'ParameterAssignment': { type: 'quality', fixable: false },
  'RequireThis': { type: 'quality', fixable: false },
  'ReturnCount': { type: 'quality', fixable: false },
  'SimplifyBooleanExpression': { type: 'quality', fixable: true },
  'SimplifyBooleanReturn': { type: 'quality', fixable: true },
  'StringLiteralEquality': { type: 'quality', fixable: false },
  'SuperClone': { type: 'quality', fixable: false },
  'SuperFinalize': { type: 'quality', fixable: false },
  'UnnecessaryParentheses': { type: 'style', fixable: true },
  'UnnecessarySemicolonAfterOuterTypeDeclaration': { type: 'style', fixable: true },
  'UnnecessarySemicolonAfterTypeMemberDeclaration': { type: 'style', fixable: true },
  'UnnecessarySemicolonInEnumeration': { type: 'style', fixable: true },
  'UnnecessarySemicolonInTryWithResources': { type: 'style', fixable: true },
  'VariableDeclarationUsageDistance': { type: 'quality', fixable: false },
};

// Combined lookup for all tools
const RULE_MAPPINGS: Record<string, Record<string, { type: IssueType; fixable: boolean }>> = {
  'eslint': ESLINT_RULES,
  'ruff': RUFF_RULES,
  'semgrep': SEMGREP_RULES,
  'pmd': PMD_RULES,
  'checkstyle': CHECKSTYLE_RULES,
};

/**
 * Classify an issue based on its rule ID and tool
 * Returns deterministic classification when rule is known,
 * or 'unknown' type for AI fallback
 *
 * Classification priority:
 * 1. Comprehensive rules from ./rules/ (ESLint 200+, TypeScript-ESLint 130+)
 * 2. Legacy inline rules (Ruff, PMD, Checkstyle, Semgrep)
 * 3. AI fallback for unknown rules
 */
export function classifyIssue(ruleId: string | undefined | null, tool: string): ClassifiedIssue {
  // Handle undefined/null ruleId - return unknown type for AI fallback
  if (!ruleId) {
    return {
      ruleId: 'unknown',
      tool,
      issueType: 'unknown',
      confidence: 0,
      fixable: false,
      fixTier: 3,  // AI fallback tier
    };
  }

  const normalizedTool = tool.toLowerCase();

  // Priority 1: Check comprehensive ESLint/TypeScript-ESLint rules
  if (normalizedTool === 'eslint' || normalizedTool.includes('eslint')) {
    const comprehensiveMatch = lookupESLintRule(ruleId);
    if (comprehensiveMatch) {
      return {
        ruleId,
        tool,
        issueType: comprehensiveMatch.type,
        confidence: 100,  // Deterministic match
        fixable: comprehensiveMatch.fixable,
        fixTier: determineFixTier(comprehensiveMatch.type, comprehensiveMatch.fixable, normalizedTool),
      };
    }
  }

  // Priority 2: Check legacy inline rules
  const toolRules = RULE_MAPPINGS[normalizedTool];

  if (toolRules) {
    // Try exact match first
    let match = toolRules[ruleId];

    // Try without prefix (e.g., '@typescript-eslint/no-unused-vars' -> 'no-unused-vars')
    if (!match && ruleId.includes('/')) {
      const shortRuleId = ruleId.split('/').pop();
      if (shortRuleId) {
        match = toolRules[shortRuleId];
      }
    }

    // Try case-insensitive match for PMD/Checkstyle
    if (!match && (normalizedTool === 'pmd' || normalizedTool === 'checkstyle')) {
      const lowerRuleId = ruleId.toLowerCase();
      for (const [key, value] of Object.entries(toolRules)) {
        if (key.toLowerCase() === lowerRuleId) {
          match = value;
          break;
        }
      }
    }

    if (match) {
      return {
        ruleId,
        tool,
        issueType: match.type,
        confidence: 100,  // Deterministic match
        fixable: match.fixable,
        fixTier: determineFixTier(match.type, match.fixable, normalizedTool),
      };
    }
  }

  // Priority 3: Tool-specific defaults for unknown rules
  // These tools have AI-based or native fix capabilities even for unknown rules

  // Semgrep: Security rules are AI-fixable (our AI fixer handles them well)
  if (normalizedTool === 'semgrep') {
    return {
      ruleId,
      tool,
      issueType: 'security',  // Semgrep primarily finds security issues
      confidence: 70,         // Medium confidence - we know it's security-related
      fixable: true,          // AI can generate fixes for semgrep findings
      fixTier: 2,             // Tier 2: AI-based fixing (not manual review)
    };
  }

  // npm-audit / dependency tools: Fixable with npm audit fix
  if (normalizedTool === 'npm-audit' || normalizedTool === 'dependency-check' ||
      normalizedTool === 'snyk' || normalizedTool === 'trivy') {
    return {
      ruleId,
      tool,
      issueType: 'dependency',
      confidence: 80,         // High confidence - these are dependency issues
      fixable: true,          // Most dependency issues are fixable with package updates
      fixTier: 1,             // Tier 1: Native tool can fix (npm audit fix, etc.)
    };
  }

  // BUG-094 FIX: Python dependency tools (pip-audit, safety)
  if (normalizedTool === 'pip-audit' || normalizedTool === 'safety') {
    return {
      ruleId,
      tool,
      issueType: 'dependency',
      confidence: 80,         // High confidence - these are Python dependency issues
      fixable: true,          // Fixable with pip-audit --fix or pip install --upgrade
      fixTier: 1,             // Tier 1: Native tool can fix
    };
  }

  // BUG-094 FIX: Python security tools (bandit)
  if (normalizedTool === 'bandit') {
    return {
      ruleId,
      tool,
      issueType: 'security',
      confidence: 80,         // High confidence - bandit finds security issues
      fixable: true,          // AI can generate security fixes
      fixTier: 2,             // Tier 2: AI-based fixing
    };
  }

  // BUG-094 FIX: Python code quality tools (pylint, mypy, flake8)
  if (normalizedTool === 'pylint' || normalizedTool === 'mypy' || normalizedTool === 'flake8') {
    return {
      ruleId,
      tool,
      issueType: 'quality',
      confidence: 70,         // Medium-high confidence
      fixable: true,          // Many rules fixable with AI or IDE
      fixTier: 2,             // Tier 2: AI-based or dedicated tool fixing
    };
  }

  // BUG-094 FIX: Go tools (golangci-lint, gosec)
  if (normalizedTool === 'golangci-lint' || normalizedTool === 'go-vet') {
    return {
      ruleId,
      tool,
      issueType: 'quality',
      confidence: 70,
      fixable: true,          // golangci-lint --fix available
      fixTier: 1,
    };
  }

  if (normalizedTool === 'gosec') {
    return {
      ruleId,
      tool,
      issueType: 'security',
      confidence: 80,
      fixable: true,          // AI can generate fixes
      fixTier: 2,
    };
  }

  // BUG-094 FIX: Ruby tools (rubocop, brakeman, bundler-audit)
  if (normalizedTool === 'rubocop') {
    return {
      ruleId,
      tool,
      issueType: 'quality',
      confidence: 70,
      fixable: true,          // rubocop -a available
      fixTier: 1,
    };
  }

  if (normalizedTool === 'brakeman') {
    return {
      ruleId,
      tool,
      issueType: 'security',
      confidence: 80,
      fixable: true,          // AI can generate fixes
      fixTier: 2,
    };
  }

  if (normalizedTool === 'bundler-audit') {
    return {
      ruleId,
      tool,
      issueType: 'dependency',
      confidence: 80,
      fixable: true,          // bundle update can fix
      fixTier: 1,
    };
  }

  // Default: Unknown rule needs AI classification
  return {
    ruleId,
    tool,
    issueType: 'unknown',
    confidence: 0,
    fixable: false,
    fixTier: 3,  // Default to AI fallback
  };
}

/**
 * Determine which fix tier should handle this issue
 */
function determineFixTier(issueType: IssueType, fixable: boolean, tool: string): 1 | 2 | 3 {
  // Tier 1: Native tool fixes (eslint --fix, ruff --fix, etc.)
  if (fixable && ['eslint', 'ruff', 'semgrep'].includes(tool)) {
    return 1;
  }

  // Tier 2: Dedicated fixer tools (Sorald, OpenRewrite, autoflake, etc.)
  if (fixable && ['pmd', 'checkstyle', 'spotbugs'].includes(tool)) {
    return 2;
  }

  // Tier 2 for Python quality issues that autoflake/pyupgrade can handle
  if (tool === 'ruff' && issueType === 'quality' && !fixable) {
    // Some ruff rules aren't auto-fixable but pyupgrade/autoflake can handle them
    return 2;
  }

  // Tier 3: AI fallback for everything else
  return 3;
}

/**
 * Batch classify multiple issues
 */
export function classifyIssues(issues: Array<{ ruleId: string; tool: string }>): ClassifiedIssue[] {
  return issues.map(issue => classifyIssue(issue.ruleId, issue.tool));
}

/**
 * Get statistics about classification coverage
 * Now includes comprehensive ESLint and TypeScript-ESLint rules
 */
export function getClassificationStats(): {
  totalRules: number;
  byTool: Record<string, number>;
  byType: Record<IssueType, number>;
  fixableCount: number;
  comprehensive: {
    eslint: number;
    typescriptEslint: number;
    eslintFixable: number;
    typescriptEslintFixable: number;
  };
} {
  const stats = {
    totalRules: 0,
    byTool: {} as Record<string, number>,
    byType: {} as Record<IssueType, number>,
    fixableCount: 0,
    comprehensive: {
      eslint: 0,
      typescriptEslint: 0,
      eslintFixable: 0,
      typescriptEslintFixable: 0,
    },
  };

  // Add legacy inline rules (Ruff, PMD, Checkstyle, Semgrep)
  for (const [tool, rules] of Object.entries(RULE_MAPPINGS)) {
    const ruleCount = Object.keys(rules).length;
    stats.totalRules += ruleCount;
    stats.byTool[tool] = ruleCount;

    for (const rule of Object.values(rules)) {
      stats.byType[rule.type] = (stats.byType[rule.type] || 0) + 1;
      if (rule.fixable) {
        stats.fixableCount++;
      }
    }
  }

  // Add comprehensive ESLint and TypeScript-ESLint rules
  const comprehensiveStats = getRuleCoverageStats();
  stats.comprehensive.eslint = comprehensiveStats.eslint.total;
  stats.comprehensive.typescriptEslint = comprehensiveStats.typescriptEslint.total;
  stats.comprehensive.eslintFixable = comprehensiveStats.eslint.fixable;
  stats.comprehensive.typescriptEslintFixable = comprehensiveStats.typescriptEslint.fixable;

  // Add to totals
  stats.totalRules += stats.comprehensive.eslint + stats.comprehensive.typescriptEslint;
  stats.fixableCount += stats.comprehensive.eslintFixable + stats.comprehensive.typescriptEslintFixable;
  stats.byTool['eslint-comprehensive'] = stats.comprehensive.eslint;
  stats.byTool['typescript-eslint-comprehensive'] = stats.comprehensive.typescriptEslint;

  return stats;
}

// Export rule mappings for extension
export { ESLINT_RULES, RUFF_RULES, SEMGREP_RULES, PMD_RULES, CHECKSTYLE_RULES };

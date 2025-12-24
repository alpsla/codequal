/**
 * Comprehensive Tool Database Schema
 *
 * This schema defines the structure for storing ALL analysis and fixer tools
 * across all 12 supported languages, with their rules and fix capabilities.
 *
 * Design Goals:
 * 1. Store ALL tools (analyzers + fixers) in one place
 * 2. Map rules from analyzers to appropriate fixers
 * 3. Track fix confidence and success rates
 * 4. Support dynamic rule updates
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type Language =
  | 'java' | 'python' | 'javascript' | 'typescript' | 'rust' | 'go'
  | 'csharp' | 'cpp' | 'c' | 'ruby' | 'php' | 'swift' | 'kotlin';

export type ToolType = 'analyzer' | 'fixer' | 'hybrid';  // hybrid = can analyze AND fix

export type ToolCategory =
  | 'security'       // Security vulnerabilities
  | 'quality'        // Code quality, linting
  | 'style'          // Formatting, style
  | 'performance'    // Performance issues
  | 'dependency'     // Dependency vulnerabilities
  | 'architecture'   // Architectural issues
  | 'secrets'        // Secret detection
  | 'type-safety'    // Type checking
  | 'compatibility'; // Language version compatibility

export type IssueType =
  | 'security' | 'quality' | 'style' | 'performance'
  | 'maintainability' | 'compatibility' | 'dependency' | 'unknown';

export type FixTier = 1 | 2 | 3;  // 1=native, 2=dedicated fixer, 3=AI

// =============================================================================
// TOOL DEFINITION
// =============================================================================

export interface Tool {
  id: string;                    // Unique identifier (e.g., 'eslint', 'pmd')
  name: string;                  // Display name
  type: ToolType;
  categories: ToolCategory[];
  languages: Language[];

  // Execution
  command: string;               // Default command to run
  outputFormat: 'json' | 'sarif' | 'xml' | 'text' | 'custom';

  // Fix capabilities
  hasNativeFix: boolean;         // Can fix with --fix flag
  nativeFixCommand?: string;     // Command for native fix (e.g., 'eslint --fix')

  // Metadata
  version?: string;
  documentationUrl?: string;
  ruleDocUrlPattern?: string;    // Pattern for rule docs (e.g., 'https://eslint.org/docs/rules/{ruleId}')

  // Status
  isEnabled: boolean;
  isInstalled?: boolean;         // Runtime check
  lastUpdated?: Date;
}

// =============================================================================
// RULE DEFINITION
// =============================================================================

export interface Rule {
  id: string;                    // Full rule ID (e.g., '@typescript-eslint/no-explicit-any')
  toolId: string;                // Reference to tool
  shortId?: string;              // Short ID without prefix (e.g., 'no-explicit-any')

  // Classification
  issueType: IssueType;
  severity: 'error' | 'warning' | 'info' | 'hint';

  // Fix information
  fixable: boolean;              // Can this rule be auto-fixed?
  fixTier: FixTier;              // Which tier should fix this?
  fixerToolId?: string;          // Which fixer handles this? (if not native)

  // Metadata
  description?: string;
  documentationUrl?: string;

  // TypeScript-specific
  requiresTypeInfo?: boolean;    // Needs type-aware parsing
  extendsBaseRule?: string;      // Extends another rule (e.g., TS version of ESLint rule)

  // Deprecation
  deprecated?: boolean;
  replacedBy?: string;

  // Statistics (for ML/optimization)
  fixSuccessRate?: number;       // Historical success rate
  avgFixTime?: number;           // Average time to fix (ms)
}

// =============================================================================
// FIXER MAPPING
// =============================================================================

export interface FixerMapping {
  analyzerToolId: string;        // Tool that detects the issue
  rulePattern: string;           // Regex pattern for rule IDs
  fixerToolId: string;           // Tool that fixes the issue
  fixTier: FixTier;
  confidence: number;            // 0-100, how confident are we this fixer works
  notes?: string;                // Special handling notes
}

// =============================================================================
// COMPLETE TOOL REGISTRY
// =============================================================================

export interface ToolRegistry {
  tools: Record<string, Tool>;
  rules: Record<string, Rule>;   // Keyed by `${toolId}:${ruleId}`
  fixerMappings: FixerMapping[];

  // Metadata
  version: string;
  lastUpdated: Date;
}

// =============================================================================
// SEED DATA - ALL KNOWN TOOLS
// =============================================================================

export const SEED_TOOLS: Tool[] = [
  // =========================================================================
  // JAVA TOOLS
  // =========================================================================
  {
    id: 'pmd',
    name: 'PMD',
    type: 'analyzer',
    categories: ['quality', 'security', 'performance'],
    languages: ['java', 'kotlin'],
    command: 'pmd pmd -d . -R rulesets/java/quickstart.xml -f json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://pmd.github.io/',
    ruleDocUrlPattern: 'https://pmd.github.io/latest/pmd_rules_java_{category}.html#{ruleId}',
    isEnabled: true,
  },
  {
    id: 'checkstyle',
    name: 'Checkstyle',
    type: 'analyzer',
    categories: ['style', 'quality'],
    languages: ['java'],
    command: 'checkstyle -c /google_checks.xml -f xml .',
    outputFormat: 'xml',
    hasNativeFix: false,
    documentationUrl: 'https://checkstyle.org/',
    ruleDocUrlPattern: 'https://checkstyle.org/checks/{category}/{ruleId}.html',
    isEnabled: true,
  },
  {
    id: 'spotbugs',
    name: 'SpotBugs',
    type: 'analyzer',
    categories: ['security', 'quality', 'performance'],
    languages: ['java'],
    command: 'spotbugs -textui -effort:max -xml:withMessages .',
    outputFormat: 'xml',
    hasNativeFix: false,
    documentationUrl: 'https://spotbugs.github.io/',
    isEnabled: true,
  },
  {
    id: 'error-prone',
    name: 'Error Prone',
    type: 'hybrid',
    categories: ['quality', 'security'],
    languages: ['java'],
    command: 'javac -XDcompilePolicy=simple -processorpath error_prone_core.jar',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: '-XepPatchChecks:{checks} -XepPatchLocation:.',
    documentationUrl: 'https://errorprone.info/',
    isEnabled: true,
  },
  {
    id: 'sorald',
    name: 'Sorald',
    type: 'fixer',
    categories: ['quality'],
    languages: ['java'],
    command: 'sorald repair --source . --rule-key {ruleKey}',
    outputFormat: 'json',
    hasNativeFix: true,
    documentationUrl: 'https://github.com/SpoonLabs/sorald',
    isEnabled: true,
  },
  {
    id: 'openrewrite',
    name: 'OpenRewrite',
    type: 'fixer',
    categories: ['quality', 'style', 'dependency'],
    languages: ['java', 'kotlin'],
    command: 'mvn rewrite:run -Drewrite.activeRecipes={recipe}',
    outputFormat: 'text',
    hasNativeFix: true,
    documentationUrl: 'https://docs.openrewrite.org/',
    isEnabled: true,
  },

  // =========================================================================
  // PYTHON TOOLS
  // =========================================================================
  {
    id: 'ruff',
    name: 'Ruff',
    type: 'hybrid',
    categories: ['quality', 'style', 'security'],
    languages: ['python'],
    command: 'ruff check . --output-format json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'ruff check . --fix',
    documentationUrl: 'https://docs.astral.sh/ruff/',
    ruleDocUrlPattern: 'https://docs.astral.sh/ruff/rules/{ruleId}',
    isEnabled: true,
  },
  {
    id: 'bandit',
    name: 'Bandit',
    type: 'analyzer',
    categories: ['security'],
    languages: ['python'],
    command: 'bandit -r . -f json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://bandit.readthedocs.io/',
    isEnabled: true,
  },
  {
    id: 'pylint',
    name: 'Pylint',
    type: 'analyzer',
    categories: ['quality', 'style'],
    languages: ['python'],
    command: 'pylint . --output-format=json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://pylint.pycqa.org/',
    ruleDocUrlPattern: 'https://pylint.pycqa.org/en/latest/messages/{category}/{ruleId}.html',
    isEnabled: true,
  },
  {
    id: 'mypy',
    name: 'Mypy',
    type: 'analyzer',
    categories: ['type-safety'],
    languages: ['python'],
    command: 'mypy . --output json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://mypy.readthedocs.io/',
    isEnabled: true,
  },
  {
    id: 'black',
    name: 'Black',
    type: 'fixer',
    categories: ['style'],
    languages: ['python'],
    command: 'black --check .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'black .',
    documentationUrl: 'https://black.readthedocs.io/',
    isEnabled: true,
  },
  {
    id: 'isort',
    name: 'isort',
    type: 'fixer',
    categories: ['style'],
    languages: ['python'],
    command: 'isort --check-only .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'isort .',
    documentationUrl: 'https://pycqa.github.io/isort/',
    isEnabled: true,
  },
  {
    id: 'autoflake',
    name: 'autoflake',
    type: 'fixer',
    categories: ['quality'],
    languages: ['python'],
    command: 'autoflake --check .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'autoflake --in-place --remove-all-unused-imports --remove-unused-variables .',
    documentationUrl: 'https://github.com/PyCQA/autoflake',
    isEnabled: true,
  },
  {
    id: 'pyupgrade',
    name: 'pyupgrade',
    type: 'fixer',
    categories: ['quality', 'compatibility'],
    languages: ['python'],
    command: 'pyupgrade --py3-plus *.py',
    outputFormat: 'text',
    hasNativeFix: true,
    documentationUrl: 'https://github.com/asottile/pyupgrade',
    isEnabled: true,
  },
  {
    id: 'safety',
    name: 'Safety',
    type: 'analyzer',
    categories: ['dependency', 'security'],
    languages: ['python'],
    command: 'safety check --json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://safetycli.com/',
    isEnabled: true,
  },
  {
    id: 'pip-audit',
    name: 'pip-audit',
    type: 'hybrid',
    categories: ['dependency', 'security'],
    languages: ['python'],
    command: 'pip-audit --format json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'pip-audit --fix',
    documentationUrl: 'https://github.com/pypa/pip-audit',
    isEnabled: true,
  },

  // =========================================================================
  // JAVASCRIPT TOOLS (JS-Only or JS-Primary)
  // =========================================================================
  {
    id: 'eslint-js',
    name: 'ESLint (JavaScript)',
    type: 'hybrid',
    categories: ['quality', 'style', 'security'],
    languages: ['javascript'],
    command: 'eslint . --format json --ext .js,.jsx,.mjs,.cjs',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'eslint . --fix --ext .js,.jsx,.mjs,.cjs',
    documentationUrl: 'https://eslint.org/',
    ruleDocUrlPattern: 'https://eslint.org/docs/rules/{ruleId}',
    isEnabled: true,
  },
  {
    id: 'prettier-js',
    name: 'Prettier (JavaScript)',
    type: 'fixer',
    categories: ['style'],
    languages: ['javascript'],
    command: 'prettier --check "**/*.{js,jsx,mjs,cjs}"',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'prettier --write "**/*.{js,jsx,mjs,cjs}"',
    documentationUrl: 'https://prettier.io/',
    isEnabled: true,
  },
  {
    id: 'biome-js',
    name: 'Biome (JavaScript)',
    type: 'hybrid',
    categories: ['quality', 'style'],
    languages: ['javascript'],
    command: 'biome check --files-ignore-unknown=true "**/*.{js,jsx,mjs,cjs}"',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'biome check --apply "**/*.{js,jsx,mjs,cjs}"',
    documentationUrl: 'https://biomejs.dev/',
    isEnabled: true,
  },
  {
    id: 'npm-audit-js',
    name: 'npm audit (JavaScript)',
    type: 'hybrid',
    categories: ['dependency', 'security'],
    languages: ['javascript'],
    command: 'npm audit --json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'npm audit fix',
    documentationUrl: 'https://docs.npmjs.com/cli/v10/commands/npm-audit',
    isEnabled: true,
  },
  {
    id: 'jshint',
    name: 'JSHint',
    type: 'analyzer',
    categories: ['quality'],
    languages: ['javascript'],
    command: 'jshint . --reporter=json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://jshint.com/',
    isEnabled: true,
  },
  {
    id: 'standardjs',
    name: 'StandardJS',
    type: 'hybrid',
    categories: ['style', 'quality'],
    languages: ['javascript'],
    command: 'standard --verbose | snazzy',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'standard --fix',
    documentationUrl: 'https://standardjs.com/',
    isEnabled: true,
  },

  // =========================================================================
  // TYPESCRIPT TOOLS (TS-Only or TS-Primary)
  // =========================================================================
  {
    id: 'eslint-ts',
    name: 'ESLint (TypeScript)',
    type: 'hybrid',
    categories: ['quality', 'style', 'security'],
    languages: ['typescript'],
    command: 'eslint . --format json --ext .ts,.tsx,.mts,.cts',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'eslint . --fix --ext .ts,.tsx,.mts,.cts',
    documentationUrl: 'https://eslint.org/',
    ruleDocUrlPattern: 'https://eslint.org/docs/rules/{ruleId}',
    isEnabled: true,
  },
  {
    id: 'typescript-eslint',
    name: 'TypeScript-ESLint',
    type: 'hybrid',
    categories: ['quality', 'type-safety'],
    languages: ['typescript'],
    command: 'eslint . --format json --ext .ts,.tsx',  // Uses ESLint with TS plugin
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'eslint . --fix --ext .ts,.tsx',
    documentationUrl: 'https://typescript-eslint.io/',
    ruleDocUrlPattern: 'https://typescript-eslint.io/rules/{ruleId}',
    isEnabled: true,
  },
  {
    id: 'prettier-ts',
    name: 'Prettier (TypeScript)',
    type: 'fixer',
    categories: ['style'],
    languages: ['typescript'],
    command: 'prettier --check "**/*.{ts,tsx,mts,cts}"',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'prettier --write "**/*.{ts,tsx,mts,cts}"',
    documentationUrl: 'https://prettier.io/',
    isEnabled: true,
  },
  {
    id: 'biome-ts',
    name: 'Biome (TypeScript)',
    type: 'hybrid',
    categories: ['quality', 'style'],
    languages: ['typescript'],
    command: 'biome check --files-ignore-unknown=true "**/*.{ts,tsx,mts,cts}"',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'biome check --apply "**/*.{ts,tsx,mts,cts}"',
    documentationUrl: 'https://biomejs.dev/',
    isEnabled: true,
  },
  {
    id: 'npm-audit-ts',
    name: 'npm audit (TypeScript)',
    type: 'hybrid',
    categories: ['dependency', 'security'],
    languages: ['typescript'],
    command: 'npm audit --json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'npm audit fix',
    documentationUrl: 'https://docs.npmjs.com/cli/v10/commands/npm-audit',
    isEnabled: true,
  },
  {
    id: 'tsc',
    name: 'TypeScript Compiler',
    type: 'analyzer',
    categories: ['type-safety', 'quality'],
    languages: ['typescript'],
    command: 'tsc --noEmit',
    outputFormat: 'text',
    hasNativeFix: false,
    documentationUrl: 'https://www.typescriptlang.org/',
    ruleDocUrlPattern: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
    isEnabled: true,
  },
  {
    id: 'ts-prune',
    name: 'ts-prune',
    type: 'analyzer',
    categories: ['quality'],
    languages: ['typescript'],
    command: 'ts-prune',
    outputFormat: 'text',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/nadeesha/ts-prune',
    isEnabled: true,
  },

  // =========================================================================
  // RUST TOOLS
  // =========================================================================
  {
    id: 'clippy',
    name: 'Clippy',
    type: 'hybrid',
    categories: ['quality', 'performance', 'style'],
    languages: ['rust'],
    command: 'cargo clippy --message-format=json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'cargo clippy --fix',
    documentationUrl: 'https://rust-lang.github.io/rust-clippy/',
    isEnabled: true,
  },
  {
    id: 'rustfmt',
    name: 'rustfmt',
    type: 'fixer',
    categories: ['style'],
    languages: ['rust'],
    command: 'cargo fmt -- --check',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'cargo fmt',
    documentationUrl: 'https://rust-lang.github.io/rustfmt/',
    isEnabled: true,
  },
  {
    id: 'cargo-audit',
    name: 'cargo-audit',
    type: 'analyzer',
    categories: ['dependency', 'security'],
    languages: ['rust'],
    command: 'cargo audit --json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://rustsec.org/',
    isEnabled: true,
  },

  // =========================================================================
  // GO TOOLS
  // =========================================================================
  {
    id: 'golangci-lint',
    name: 'golangci-lint',
    type: 'hybrid',
    categories: ['quality', 'security', 'performance', 'style'],
    languages: ['go'],
    command: 'golangci-lint run --out-format json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'golangci-lint run --fix',
    documentationUrl: 'https://golangci-lint.run/',
    isEnabled: true,
  },
  {
    id: 'gosec',
    name: 'gosec',
    type: 'analyzer',
    categories: ['security'],
    languages: ['go'],
    command: 'gosec -fmt json ./...',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://securego.io/',
    isEnabled: true,
  },
  {
    id: 'gofmt',
    name: 'gofmt',
    type: 'fixer',
    categories: ['style'],
    languages: ['go'],
    command: 'gofmt -l .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'gofmt -w .',
    documentationUrl: 'https://pkg.go.dev/cmd/gofmt',
    isEnabled: true,
  },
  {
    id: 'goimports',
    name: 'goimports',
    type: 'fixer',
    categories: ['style'],
    languages: ['go'],
    command: 'goimports -l .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'goimports -w .',
    documentationUrl: 'https://pkg.go.dev/golang.org/x/tools/cmd/goimports',
    isEnabled: true,
  },

  // =========================================================================
  // CROSS-LANGUAGE TOOLS
  // =========================================================================
  {
    id: 'semgrep',
    name: 'Semgrep',
    type: 'hybrid',
    categories: ['security', 'quality'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust', 'kotlin', 'swift', 'c', 'cpp'],
    command: 'semgrep --config=auto --json .',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'semgrep --config=auto --autofix .',
    documentationUrl: 'https://semgrep.dev/',
    isEnabled: true,
  },
  // =========================================================================
  // P0 CRITICAL SECURITY TOOLS (Session 59)
  // =========================================================================
  {
    id: 'gitleaks',
    name: 'Gitleaks',
    type: 'analyzer',
    categories: ['secrets', 'security'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust', 'kotlin', 'swift', 'c', 'cpp'],
    command: 'gitleaks detect --source . --format json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://gitleaks.io/',
    isEnabled: true,
  },
  {
    id: 'trufflehog',
    name: 'TruffleHog',
    type: 'analyzer',
    categories: ['secrets', 'security'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust', 'kotlin', 'swift', 'c', 'cpp'],
    command: 'trufflehog filesystem . --json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://trufflesecurity.com/trufflehog',
    isEnabled: true,
  },
  {
    id: 'checkov',
    name: 'Checkov',
    type: 'hybrid',
    categories: ['security'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp', 'rust'],
    command: 'checkov -d . --output json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'checkov -d . --fix',
    documentationUrl: 'https://www.checkov.io/',
    isEnabled: true,
  },
  {
    id: 'trivy',
    name: 'Trivy',
    type: 'analyzer',
    categories: ['security', 'dependency'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'rust'],
    command: 'trivy fs . --format json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://trivy.dev/',
    isEnabled: true,
  },
  {
    id: 'grype',
    name: 'Grype',
    type: 'analyzer',
    categories: ['security', 'dependency'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'rust'],
    command: 'grype dir:. -o json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/anchore/grype',
    isEnabled: true,
  },

  // =========================================================================
  // P1 API/GraphQL TOOLS (Session 59)
  // =========================================================================
  {
    id: 'spectral',
    name: 'Spectral',
    type: 'hybrid',
    categories: ['quality'],
    languages: ['javascript', 'typescript', 'java', 'python', 'go', 'ruby', 'php'],
    command: 'spectral lint . --format json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'spectral lint . --fix',
    documentationUrl: 'https://stoplight.io/open-source/spectral',
    isEnabled: true,
  },
  {
    id: 'graphql-cop',
    name: 'GraphQL-Cop',
    type: 'analyzer',
    categories: ['security'],
    languages: ['javascript', 'typescript', 'java', 'python', 'go', 'ruby'],
    command: 'graphql-cop -t http://localhost:4000/graphql',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/dolevf/graphql-cop',
    isEnabled: true,
  },
  {
    id: 'snyk',
    name: 'Snyk',
    type: 'hybrid',
    categories: ['security', 'dependency'],
    languages: ['java', 'python', 'javascript', 'typescript', 'go', 'ruby', 'php', 'csharp'],
    command: 'snyk test --json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'snyk fix',
    documentationUrl: 'https://snyk.io/',
    isEnabled: false,  // PAID TOOL - disabled until enterprise clients
  },
  {
    id: 'dependency-check',
    name: 'OWASP Dependency-Check',
    type: 'analyzer',
    categories: ['dependency', 'security'],
    languages: ['java', 'javascript', 'typescript', 'python', 'ruby', 'php'],
    command: 'dependency-check --scan . --format JSON',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://owasp.org/www-project-dependency-check/',
    isEnabled: true,
  },

  // =========================================================================
  // RUBY TOOLS
  // =========================================================================
  {
    id: 'rubocop',
    name: 'RuboCop',
    type: 'hybrid',
    categories: ['quality', 'style'],
    languages: ['ruby'],
    command: 'rubocop --format json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'rubocop -a',
    documentationUrl: 'https://rubocop.org/',
    isEnabled: true,
  },
  {
    id: 'brakeman',
    name: 'Brakeman',
    type: 'analyzer',
    categories: ['security'],
    languages: ['ruby'],
    command: 'brakeman -f json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://brakemanscanner.org/',
    isEnabled: true,
  },
  {
    id: 'bundler-audit',
    name: 'bundler-audit',
    type: 'hybrid',
    categories: ['dependency', 'security'],
    languages: ['ruby'],
    command: 'bundle-audit check --format json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'bundle-audit update',
    documentationUrl: 'https://github.com/rubysec/bundler-audit',
    isEnabled: true,
  },

  // =========================================================================
  // PHP TOOLS
  // =========================================================================
  {
    id: 'phpcs',
    name: 'PHP_CodeSniffer',
    type: 'analyzer',
    categories: ['quality', 'style'],
    languages: ['php'],
    command: 'phpcs --report=json .',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/squizlabs/PHP_CodeSniffer',
    isEnabled: true,
  },
  {
    id: 'phpcbf',
    name: 'PHP Code Beautifier',
    type: 'fixer',
    categories: ['style'],
    languages: ['php'],
    command: 'phpcbf .',
    outputFormat: 'text',
    hasNativeFix: true,
    documentationUrl: 'https://github.com/squizlabs/PHP_CodeSniffer',
    isEnabled: true,
  },
  {
    id: 'phpstan',
    name: 'PHPStan',
    type: 'analyzer',
    categories: ['quality', 'type-safety'],
    languages: ['php'],
    command: 'phpstan analyse --error-format=json .',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://phpstan.org/',
    isEnabled: true,
  },
  {
    id: 'psalm',
    name: 'Psalm',
    type: 'hybrid',
    categories: ['quality', 'type-safety', 'security'],
    languages: ['php'],
    command: 'psalm --output-format=json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'psalm --alter --issues=all',
    documentationUrl: 'https://psalm.dev/',
    isEnabled: true,
  },

  // =========================================================================
  // C# TOOLS
  // =========================================================================
  {
    id: 'dotnet-format',
    name: 'dotnet format',
    type: 'fixer',
    categories: ['style'],
    languages: ['csharp'],
    command: 'dotnet format --verify-no-changes',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'dotnet format',
    documentationUrl: 'https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-format',
    isEnabled: true,
  },
  {
    id: 'roslyn-analyzers',
    name: 'Roslyn Analyzers',
    type: 'analyzer',
    categories: ['quality', 'security'],
    languages: ['csharp'],
    command: 'dotnet build /p:TreatWarningsAsErrors=false',
    outputFormat: 'text',
    hasNativeFix: false,
    documentationUrl: 'https://learn.microsoft.com/en-us/visualstudio/code-quality/roslyn-analyzers-overview',
    isEnabled: true,
  },

  // =========================================================================
  // C/C++ TOOLS
  // =========================================================================
  {
    id: 'cppcheck',
    name: 'Cppcheck',
    type: 'analyzer',
    categories: ['quality', 'security'],
    languages: ['c', 'cpp'],
    command: 'cppcheck --enable=all --xml .',
    outputFormat: 'xml',
    hasNativeFix: false,
    documentationUrl: 'https://cppcheck.sourceforge.io/',
    isEnabled: true,
  },
  {
    id: 'clang-tidy',
    name: 'clang-tidy',
    type: 'hybrid',
    categories: ['quality', 'security', 'performance'],
    languages: ['c', 'cpp'],
    command: 'clang-tidy -checks=* .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'clang-tidy --fix -checks=* .',
    documentationUrl: 'https://clang.llvm.org/extra/clang-tidy/',
    isEnabled: true,
  },
  {
    id: 'clang-format',
    name: 'clang-format',
    type: 'fixer',
    categories: ['style'],
    languages: ['c', 'cpp'],
    command: 'clang-format --dry-run .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'clang-format -i .',
    documentationUrl: 'https://clang.llvm.org/docs/ClangFormat.html',
    isEnabled: true,
  },

  // =========================================================================
  // SWIFT TOOLS
  // =========================================================================
  {
    id: 'swiftlint',
    name: 'SwiftLint',
    type: 'hybrid',
    categories: ['quality', 'style'],
    languages: ['swift'],
    command: 'swiftlint --reporter json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'swiftlint --fix',
    documentationUrl: 'https://realm.github.io/SwiftLint/',
    isEnabled: true,
  },
  {
    id: 'swift-format',
    name: 'swift-format',
    type: 'fixer',
    categories: ['style'],
    languages: ['swift'],
    command: 'swift-format lint .',
    outputFormat: 'text',
    hasNativeFix: true,
    nativeFixCommand: 'swift-format format --in-place .',
    documentationUrl: 'https://github.com/apple/swift-format',
    isEnabled: true,
  },

  // =========================================================================
  // KOTLIN TOOLS
  // =========================================================================
  {
    id: 'detekt',
    name: 'detekt',
    type: 'hybrid',
    categories: ['quality', 'style'],
    languages: ['kotlin'],
    command: 'detekt --report json:detekt-report.json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'detekt --auto-correct',
    documentationUrl: 'https://detekt.dev/',
    isEnabled: true,
  },
  {
    id: 'ktlint',
    name: 'ktlint',
    type: 'hybrid',
    categories: ['style'],
    languages: ['kotlin'],
    command: 'ktlint --reporter=json',
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'ktlint -F',
    documentationUrl: 'https://pinterest.github.io/ktlint/',
    isEnabled: true,
  },

  // =========================================================================
  // P2 ARCHITECTURE TOOLS (Session 59)
  // =========================================================================

  // TypeScript Architecture
  {
    id: 'madge',
    name: 'Madge',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['javascript', 'typescript'],
    command: 'madge --circular --json .',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/pahen/madge',
    isEnabled: true,
  },
  {
    id: 'dependency-cruiser',
    name: 'Dependency Cruiser',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['javascript', 'typescript'],
    command: 'depcruise --output-type json .',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/sverweij/dependency-cruiser',
    isEnabled: true,
  },
  {
    id: 'ts-unused-exports',
    name: 'ts-unused-exports',
    type: 'analyzer',
    categories: ['architecture', 'quality'],
    languages: ['typescript'],
    command: 'ts-unused-exports tsconfig.json --excludePathsFromReport=node_modules',
    outputFormat: 'text',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/pzavolinsky/ts-unused-exports',
    isEnabled: true,
  },

  // Python Architecture
  {
    id: 'pydeps',
    name: 'pydeps',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['python'],
    command: 'pydeps . --show-deps --no-show --noshow',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/thebjorn/pydeps',
    isEnabled: true,
  },
  {
    id: 'import-linter',
    name: 'Import Linter',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['python'],
    command: 'lint-imports',
    outputFormat: 'text',
    hasNativeFix: false,
    documentationUrl: 'https://import-linter.readthedocs.io/',
    isEnabled: true,
  },

  // Java Architecture
  {
    id: 'jdepend',
    name: 'JDepend',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['java'],
    command: 'jdepend -xml target/classes',
    outputFormat: 'xml',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/clarkware/jdepend',
    isEnabled: true,
  },

  // Go Architecture
  {
    id: 'go-arch-lint',
    name: 'go-arch-lint',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['go'],
    command: 'go-arch-lint check --project-path .',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/fe3dback/go-arch-lint',
    isEnabled: true,
  },

  // Rust Architecture
  {
    id: 'cargo-modules',
    name: 'cargo-modules',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['rust'],
    command: 'cargo modules structure --json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/regber/cargo-modules',
    isEnabled: true,
  },

  // Ruby Architecture
  {
    id: 'packwerk',
    name: 'Packwerk',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['ruby'],
    command: 'packwerk check',
    outputFormat: 'text',
    hasNativeFix: false,
    documentationUrl: 'https://github.com/Shopify/packwerk',
    isEnabled: true,
  },

  // PHP Architecture
  {
    id: 'deptrac',
    name: 'Deptrac',
    type: 'analyzer',
    categories: ['architecture'],
    languages: ['php'],
    command: 'deptrac analyse --report-uncovered --formatter json',
    outputFormat: 'json',
    hasNativeFix: false,
    documentationUrl: 'https://qossmic.github.io/deptrac/',
    isEnabled: true,
  },

  // =========================================================================
  // TIER 3 AI FIXER (Virtual Tool)
  // =========================================================================
  {
    id: 'ai',
    name: 'AI Fixer (Tier 3)',
    type: 'fixer',
    categories: ['quality', 'security', 'performance', 'style', 'dependency', 'type-safety', 'architecture'],
    languages: ['java', 'python', 'javascript', 'typescript', 'rust', 'go', 'csharp', 'cpp', 'c', 'ruby', 'php', 'swift', 'kotlin'],
    command: 'codequal-ai-fix',  // Virtual command - handled by AI system
    outputFormat: 'json',
    hasNativeFix: true,
    nativeFixCommand: 'codequal-ai-fix --apply',
    documentationUrl: 'https://codequal.dev/docs/ai-fixer',
    isEnabled: true,
  },
];

// =============================================================================
// FIXER MAPPINGS - Which fixer handles which analyzer's issues
// =============================================================================

export const SEED_FIXER_MAPPINGS: FixerMapping[] = [
  // Java
  { analyzerToolId: 'pmd', rulePattern: '.*', fixerToolId: 'sorald', fixTier: 2, confidence: 75 },
  { analyzerToolId: 'checkstyle', rulePattern: '.*', fixerToolId: 'openrewrite', fixTier: 2, confidence: 70 },

  // Python - Ruff handles most Python linting issues (Ruff has replaced Flake8)
  { analyzerToolId: 'pylint', rulePattern: '(C|W|R)\\d+', fixerToolId: 'ruff', fixTier: 1, confidence: 85 },
  { analyzerToolId: 'ruff', rulePattern: '.*', fixerToolId: 'ruff', fixTier: 1, confidence: 95 },
  { analyzerToolId: 'pylint', rulePattern: 'W0611', fixerToolId: 'autoflake', fixTier: 2, confidence: 95, notes: 'Unused imports' },
  { analyzerToolId: 'pylint', rulePattern: 'C0411', fixerToolId: 'isort', fixTier: 1, confidence: 95, notes: 'Import order' },

  // JavaScript (eslint-js)
  { analyzerToolId: 'eslint-js', rulePattern: '.*', fixerToolId: 'eslint-js', fixTier: 1, confidence: 90 },
  { analyzerToolId: 'jshint', rulePattern: '.*', fixerToolId: 'eslint-js', fixTier: 2, confidence: 70, notes: 'JSHint issues often fixable by ESLint' },
  { analyzerToolId: 'standardjs', rulePattern: '.*', fixerToolId: 'standardjs', fixTier: 1, confidence: 95 },

  // TypeScript (eslint-ts, typescript-eslint, tsc)
  { analyzerToolId: 'eslint-ts', rulePattern: '.*', fixerToolId: 'eslint-ts', fixTier: 1, confidence: 90 },
  { analyzerToolId: 'typescript-eslint', rulePattern: '.*', fixerToolId: 'typescript-eslint', fixTier: 1, confidence: 85 },
  { analyzerToolId: 'typescript-eslint', rulePattern: '@typescript-eslint/.*', fixerToolId: 'typescript-eslint', fixTier: 1, confidence: 90 },
  { analyzerToolId: 'tsc', rulePattern: 'TS\\d+', fixerToolId: 'ai', fixTier: 3, confidence: 60, notes: 'Type errors need AI' },
  { analyzerToolId: 'ts-prune', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 50, notes: 'Unused exports need manual review' },

  // Rust
  { analyzerToolId: 'clippy', rulePattern: '.*', fixerToolId: 'clippy', fixTier: 1, confidence: 85 },

  // Go
  { analyzerToolId: 'golangci-lint', rulePattern: '.*', fixerToolId: 'golangci-lint', fixTier: 1, confidence: 80 },
  { analyzerToolId: 'gosec', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 60, notes: 'Security issues need review' },

  // Ruby
  { analyzerToolId: 'rubocop', rulePattern: '.*', fixerToolId: 'rubocop', fixTier: 1, confidence: 85 },

  // PHP
  { analyzerToolId: 'phpcs', rulePattern: '.*', fixerToolId: 'phpcbf', fixTier: 2, confidence: 80 },
  { analyzerToolId: 'psalm', rulePattern: '.*', fixerToolId: 'psalm', fixTier: 1, confidence: 75 },

  // C/C++
  { analyzerToolId: 'cppcheck', rulePattern: '.*', fixerToolId: 'clang-tidy', fixTier: 2, confidence: 70 },
  { analyzerToolId: 'clang-tidy', rulePattern: '.*', fixerToolId: 'clang-tidy', fixTier: 1, confidence: 85 },

  // Swift
  { analyzerToolId: 'swiftlint', rulePattern: '.*', fixerToolId: 'swiftlint', fixTier: 1, confidence: 85 },

  // Kotlin
  { analyzerToolId: 'detekt', rulePattern: '.*', fixerToolId: 'detekt', fixTier: 1, confidence: 80 },
  { analyzerToolId: 'ktlint', rulePattern: '.*', fixerToolId: 'ktlint', fixTier: 1, confidence: 90 },

  // Cross-language (Semgrep)
  { analyzerToolId: 'semgrep', rulePattern: '.*', fixerToolId: 'semgrep', fixTier: 1, confidence: 70, notes: 'Autofix available for some rules' },

  // Dependency tools - generally need manual/AI intervention
  { analyzerToolId: 'npm-audit-js', rulePattern: '.*', fixerToolId: 'npm-audit-js', fixTier: 1, confidence: 60 },
  { analyzerToolId: 'npm-audit-ts', rulePattern: '.*', fixerToolId: 'npm-audit-ts', fixTier: 1, confidence: 60 },
  { analyzerToolId: 'safety', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 50 },
  { analyzerToolId: 'cargo-audit', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 50 },
  { analyzerToolId: 'bundler-audit', rulePattern: '.*', fixerToolId: 'bundler-audit', fixTier: 2, confidence: 60 },

  // Secret detection - always needs manual review
  { analyzerToolId: 'gitleaks', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 30, notes: 'Secrets need careful manual review' },
  { analyzerToolId: 'trufflehog', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 30, notes: 'Secrets need careful manual review' },

  // P0 Security Tools (Session 59)
  { analyzerToolId: 'checkov', rulePattern: '.*', fixerToolId: 'checkov', fixTier: 2, confidence: 70, notes: 'Partial fix support for ~30% of checks' },
  { analyzerToolId: 'trivy', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 40, notes: 'Dependency updates need review' },
  { analyzerToolId: 'grype', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 40, notes: 'Dependency updates need review' },

  // P1 API/GraphQL Tools (Session 59)
  { analyzerToolId: 'spectral', rulePattern: '.*', fixerToolId: 'spectral', fixTier: 2, confidence: 60, notes: 'API schema fixes' },
  { analyzerToolId: 'graphql-cop', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 50, notes: 'GraphQL security issues need manual review' },

  // P2 Architecture Tools (Session 59) - All need AI/manual due to architectural nature
  { analyzerToolId: 'madge', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 20, notes: 'Circular dependencies require architectural changes' },
  { analyzerToolId: 'dependency-cruiser', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 25, notes: 'Architecture rule violations need design changes' },
  { analyzerToolId: 'ts-unused-exports', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 60, notes: 'Dead code removal is relatively safe' },
  { analyzerToolId: 'pydeps', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 25, notes: 'Circular dependencies require architectural changes' },
  { analyzerToolId: 'import-linter', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 20, notes: 'Layer violations require architectural refactoring' },
  { analyzerToolId: 'jdepend', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 20, notes: 'Package cycles require architectural refactoring' },
  { analyzerToolId: 'go-arch-lint', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 20, notes: 'Architecture violations require design changes' },
  { analyzerToolId: 'cargo-modules', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 25, notes: 'Circular dependencies require module restructuring' },
  { analyzerToolId: 'packwerk', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 30, notes: 'Boundary violations require package restructuring' },
  { analyzerToolId: 'deptrac', rulePattern: '.*', fixerToolId: 'ai', fixTier: 3, confidence: 25, notes: 'Layer violations require architecture refactoring' },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all tools for a specific language
 */
export function getToolsForLanguage(language: Language): Tool[] {
  return SEED_TOOLS.filter(tool => tool.languages.includes(language));
}

/**
 * Get all fixers for a specific language
 */
export function getFixersForLanguage(language: Language): Tool[] {
  return SEED_TOOLS.filter(tool =>
    tool.languages.includes(language) &&
    (tool.type === 'fixer' || tool.hasNativeFix)
  );
}

/**
 * Get fixer for an analyzer issue
 */
export function getFixerForIssue(analyzerToolId: string, ruleId: string): FixerMapping | undefined {
  return SEED_FIXER_MAPPINGS.find(mapping => {
    if (mapping.analyzerToolId !== analyzerToolId) return false;
    const regex = new RegExp(mapping.rulePattern);
    return regex.test(ruleId);
  });
}

/**
 * Get tool by ID
 */
export function getToolById(toolId: string): Tool | undefined {
  return SEED_TOOLS.find(tool => tool.id === toolId);
}

/**
 * Get JavaScript-specific tools (JS-only analyzers/fixers)
 * Does NOT include cross-language tools like Semgrep
 */
export function getJavaScriptTools(): Tool[] {
  return SEED_TOOLS.filter(tool =>
    tool.languages.includes('javascript') &&
    !tool.languages.includes('typescript') // JS-only
  );
}

/**
 * Get TypeScript-specific tools (TS-only analyzers/fixers)
 * Includes typescript-eslint, tsc, ts-prune, etc.
 */
export function getTypeScriptTools(): Tool[] {
  return SEED_TOOLS.filter(tool =>
    tool.languages.includes('typescript') &&
    !tool.languages.includes('javascript') // TS-only
  );
}

/**
 * Get all tools that support both JS and TS
 * These are cross-language tools like Semgrep, Trivy
 */
export function getCrossLanguageJsTsTools(): Tool[] {
  return SEED_TOOLS.filter(tool =>
    tool.languages.includes('javascript') &&
    tool.languages.includes('typescript')
  );
}

/**
 * Get comparison of JS vs TS tool counts
 */
export function getJsTsToolComparison(): {
  jsOnly: string[];
  tsOnly: string[];
  crossLanguage: string[];
  jsToolCount: number;
  tsToolCount: number;
} {
  const jsOnly = getJavaScriptTools().map(t => t.id);
  const tsOnly = getTypeScriptTools().map(t => t.id);
  const crossLanguage = getCrossLanguageJsTsTools().map(t => t.id);

  return {
    jsOnly,
    tsOnly,
    crossLanguage,
    jsToolCount: jsOnly.length + crossLanguage.length,
    tsToolCount: tsOnly.length + crossLanguage.length,
  };
}

/**
 * Get comprehensive statistics
 */
export function getToolStats(): {
  totalTools: number;
  byLanguage: Record<Language, number>;
  byType: Record<ToolType, number>;
  byCategory: Record<ToolCategory, number>;
  withNativeFix: number;
} {
  const byLanguage: Record<string, number> = {};
  const byType: Record<string, number> = { analyzer: 0, fixer: 0, hybrid: 0 };
  const byCategory: Record<string, number> = {};
  let withNativeFix = 0;

  for (const tool of SEED_TOOLS) {
    // Count by type
    byType[tool.type]++;

    // Count native fix
    if (tool.hasNativeFix) withNativeFix++;

    // Count by language
    for (const lang of tool.languages) {
      byLanguage[lang] = (byLanguage[lang] || 0) + 1;
    }

    // Count by category
    for (const cat of tool.categories) {
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
  }

  return {
    totalTools: SEED_TOOLS.length,
    byLanguage: byLanguage as Record<Language, number>,
    byType: byType as Record<ToolType, number>,
    byCategory: byCategory as Record<ToolCategory, number>,
    withNativeFix,
  };
}

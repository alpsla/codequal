/**
 * JavaScript/TypeScript Language Tool Matrix
 * Defines all expected tools for JavaScript/TypeScript analysis
 */

export interface ToolDefinition {
  name: string;
  category: 'security' | 'dependency' | 'quality' | 'architecture' | 'secrets';
  command: string;
  expectedAvailable: boolean;
  description: string;
  languages: ('javascript' | 'typescript')[];
}

export const JAVASCRIPT_TOOLS_MATRIX: ToolDefinition[] = [
  // Security Tools
  {
    name: 'eslint',
    category: 'quality',
    command: 'eslint . --format json',
    expectedAvailable: true,
    description: 'JavaScript/TypeScript linter with security rules',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'semgrep',
    category: 'security',
    command: 'semgrep --config=auto --json .',
    expectedAvailable: true,
    description: 'Multi-language static analysis (includes JS/TS)',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'snyk',
    category: 'security',
    command: 'snyk test --json',
    expectedAvailable: false, // Requires authentication
    description: 'Vulnerability scanner for dependencies and code',
    languages: ['javascript', 'typescript']
  },
  
  // Dependency Tools
  {
    name: 'npm-audit',
    category: 'dependency',
    command: 'npm audit --json',
    expectedAvailable: true,
    description: 'NPM security audit for dependencies',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'yarn-audit',
    category: 'dependency',
    command: 'yarn audit --json',
    expectedAvailable: false, // Only if yarn.lock exists
    description: 'Yarn security audit for dependencies',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'retire-js',
    category: 'dependency',
    command: 'retire --outputformat json --path .',
    expectedAvailable: false, // Often not installed
    description: 'Detects vulnerable JavaScript libraries',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'license-checker',
    category: 'dependency',
    command: 'license-checker --json',
    expectedAvailable: false,
    description: 'Check licenses of dependencies',
    languages: ['javascript', 'typescript']
  },
  
  // Code Quality Tools
  {
    name: 'tslint',
    category: 'quality',
    command: 'tslint -p . --format json',
    expectedAvailable: false, // Deprecated, replaced by ESLint
    description: 'TypeScript linter (deprecated)',
    languages: ['typescript']
  },
  {
    name: 'jshint',
    category: 'quality',
    command: 'jshint . --reporter=json',
    expectedAvailable: false,
    description: 'JavaScript code quality tool',
    languages: ['javascript']
  },
  {
    name: 'complexity-report',
    category: 'quality',
    command: 'cr . --format json',
    expectedAvailable: false,
    description: 'Complexity analysis for JavaScript',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'jscpd',
    category: 'quality',
    command: 'jscpd . --format json',
    expectedAvailable: true,
    description: 'Copy/paste detector',
    languages: ['javascript', 'typescript']
  },
  
  // TypeScript Specific
  {
    name: 'tsc',
    category: 'quality',
    command: 'tsc --noEmit',
    expectedAvailable: true,
    description: 'TypeScript compiler type checking',
    languages: ['typescript']
  },
  
  // Architecture Tools
  {
    name: 'madge',
    category: 'architecture',
    command: 'madge --json .',
    expectedAvailable: false,
    description: 'Circular dependency detection',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'dependency-cruiser',
    category: 'architecture',
    command: 'depcruise --output-type json src',
    expectedAvailable: false,
    description: 'Validate and visualize dependencies',
    languages: ['javascript', 'typescript']
  },
  
  // Secret Scanning (same as Python)
  {
    name: 'gitleaks',
    category: 'secrets',
    command: 'gitleaks detect --source . --format json',
    expectedAvailable: true,
    description: 'Detect secrets in git repos',
    languages: ['javascript', 'typescript']
  },
  {
    name: 'trufflehog',
    category: 'secrets',
    command: 'trufflehog filesystem . --json',
    expectedAvailable: false,
    description: 'Find secrets in repositories',
    languages: ['javascript', 'typescript']
  },
  
  // Container/Infrastructure scanning
  {
    name: 'trivy',
    category: 'security',
    command: 'trivy fs . --format json',
    expectedAvailable: true,
    description: 'Container and filesystem vulnerability scanner',
    languages: ['javascript', 'typescript']
  }
];

/**
 * Get tools by category for JavaScript/TypeScript
 */
export function getToolsByCategory(category: string, language: 'javascript' | 'typescript' = 'javascript'): ToolDefinition[] {
  return JAVASCRIPT_TOOLS_MATRIX.filter(tool => 
    tool.category === category && tool.languages.includes(language)
  );
}

/**
 * Get all expected available tools for a language
 */
export function getExpectedAvailableTools(language: 'javascript' | 'typescript' = 'javascript'): ToolDefinition[] {
  return JAVASCRIPT_TOOLS_MATRIX.filter(tool => 
    tool.expectedAvailable && tool.languages.includes(language)
  );
}

/**
 * Tool aliases for parsing output
 */
export const TOOL_ALIASES: Record<string, string> = {
  'npm_audit': 'npm-audit',
  'yarn_audit': 'yarn-audit',
  'retire_js': 'retire-js',
  'license_checker': 'license-checker',
  'dependency_cruiser': 'dependency-cruiser',
  'eslint-security': 'eslint'
};

/**
 * Check if a tool name matches (considering aliases)
 */
export function isToolMatch(executedTool: string, expectedTool: string): boolean {
  const normalizedExecuted = executedTool.toLowerCase().replace(/[-_]/g, '');
  const normalizedExpected = expectedTool.toLowerCase().replace(/[-_]/g, '');
  
  return normalizedExecuted === normalizedExpected ||
         normalizedExecuted.includes(normalizedExpected) ||
         normalizedExpected.includes(normalizedExecuted);
}
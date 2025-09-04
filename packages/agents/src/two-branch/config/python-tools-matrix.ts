/**
 * Python Language Tool Matrix
 * Defines all expected tools for Python language analysis
 */

export interface ToolDefinition {
  name: string;
  category: 'security' | 'dependency' | 'quality' | 'architecture' | 'secrets';
  command: string;
  expectedAvailable: boolean;
  description: string;
}

export const PYTHON_TOOLS_MATRIX: ToolDefinition[] = [
  // Security Tools
  {
    name: 'bandit',
    category: 'security',
    command: 'bandit -r . -f json',
    expectedAvailable: true,
    description: 'Python AST-based security scanner'
  },
  {
    name: 'semgrep',
    category: 'security',
    command: 'semgrep --config=auto --json .',
    expectedAvailable: true,
    description: 'Multi-language static analysis'
  },
  {
    name: 'safety',
    category: 'dependency',
    command: 'safety check --json',
    expectedAvailable: true,
    description: 'Python dependency vulnerability scanner'
  },
  {
    name: 'pip-audit',
    category: 'dependency',
    command: 'pip-audit --format json',
    expectedAvailable: true,
    description: 'Audit Python packages for known vulnerabilities'
  },
  
  // Code Quality Tools
  {
    name: 'pylint',
    category: 'quality',
    command: 'pylint **/*.py --output-format=json',
    expectedAvailable: true,
    description: 'Python code analysis tool'
  },
  {
    name: 'mypy',
    category: 'quality',
    command: 'mypy . --json',
    expectedAvailable: true,
    description: 'Static type checker for Python'
  },
  {
    name: 'ruff',
    category: 'quality',
    command: 'ruff check . --output-format json',
    expectedAvailable: true,
    description: 'Fast Python linter'
  },
  {
    name: 'flake8',
    category: 'quality',
    command: 'flake8 . --format=json',
    expectedAvailable: false, // Often needs plugin
    description: 'Python style guide enforcement'
  },
  {
    name: 'radon',
    category: 'quality',
    command: 'radon cc . -j',
    expectedAvailable: true,
    description: 'Code complexity checker'
  },
  
  // Architecture Tools
  {
    name: 'pyreverse',
    category: 'architecture',
    command: 'pyreverse -o json .',
    expectedAvailable: true,
    description: 'Python UML diagram generator'
  },
  {
    name: 'pydeps',
    category: 'architecture',
    command: 'pydeps --max-bacon 2 --pylib-all .',
    expectedAvailable: false, // Often not installed
    description: 'Python dependency graph'
  },
  
  // Secret Scanning (Local GitHub-like tools)
  {
    name: 'gitleaks',
    category: 'secrets',
    command: 'gitleaks detect --source . --format json',
    expectedAvailable: true,
    description: 'Detect secrets in git repos'
  },
  {
    name: 'trufflehog',
    category: 'secrets',
    command: 'trufflehog filesystem . --json',
    expectedAvailable: false, // Often not installed
    description: 'Find secrets in repositories'
  },
  {
    name: 'detect-secrets',
    category: 'secrets',
    command: 'detect-secrets scan --all-files',
    expectedAvailable: false, // Python package, often not installed
    description: 'Detect secrets in code'
  },
  
  // Container/Infrastructure scanning (GitHub-like)
  {
    name: 'trivy',
    category: 'security',
    command: 'trivy fs . --format json',
    expectedAvailable: true,
    description: 'Container and filesystem vulnerability scanner'
  }
];

/**
 * Get tools by category
 */
export function getToolsByCategory(category: string): ToolDefinition[] {
  return PYTHON_TOOLS_MATRIX.filter(tool => tool.category === category);
}

/**
 * Get all expected available tools
 */
export function getExpectedAvailableTools(): ToolDefinition[] {
  return PYTHON_TOOLS_MATRIX.filter(tool => tool.expectedAvailable);
}

/**
 * Tool aliases for parsing output
 */
export const TOOL_ALIASES: Record<string, string> = {
  'pip_audit': 'pip-audit',
  'detect_secrets': 'detect-secrets',
  'security': 'bandit', // Sometimes bandit is just called 'security'
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
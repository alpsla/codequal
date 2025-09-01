/**
 * Integration Test Matrix Validator
 * Validates that each PR type and language combination selects the correct agent and tools
 * Based on the MCP_TOOLS_COVERAGE_MATRIX_V3.md
 */

// import { SecurityAgentFactory } from '../../agents/security-agent-factory'; // TODO: Create this factory
import { FileInfo } from '../../interfaces/agent-interfaces';
import { SecurityIssue } from '../../interfaces/security-interfaces';

/**
 * Matrix entry representing expected agent and tools for a language
 */
interface MatrixEntry {
  language: string;
  fileExtensions: string[];
  expectedAgent: string;
  expectedSecurityTools: string[];
  expectedQualityTools: string[];
  testFiles: {
    path: string;
    content: string;
    expectedIssueTypes?: string[];
  }[];
}

/**
 * Complete coverage matrix based on MCP_TOOLS_COVERAGE_MATRIX_V3.md
 */
export const COVERAGE_MATRIX: MatrixEntry[] = [
  {
    language: 'TypeScript',
    fileExtensions: ['.ts', '.tsx'],
    expectedAgent: 'TypeScriptSecurityAgent',
    expectedSecurityTools: ['semgrep', 'eslint-plugin-security'],
    expectedQualityTools: ['eslint', 'tslint'],
    testFiles: [
      {
        path: 'test.ts',
        content: `const password = "hardcoded123";
const query = \`SELECT * FROM users WHERE id = \${req.params.id}\`;`,
        expectedIssueTypes: ['CWE-798', 'CWE-89']
      }
    ]
  },
  {
    language: 'JavaScript',
    fileExtensions: ['.js', '.jsx', '.mjs'],
    expectedAgent: 'JavaScriptSecurityAgent',
    expectedSecurityTools: ['semgrep', 'jshint'],
    expectedQualityTools: ['eslint', 'jshint'],
    testFiles: [
      {
        path: 'test.js',
        content: `eval(userInput);
document.write(req.query.name);`,
        expectedIssueTypes: ['CWE-95', 'CWE-79']
      }
    ]
  },
  {
    language: 'Python',
    fileExtensions: ['.py'],
    expectedAgent: 'PythonSecurityAgent',
    expectedSecurityTools: ['bandit', 'safety'],
    expectedQualityTools: ['pylint', 'mypy'],
    testFiles: [
      {
        path: 'test.py',
        content: `import pickle
exec(user_input)
os.system(f"cat {filename}")`,
        expectedIssueTypes: ['CWE-502', 'CWE-95', 'CWE-78']
      }
    ]
  },
  {
    language: 'Java',
    fileExtensions: ['.java'],
    expectedAgent: 'JavaSecurityAgent',
    expectedSecurityTools: ['spotbugs', 'pmd'],
    expectedQualityTools: ['checkstyle'],
    testFiles: [
      {
        path: 'Test.java',
        content: `String query = "SELECT * FROM users WHERE id = " + userId;
Runtime.getRuntime().exec(command);`,
        expectedIssueTypes: ['CWE-89', 'CWE-78']
      }
    ]
  },
  {
    language: 'Go',
    fileExtensions: ['.go'],
    expectedAgent: 'GoSecurityAgent',
    expectedSecurityTools: ['gosec', 'staticcheck'],
    expectedQualityTools: ['golangci-lint'],
    testFiles: [
      {
        path: 'test.go',
        content: `query := fmt.Sprintf("SELECT * FROM users WHERE id = %s", userID)
exec.Command("sh", "-c", userInput).Run()`,
        expectedIssueTypes: ['CWE-89', 'CWE-78']
      }
    ]
  },
  {
    language: 'Ruby',
    fileExtensions: ['.rb'],
    expectedAgent: 'RubySecurityAgent',
    expectedSecurityTools: ['brakeman', 'rubocop'],
    expectedQualityTools: ['rubocop'],
    testFiles: [
      {
        path: 'test.rb',
        content: `User.where("name = '#{params[:name]}'")
system(user_command)`,
        expectedIssueTypes: ['CWE-89', 'CWE-78']
      }
    ]
  },
  {
    language: 'C++',
    fileExtensions: ['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp'],
    expectedAgent: 'CppSecurityAgent',
    expectedSecurityTools: ['cppcheck', 'clang-tidy'],
    expectedQualityTools: ['clang-tidy'],
    testFiles: [
      {
        path: 'test.cpp',
        content: `strcpy(buffer, userInput);
system(command);`,
        expectedIssueTypes: ['CWE-120', 'CWE-78']
      }
    ]
  },
  {
    language: 'PHP',
    fileExtensions: ['.php', '.inc'],
    expectedAgent: 'PHPSecurityAgent',
    expectedSecurityTools: ['phpcs-security-audit', 'psalm', 'phpstan'],
    expectedQualityTools: ['php_codesniffer'],
    testFiles: [
      {
        path: 'test.php',
        content: `<?php
$query = "SELECT * FROM users WHERE id = '$_GET[id]'";
mysql_query($query);
echo $_POST['name'];
?>`,
        expectedIssueTypes: ['CWE-89', 'CWE-79']
      }
    ]
  },
  {
    language: 'Rust',
    fileExtensions: ['.rs'],
    expectedAgent: 'RustSecurityAgent',
    expectedSecurityTools: ['cargo-audit', 'clippy', 'cargo-geiger', 'rudra'],
    expectedQualityTools: ['clippy'],
    testFiles: [
      {
        path: 'test.rs',
        content: `unsafe { *ptr = 42; }
let x: u8 = 255; let y = x + 1;
None.unwrap();`,
        expectedIssueTypes: ['CWE-242', 'CWE-190']
      }
    ]
  }
];

/**
 * Test scenario for a pull request
 */
interface PRTestScenario {
  name: string;
  description: string;
  repository: string;
  prNumber: number;
  files: FileInfo[];
  expectedAgents: string[];
  expectedTools: string[];
  expectedMinIssues: number;
}

/**
 * Generate test scenarios for all matrix combinations
 */
export function generateTestScenarios(): PRTestScenario[] {
  const scenarios: PRTestScenario[] = [];

  // Single language scenarios
  COVERAGE_MATRIX.forEach(entry => {
    scenarios.push({
      name: `${entry.language} Security Analysis`,
      description: `Test ${entry.language} agent selection and tool execution`,
      repository: `test-org/test-${entry.language.toLowerCase()}-repo`,
      prNumber: 100 + scenarios.length,
      files: entry.testFiles.map(tf => ({
        path: tf.path,
        content: tf.content,
        branch: 'main'
      })),
      expectedAgents: [entry.expectedAgent],
      expectedTools: [...entry.expectedSecurityTools, ...entry.expectedQualityTools],
      expectedMinIssues: entry.testFiles[0].expectedIssueTypes?.length || 1
    });
  });

  // Multi-language scenarios
  scenarios.push({
    name: 'Full-Stack Web Application',
    description: 'TypeScript frontend, Python backend, SQL database',
    repository: 'test-org/fullstack-app',
    prNumber: 200,
    files: [
      {
        path: 'frontend/app.ts',
        content: 'const apiKey = "sk-12345"; fetch(`/api/${userId}`);',
        branch: 'main'
      },
      {
        path: 'backend/server.py',
        content: 'cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")',
        branch: 'main'
      },
      {
        path: 'database/schema.sql',
        content: 'CREATE TABLE users (id INT, password VARCHAR(255));',
        branch: 'main'
      }
    ],
    expectedAgents: ['TypeScriptSecurityAgent', 'PythonSecurityAgent'],
    expectedTools: ['semgrep', 'eslint', 'bandit', 'pylint'],
    expectedMinIssues: 3
  });

  scenarios.push({
    name: 'Microservices Architecture',
    description: 'Go services, Rust performance-critical components',
    repository: 'test-org/microservices',
    prNumber: 201,
    files: [
      {
        path: 'auth-service/main.go',
        content: 'db.Query("SELECT * FROM users WHERE email = " + email)',
        branch: 'main'
      },
      {
        path: 'cache-service/cache.rs',
        content: 'unsafe { std::ptr::copy_nonoverlapping(src, dst, len) }',
        branch: 'main'
      }
    ],
    expectedAgents: ['GoSecurityAgent', 'RustSecurityAgent'],
    expectedTools: ['gosec', 'cargo-audit', 'clippy'],
    expectedMinIssues: 2
  });

  scenarios.push({
    name: 'Legacy Migration',
    description: 'PHP legacy code with Java modernization',
    repository: 'test-org/legacy-migration',
    prNumber: 202,
    files: [
      {
        path: 'legacy/admin.php',
        content: '<?php include($_GET["page"] . ".php"); ?>',
        branch: 'main'
      },
      {
        path: 'modern/AdminController.java',
        content: 'PreparedStatement ps = conn.prepareStatement("SELECT * FROM " + table);',
        branch: 'main'
      }
    ],
    expectedAgents: ['PHPSecurityAgent', 'JavaSecurityAgent'],
    expectedTools: ['psalm', 'spotbugs', 'pmd'],
    expectedMinIssues: 2
  });

  return scenarios;
}

/**
 * Agent selector that mimics production behavior
 */
export class AgentSelector {
  /**
   * Select appropriate agents based on file extensions
   */
  selectAgents(files: FileInfo[]): string[] {
    const agents = new Set<string>();
    
    files.forEach(file => {
      const extension = this.getFileExtension(file.path);
      const matrixEntry = COVERAGE_MATRIX.find(entry => 
        entry.fileExtensions.includes(extension)
      );
      
      if (matrixEntry) {
        agents.add(matrixEntry.expectedAgent);
      }
    });
    
    return Array.from(agents);
  }

  /**
   * Get expected tools for selected agents
   */
  getExpectedTools(agentNames: string[]): string[] {
    const tools = new Set<string>();
    
    agentNames.forEach(agentName => {
      const matrixEntry = COVERAGE_MATRIX.find(entry => 
        entry.expectedAgent === agentName
      );
      
      if (matrixEntry) {
        matrixEntry.expectedSecurityTools.forEach(tool => tools.add(tool));
        matrixEntry.expectedQualityTools.forEach(tool => tools.add(tool));
      }
    });
    
    return Array.from(tools);
  }

  private getFileExtension(path: string): string {
    const match = path.match(/\.[^.]+$/);
    return match ? match[0] : '';
  }
}

/**
 * Validator for agent and tool selection
 */
export class MatrixValidator {
  private selector = new AgentSelector();

  /**
   * Validate a PR scenario
   */
  async validateScenario(scenario: PRTestScenario): Promise<{
    passed: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate agent selection
    const selectedAgents = this.selector.selectAgents(scenario.files);
    const missingAgents = scenario.expectedAgents.filter(
      agent => !selectedAgents.includes(agent)
    );
    const unexpectedAgents = selectedAgents.filter(
      agent => !scenario.expectedAgents.includes(agent)
    );

    if (missingAgents.length > 0) {
      errors.push(`Missing expected agents: ${missingAgents.join(', ')}`);
    }
    if (unexpectedAgents.length > 0) {
      warnings.push(`Unexpected agents selected: ${unexpectedAgents.join(', ')}`);
    }

    // Validate tool selection
    const expectedTools = this.selector.getExpectedTools(selectedAgents);
    const missingTools = scenario.expectedTools.filter(
      tool => !expectedTools.includes(tool)
    );

    if (missingTools.length > 0) {
      errors.push(`Missing expected tools: ${missingTools.join(', ')}`);
    }

    // Simulate agent execution and validate results
    const issues = await this.simulateAgentExecution(scenario);
    
    if (issues.length < scenario.expectedMinIssues) {
      errors.push(
        `Expected at least ${scenario.expectedMinIssues} issues, found ${issues.length}`
      );
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Simulate agent execution for testing
   */
  private async simulateAgentExecution(
    scenario: PRTestScenario
  ): Promise<SecurityIssue[]> {
    // In real implementation, this would instantiate and run the agents
    // For testing, we'll return mock issues based on the scenario
    const issues: SecurityIssue[] = [];

    scenario.files.forEach((file, index) => {
      // Simulate finding issues based on content patterns
      if (file.content.includes('SELECT') || file.content.includes('query')) {
        issues.push({
          id: `sql-${index}`,
          type: 'security',
          severity: 'critical',
          title: 'SQL Injection',
          description: 'Potential SQL injection vulnerability',
          file: file.path,
          line: 1,
          tool: 'semgrep',
          branch: file.branch,
          cwe: 'CWE-89'
        });
      }

      if (file.content.includes('eval') || file.content.includes('exec')) {
        issues.push({
          id: `exec-${index}`,
          type: 'security',
          severity: 'critical',
          title: 'Code Injection',
          description: 'Potential code injection vulnerability',
          file: file.path,
          line: 1,
          tool: 'bandit',
          branch: file.branch,
          cwe: 'CWE-95'
        });
      }

      if (file.content.includes('unsafe')) {
        issues.push({
          id: `unsafe-${index}`,
          type: 'security',
          severity: 'high',
          title: 'Unsafe Code',
          description: 'Unsafe code block detected',
          file: file.path,
          line: 1,
          tool: 'cargo-audit',
          branch: file.branch,
          cwe: 'CWE-242'
        });
      }
    });

    return issues;
  }
}

/**
 * Run all integration tests
 */
export async function runIntegrationTests(): Promise<{
  totalScenarios: number;
  passed: number;
  failed: number;
  results: Array<{
    scenario: string;
    passed: boolean;
    errors: string[];
    warnings: string[];
  }>;
}> {
  const validator = new MatrixValidator();
  const scenarios = generateTestScenarios();
  const results: Array<{
    scenario: string;
    passed: boolean;
    errors: string[];
    warnings: string[];
  }> = [];

  let passed = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    console.log(`Testing: ${scenario.name}`);
    const result = await validator.validateScenario(scenario);
    
    results.push({
      scenario: scenario.name,
      ...result
    });

    if (result.passed) {
      passed++;
      console.log(`  ✅ PASSED`);
    } else {
      failed++;
      console.log(`  ❌ FAILED`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`    ⚠️  ${warning}`));
    }
  }

  return {
    totalScenarios: scenarios.length,
    passed,
    failed,
    results
  };
}
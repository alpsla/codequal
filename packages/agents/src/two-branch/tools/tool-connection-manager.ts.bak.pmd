/**
 * Tool Connection Manager
 *
 * Manages connections between 65 cloud analysis tools and 5 hybrid agent services
 * Provides unified interface for tool execution with caching and fix generation
 */

import axios from 'axios';
import { createLogger } from '../../../../core/src/utils/logger';

const logger = createLogger('tool-connection-manager');

// Cloud service endpoints
const HYBRID_AGENT_URL = process.env.HYBRID_AGENT_URL || 'http://129.212.136.24';

export interface ToolDefinition {
  name: string;
  category: 'security' | 'quality' | 'performance' | 'dependency' | 'architecture';
  languages: string[];
  command: string;
  parser: string;
  fixGenerator?: string;
  enabled: boolean;
}

export class ToolConnectionManager {
  private tools: Map<string, ToolDefinition>;
  private agentMapping: Map<string, string>;

  constructor() {
    this.tools = new Map();
    this.agentMapping = new Map();
    this.initializeTools();
    this.initializeAgentMapping();
  }

  /**
   * Initialize all 65 analysis tools with their configurations
   */
  private initializeTools() {
    // Java Tools (10 tools)
    this.registerTool({
      name: 'spotbugs',
      category: 'quality',
      languages: ['java'],
      command: 'spotbugs -textui -xml',
      parser: 'xml',
      fixGenerator: 'spotbugs-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'pmd',
      category: 'quality',
      languages: ['java'],
      command: 'pmd check -f xml',
      parser: 'xml',
      fixGenerator: 'pmd-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'checkstyle',
      category: 'quality',
      languages: ['java'],
      command: 'checkstyle -f xml',
      parser: 'xml',
      enabled: true
    });

    this.registerTool({
      name: 'error-prone',
      category: 'quality',
      languages: ['java'],
      command: 'error-prone',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'infer',
      category: 'quality',
      languages: ['java'],
      command: 'infer run -- javac',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'dependency-check',
      category: 'dependency',
      languages: ['java'],
      command: 'dependency-check --scan',
      parser: 'xml',
      enabled: true
    });

    this.registerTool({
      name: 'sonarqube-java',
      category: 'quality',
      languages: ['java'],
      command: 'sonar-scanner',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'nullaway',
      category: 'quality',
      languages: ['java'],
      command: 'nullaway',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'jqassistant',
      category: 'architecture',
      languages: ['java'],
      command: 'jqassistant scan',
      parser: 'xml',
      enabled: true
    });

    this.registerTool({
      name: 'archunit',
      category: 'architecture',
      languages: ['java'],
      command: 'archunit test',
      parser: 'json',
      enabled: true
    });

    // Python Tools (10 tools)
    this.registerTool({
      name: 'pylint',
      category: 'quality',
      languages: ['python'],
      command: 'pylint --output-format=json',
      parser: 'json',
      fixGenerator: 'pylint-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'flake8',
      category: 'quality',
      languages: ['python'],
      command: 'flake8 --format=json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'mypy',
      category: 'quality',
      languages: ['python'],
      command: 'mypy --json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'bandit',
      category: 'security',
      languages: ['python'],
      command: 'bandit -f json',
      parser: 'json',
      fixGenerator: 'bandit-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'safety',
      category: 'dependency',
      languages: ['python'],
      command: 'safety check --json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'radon',
      category: 'quality',
      languages: ['python'],
      command: 'radon cc -j',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'vulture',
      category: 'quality',
      languages: ['python'],
      command: 'vulture',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'pydocstyle',
      category: 'quality',
      languages: ['python'],
      command: 'pydocstyle',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'prospector',
      category: 'quality',
      languages: ['python'],
      command: 'prospector --output-format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'pycodestyle',
      category: 'quality',
      languages: ['python'],
      command: 'pycodestyle',
      parser: 'text',
      enabled: true
    });

    // JavaScript/TypeScript Tools (10 tools)
    this.registerTool({
      name: 'eslint',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      command: 'eslint -f json',
      parser: 'json',
      fixGenerator: 'eslint-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'jshint',
      category: 'quality',
      languages: ['javascript'],
      command: 'jshint --reporter=json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'tslint',
      category: 'quality',
      languages: ['typescript'],
      command: 'tslint -t json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'npm-audit',
      category: 'dependency',
      languages: ['javascript', 'typescript'],
      command: 'npm audit --json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'snyk-js',
      category: 'security',
      languages: ['javascript', 'typescript'],
      command: 'snyk test --json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'jscpd',
      category: 'quality',
      languages: ['javascript', 'typescript'],
      command: 'jscpd --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'retire-js',
      category: 'security',
      languages: ['javascript'],
      command: 'retire --outputformat json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'complexity-report',
      category: 'quality',
      languages: ['javascript'],
      command: 'cr --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'depcheck',
      category: 'dependency',
      languages: ['javascript', 'typescript'],
      command: 'depcheck --json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'madge',
      category: 'architecture',
      languages: ['javascript', 'typescript'],
      command: 'madge --json',
      parser: 'json',
      enabled: true
    });

    // Go Tools (8 tools)
    this.registerTool({
      name: 'golint',
      category: 'quality',
      languages: ['go'],
      command: 'golint',
      parser: 'text',
      fixGenerator: 'golint-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'go-vet',
      category: 'quality',
      languages: ['go'],
      command: 'go vet',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'staticcheck',
      category: 'quality',
      languages: ['go'],
      command: 'staticcheck -f json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'gosec',
      category: 'security',
      languages: ['go'],
      command: 'gosec -fmt json',
      parser: 'json',
      fixGenerator: 'gosec-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'gocyclo',
      category: 'quality',
      languages: ['go'],
      command: 'gocyclo',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'ineffassign',
      category: 'quality',
      languages: ['go'],
      command: 'ineffassign',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'errcheck',
      category: 'quality',
      languages: ['go'],
      command: 'errcheck',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'go-mod-outdated',
      category: 'dependency',
      languages: ['go'],
      command: 'go-mod-outdated -json',
      parser: 'json',
      enabled: true
    });

    // Rust Tools (7 tools)
    this.registerTool({
      name: 'clippy',
      category: 'quality',
      languages: ['rust'],
      command: 'cargo clippy --message-format json',
      parser: 'json',
      fixGenerator: 'clippy-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'cargo-audit',
      category: 'dependency',
      languages: ['rust'],
      command: 'cargo audit --json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'cargo-deny',
      category: 'dependency',
      languages: ['rust'],
      command: 'cargo deny check',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'cargo-outdated',
      category: 'dependency',
      languages: ['rust'],
      command: 'cargo outdated --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'cargo-geiger',
      category: 'security',
      languages: ['rust'],
      command: 'cargo geiger --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'cargo-expand',
      category: 'quality',
      languages: ['rust'],
      command: 'cargo expand',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'miri',
      category: 'quality',
      languages: ['rust'],
      command: 'cargo miri test',
      parser: 'text',
      enabled: true
    });

    // C++ Tools (5 tools)
    this.registerTool({
      name: 'cppcheck',
      category: 'quality',
      languages: ['cpp', 'c'],
      command: 'cppcheck --xml',
      parser: 'xml',
      fixGenerator: 'cppcheck-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'clang-tidy',
      category: 'quality',
      languages: ['cpp', 'c'],
      command: 'clang-tidy -export-fixes',
      parser: 'yaml',
      enabled: true
    });

    this.registerTool({
      name: 'pvs-studio',
      category: 'quality',
      languages: ['cpp', 'c'],
      command: 'pvs-studio-analyzer',
      parser: 'xml',
      enabled: true
    });

    this.registerTool({
      name: 'cpplint',
      category: 'quality',
      languages: ['cpp'],
      command: 'cpplint',
      parser: 'text',
      enabled: true
    });

    this.registerTool({
      name: 'include-what-you-use',
      category: 'quality',
      languages: ['cpp', 'c'],
      command: 'iwyu',
      parser: 'text',
      enabled: true
    });

    // Ruby Tools (5 tools)
    this.registerTool({
      name: 'rubocop',
      category: 'quality',
      languages: ['ruby'],
      command: 'rubocop -f json',
      parser: 'json',
      fixGenerator: 'rubocop-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'brakeman',
      category: 'security',
      languages: ['ruby'],
      command: 'brakeman -f json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'reek',
      category: 'quality',
      languages: ['ruby'],
      command: 'reek --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'bundle-audit',
      category: 'dependency',
      languages: ['ruby'],
      command: 'bundle-audit check --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'rails-best-practices',
      category: 'quality',
      languages: ['ruby'],
      command: 'rails_best_practices -f json',
      parser: 'json',
      enabled: true
    });

    // PHP Tools (5 tools)
    this.registerTool({
      name: 'phpstan',
      category: 'quality',
      languages: ['php'],
      command: 'phpstan analyse --error-format json',
      parser: 'json',
      fixGenerator: 'phpstan-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'psalm',
      category: 'quality',
      languages: ['php'],
      command: 'psalm --output-format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'phpcs',
      category: 'quality',
      languages: ['php'],
      command: 'phpcs --report=json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'phpmd',
      category: 'quality',
      languages: ['php'],
      command: 'phpmd . json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'security-checker',
      category: 'dependency',
      languages: ['php'],
      command: 'security-checker security:check --format json',
      parser: 'json',
      enabled: true
    });

    // General/Multi-language Tools (5 tools)
    this.registerTool({
      name: 'semgrep',
      category: 'security',
      languages: ['java', 'python', 'javascript', 'typescript', 'go', 'rust', 'ruby', 'php'],
      command: 'semgrep --json',
      parser: 'json',
      fixGenerator: 'semgrep-fix-generator',
      enabled: true
    });

    this.registerTool({
      name: 'sonarqube',
      category: 'quality',
      languages: ['java', 'python', 'javascript', 'typescript', 'go', 'csharp', 'cpp'],
      command: 'sonar-scanner',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'trivy',
      category: 'security',
      languages: ['all'],
      command: 'trivy fs --format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'gitleaks',
      category: 'security',
      languages: ['all'],
      command: 'gitleaks detect --report-format json',
      parser: 'json',
      enabled: true
    });

    this.registerTool({
      name: 'lizard',
      category: 'quality',
      languages: ['all'],
      command: 'lizard --xml',
      parser: 'xml',
      enabled: true
    });

    logger.info(`Initialized ${this.tools.size} analysis tools`);
  }

  /**
   * Initialize mapping between tool categories and hybrid agents
   */
  private initializeAgentMapping() {
    this.agentMapping.set('security', 'security-agent');
    this.agentMapping.set('quality', 'quality-agent');
    this.agentMapping.set('performance', 'performance-agent');
    this.agentMapping.set('dependency', 'dependency-agent');
    this.agentMapping.set('architecture', 'architecture-agent');
  }

  /**
   * Register a tool definition
   */
  private registerTool(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get tools for a specific language
   */
  getToolsForLanguage(language: string): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const tool of this.tools.values()) {
      if (tool.enabled && (tool.languages.includes(language) || tool.languages.includes('all'))) {
        tools.push(tool);
      }
    }
    return tools;
  }

  /**
   * Execute a tool and get results with fixes
   */
  async executeTool(
    toolName: string,
    workspace: string,
    language: string
  ): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    logger.info(`Executing tool: ${toolName} for ${language}`);

    try {
      // Call the hybrid agent's tool execution endpoint
      const response = await axios.post(
        `${HYBRID_AGENT_URL}/tools/execute`,
        {
          tool: toolName,
          workspace,
          language,
          command: tool.command,
          parser: tool.parser
        },
        {
          timeout: 60000, // 60 second timeout for tool execution
          maxBodyLength: 10 * 1024 * 1024 // 10MB max response
        }
      );

      return {
        tool: toolName,
        success: true,
        issues: response.data.issues || [],
        executionTime: response.data.executionTime || 0,
        raw: response.data.raw
      };
    } catch (error: any) {
      logger.error(`Tool ${toolName} execution failed`, error);

      // Return error result but don't throw to allow other tools to continue
      return {
        tool: toolName,
        success: false,
        issues: [],
        executionTime: 0,
        error: error.message || 'Tool execution failed'
      };
    }
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeTools(
    language: string,
    workspace: string,
    tools?: string[]
  ): Promise<Map<string, any>> {
    const toolsToRun = tools
      ? tools.map(name => this.tools.get(name)).filter(Boolean) as ToolDefinition[]
      : this.getToolsForLanguage(language);

    logger.info(`Executing ${toolsToRun.length} tools for ${language}`);

    const results = new Map<string, any>();
    const promises = toolsToRun.map(async tool => {
      try {
        const result = await this.executeTool(tool.name, workspace, language);
        results.set(tool.name, result);
      } catch (error) {
        logger.error(`Tool ${tool.name} failed`, error);
        results.set(tool.name, {
          tool: tool.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Generate fixes for issues using hybrid agents
   */
  async generateFixes(
    issues: any[],
    prInfo: any
  ): Promise<Map<string, any>> {
    const categorizedIssues = this.categorizeIssuesByAgent(issues);
    const fixes = new Map<string, any>();

    for (const [agent, agentIssues] of categorizedIssues) {
      try {
        const response = await axios.post(
          `${HYBRID_AGENT_URL}/${agent}/fix/batch`,
          { issues: agentIssues, prInfo },
          { timeout: 30000 }
        );

        response.data.results.forEach((result: any) => {
          if (result.success) {
            fixes.set(result.issue.id, result.fix);
          }
        });
      } catch (error) {
        logger.error(`Fix generation failed for ${agent}`, error);
      }
    }

    return fixes;
  }

  /**
   * Categorize issues by their responsible agent
   */
  private categorizeIssuesByAgent(issues: any[]): Map<string, any[]> {
    const categorized = new Map<string, any[]>();

    for (const issue of issues) {
      const tool = this.tools.get(issue.tool);
      if (!tool) continue;

      const agent = this.agentMapping.get(tool.category);
      if (!agent) continue;

      if (!categorized.has(agent)) {
        categorized.set(agent, []);
      }
      categorized.get(agent)!.push(issue);
    }

    return categorized;
  }

  /**
   * Get statistics about tool usage
   */
  getStatistics(): any {
    const stats = {
      totalTools: this.tools.size,
      enabledTools: 0,
      toolsByCategory: {} as Record<string, number>,
      toolsByLanguage: {} as Record<string, number>
    };

    for (const tool of this.tools.values()) {
      if (tool.enabled) {
        stats.enabledTools++;
      }

      // Count by category
      stats.toolsByCategory[tool.category] = (stats.toolsByCategory[tool.category] || 0) + 1;

      // Count by language
      for (const lang of tool.languages) {
        stats.toolsByLanguage[lang] = (stats.toolsByLanguage[lang] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Enable or disable a tool
   */
  setToolEnabled(toolName: string, enabled: boolean) {
    const tool = this.tools.get(toolName);
    if (tool) {
      tool.enabled = enabled;
      logger.info(`Tool ${toolName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Get all available tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(tool => tool.category === category);
  }
}

// Export singleton instance
export const toolConnectionManager = new ToolConnectionManager();
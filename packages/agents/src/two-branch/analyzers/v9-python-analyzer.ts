/**
 * V9 Python Analyzer - Language-specific implementation
 * 
 * This class extends the V9BaseAnalyzer and provides Python-specific configurations:
 * - Tool configurations (Pylint, Bandit, mypy, Safety, etc.)
 * - Tool output parsers (using existing PythonToolParser)
 * - Python-specific suggested fixes
 * 
 * Follows the proven pattern from V9JavaAnalyzer and V9TypeScriptAnalyzer
 */

import { V9BaseAnalyzer } from './v9-base-analyzer';
import { LanguageConfig, Issue, IssueCategory } from './v9-types';
import { PythonToolParser, PythonIssue } from '../parsers/python-tool-parser';
import { PythonToolOrchestrator } from '../tools/python/python-tool-orchestrator';

export class V9PythonAnalyzer extends V9BaseAnalyzer {
  private parser: PythonToolParser;
  private orchestrator: PythonToolOrchestrator;
  
  constructor() {
    super();
    this.parser = new PythonToolParser();
    this.orchestrator = new PythonToolOrchestrator();
  }
  
  /**
   * Python-specific configuration
   */
  getLanguageConfig(): LanguageConfig {
    return {
      name: 'Python',
      fileExtensions: ['.py', '.pyw', '.pyx'],
      tools: [
        // NOTE: These tools are deployed in cloud pods
        
        // Pylint - Code Quality
        {
          name: 'pylint',
          command: 'python -m pylint --output-format=json . 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parsePylintOutput.bind(this)
        },

        // Bandit - Security Scanner
        {
          name: 'bandit',
          command: 'bandit -r . -f json 2>&1 || true',
          agent: 'SecurityAnalyzer',
          parser: this.parseBanditOutput.bind(this)
        },

        // mypy - Type Checking
        {
          name: 'mypy',
          command: 'mypy . --no-error-summary 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseMypyOutput.bind(this)
        },

        // Safety - Dependency Vulnerabilities
        {
          name: 'safety',
          command: 'safety check --json 2>&1 || true',
          agent: 'DependencyAnalyzer',
          parser: this.parseSafetyOutput.bind(this)
        },

        // Semgrep - Security Analysis (language-agnostic)
        {
          name: 'semgrep',
          command: 'semgrep --config=auto --json . 2>&1 || true',
          agent: 'SecurityAnalyzer',
          parser: this.parseSemgrepOutput.bind(this)
        }
      ],
      suggestedFixPatterns: {
        'sql injection': `# Use parameterized queries
cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
# Or use ORM
user = User.query.filter_by(username=username).first()`,
        
        'hardcoded secret': `# Use environment variables
import os
api_key = os.getenv('API_KEY')
if not api_key:
    raise ValueError('API_KEY environment variable not set')`,
        
        'command injection': `# Use subprocess with list arguments (not shell=True)
import subprocess
result = subprocess.run(['ls', directory], capture_output=True)
# Never: subprocess.run(f"ls {directory}", shell=True)`,
        
        'undefined variable': `# Check if variable exists
if hasattr(obj, 'attribute'):
    value = obj.attribute
# Or use getattr with default
value = getattr(obj, 'attribute', default_value)`,
        
        'type': `# Add type hints
def process_data(items: list[dict]) -> dict:
    result: dict[str, int] = {}
    return result`,
        
        'null check': `# Use None checks
if value is not None:
    process(value)
# Or use Optional
from typing import Optional
def get_user(id: int) -> Optional[User]:
    return User.query.get(id)`,
        
        'exception': `# Use specific exceptions and proper handling
try:
    process_data()
except ValueError as e:
    logger.error(f"Validation error: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise`,
        
        'unused import': `# Remove unused imports or use __all__
# Run: pip install autoflake
# autoflake --remove-all-unused-imports --in-place file.py`,

        'complexity': `# Reduce cyclomatic complexity
# Break into smaller functions
def process_item(item):
    validate(item)
    transform(item)
    save(item)

def process_all(items):
    for item in items:
        process_item(item)`
      }
    };
  }
  
  /**
   * Parse Pylint output
   * Adapter method: PythonIssue → V9 Issue
   */
  private async parsePylintOutput(output: string, workspacePath: string): Promise<Issue[]> {
    try {
      const result = await this.parser.runPylint(workspacePath);
      return result.issues.map(pyIssue => this.convertToV9Issue(pyIssue, workspacePath, 'QualityAnalyzer'));
    } catch (error: any) {
      this.logger.warn('Pylint parsing failed:', error.message);
      return [];
    }
  }
  
  /**
   * Parse Bandit output
   * Adapter method: PythonIssue → V9 Issue
   */
  private async parseBanditOutput(output: string, workspacePath: string): Promise<Issue[]> {
    try {
      const result = await this.parser.runBandit(workspacePath);
      return result.issues.map(pyIssue => this.convertToV9Issue(pyIssue, workspacePath, 'SecurityAnalyzer'));
    } catch (error: any) {
      this.logger.warn('Bandit parsing failed:', error.message);
      return [];
    }
  }
  
  /**
   * Parse mypy output
   * Adapter method: PythonIssue → V9 Issue
   */
  private async parseMypyOutput(output: string, workspacePath: string): Promise<Issue[]> {
    try {
      const result = await this.parser.runMypy(workspacePath);
      return result.issues.map(pyIssue => this.convertToV9Issue(pyIssue, workspacePath, 'QualityAnalyzer'));
    } catch (error: any) {
      this.logger.warn('mypy parsing failed:', error.message);
      return [];
    }
  }
  
  /**
   * Parse Safety output
   * Adapter method: PythonIssue → V9 Issue
   */
  private async parseSafetyOutput(output: string, workspacePath: string): Promise<Issue[]> {
    try {
      const result = await this.parser.runSafety(workspacePath);
      return result.issues.map(pyIssue => this.convertToV9Issue(pyIssue, workspacePath, 'DependencyAnalyzer'));
    } catch (error: any) {
      this.logger.warn('Safety parsing failed:', error.message);
      return [];
    }
  }
  
  /**
   * Parse Semgrep output (same as TypeScript)
   */
  private async parseSemgrepOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (data.results) {
          for (const result of data.results) {
            let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
            if (result.extra?.severity) {
              severity = result.extra.severity.toLowerCase() as any;
            }
            
            issues.push({
              id: `SEM-${result.check_id}`,
              category: 'Security',
              severity,
              status: 'new',
              title: result.extra?.message || 'Security issue detected',
              description: result.extra?.metadata?.description || result.check_id,
              file: result.path.replace(workspacePath + '/', ''),
              line: result.start.line,
              tool: 'semgrep',
              agent: 'SecurityAnalyzer',
              impact: result.extra?.metadata?.impact || 'Security vulnerability',
              businessImpact: this.getBusinessImpact('Security', severity),
              suggestedFix: result.extra?.fix || 'Review and fix security issue'
            });
          }
        }
      }
    } catch (e) {
      this.logger.warn('Semgrep parsing failed:', e);
    }
    
    return issues;
  }
  
  /**
   * Convert PythonIssue to V9 Issue format
   */
  private convertToV9Issue(
    pyIssue: PythonIssue, 
    workspacePath: string, 
    defaultAgent: string
  ): Issue {
    return {
      id: pyIssue.id,
      category: this.mapPythonTypeToCategory(pyIssue.type),
      severity: pyIssue.severity,
      status: 'new',
      title: this.extractTitle(pyIssue.message),
      description: pyIssue.message,
      file: pyIssue.file.replace(workspacePath + '/', ''),
      line: pyIssue.line,
      tool: pyIssue.tool,
      agent: this.mapToolToAgent(pyIssue.tool, pyIssue.type) || defaultAgent,
      impact: this.getImpact(this.mapPythonTypeToCategory(pyIssue.type), pyIssue.severity),
      businessImpact: this.getBusinessImpact(this.mapPythonTypeToCategory(pyIssue.type), pyIssue.severity),
      suggestedFix: pyIssue.suggestion || this.getSuggestedFix(pyIssue.message)
    };
  }
  
  /**
   * Map Python issue type to V9 category
   */
  private mapPythonTypeToCategory(type: string): IssueCategory {
    const mapping: Record<string, IssueCategory> = {
      'security': 'Security',
      'performance': 'Performance',
      'quality': 'Quality',
      'bug': 'Quality',
      'style': 'Quality',
      'type-error': 'Quality'
    };
    return mapping[type] || 'Quality';
  }
  
  /**
   * Map tool + type to appropriate agent
   */
  private mapToolToAgent(tool: string, type: string): string {
    if (tool === 'bandit' || tool === 'semgrep' || type === 'security') {
      return 'SecurityAnalyzer';
    }
    if (tool === 'safety') {
      return 'DependencyAnalyzer';
    }
    if (type === 'performance') {
      return 'PerformanceAnalyzer';
    }
    return 'QualityAnalyzer';
  }
  
  // Helper methods (same as TypeScript)
  
  private extractTitle(description: string): string {
    const title = description.substring(0, 60).trim();
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  private getImpact(category: IssueCategory, severity: string): string {
    const impacts = {
      Security: {
        critical: 'Allows remote code execution or data breach',
        high: 'Allows unauthorized access or injection attacks',
        medium: 'Security weakness requiring specific conditions',
        low: 'Minor security improvement needed'
      },
      Performance: {
        critical: 'Application hang or excessive memory usage',
        high: 'Severe performance degradation',
        medium: 'Noticeable slowdown under load',
        low: 'Minor performance optimization opportunity'
      },
      Dependency: {
        critical: 'Critical CVE with active exploits',
        high: 'High severity CVE in dependency',
        medium: 'Medium severity vulnerability',
        low: 'Low risk or informational'
      },
      Architecture: {
        critical: 'Major architectural flaw',
        high: 'Significant design issue',
        medium: 'Design improvement needed',
        low: 'Minor refactoring opportunity'
      },
      Quality: {
        critical: 'Code won\'t run or crashes',
        high: 'Likely to cause bugs or type errors',
        medium: 'Code maintainability issue',
        low: 'Style or convention violation'
      }
    };
    
    return impacts[category]?.[severity as keyof typeof impacts.Security] || 'Impact under assessment';
  }
  
  private getBusinessImpact(category: IssueCategory, severity: string): string {
    const impacts = {
      Security: {
        critical: '$100K-$500K breach cost, regulatory fines',
        high: '$50K-$100K incident response cost',
        medium: '$10K-$50K remediation cost',
        low: '$1K-$10K security review cost'
      },
      Performance: {
        critical: 'Service outage, customer churn',
        high: 'User complaints, support load increase',
        medium: 'Reduced user satisfaction',
        low: 'Minor UX impact'
      },
      Dependency: {
        critical: 'Emergency patch deployment required',
        high: 'Urgent update in current sprint',
        medium: 'Plan update for next release',
        low: 'Update when convenient'
      },
      Architecture: {
        critical: '6+ month refactor project',
        high: '2-3 month improvement project',
        medium: '2-4 week refactoring',
        low: '1-2 day improvement'
      },
      Quality: {
        critical: 'Release blocked, deployment failed',
        high: 'High bug probability, QA escalation',
        medium: 'Maintenance cost increase',
        low: 'Minor technical debt'
      }
    };
    
    return impacts[category]?.[severity as keyof typeof impacts.Security] || 'Business impact pending';
  }
  
  private getSuggestedFix(description: string): string {
    const fixes: Record<string, string> = {
      'sql': 'Use parameterized queries or ORM',
      'injection': 'Sanitize input, use safe APIs',
      'hardcoded': 'Use environment variables',
      'type': 'Add type hints',
      'none': 'Add None checks',
      'exception': 'Use specific exception handling',
      'import': 'Remove unused imports',
      'complexity': 'Reduce cyclomatic complexity',
      'format': 'Run black formatter',
      'naming': 'Follow PEP 8 naming conventions'
    };
    
    const descLower = description.toLowerCase();
    for (const [key, fix] of Object.entries(fixes)) {
      if (descLower.includes(key)) {
        return fix;
      }
    }
    
    return 'Apply Python best practices (PEP 8)';
  }
}

// Export for direct usage
export default V9PythonAnalyzer;

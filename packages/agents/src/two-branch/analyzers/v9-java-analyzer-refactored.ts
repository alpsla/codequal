/**
 * V9 Java Analyzer - Refactored with ModelAwareBaseAgent
 * 
 * This class extends the refactored V9BaseAnalyzer and provides:
 * - Java-specific tool configurations
 * - Tool output parsers
 * - Java-specific suggested fixes
 * - Automatic model selection and fallback
 */

import { V9BaseAnalyzer } from './v9-base-analyzer-refactored';
import { LanguageConfig, Issue, IssueCategory, IssueSeverity } from './v9-types';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class V9JavaAnalyzer extends V9BaseAnalyzer {
  
  constructor(agentName: string = 'V9JavaAnalyzer') {
    super(agentName);
  }
  
  /**
   * Java-specific configuration
   */
  getLanguageConfig(): LanguageConfig {
    return {
      name: 'Java',
      fileExtensions: ['.java', '.xml', '.gradle', '.mvn'],
      tools: [
        {
          name: 'spotbugs',
          command: 'spotbugs -textui -effort:max -low . 2>&1 || true',
          agent: 'QualityAnalyzer',
          supportsFileList: false,
          parser: this.parseSpotBugsOutput.bind(this)
        },
        {
          name: 'pmd',
          command: 'pmd check -d . -R rulesets/java/quickstart.xml -f text 2>&1 || true',
          agent: 'QualityAnalyzer',
          supportsFileList: false,
          parser: this.parsePMDOutput.bind(this)
        },
        {
          name: 'checkstyle',
          command: 'checkstyle -c /google_checks.xml . 2>&1 || true',
          agent: 'QualityAnalyzer',
          supportsFileList: false,
          parser: this.parseCheckstyleOutput.bind(this)
        },
        {
          name: 'dependency-check',
          command: 'dependency-check --scan . --format JSON --out dep-check.json 2>&1 || true',
          agent: 'DependencyAnalyzer',
          supportsFileList: false,
          parser: this.parseDependencyCheckOutput.bind(this)
        },
        {
          name: 'semgrep',
          command: 'semgrep --config=auto --json . 2>&1 || true',
          agent: 'SecurityAnalyzer',
          supportsFileList: false,
          parser: this.parseSemgrepOutput.bind(this)
        }
      ],
      suggestedFixPatterns: this.getJavaSuggestedFixes()
    };
  }
  
  /**
   * Java-specific suggested fixes
   */
  private getJavaSuggestedFixes(): Record<string, string> {
    return {
      'sql injection': `// Use PreparedStatement with parameterized queries
PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE username = ?");
ps.setString(1, username);
ResultSet rs = ps.executeQuery();`,
      
      'hardcoded': `// Use environment variables or properties file
String apiKey = System.getenv("API_KEY");
if (apiKey == null) {
    apiKey = properties.getProperty("api.key");
}`,
      
      'null check': `// Add null check before usage
if (object != null) {
    object.doSomething();
}
// Or use Optional
Optional.ofNullable(object).ifPresent(Object::doSomething);`,
      
      'resource leak': `// Use try-with-resources
try (FileInputStream fis = new FileInputStream(file);
     BufferedReader br = new BufferedReader(new InputStreamReader(fis))) {
    // Use resources
} // Auto-closed`,
      
      'n+1': `// Use JOIN fetch or batch loading
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.id IN :ids")
List<Order> findOrdersWithItems(@Param("ids") List<Long> ids);`,
      
      'synchronization': `// Use concurrent collections or proper synchronization
private final ConcurrentHashMap<String, Object> cache = new ConcurrentHashMap<>();
// Or use synchronized blocks properly
synchronized(lock) {
    // Critical section
}`
    };
  }
  
  /**
   * Parse SpotBugs output
   */
  private async parseSpotBugsOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes(':') && line.includes('.java')) {
        const parts = line.split(':');
        if (parts.length >= 3) {
          const filePart = parts[0].trim();
          const lineNum = parseInt(parts[1], 10) || 0;
          const message = parts.slice(2).join(':').trim();
          
          issues.push({
            id: `spotbugs-${issues.length + 1}`,
            category: this.categorizeSpotBugsIssue(message),
            severity: this.getSeverityFromMessage(message),
            status: 'new',
            title: 'SpotBugs Issue',
            description: message,
            file: filePart,
            line: lineNum,
            tool: 'spotbugs',
            agent: 'QualityAnalyzer',
            impact: 'Code quality issue detected',
            businessImpact: 'Potential bugs that may cause runtime errors'
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Parse PMD output
   */
  private async parsePMDOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/(.+\.java):(\d+):\s+(.+)/);
      if (match) {
        const [, file, lineStr, message] = match;
        
        issues.push({
          id: `pmd-${issues.length + 1}`,
          category: 'Quality' as IssueCategory,
          severity: 'medium' as IssueSeverity,
          status: 'new',
          title: 'PMD Rule Violation',
          description: message,
          file: file.replace(workspacePath + '/', ''),
          line: parseInt(lineStr, 10),
          tool: 'pmd',
          agent: 'QualityAnalyzer',
          impact: 'Code style or quality issue',
          businessImpact: 'May affect code maintainability'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse Checkstyle output
   */
  private async parseCheckstyleOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      const match = line.match(/\[ERROR\]\s+(.+\.java):(\d+):(\d+):\s+(.+)/);
      if (match) {
        const [, file, lineStr, , message] = match;
        
        issues.push({
          id: `checkstyle-${issues.length + 1}`,
          category: 'Quality' as IssueCategory,
          severity: 'low' as IssueSeverity,
          status: 'new',
          title: 'Checkstyle Violation',
          description: message,
          file: file.replace(workspacePath + '/', ''),
          line: parseInt(lineStr, 10),
          tool: 'checkstyle',
          agent: 'QualityAnalyzer',
          impact: 'Code style issue',
          businessImpact: 'Affects code consistency'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse Dependency Check output
   */
  private async parseDependencyCheckOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    try {
      const jsonFile = path.join(workspacePath, 'dep-check.json');
      if (fs.existsSync(jsonFile)) {
        const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        
        if (data.dependencies) {
          for (const dep of data.dependencies) {
            if (dep.vulnerabilities) {
              for (const vuln of dep.vulnerabilities) {
                issues.push({
                  id: `dep-check-${issues.length + 1}`,
                  category: 'Dependency' as IssueCategory,
                  severity: this.mapCVSSSeverity(vuln.cvssv3?.baseScore || vuln.cvssv2?.score || 0),
                  status: 'new',
                  title: `Vulnerable Dependency: ${dep.fileName}`,
                  description: `${vuln.name}: ${vuln.description}`,
                  file: dep.filePath || '',
                  line: 0,
                  tool: 'dependency-check',
                  agent: 'DependencyAnalyzer',
                  impact: `Security vulnerability in dependency`,
                  businessImpact: `CVE ${vuln.name} with severity ${vuln.severity}`
                });
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to parse dependency check output', error);
    }
    
    return issues;
  }
  
  /**
   * Parse Semgrep output
   */
  private async parseSemgrepOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    try {
      const data = JSON.parse(output);
      
      if (data.results) {
        for (const result of data.results) {
          issues.push({
            id: `semgrep-${issues.length + 1}`,
            category: 'Security' as IssueCategory,
            severity: this.mapSemgrepSeverity(result.extra?.severity || 'WARNING'),
            status: 'new',
            title: result.check_id || 'Security Issue',
            description: result.extra?.message || result.check_id,
            file: result.path.replace(workspacePath + '/', ''),
            line: result.start.line,
            tool: 'semgrep',
            agent: 'SecurityAnalyzer',
            impact: result.extra?.metadata?.impact || 'Security vulnerability detected',
            businessImpact: result.extra?.metadata?.likelihood || 'Potential security risk'
          });
        }
      }
    } catch (error) {
      logger.error('Failed to parse semgrep output', error);
    }
    
    return issues;
  }
  
  /**
   * Helper methods for categorization and severity mapping
   */
  private categorizeSpotBugsIssue(message: string): IssueCategory {
    const lower = message.toLowerCase();
    if (lower.includes('security') || lower.includes('injection') || lower.includes('vulnerability')) {
      return 'Security';
    }
    if (lower.includes('performance') || lower.includes('inefficient')) {
      return 'Performance';
    }
    return 'Quality';
  }
  
  private getSeverityFromMessage(message: string): IssueSeverity {
    const lower = message.toLowerCase();
    if (lower.includes('critical') || lower.includes('high priority')) {
      return 'critical';
    }
    if (lower.includes('warning') || lower.includes('medium')) {
      return 'medium';
    }
    return 'low';
  }
  
  private mapCVSSSeverity(score: number): IssueSeverity {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }
  
  private mapSemgrepSeverity(severity: string): IssueSeverity {
    switch (severity.toUpperCase()) {
      case 'ERROR':
      case 'CRITICAL':
        return 'critical';
      case 'WARNING':
      case 'HIGH':
        return 'high';
      case 'INFO':
      case 'MEDIUM':
        return 'medium';
      default:
        return 'low';
    }
  }
}
/**
 * V8 Java Analyzer - Language-specific implementation
 * 
 * This class extends the V8BaseAnalyzer and only implements
 * Java-specific configurations:
 * - Tool configurations (SpotBugs, PMD, Checkstyle, etc.)
 * - Tool output parsers
 * - Java-specific suggested fixes
 */

import { V8BaseAnalyzer, LanguageConfig, Issue, IssueCategory } from './v8-base-analyzer';

export class V8JavaAnalyzer extends V8BaseAnalyzer {
  
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
          parser: this.parseSpotBugsOutput.bind(this)
        },
        {
          name: 'pmd',
          command: 'pmd check -d . -R rulesets/java/quickstart.xml -f text 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parsePMDOutput.bind(this)
        },
        {
          name: 'checkstyle',
          command: 'checkstyle -c /google_checks.xml . 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseCheckstyleOutput.bind(this)
        },
        {
          name: 'dependency-check',
          command: 'dependency-check --scan . --format JSON --out dep-check.json 2>&1 || true',
          agent: 'DependencyAnalyzer',
          parser: this.parseDependencyCheckOutput.bind(this)
        },
        {
          name: 'semgrep',
          command: 'semgrep --config=auto --json . 2>&1 || true',
          agent: 'SecurityAnalyzer',
          parser: this.parseSemgrepOutput.bind(this)
        }
      ],
      suggestedFixPatterns: {
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
      }
    };
  }
  
  /**
   * Parse SpotBugs output
   */
  private async parseSpotBugsOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match SpotBugs pattern
      const bugMatch = line.match(/(\w+):\s+(.+)\s+at\s+(.+)\s+\[line\s+(\d+)\]/);
      if (bugMatch) {
        const [_, bugType, description, file, lineNum] = bugMatch;
        
        // Determine category and severity based on bug type
        let category: IssueCategory = 'Quality';
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        
        if (bugType.includes('SQL') || bugType.includes('SECURITY')) {
          category = 'Security';
          severity = 'critical';
        } else if (bugType.includes('PERFORMANCE')) {
          category = 'Performance';
          severity = 'high';
        } else if (bugType.includes('NULL')) {
          severity = 'high';
        }
        
        issues.push({
          id: `SPOT-${bugType}`,
          category,
          severity,
          status: 'new',
          title: this.extractTitle(description),
          description,
          file: file.replace(workspacePath + '/', ''),
          line: parseInt(lineNum),
          tool: 'spotbugs',
          agent: 'QualityAnalyzer',
          impact: this.getImpact(category, severity),
          businessImpact: this.getBusinessImpact(category, severity),
          suggestedFix: this.getSuggestedFix(description)
        });
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
      // Match PMD violation pattern
      const violationMatch = line.match(/(.+):(\d+):\s+(.+)/);
      if (violationMatch) {
        const [_, file, lineNum, description] = violationMatch;
        
        // Categorize based on description
        let category: IssueCategory = 'Quality';
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        
        if (description.includes('Security')) {
          category = 'Security';
          severity = 'high';
        } else if (description.includes('Performance')) {
          category = 'Performance';
          severity = 'medium';
        } else if (description.includes('Design')) {
          category = 'Architecture';
          severity = 'medium';
        }
        
        issues.push({
          id: `PMD-${issues.length + 1}`,
          category,
          severity,
          status: 'new',
          title: this.extractTitle(description),
          description,
          file: file.replace(workspacePath + '/', ''),
          line: parseInt(lineNum),
          tool: 'pmd',
          agent: 'QualityAnalyzer',
          impact: this.getImpact(category, severity),
          businessImpact: this.getBusinessImpact(category, severity),
          suggestedFix: this.getSuggestedFix(description)
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
      // Match Checkstyle warning/error pattern
      const checkMatch = line.match(/\[(\w+)\]\s+(.+):(\d+):\s+(.+)/);
      if (checkMatch) {
        const [_, level, file, lineNum, description] = checkMatch;
        
        const severity: 'critical' | 'high' | 'medium' | 'low' = 
          level === 'ERROR' ? 'high' : 'low';
        
        issues.push({
          id: `CS-${issues.length + 1}`,
          category: 'Quality',
          severity,
          status: 'new',
          title: this.extractTitle(description),
          description,
          file: file.replace(workspacePath + '/', ''),
          line: parseInt(lineNum),
          tool: 'checkstyle',
          agent: 'QualityAnalyzer',
          impact: 'Code style violation',
          businessImpact: 'Minor - affects code consistency',
          suggestedFix: 'Apply Google Java Style Guide'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse Dependency Check output (JSON format)
   */
  private async parseDependencyCheckOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    try {
      // Try to parse JSON output
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (data.dependencies) {
          for (const dep of data.dependencies) {
            if (dep.vulnerabilities && dep.vulnerabilities.length > 0) {
              for (const vuln of dep.vulnerabilities) {
                issues.push({
                  id: vuln.name || `CVE-${issues.length + 1}`,
                  category: 'Dependency',
                  severity: this.cvssToSeverity(vuln.cvssScore),
                  status: 'new',
                  title: `Vulnerability in ${dep.fileName}`,
                  description: vuln.description || 'Security vulnerability detected',
                  file: 'pom.xml',
                  line: 1,
                  tool: 'dependency-check',
                  agent: 'DependencyAnalyzer',
                  impact: 'Known security vulnerability',
                  businessImpact: this.getBusinessImpact('Dependency', this.cvssToSeverity(vuln.cvssScore)),
                  suggestedFix: `Update ${dep.fileName} to latest secure version`
                });
              }
            }
          }
        }
      }
    } catch (e) {
      // Fallback to text parsing if JSON fails
      if (output.includes('vulnerabilities found')) {
        issues.push({
          id: 'DEP-001',
          category: 'Dependency',
          severity: 'high',
          status: 'new',
          title: 'Vulnerable dependencies detected',
          description: 'Security vulnerabilities found in project dependencies',
          file: 'pom.xml',
          line: 1,
          tool: 'dependency-check',
          agent: 'DependencyAnalyzer',
          impact: 'Security vulnerabilities in dependencies',
          businessImpact: 'Potential security breach risk'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse Semgrep output (JSON format)
   */
  private async parseSemgrepOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (data.results) {
          for (const result of data.results) {
            // Determine severity
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
      // Handle parse error silently
    }
    
    return issues;
  }
  
  // Helper methods
  
  private extractTitle(description: string): string {
    const title = description.substring(0, 60).trim();
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  private cvssToSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }
  
  private getImpact(category: IssueCategory, severity: string): string {
    const impacts = {
      Security: {
        critical: 'Allows remote code execution or complete system compromise',
        high: 'Allows unauthorized access or data exposure',
        medium: 'Security weakness that requires specific conditions',
        low: 'Minor security improvement needed'
      },
      Performance: {
        critical: 'Application crash or hang',
        high: 'Severe performance degradation',
        medium: 'Noticeable slowdown under load',
        low: 'Minor performance improvement possible'
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
        critical: 'Code won\'t compile or crashes',
        high: 'Likely to cause bugs',
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
        critical: 'Service outage, $50K/hour downtime',
        high: 'Customer churn, revenue loss',
        medium: 'Support ticket increase',
        low: 'Minor user complaints'
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
        critical: 'Release blocked',
        high: 'High bug probability',
        medium: 'Maintenance cost increase',
        low: 'Minor quality debt'
      }
    };
    
    return impacts[category]?.[severity as keyof typeof impacts.Security] || 'Business impact pending';
  }
  
  private getSuggestedFix(description: string): string {
    const fixes: Record<string, string> = {
      'null': 'Add null check before usage',
      'sql': 'Use PreparedStatement with parameters',
      'resource': 'Use try-with-resources',
      'synchronized': 'Use proper synchronization',
      'equals': 'Override hashCode when overriding equals',
      'serializable': 'Add serialVersionUID',
      'unused': 'Remove unused code',
      'complexity': 'Refactor to reduce complexity',
      'naming': 'Follow Java naming conventions'
    };
    
    const descLower = description.toLowerCase();
    for (const [key, fix] of Object.entries(fixes)) {
      if (descLower.includes(key)) {
        return fix;
      }
    }
    
    return 'Review and apply Java best practices';
  }
}

// Export for direct usage
export default V8JavaAnalyzer;
/**
 * V9 JavaScript/TypeScript Analyzer
 * Language-specific analyzer for JavaScript and TypeScript repositories
 */

import { V9BaseAnalyzer } from './v9-base-analyzer';
import { LanguageConfig, Issue, IssueCategory } from './v9-types';

export class V9JavaScriptAnalyzer extends V9BaseAnalyzer {
  
  /**
   * JavaScript/TypeScript configuration with actual tools
   */
  getLanguageConfig(): LanguageConfig {
    return {
      name: 'JavaScript/TypeScript',
      fileExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', 'package.json', 'tsconfig.json'],
      tools: [
        {
          name: 'eslint',
          command: 'eslint . --format json 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseESLintOutput.bind(this)
        },
        {
          name: 'npm-audit',
          command: 'npm audit --json 2>&1 || true',
          agent: 'DependencyAnalyzer',
          parser: this.parseNpmAuditOutput.bind(this)
        },
        {
          name: 'semgrep',
          command: 'semgrep --config=auto --json . 2>&1 || true',
          agent: 'SecurityAnalyzer',
          parser: this.parseSemgrepOutput.bind(this)
        },
        {
          name: 'tsc',
          command: 'tsc --noEmit --pretty false 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseTscOutput.bind(this)
        },
        {
          name: 'jshint',
          command: 'jshint . --reporter=json 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseJSHintOutput.bind(this)
        }
      ],
      suggestedFixPatterns: {
        'sql injection': `// Use parameterized queries with prepared statements
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId], (error, results) => {
  // Handle results
});`,
        
        'xss': `// Sanitize user input before rendering
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(userInput);
element.innerHTML = sanitized;`,
        
        'hardcoded': `// Use environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable is required');
}`,
        
        'async': `// Use async/await with proper error handling
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}`,
        
        'null check': `// Use optional chaining and nullish coalescing
const value = object?.property?.nested ?? defaultValue;
// Or guard clauses
if (!object?.property) {
  return defaultValue;
}`,
        
        'memory leak': `// Clean up event listeners and timers
useEffect(() => {
  const handler = () => console.log('clicked');
  element.addEventListener('click', handler);
  
  return () => {
    element.removeEventListener('click', handler);
  };
}, []);`,
        
        'type': `// Add TypeScript types
interface User {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User): void {
  // Type-safe processing
}`
      }
    };
  }

  /**
   * Parse ESLint output
   */
  private async parseESLintOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    try {
      const data = JSON.parse(output);
      if (Array.isArray(data)) {
        for (const file of data) {
          for (const message of file.messages || []) {
            issues.push({
              id: `eslint-${message.ruleId}-${Date.now()}`,
              category: 'Quality' as IssueCategory,
              severity: this.mapESLintSeverity(message.severity),
              status: 'new',
              title: message.message,
              description: `${message.message} (Rule: ${message.ruleId})`,
              file: file.filePath,
              line: message.line || 0,
              tool: 'eslint',
              agent: 'QualityAnalyzer',
              impact: 'Code quality issue',
              businessImpact: 'May affect code maintainability and reliability',
              codeSnippet: message.source,
              suggestedFix: message.fix ? 'Auto-fixable with ESLint' : this.getSuggestedFix(message.ruleId || '')
            });
          }
        }
      }
    } catch (e) {
      // Fallback to text parsing
    }
    return issues;
  }

  /**
   * Parse npm audit output
   */
  private async parseNpmAuditOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    try {
      const data = JSON.parse(output);
      if (data.vulnerabilities) {
        for (const [pkg, vuln] of Object.entries(data.vulnerabilities) as any) {
          issues.push({
            id: `npm-audit-${pkg}-${Date.now()}`,
            category: 'Dependency' as IssueCategory,
            severity: this.mapNpmAuditSeverity(vuln.severity),
            status: 'new',
            title: `Vulnerable dependency: ${pkg}`,
            description: vuln.via?.[0]?.title || `Security vulnerability in ${pkg}`,
            file: 'package.json',
            line: 0,
            tool: 'npm-audit',
            agent: 'DependencyAnalyzer',
            impact: 'Security vulnerability in dependency',
            businessImpact: this.getDependencyBusinessImpact(vuln.severity),
            suggestedFix: vuln.fixAvailable ? `Run: npm audit fix` : `Manual update required for ${pkg}`
            });
        }
      }
    } catch (e) {
      // Fallback
    }
    return issues;
  }

  /**
   * Parse TypeScript compiler output
   */
  private async parseTscOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Parse TypeScript error format: file(line,col): error TS####: message
      const match = line.match(/(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)/);
      if (match) {
        issues.push({
          id: `tsc-${match[4]}-${Date.now()}`,
          category: 'Quality' as IssueCategory,
          severity: 'high',
          status: 'new',
          title: match[5],
          description: `TypeScript Error ${match[4]}: ${match[5]}`,
          file: match[1],
          line: parseInt(match[2]),
          tool: 'tsc',
          agent: 'QualityAnalyzer',
          impact: 'Type safety violation',
          businessImpact: 'May cause runtime errors',
          suggestedFix: this.getSuggestedFix('type')
        });
      }
    }
    return issues;
  }

  /**
   * Parse JSHint output
   */
  private async parseJSHintOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    try {
      const data = JSON.parse(output);
      if (data.result) {
        for (const file of data.result) {
          for (const error of file.error || []) {
            issues.push({
              id: `jshint-${error.code}-${Date.now()}`,
              category: 'Quality' as IssueCategory,
              severity: this.mapJSHintSeverity(error.code),
              status: 'new',
              title: error.reason,
              description: `${error.reason} (${error.code})`,
              file: file.file,
              line: error.line,
              tool: 'jshint',
              agent: 'QualityAnalyzer',
              impact: 'Code quality issue',
              businessImpact: 'May affect code reliability',
              codeSnippet: error.evidence,
              suggestedFix: this.getSuggestedFix(error.code || '')
            });
          }
        }
      }
    } catch (e) {
      // Fallback
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
            id: `semgrep-${result.check_id}-${Date.now()}`,
            category: 'Security' as IssueCategory,
            severity: this.mapSemgrepSeverity(result.extra?.severity),
            status: 'new',
            title: result.extra?.message || 'Security issue detected',
            description: `${result.extra?.message}. Rule: ${result.check_id}`,
            file: result.path,
            line: result.start?.line || 0,
            tool: 'semgrep',
            agent: 'SecurityAnalyzer',
            impact: result.extra?.metadata?.impact || 'Potential security issue',
            businessImpact: this.getSecurityBusinessImpact(result.extra?.severity),
            codeSnippet: result.extra?.lines,
            suggestedFix: result.extra?.fix || this.getSuggestedFix(result.check_id)
          });
        }
      }
    } catch (e) {
      // Fallback
    }
    return issues;
  }

  /**
   * Map severity levels
   */
  private mapESLintSeverity(severity: number): 'critical' | 'high' | 'medium' | 'low' {
    return severity === 2 ? 'high' : 'medium';
  }

  private mapNpmAuditSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'moderate': return 'medium';
      case 'low': return 'low';
      default: return 'low';
    }
  }

  private mapJSHintSeverity(code: string): 'critical' | 'high' | 'medium' | 'low' {
    if (code?.startsWith('E')) return 'high';
    if (code?.startsWith('W')) return 'medium';
    return 'low';
  }

  private mapSemgrepSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' {
    switch (severity?.toUpperCase()) {
      case 'ERROR': return 'critical';
      case 'WARNING': return 'high';
      case 'INFO': return 'medium';
      default: return 'low';
    }
  }

  private getSecurityBusinessImpact(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'ERROR':
        return 'Critical security risk, immediate action required';
      case 'HIGH':
      case 'WARNING':
        return 'High security risk, should be addressed urgently';
      case 'MEDIUM':
        return 'Moderate security risk, plan to address soon';
      default:
        return 'Low security impact, best practice violation';
    }
  }

  private getDependencyBusinessImpact(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'Critical vulnerability, system compromise possible';
      case 'high':
        return 'High risk vulnerability, potential for data breach';
      case 'moderate':
        return 'Moderate risk, should be updated in next release';
      default:
        return 'Low risk, update when convenient';
    }
  }

  private getSuggestedFix(issueType: string): string {
    const fixes = this.getLanguageConfig().suggestedFixPatterns;
    for (const [key, fix] of Object.entries(fixes)) {
      if (issueType.toLowerCase().includes(key)) {
        return fix;
      }
    }
    return 'Review and fix the identified issue';
  }
}
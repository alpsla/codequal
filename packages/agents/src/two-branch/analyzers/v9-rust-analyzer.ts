/**
 * V9 Rust Analyzer - Language-specific implementation
 * 
 * This class extends the V9BaseAnalyzer and only implements
 * Rust-specific configurations:
 * - Tool configurations (clippy, cargo-audit, etc.)
 * - Tool output parsers
 * - Rust-specific suggested fixes
 */

import { V9BaseAnalyzer } from './v9-base-analyzer';
import { LanguageConfig, Issue, IssueCategory } from './v9-types';

export class V9RustAnalyzer extends V9BaseAnalyzer {
  
  /**
   * Rust-specific configuration
   */
  getLanguageConfig(): LanguageConfig {
    return {
      name: 'Rust',
      fileExtensions: ['.rs', '.toml'],
      tools: [
        {
          name: 'clippy',
          command: 'cargo clippy --all-targets -- -D warnings 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseClippyOutput.bind(this)
        },
        {
          name: 'cargo-audit',
          command: 'cargo audit 2>&1 || true',
          agent: 'DependencyAnalyzer',
          parser: this.parseCargoAuditOutput.bind(this)
        },
        {
          name: 'cargo-fmt',
          command: 'cargo fmt -- --check 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseCargoFmtOutput.bind(this)
        },
        {
          name: 'cargo-test',
          command: 'cargo test --no-run 2>&1 || true',
          agent: 'QualityAnalyzer',
          parser: this.parseCargoTestOutput.bind(this)
        }
      ],
      suggestedFixPatterns: {
        'sql injection': `// Use prepared statements
use sqlx::query;

let user = query!("SELECT * FROM users WHERE username = ?", username)
    .fetch_one(&pool)
    .await?;`,
        
        'hardcoded': `// Use environment variables
use std::env;

let api_key = env::var("API_KEY")
    .expect("API_KEY must be set");`,
        
        'unwrap': `// Use proper error handling
let result = operation()?; // Or use match for custom handling`,
        
        'clone': `// Use references instead
fn process(data: &DataType) { // Pass by reference
    // No clone needed
}`,
        
        'memory': `// Ensure proper memory management
use std::rc::Rc; // Or Arc for thread safety
let shared_data = Rc::new(data);`,
        
        'n+1': `// Use batch loading
let items = sqlx::query!(
    "SELECT * FROM items WHERE order_id = ANY($1)",
    &order_ids
).fetch_all(&pool).await?;`
      }
    };
  }
  
  /**
   * Parse Clippy output
   */
  private async parseClippyOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match Clippy warning pattern
      const warningMatch = line.match(/warning: (.+)/);
      if (warningMatch) {
        const description = warningMatch[1];
        
        // Look for file location in next lines
        const locationLine = lines[i + 1] || '';
        const locationMatch = locationLine.match(/\s+-->\s+(.+):(\d+):(\d+)/);
        
        if (locationMatch) {
          const [_, file, lineNum, _col] = locationMatch;
          
          // Determine category and severity
          let category: IssueCategory = 'Quality';
          let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
          
          if (description.includes('unsafe') || description.includes('security')) {
            category = 'Security';
            severity = 'high';
          } else if (description.includes('performance') || description.includes('clone')) {
            category = 'Performance';
            severity = 'medium';
          } else if (description.includes('deprecated')) {
            category = 'Dependency';
            severity = 'low';
          }
          
          issues.push({
            id: `CLIPPY-${issues.length + 1}`,
            category,
            severity,
            status: 'new',
            title: this.extractTitle(description),
            description,
            file: file.replace(workspacePath + '/', ''),
            line: parseInt(lineNum),
            tool: 'clippy',
            agent: 'QualityAnalyzer',
            impact: this.getImpact(category, severity),
            businessImpact: this.getBusinessImpact(category, severity),
            suggestedFix: this.getSuggestedFix(description)
          });
        }
      }
      
      // Match Clippy error pattern
      const errorMatch = line.match(/error: (.+)/);
      if (errorMatch) {
        const description = errorMatch[1];
        const locationLine = lines[i + 1] || '';
        const locationMatch = locationLine.match(/\s+-->\s+(.+):(\d+):(\d+)/);
        
        if (locationMatch) {
          const [_, file, lineNum, _col] = locationMatch;
          
          issues.push({
            id: `CLIPPY-ERR-${issues.length + 1}`,
            category: 'Quality',
            severity: 'critical',
            status: 'new',
            title: this.extractTitle(description),
            description,
            file: file.replace(workspacePath + '/', ''),
            line: parseInt(lineNum),
            tool: 'clippy',
            agent: 'QualityAnalyzer',
            impact: 'Code will not compile or has critical issues',
            businessImpact: 'Cannot ship product, blocking release'
          });
        }
      }
    }
    
    return issues;
  }
  
  /**
   * Parse cargo-audit output
   */
  private async parseCargoAuditOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match RUSTSEC advisories
      const rustsecMatch = line.match(/RUSTSEC-(\d{4}-\d{4}):\s+(.+)/);
      if (rustsecMatch) {
        const [_, advisoryId, description] = rustsecMatch;
        
        issues.push({
          id: `RUSTSEC-${advisoryId}`,
          category: 'Dependency',
          severity: 'high',
          status: 'new',
          title: `Security Advisory: ${advisoryId}`,
          description,
          file: 'Cargo.toml',
          line: 1,
          tool: 'cargo-audit',
          agent: 'DependencyAnalyzer',
          impact: 'Known security vulnerability in dependency',
          businessImpact: 'Security breach risk, immediate patch required',
          suggestedFix: 'Update to patched version or use alternative dependency'
        });
      }
      
      // Match vulnerability count
      const vulnMatch = line.match(/(\d+) vulnerabilities? found/);
      if (vulnMatch && parseInt(vulnMatch[1]) > 0 && issues.length === 0) {
        // Generic vulnerability if no specific RUSTSEC found
        issues.push({
          id: 'DEP-VULN-001',
          category: 'Dependency',
          severity: 'high',
          status: 'new',
          title: 'Vulnerable Dependencies Detected',
          description: `${vulnMatch[1]} vulnerabilities found in dependencies`,
          file: 'Cargo.toml',
          line: 1,
          tool: 'cargo-audit',
          agent: 'DependencyAnalyzer',
          impact: 'Security vulnerabilities in dependency tree',
          businessImpact: 'Potential security breach, update required'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse cargo fmt output
   */
  private async parseCargoFmtOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match formatting issues
      const diffMatch = line.match(/Diff in (.+) at line (\d+)/);
      if (diffMatch) {
        const [_, file, lineNum] = diffMatch;
        
        issues.push({
          id: `FMT-${issues.length + 1}`,
          category: 'Quality',
          severity: 'low',
          status: 'new',
          title: 'Code formatting issue',
          description: 'Code does not match Rust formatting standards',
          file: file.replace(workspacePath + '/', ''),
          line: parseInt(lineNum),
          tool: 'cargo-fmt',
          agent: 'QualityAnalyzer',
          impact: 'Code style inconsistency',
          businessImpact: 'Minor - affects code readability',
          suggestedFix: 'Run `cargo fmt` to fix formatting'
        });
      }
    }
    
    return issues;
  }
  
  /**
   * Parse cargo test output
   */
  private async parseCargoTestOutput(output: string, workspacePath: string): Promise<Issue[]> {
    const issues: Issue[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match compilation errors in tests
      const errorMatch = line.match(/error\[E(\d+)\]:\s+(.+)/);
      if (errorMatch) {
        const [_, errorCode, description] = errorMatch;
        
        issues.push({
          id: `TEST-E${errorCode}`,
          category: 'Quality',
          severity: 'high',
          status: 'new',
          title: `Test compilation error E${errorCode}`,
          description,
          file: 'tests/',
          line: 1,
          tool: 'cargo-test',
          agent: 'QualityAnalyzer',
          impact: 'Tests cannot compile',
          businessImpact: 'Cannot validate code correctness',
          suggestedFix: 'Fix compilation errors in test code'
        });
      }
    }
    
    return issues;
  }
  
  // Helper methods
  
  private extractTitle(description: string): string {
    // Take first 60 characters and clean up
    const title = description.substring(0, 60).trim();
    return title.charAt(0).toUpperCase() + title.slice(1);
  }
  
  private getImpact(category: IssueCategory, severity: string): string {
    const impacts = {
      Security: {
        critical: 'Allows arbitrary code execution or data breach',
        high: 'Exposes sensitive data or allows unauthorized access',
        medium: 'Potential security vulnerability under specific conditions',
        low: 'Minor security concern with limited impact'
      },
      Performance: {
        critical: 'Causes system outage or severe degradation',
        high: 'Significant performance impact affecting user experience',
        medium: 'Noticeable performance degradation under load',
        low: 'Minor performance impact in edge cases'
      },
      Dependency: {
        critical: 'Critical vulnerability in dependency',
        high: 'Known security issue in dependency',
        medium: 'Outdated dependency with available updates',
        low: 'Optional dependency upgrade available'
      },
      Architecture: {
        critical: 'Fundamental design flaw requiring major refactoring',
        high: 'Violates core architectural principles',
        medium: 'Suboptimal design pattern affecting maintainability',
        low: 'Minor architectural improvement opportunity'
      },
      Quality: {
        critical: 'Code will not compile or causes runtime errors',
        high: 'Significant code quality issues affecting reliability',
        medium: 'Code quality issues affecting maintainability',
        low: 'Minor style or convention violations'
      }
    };
    
    return impacts[category]?.[severity as keyof typeof impacts.Security] || 'Impact assessment pending';
  }
  
  private getBusinessImpact(category: IssueCategory, severity: string): string {
    const impacts = {
      Security: {
        critical: '$50K-$250K potential breach cost, GDPR violations',
        high: '$10K-$50K remediation cost, reputation damage',
        medium: '$5K-$10K security audit findings',
        low: 'Minimal financial impact'
      },
      Performance: {
        critical: 'Service downtime costing $10K/hour',
        high: 'User churn due to poor performance',
        medium: 'Reduced customer satisfaction scores',
        low: 'Minor user experience impact'
      },
      Dependency: {
        critical: 'Immediate patch required, service at risk',
        high: 'Urgent update needed within sprint',
        medium: 'Schedule update in next release',
        low: 'Optional update when convenient'
      },
      Architecture: {
        critical: '3-6 month refactoring project required',
        high: '1-2 month technical debt paydown',
        medium: '1-2 week improvement sprint',
        low: '1-2 day enhancement'
      },
      Quality: {
        critical: 'Cannot ship product, blocking release',
        high: 'Increased bug reports and support costs',
        medium: 'Higher maintenance costs over time',
        low: 'Minimal business impact'
      }
    };
    
    return impacts[category]?.[severity as keyof typeof impacts.Security] || 'Business impact under evaluation';
  }
  
  private getSuggestedFix(description: string): string {
    const fixes: Record<string, string> = {
      'unwrap': 'Use ? operator or match for proper error handling',
      'clone': 'Use references to avoid unnecessary cloning',
      'unused': 'Remove unused code or add #[allow(unused)]',
      'mut': 'Remove unnecessary mut keyword',
      'deprecated': 'Update to use non-deprecated alternative',
      'unsafe': 'Review unsafe code and add safety documentation',
      'panic': 'Handle error case without panicking',
      'lifetime': 'Fix lifetime annotations'
    };
    
    const descLower = description.toLowerCase();
    for (const [key, fix] of Object.entries(fixes)) {
      if (descLower.includes(key)) {
        return fix;
      }
    }
    
    return 'Review and apply Rust best practices';
  }
}

// Export for direct usage
export default V9RustAnalyzer;
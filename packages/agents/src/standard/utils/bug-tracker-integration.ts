/**
 * Bug Tracker Integration
 * 
 * This utility helps automatically create and track bugs when issues are discovered
 * during development or testing. It integrates with the bug-tracker agent.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Bug {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  component: string;
  file?: string;
  line?: number;
  createdAt: Date;
  updatedAt?: Date;
  assignee?: string;
  labels?: string[];
  reproductionSteps?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  suggestedFix?: string;
}

export class BugTracker {
  private bugsDir: string;
  private currentBugs: Bug[] = [];
  
  constructor() {
    this.bugsDir = path.join(__dirname, '../../bugs');
    this.ensureBugsDirectory();
    this.loadExistingBugs();
  }
  
  private ensureBugsDirectory(): void {
    if (!fs.existsSync(this.bugsDir)) {
      fs.mkdirSync(this.bugsDir, { recursive: true });
    }
  }
  
  private loadExistingBugs(): void {
    const bugFiles = fs.readdirSync(this.bugsDir)
      .filter(f => f.endsWith('.json'));
    
    this.currentBugs = bugFiles.map(file => {
      const content = fs.readFileSync(path.join(this.bugsDir, file), 'utf-8');
      return JSON.parse(content) as Bug;
    });
  }
  
  /**
   * Create a new bug entry
   */
  createBug(bug: Omit<Bug, 'id' | 'createdAt'>): Bug {
    const newBug: Bug = {
      ...bug,
      id: this.generateBugId(),
      createdAt: new Date(),
      status: bug.status || 'open'
    };
    
    this.currentBugs.push(newBug);
    this.saveBug(newBug);
    this.generateMarkdownReport();
    
    console.log(`🐛 Bug created: ${newBug.id} - ${newBug.title}`);
    return newBug;
  }
  
  /**
   * Generate a unique bug ID
   */
  private generateBugId(): string {
    const date = new Date().toISOString().split('T')[0];
    const count = this.currentBugs.filter(b => 
      b.id.startsWith(`BUG-${date}`)
    ).length + 1;
    return `BUG-${date}-${String(count).padStart(3, '0')}`;
  }
  
  /**
   * Save bug to JSON file
   */
  private saveBug(bug: Bug): void {
    const filename = `${bug.id}.json`;
    const filepath = path.join(this.bugsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(bug, null, 2));
  }
  
  /**
   * Generate markdown report of all bugs
   */
  generateMarkdownReport(): void {
    const reportPath = path.join(this.bugsDir, 'BUGS.md');
    let content = '# Bug Tracking Report\\n';
    content += `**Last Updated:** ${new Date().toISOString()}\\n\\n`;
    
    // Group bugs by status
    const openBugs = this.currentBugs.filter(b => b.status === 'open');
    const inProgressBugs = this.currentBugs.filter(b => b.status === 'in-progress');
    const resolvedBugs = this.currentBugs.filter(b => b.status === 'resolved');
    
    if (openBugs.length > 0) {
      content += '## 🔴 Open Bugs\\n\\n';
      openBugs.forEach(bug => {
        content += this.formatBugMarkdown(bug);
      });
    }
    
    if (inProgressBugs.length > 0) {
      content += '## 🟡 In Progress\\n\\n';
      inProgressBugs.forEach(bug => {
        content += this.formatBugMarkdown(bug);
      });
    }
    
    if (resolvedBugs.length > 0) {
      content += '## ✅ Resolved\\n\\n';
      resolvedBugs.forEach(bug => {
        content += this.formatBugMarkdown(bug);
      });
    }
    
    fs.writeFileSync(reportPath, content);
  }
  
  /**
   * Format a single bug as markdown
   */
  private formatBugMarkdown(bug: Bug): string {
    let md = `### ${bug.id}: ${bug.title}\\n`;
    md += `**Severity:** ${bug.severity} | **Status:** ${bug.status}\\n`;
    md += `**Component:** ${bug.component}\\n`;
    
    if (bug.file) {
      md += `**Location:** ${bug.file}`;
      if (bug.line) md += `:${bug.line}`;
      md += '\\n';
    }
    
    md += `\\n${bug.description}\\n`;
    
    if (bug.reproductionSteps && bug.reproductionSteps.length > 0) {
      md += '\\n**Reproduction Steps:**\\n';
      bug.reproductionSteps.forEach((step, i) => {
        md += `${i + 1}. ${step}\\n`;
      });
    }
    
    if (bug.expectedBehavior) {
      md += `\\n**Expected:** ${bug.expectedBehavior}\\n`;
    }
    
    if (bug.actualBehavior) {
      md += `**Actual:** ${bug.actualBehavior}\\n`;
    }
    
    if (bug.suggestedFix) {
      md += `\\n**Suggested Fix:**\\n\`\`\`typescript\\n${bug.suggestedFix}\\n\`\`\`\\n`;
    }
    
    md += '\\n---\\n\\n';
    return md;
  }
  
  /**
   * Quick method to create bugs from test failures or analysis
   */
  static fromTestFailure(
    title: string,
    error: Error,
    component: string,
    file?: string
  ): Omit<Bug, 'id' | 'createdAt'> {
    return {
      title,
      description: error.message,
      severity: 'high',
      status: 'open',
      component,
      file,
      actualBehavior: error.stack,
      labels: ['test-failure', 'automated']
    };
  }
  
  /**
   * Create bug from report analysis issues
   */
  static fromReportIssue(
    issue: any,
    component = 'report-generator'
  ): Omit<Bug, 'id' | 'createdAt'> {
    return {
      title: issue.message || issue.title || 'Report Generation Issue',
      description: issue.description || issue.message,
      severity: issue.severity === 'critical' ? 'critical' : 
               issue.severity === 'high' ? 'high' :
               issue.severity === 'medium' ? 'medium' : 'low',
      status: 'open',
      component,
      file: issue.location?.file,
      line: issue.location?.line,
      suggestedFix: issue.suggestion || issue.remediation,
      labels: ['report-issue', issue.category]
    };
  }
}

// Export singleton instance
export const bugTracker = new BugTracker();

// Helper function to quickly create bugs
export function createBug(
  title: string,
  description: string,
  severity: Bug['severity'] = 'medium',
  component = 'unknown'
): Bug {
  return bugTracker.createBug({
    title,
    description,
    severity,
    status: 'open',
    component
  });
}

// Helper to track bugs during tests
export function trackTestBugs(testName: string, failures: any[]): void {
  failures.forEach(failure => {
    bugTracker.createBug({
      title: `Test Failure: ${testName}`,
      description: failure.message || 'Test failed',
      severity: 'high',
      status: 'open',
      component: 'testing',
      actualBehavior: failure.stack,
      labels: ['test-failure', testName]
    });
  });
}
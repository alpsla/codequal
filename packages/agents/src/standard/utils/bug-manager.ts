/**
 * Bug Manager - Centralized bug tracking and management
 * Used by bug-tracker agent and integrated with state management
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import { sessionStateManager, Bug } from './session-state-manager';

export interface BugReport {
  id: string;
  severity: 'high' | 'medium' | 'low';
  status: 'open' | 'confirmed' | 'in-progress' | 'resolved' | 'closed' | 'duplicate' | 'invalid';
  title: string;
  description: string;
  impact: string;
  reproduction?: string;
  environment?: {
    version: string;
    component: string;
    file?: string;
    line?: number;
  };
  fix: string;
  workaround?: string;
  relatedBugs?: string[];
  createdDate: string;
  createdBy?: string;
  assignedTo?: string;
  resolvedDate?: string;
  resolvedBy?: string;
  resolution?: string;
  githubIssue?: number;
}

export class BugManager {
  private bugsFilePath: string;
  private nextBugId: number = 1;
  
  constructor(
    bugsFilePath = path.join(__dirname, '../../data/bugs.json')
  ) {
    this.bugsFilePath = bugsFilePath;
    this.initializeBugStorage();
  }
  
  /**
   * Initialize bug storage file if it doesn't exist
   */
  private async initializeBugStorage(): Promise<void> {
    try {
      await fs.access(this.bugsFilePath);
    } catch {
      // File doesn't exist, create it
      const dir = path.dirname(this.bugsFilePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.bugsFilePath, JSON.stringify({
        bugs: [],
        nextId: 1,
        metrics: {
          totalCreated: 0,
          totalResolved: 0,
          averageResolutionTime: 0
        }
      }, null, 2));
    }
  }
  
  /**
   * Get next bug ID
   */
  private async getNextBugId(): Promise<string> {
    const data = await this.loadBugData();
    const id = `BUG-${String(data.nextId).padStart(3, '0')}`;
    data.nextId++;
    await this.saveBugData(data);
    return id;
  }
  
  /**
   * Load bug data from file
   */
  private async loadBugData(): Promise<any> {
    try {
      const content = await fs.readFile(this.bugsFilePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { bugs: [], nextId: 1, metrics: {} };
    }
  }
  
  /**
   * Save bug data to file
   */
  private async saveBugData(data: any): Promise<void> {
    await fs.writeFile(this.bugsFilePath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Create a new bug with confirmation
   */
  async createBug(
    bugInfo: Partial<BugReport>,
    skipConfirmation = false
  ): Promise<BugReport> {
    // Generate bug ID
    const bugId = await this.getNextBugId();
    
    // Create bug report
    const bug: BugReport = {
      id: bugId,
      severity: bugInfo.severity || 'medium',
      status: 'open',
      title: bugInfo.title || 'Untitled Bug',
      description: bugInfo.description || '',
      impact: bugInfo.impact || 'Unknown impact',
      reproduction: bugInfo.reproduction,
      environment: bugInfo.environment || {
        version: await this.getCurrentVersion(),
        component: 'unknown'
      },
      fix: bugInfo.fix || 'Investigation needed',
      workaround: bugInfo.workaround,
      relatedBugs: bugInfo.relatedBugs || [],
      createdDate: new Date().toISOString().split('T')[0],
      createdBy: bugInfo.createdBy || process.env.USER || 'unknown'
    };
    
    // Check for duplicates
    const duplicate = await this.findDuplicate(bug);
    if (duplicate) {
      console.log(`⚠️ Potential duplicate of ${duplicate.id}: ${duplicate.title}`);
      if (!skipConfirmation) {
        // In a real implementation, this would prompt for confirmation
        console.log('Creating anyway for this example...');
      }
    }
    
    // Save bug to storage
    const data = await this.loadBugData();
    data.bugs.push(bug);
    data.metrics.totalCreated++;
    await this.saveBugData(data);
    
    // Update state test
    await this.updateStateTest(bug, 'add');
    
    return bug;
  }
  
  /**
   * Update bug status
   */
  async updateBugStatus(
    bugId: string,
    status: BugReport['status'],
    resolution?: string
  ): Promise<void> {
    const data = await this.loadBugData();
    const bug = data.bugs.find((b: BugReport) => b.id === bugId);
    
    if (!bug) {
      throw new Error(`Bug ${bugId} not found`);
    }
    
    bug.status = status;
    
    if (status === 'resolved' || status === 'closed') {
      bug.resolvedDate = new Date().toISOString().split('T')[0];
      bug.resolvedBy = process.env.USER || 'unknown';
      bug.resolution = resolution || 'Fixed';
      data.metrics.totalResolved++;
      
      // Update state test
      await this.updateStateTest(bug, 'remove');
    }
    
    await this.saveBugData(data);
  }
  
  /**
   * Find duplicate bugs
   */
  async findDuplicate(newBug: BugReport): Promise<BugReport | null> {
    const data = await this.loadBugData();
    const openBugs = data.bugs.filter((b: BugReport) => 
      b.status === 'open' || b.status === 'confirmed' || b.status === 'in-progress'
    );
    
    for (const existingBug of openBugs) {
      // Check same component
      if (existingBug.environment?.component === newBug.environment?.component) {
        // Check description similarity (simple check)
        const similarity = this.calculateSimilarity(
          existingBug.description,
          newBug.description
        );
        
        if (similarity > 0.7) {
          return existingBug;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Calculate string similarity (simple implementation)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const intersection = words1.filter(w => words2.includes(w));
    return intersection.length / Math.max(words1.length, words2.length);
  }
  
  /**
   * Get current version from state
   */
  private async getCurrentVersion(): Promise<string> {
    const state = await sessionStateManager.readState();
    return state.version;
  }
  
  /**
   * Update state test with bug changes
   */
  private async updateStateTest(bug: BugReport, action: 'add' | 'remove'): Promise<void> {
    const state = await sessionStateManager.readState();
    
    if (action === 'add') {
      // Add simplified bug to state
      const simpleBug: Bug = {
        id: bug.id,
        severity: bug.severity,
        description: bug.description,
        impact: bug.impact,
        fix: bug.fix
      };
      
      state.bugs.push(simpleBug);
    } else {
      // Remove bug from state
      state.bugs = state.bugs.filter(b => b.id !== bug.id);
    }
    
    // Update state file
    await sessionStateManager.updateState({
      bugsDiscovered: action === 'add' ? [bug as Bug] : undefined,
      bugsFixed: action === 'remove' ? [bug.id] : undefined
    });
  }
  
  /**
   * Create GitHub issue for bug
   */
  async createGitHubIssue(bug: BugReport): Promise<number | null> {
    try {
      const title = `🐛 [${bug.id}] ${bug.title}`;
      const body = this.formatGitHubIssueBody(bug);
      
      // Use GitHub CLI if available
      const result = execSync(
        `gh issue create --title "${title}" --body "${body}" --label "bug,${bug.severity}-severity"`,
        { encoding: 'utf-8' }
      );
      
      // Extract issue number from output
      const match = result.match(/#(\d+)/);
      if (match) {
        const issueNumber = parseInt(match[1]);
        
        // Update bug with GitHub issue number
        const data = await this.loadBugData();
        const bugRecord = data.bugs.find((b: BugReport) => b.id === bug.id);
        if (bugRecord) {
          bugRecord.githubIssue = issueNumber;
          await this.saveBugData(data);
        }
        
        return issueNumber;
      }
    } catch (error) {
      console.error('Failed to create GitHub issue:', error);
    }
    
    return null;
  }
  
  /**
   * Format bug for GitHub issue
   */
  private formatGitHubIssueBody(bug: BugReport): string {
    const lines = [
      `## Bug Report: ${bug.title}`,
      '',
      `**Bug ID:** ${bug.id}`,
      `**Severity:** ${bug.severity}`,
      `**Status:** ${bug.status}`,
      `**Component:** ${bug.environment?.component || 'Unknown'}`,
      `**Version:** ${bug.environment?.version || 'Unknown'}`,
      '',
      '### Description',
      bug.description,
      '',
      '### Impact',
      bug.impact,
      ''
    ];
    
    if (bug.reproduction) {
      lines.push('### Reproduction Steps', bug.reproduction, '');
    }
    
    if (bug.workaround) {
      lines.push('### Workaround', bug.workaround, '');
    }
    
    lines.push('### Suggested Fix', bug.fix, '');
    
    if (bug.environment?.file) {
      lines.push('### Location');
      lines.push(`File: \`${bug.environment.file}\``);
      if (bug.environment.line) {
        lines.push(`Line: ${bug.environment.line}`);
      }
      lines.push('');
    }
    
    if (bug.relatedBugs && bug.relatedBugs.length > 0) {
      lines.push('### Related Bugs');
      bug.relatedBugs.forEach(id => lines.push(`- ${id}`));
      lines.push('');
    }
    
    lines.push('---');
    lines.push(`*Created: ${bug.createdDate} by ${bug.createdBy || 'system'}*`);
    
    return lines.join('\n');
  }
  
  /**
   * List all bugs with optional filtering
   */
  async listBugs(filter?: {
    status?: BugReport['status'];
    severity?: BugReport['severity'];
    component?: string;
  }): Promise<BugReport[]> {
    const data = await this.loadBugData();
    let bugs = data.bugs;
    
    if (filter) {
      if (filter.status) {
        bugs = bugs.filter((b: BugReport) => b.status === filter.status);
      }
      if (filter.severity) {
        bugs = bugs.filter((b: BugReport) => b.severity === filter.severity);
      }
      if (filter.component) {
        bugs = bugs.filter((b: BugReport) => 
          b.environment?.component === filter.component
        );
      }
    }
    
    return bugs;
  }
  
  /**
   * Get bug metrics
   */
  async getMetrics(): Promise<{
    total: number;
    open: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    averageResolutionTime: number;
  }> {
    const data = await this.loadBugData();
    const bugs: BugReport[] = data.bugs;
    
    const metrics = {
      total: bugs.length,
      open: bugs.filter(b => b.status === 'open' || b.status === 'confirmed' || b.status === 'in-progress').length,
      resolved: bugs.filter(b => b.status === 'resolved' || b.status === 'closed').length,
      bySeverity: {
        high: bugs.filter(b => b.severity === 'high').length,
        medium: bugs.filter(b => b.severity === 'medium').length,
        low: bugs.filter(b => b.severity === 'low').length
      },
      byComponent: {} as Record<string, number>,
      averageResolutionTime: 0
    };
    
    // Count by component
    bugs.forEach(bug => {
      const component = bug.environment?.component || 'unknown';
      metrics.byComponent[component] = (metrics.byComponent[component] || 0) + 1;
    });
    
    // Calculate average resolution time
    const resolvedBugs = bugs.filter(b => b.status === 'resolved' && b.resolvedDate);
    if (resolvedBugs.length > 0) {
      const totalDays = resolvedBugs.reduce((sum, bug) => {
        const created = new Date(bug.createdDate).getTime();
        const resolved = new Date(bug.resolvedDate!).getTime();
        const days = (resolved - created) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      metrics.averageResolutionTime = totalDays / resolvedBugs.length;
    }
    
    return metrics;
  }
  
  /**
   * Generate bug report summary
   */
  async generateSummary(): Promise<string> {
    const metrics = await this.getMetrics();
    const openHighSeverity = await this.listBugs({ 
      status: 'open', 
      severity: 'high' 
    });
    
    const lines = [
      '## Bug Tracking Summary',
      `Generated: ${new Date().toISOString()}`,
      '',
      '### Overall Metrics',
      `- Total Bugs: ${metrics.total}`,
      `- Open: ${metrics.open}`,
      `- Resolved: ${metrics.resolved}`,
      `- Average Resolution Time: ${metrics.averageResolutionTime.toFixed(1)} days`,
      '',
      '### By Severity',
      `- High: ${metrics.bySeverity.high} (${openHighSeverity.length} open)`,
      `- Medium: ${metrics.bySeverity.medium}`,
      `- Low: ${metrics.bySeverity.low}`,
      '',
      '### By Component'
    ];
    
    Object.entries(metrics.byComponent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([component, count]) => {
        lines.push(`- ${component}: ${count}`);
      });
    
    if (openHighSeverity.length > 0) {
      lines.push('', '### ⚠️ Open High Severity Bugs');
      openHighSeverity.forEach(bug => {
        lines.push(`- ${bug.id}: ${bug.title}`);
      });
    }
    
    return lines.join('\n');
  }
}

// Export singleton instance
export const bugManager = new BugManager();
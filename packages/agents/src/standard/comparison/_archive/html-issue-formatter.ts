/**
 * HTML Issue Formatter for V8 Reports
 * Properly formats issues with clean HTML structure
 */

export class HTMLIssueFormatter {
  /**
   * Format a single issue as HTML
   */
  formatIssue(issue: any, prefix: string = ''): string {
    const severityClass = this.getSeverityClass(issue.severity);
    const severityIcon = this.getSeverityIcon(issue.severity);
    const location = issue.location?.file || issue.file || 'Unknown location';
    const line = issue.location?.line || issue.line || '';
    
    return `
    <div class="issue-item ${severityClass}">
      <div class="issue-header">
        <span class="issue-severity-icon">${severityIcon}</span>
        <span class="issue-title">${prefix}${issue.title || issue.message || 'Untitled Issue'}</span>
        <span class="issue-severity-badge severity-${issue.severity || 'medium'}">${(issue.severity || 'medium').toUpperCase()}</span>
      </div>
      
      <div class="issue-body">
        ${location !== 'Unknown location' ? `
        <div class="issue-location">
          <span class="icon">📁</span>
          <code>${location}${line ? `:${line}` : ''}</code>
        </div>` : ''}
        
        ${issue.description ? `
        <div class="issue-description">
          ${this.escapeHtml(issue.description)}
        </div>` : ''}
        
        <div class="issue-metadata">
          ${issue.category ? `<span class="metadata-tag">🏷️ ${issue.category}</span>` : ''}
          ${issue.type ? `<span class="metadata-tag">Type: ${issue.type}</span>` : ''}
        </div>
        
        ${issue.impact ? `
        <div class="issue-impact">
          <strong>Impact:</strong> ${this.escapeHtml(issue.impact)}
        </div>` : ''}
        
        ${issue.recommendation || issue.remediation ? `
        <div class="issue-recommendation">
          <strong>Recommendation:</strong> ${this.escapeHtml(issue.recommendation || issue.remediation || '')}
        </div>` : ''}
        
        ${issue.codeSnippet ? `
        <div class="issue-code">
          <div class="code-label">Code:</div>
          <pre><code>${this.escapeHtml(issue.codeSnippet)}</code></pre>
        </div>` : ''}
      </div>
    </div>`;
  }
  
  /**
   * Format a section of issues
   */
  formatIssueSection(title: string, issues: any[], className: string = ''): string {
    if (!issues || issues.length === 0) {
      return `
      <div class="issue-section ${className}">
        <h3>${title}</h3>
        <p class="no-issues">No issues in this category.</p>
      </div>`;
    }
    
    return `
    <div class="issue-section ${className}">
      <h3>${title} (${issues.length})</h3>
      <div class="issues-list">
        ${issues.map(issue => this.formatIssue(issue)).join('\n')}
      </div>
    </div>`;
  }
  
  /**
   * Get CSS styles for the HTML report
   */
  getStyles(): string {
    return `
    <style>
      .issue-item {
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        margin-bottom: 16px;
        overflow: hidden;
      }
      
      .issue-item.critical {
        border-left: 4px solid #dc3545;
      }
      
      .issue-item.high {
        border-left: 4px solid #fd7e14;
      }
      
      .issue-item.medium {
        border-left: 4px solid #ffc107;
      }
      
      .issue-item.low {
        border-left: 4px solid #28a745;
      }
      
      .issue-header {
        background: white;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid #dee2e6;
      }
      
      .issue-severity-icon {
        font-size: 20px;
      }
      
      .issue-title {
        flex: 1;
        font-weight: 600;
        color: #212529;
      }
      
      .issue-severity-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        color: white;
      }
      
      .severity-critical {
        background: #dc3545;
      }
      
      .severity-high {
        background: #fd7e14;
      }
      
      .severity-medium {
        background: #ffc107;
        color: #212529;
      }
      
      .severity-low {
        background: #28a745;
      }
      
      .issue-body {
        padding: 16px;
      }
      
      .issue-location {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .issue-location code {
        background: #e9ecef;
        padding: 4px 8px;
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 13px;
      }
      
      .issue-description {
        color: #495057;
        line-height: 1.6;
        margin-bottom: 12px;
      }
      
      .issue-metadata {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      
      .metadata-tag {
        background: #e9ecef;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #495057;
      }
      
      .issue-impact,
      .issue-recommendation {
        background: #fff;
        padding: 8px 12px;
        border-radius: 4px;
        margin-bottom: 8px;
        border: 1px solid #e9ecef;
      }
      
      .issue-impact strong,
      .issue-recommendation strong {
        color: #212529;
        display: block;
        margin-bottom: 4px;
      }
      
      .issue-code {
        margin-top: 12px;
      }
      
      .code-label {
        font-weight: 600;
        margin-bottom: 4px;
        color: #495057;
      }
      
      .issue-code pre {
        background: #f1f3f5;
        padding: 12px;
        border-radius: 4px;
        overflow-x: auto;
        margin: 0;
      }
      
      .issue-code code {
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 13px;
        color: #212529;
      }
      
      .issue-section {
        margin-bottom: 32px;
      }
      
      .issue-section h3 {
        color: #212529;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 2px solid #dee2e6;
      }
      
      .no-issues {
        color: #6c757d;
        font-style: italic;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 4px;
        text-align: center;
      }
      
      .issues-list {
        /* Issues container */
      }
    </style>`;
  }
  
  private getSeverityClass(severity?: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  }
  
  private getSeverityIcon(severity?: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
  
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
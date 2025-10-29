/**
 * IDE Integration Generator
 * 
 * Generates IDE-specific fix files for one-click auto-fixing.
 * Supports Cursor, VSCode, and JetBrains IDEs.
 */

import { EnrichedIssue, IDEFixFile, IssueLocation } from './types';
import { IssueGroup } from '../utils/issue-grouping';
import * as fs from 'fs';
import * as path from 'path';

export class IDEIntegrationGenerator {
  constructor(private repositoryPath: string) {}

  /**
   * Generate all IDE fix files
   */
  async generateAllIDEFixes(groups: IssueGroup[]): Promise<IDEFixFile[]> {
    const fixes: IDEFixFile[] = [];

    // Cursor IDE (primary)
    const cursorFix = await this.generateCursorFix(groups);
    if (cursorFix) {
      fixes.push(cursorFix);
    }

    // VSCode (secondary)
    const vscodeFix = await this.generateVSCodeFix(groups);
    if (vscodeFix) {
      fixes.push(vscodeFix);
    }

    // JetBrains (IntelliJ, etc.)
    const jetbrainsFix = await this.generateJetBrainsFix(groups);
    if (jetbrainsFix) {
      fixes.push(jetbrainsFix);
    }

    return fixes;
  }

  /**
   * Generate Cursor IDE fix file (manifest v2.0)
   */
  private async generateCursorFix(groups: IssueGroup[]): Promise<IDEFixFile | null> {
    const manifest = {
      version: '2.0',
      generated_at: new Date().toISOString(),
      total_groups: groups.length,
      groups: [] as any[]
    };

    for (const group of groups) {
      const groupId = `${group.rule}-${group.severity}-${group.tool}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      const representative = group.examples[0];

      manifest.groups.push({
        id: groupId,
        rule: group.rule,
        tool: group.tool,
        severity: group.severity,
        category: group.category || 'Code Quality',
        total_occurrences: group.count,
        representative: {
          file: representative.file,
          line: representative.line || 0,
          snippet: representative.snippet || 'N/A'
        },
        ai_fix: group.fixSuggestion ? {
          fix: group.fixSuggestion.fix,
          corrected_code: group.fixSuggestion.correctedCode,
          explanation: group.fixSuggestion.explanation,
          best_practices: group.fixSuggestion.bestPractices || []
        } : null,
        locations_file: `issue-locations-${groupId}.json`
      });
    }

    return {
      type: 'cursor',
      filename: 'cursor-fixes-manifest-v2.json',
      content: manifest
    };
  }

  /**
   * Generate VSCode fix file
   */
  private async generateVSCodeFix(groups: IssueGroup[]): Promise<IDEFixFile | null> {
    const diagnostics: any[] = [];

    for (const group of groups) {
      for (const example of group.examples) {
        diagnostics.push({
          file: example.file,
          line: example.line || 1,
          column: example.column || 1,
          severity: this.mapSeverityToVSCode(group.severity),
          message: group.description,
          source: group.tool,
          code: group.rule,
          codeActions: group.fixSuggestion ? [{
            title: `Fix: ${group.fixSuggestion.fix}`,
            kind: 'quickfix',
            edit: {
              changes: [{
                newText: group.fixSuggestion.correctedCode
              }]
            }
          }] : []
        });
      }
    }

    return {
      type: 'vscode',
      filename: 'vscode-diagnostics.json',
      content: { diagnostics }
    };
  }

  /**
   * Generate JetBrains IDE fix file (IntelliJ format)
   */
  private async generateJetBrainsFix(groups: IssueGroup[]): Promise<IDEFixFile | null> {
    const inspections: any[] = [];

    for (const group of groups) {
      for (const example of group.examples) {
        inspections.push({
          file: example.file,
          line: example.line || 1,
          type: this.mapSeverityToJetBrains(group.severity),
          description: group.description,
          category: group.detectedCategory || 'Code Quality',
          tool: group.tool,
          quickFix: group.fixSuggestion ? {
            description: group.fixSuggestion.fix,
            replacement: group.fixSuggestion.correctedCode
          } : null
        });
      }
    }

    return {
      type: 'jetbrains',
      filename: 'jetbrains-inspections.xml',
      content: this.generateJetBrainsXML(inspections)
    };
  }

  /**
   * Generate location attachment files (lazy-loadable)
   */
  async generateLocationAttachments(groups: IssueGroup[]): Promise<Array<{
    groupId: string;
    filename: string;
    content: any;
  }>> {
    const attachments: Array<{ groupId: string; filename: string; content: any }> = [];

    for (const group of groups) {
      const groupId = `${group.rule}-${group.severity}-${group.tool}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      
      // Convert examples to simple location objects for the attachment
      const locations = group.examples.map(ex => ({
        file: ex.file,
        line: ex.line || 1,
        column: ex.column,
        snippet: ex.snippet
      }));
      
      const content = {
        group_id: groupId,
        rule: group.rule,
        tool: group.tool,
        severity: group.severity,
        category: group.category || 'Code Quality',
        total_occurrences: group.count,
        locations,
        description: group.description,
        fix_suggestion: group.fixSuggestion
      };

      attachments.push({
        groupId: groupId,
        filename: `issue-locations-${groupId}.json`,
        content
      });
    }

    return attachments;
  }

  /**
   * Extract locations from issues with snippets
   */
  private async extractLocations(issues: EnrichedIssue[]): Promise<IssueLocation[]> {
    const locations: IssueLocation[] = [];

    for (const issue of issues) {
      const snippet = issue.snippet || await this.extractSnippet(issue.file, issue.line || 0);
      
      locations.push({
        file: issue.file,
        line: issue.line || 0,
        column: issue.column,
        snippet,
        category: issue.category
      });
    }

    return locations;
  }

  /**
   * Extract code snippet from file
   */
  private async extractSnippet(file: string, line: number, contextLines = 3): Promise<string> {
    try {
      const fullPath = path.join(this.repositoryPath, file);
      if (!fs.existsSync(fullPath)) {
        return 'N/A';
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      const startLine = Math.max(0, line - contextLines - 1);
      const endLine = Math.min(lines.length, line + contextLines);
      
      return lines.slice(startLine, endLine).join('\n');
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Calculate group statistics
   */
  private calculateGroupStatistics(issues: EnrichedIssue[]): {
    files_affected: number;
    lines_affected: number;
    categories: Record<string, number>;
  } {
    const uniqueFiles = new Set(issues.map(i => i.file));
    const uniqueLines = new Set(issues.map(i => `${i.file}:${i.line}`));
    
    const categories: Record<string, number> = {};
    for (const issue of issues) {
      categories[issue.category] = (categories[issue.category] || 0) + 1;
    }

    return {
      files_affected: uniqueFiles.size,
      lines_affected: uniqueLines.size,
      categories
    };
  }

  /**
   * Map severity to VSCode diagnostic severity
   */
  private mapSeverityToVSCode(severity: string): number {
    const map: Record<string, number> = {
      critical: 0, // Error
      high: 0,     // Error
      medium: 1,   // Warning
      low: 2       // Information
    };
    return map[severity] || 1;
  }

  /**
   * Map severity to JetBrains inspection severity
   */
  private mapSeverityToJetBrains(severity: string): string {
    const map: Record<string, string> = {
      critical: 'ERROR',
      high: 'ERROR',
      medium: 'WARNING',
      low: 'WEAK_WARNING'
    };
    return map[severity] || 'WARNING';
  }

  /**
   * Generate JetBrains XML format
   */
  private generateJetBrainsXML(inspections: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<problems>\n';
    
    for (const inspection of inspections) {
      xml += '  <problem>\n';
      xml += `    <file>${this.escapeXml(inspection.file)}</file>\n`;
      xml += `    <line>${inspection.line}</line>\n`;
      xml += `    <problem_class severity="${inspection.type}">${this.escapeXml(inspection.category)}</problem_class>\n`;
      xml += `    <description>${this.escapeXml(inspection.description)}</description>\n`;
      
      if (inspection.quickFix) {
        xml += '    <quickfix>\n';
        xml += `      <description>${this.escapeXml(inspection.quickFix.description)}</description>\n`;
        xml += `      <replacement><![CDATA[${inspection.quickFix.replacement}]]></replacement>\n`;
        xml += '    </quickfix>\n';
      }
      
      xml += '  </problem>\n';
    }
    
    xml += '</problems>';
    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}


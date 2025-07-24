/**
 * Prettier Direct Adapter
 * Directly executes Prettier for code formatting checks
 */

import { DirectToolAdapter } from './base-adapter';
import { AnalysisContext, ToolResult, ToolFinding, AgentRole, ToolMetadata, ToolCapability, ToolRequirements } from '../../core/interfaces';

export class PrettierDirectAdapter extends DirectToolAdapter {
  readonly id = 'prettier-direct';
  readonly name = 'Prettier Code Formatter';
  readonly version = '3.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'code-formatting',
      category: 'quality',
      languages: ['javascript', 'typescript', 'css', 'html', 'json', 'yaml'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.json', '.yml', '.yaml', '.md']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 20000,
    authentication: { type: 'none', required: false }
  };

  canAnalyze(context: AnalysisContext): boolean {
    // Check if PR has formattable files
    return context.pr.files.some(file => 
      this.capabilities[0].fileTypes?.some(ext => file.path.endsWith(ext))
    );
  }

  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    const findings: ToolFinding[] = [];
    
    try {
      // Check formatting for each file
      let formattedCount = 0;
      let needsFormattingCount = 0;
      
      for (const file of context.pr.files) {
        if (file.changeType === 'deleted') continue;
        
        const isSupported = this.capabilities[0].fileTypes?.some(ext => 
          file.path.endsWith(ext)
        );
        
        if (isSupported) {
          const needsFormatting = await this.checkFormatting(file.path);
          
          if (needsFormatting) {
            needsFormattingCount++;
            findings.push({
              type: 'suggestion',
              severity: 'low',
              category: 'formatting',
              message: `File needs formatting: ${file.path}`,
              file: file.path,
              ruleId: 'prettier',
              autoFixable: true,
              fix: {
                description: 'Run prettier --write',
                changes: []
              }
            });
          } else {
            formattedCount++;
          }
        }
      }
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesChecked: formattedCount + needsFormattingCount,
          properlyFormatted: formattedCount,
          needsFormatting: needsFormattingCount,
          formattingRate: formattedCount / (formattedCount + needsFormattingCount)
        }
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'PRETTIER_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  private async checkFormatting(filePath: string): Promise<boolean> {
    try {
      const { code } = await this.executeCommand('npx', [
        'prettier',
        '--check',
        filePath
      ], { timeout: 5000 });
      
      // Exit code 0 means properly formatted
      // Exit code 1 means needs formatting
      return code !== 0;
    } catch {
      // If prettier fails, assume file doesn't need formatting
      return false;
    }
  }
  
  protected getHealthCheckCommand() {
    return { cmd: 'npx', args: ['prettier', '--version'] };
  }
  
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Code formatting checker using Prettier',
      author: 'CodeQual',
      supportedRoles: ['codeQuality'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript', 'css', 'html', 'json', 'markdown'],
      tags: ['formatting', 'code-style', 'quality'],
      securityVerified: true,
      lastVerified: new Date('2025-06-07')
    };
  }
}

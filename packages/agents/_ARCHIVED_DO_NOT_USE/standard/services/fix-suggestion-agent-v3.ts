/**
 * Fix Suggestion Agent V3
 * 
 * Enhanced with Type A/B distinction:
 * - Type A: Direct copy-paste (same signature)
 * - Type B: Requires adjustments (different signature)
 */

import { TemplateLibrary } from './template-library';
import { DynamicModelSelector } from './dynamic-model-selector';
import axios from 'axios';

export interface FixSuggestionV3 {
  issueId: string;
  originalCode: string;
  fixedCode: string;
  explanation: string;
  confidence: 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  language: string;
  framework?: string;
  templateUsed?: string;
  
  // Type A/B distinction
  fixType: 'A' | 'B';
  adjustmentNotes?: string; // For Type B: what needs adjustment
  signatureChanged: boolean;
  breakingChange: boolean;
}

interface IssueContext {
  title: string;
  severity: string;
  category: string;
  location: {
    file: string;
    line: number;
  };
  codeSnippet?: string;
  description?: string;
}

export class FixSuggestionAgentV3 {
  private templateLibrary: TemplateLibrary;
  private modelSelector: DynamicModelSelector;
  
  constructor() {
    this.templateLibrary = new TemplateLibrary();
    this.modelSelector = new DynamicModelSelector();
  }
  
  /**
   * Generate fix suggestions for issues with Type A/B distinction
   */
  async generateSuggestions(
    issues: IssueContext[],
    options?: {
      maxSuggestions?: number;
      priorityCriteria?: 'severity' | 'security' | 'performance';
      useAI?: boolean;
    }
  ): Promise<FixSuggestionV3[]> {
    const maxSuggestions = options?.maxSuggestions || 5;
    const useAI = options?.useAI !== false;
    
    // Prioritize issues
    const prioritizedIssues = this.prioritizeIssues(issues, options?.priorityCriteria || 'severity');
    const selectedIssues = prioritizedIssues.slice(0, maxSuggestions);
    
    console.log(`Processing ${selectedIssues.length} of ${issues.length} issues for fix suggestions`);
    
    const suggestions: FixSuggestionV3[] = [];
    
    for (const issue of selectedIssues) {
      try {
        // First try template-based fix
        const templateFix = await this.tryTemplateFix(issue);
        
        if (templateFix) {
          suggestions.push(templateFix);
          console.log(`  ✅ Using template-based fix (Type ${templateFix.fixType})`);
        } else if (useAI) {
          // Fall back to AI
          const aiFix = await this.generateAIFix(issue);
          if (aiFix) {
            suggestions.push(aiFix);
            console.log(`  ✅ AI generated fix (Type ${aiFix.fixType})`);
          }
        }
      } catch (error) {
        console.log(`  ⚠️ Failed to generate fix for issue: ${issue.title}`);
      }
    }
    
    return suggestions;
  }
  
  /**
   * Try to generate fix using templates
   */
  private async tryTemplateFix(issue: IssueContext): Promise<FixSuggestionV3 | null> {
    const templateMatch = await this.templateLibrary.matchTemplate(
      issue as any, // Convert IssueContext to Issue type expected by matchTemplate
      this.detectLanguage(issue.location.file)
    );
    
    if (!templateMatch || !templateMatch.template) return null;
    const fix = templateMatch.template;
    
    if (!fix) return null;
    
    // Analyze if signature changes
    const analysis = this.analyzeSignatureChange(
      issue.codeSnippet || '',
      fix.code
    );
    
    return {
      issueId: `issue-${Date.now()}`,
      originalCode: issue.codeSnippet || '',
      fixedCode: fix.code,
      explanation: fix.explanation,
      confidence: fix.confidence as 'high' | 'medium' | 'low',
      estimatedMinutes: fix.estimatedMinutes,
      language: this.detectLanguage(issue.location.file),
      framework: 'unknown', // Template doesn't have framework property
      templateUsed: templateMatch.pattern,
      
      // Type A/B determination
      fixType: analysis.signatureChanged ? 'B' : 'A',
      signatureChanged: analysis.signatureChanged,
      breakingChange: analysis.breakingChange,
      adjustmentNotes: analysis.adjustmentNotes
    };
  }
  
  /**
   * Generate fix using AI
   */
  private async generateAIFix(issue: IssueContext): Promise<FixSuggestionV3 | null> {
    try {
      // Select appropriate model
      const models = await this.modelSelector.selectModelsForRole({
        role: 'fix-generation',
        description: 'Generate code fixes for identified issues',
        repositorySize: 'medium',
        weights: {
          quality: 0.8,
          speed: 0.6,
          cost: 0.4
        },
        requiresReasoning: true,
        requiresCodeAnalysis: true
      });
      const model = models.primary;
      
      console.log(`  🤖 Using AI model: ${model}`);
      
      const prompt = this.buildAIPrompt(issue);
      
      const response = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [
            {
              role: 'system',
              content: `You are a code fix expert. Generate fixes that clearly indicate:
                       - Type A: Direct copy-paste replacement (same function signature)
                       - Type B: Requires adjustments (different signature or API changes)
                       Always analyze if the fix changes the function signature or breaks existing callers.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const aiResponse = response.data.choices[0].message.content;
      const parsed = this.parseAIResponse(aiResponse, issue);
      
      return parsed;
      
    } catch (error) {
      console.log(`  ❌ AI generation failed: ${error}`);
      return null;
    }
  }
  
  /**
   * Analyze if a fix changes the function signature
   */
  private analyzeSignatureChange(original: string, fixed: string): {
    signatureChanged: boolean;
    breakingChange: boolean;
    adjustmentNotes?: string;
  } {
    // Extract function signatures
    const originalSig = this.extractSignature(original);
    const fixedSig = this.extractSignature(fixed);
    
    if (!originalSig || !fixedSig) {
      return { signatureChanged: false, breakingChange: false };
    }
    
    // Compare signatures
    const signatureChanged = originalSig !== fixedSig;
    
    // Check for breaking changes
    const breakingChange = this.isBreakingChange(original, fixed);
    
    // Generate adjustment notes if needed
    let adjustmentNotes: string | undefined;
    if (signatureChanged) {
      adjustmentNotes = this.generateAdjustmentNotes(originalSig, fixedSig);
    }
    
    return {
      signatureChanged,
      breakingChange,
      adjustmentNotes
    };
  }
  
  /**
   * Extract function signature from code
   */
  private extractSignature(code: string): string | null {
    // Match various function patterns
    const patterns = [
      // JavaScript/TypeScript functions
      /function\s+(\w+)\s*\(([^)]*)\)/,
      /const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>/,
      /(\w+)\s*\(([^)]*)\)\s*{/,
      
      // Method signatures
      /(\w+)\s*:\s*\(([^)]*)\)\s*=>/,
      
      // Python functions
      /def\s+(\w+)\s*\(([^)]*)\)/,
      
      // Java/C# methods
      /public\s+\w+\s+(\w+)\s*\(([^)]*)\)/,
    ];
    
    for (const pattern of patterns) {
      const match = code.match(pattern);
      if (match) {
        return `${match[1]}(${match[2]})`;
      }
    }
    
    return null;
  }
  
  /**
   * Check if changes are breaking
   */
  private isBreakingChange(original: string, fixed: string): boolean {
    // Check for:
    // 1. Parameter count changes
    // 2. Return type changes
    // 3. Async/sync changes
    // 4. Required parameter additions
    
    const originalParams = (original.match(/\(([^)]*)\)/) || ['', ''])[1].split(',').filter(p => p.trim());
    const fixedParams = (fixed.match(/\(([^)]*)\)/) || ['', ''])[1].split(',').filter(p => p.trim());
    
    // Different parameter count
    if (originalParams.length !== fixedParams.length) {
      return true;
    }
    
    // Async change
    const originalAsync = /async\s+/.test(original);
    const fixedAsync = /async\s+/.test(fixed);
    if (originalAsync !== fixedAsync) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate notes about what needs adjustment
   */
  private generateAdjustmentNotes(originalSig: string, fixedSig: string): string {
    const notes: string[] = [];
    
    // Extract parameter lists
    const originalParams = originalSig.match(/\(([^)]*)\)/)?.[1] || '';
    const fixedParams = fixedSig.match(/\(([^)]*)\)/)?.[1] || '';
    
    if (originalParams !== fixedParams) {
      notes.push(`Update function calls: ${originalSig} → ${fixedSig}`);
      
      // Count parameters
      const originalCount = originalParams.split(',').filter(p => p.trim()).length;
      const fixedCount = fixedParams.split(',').filter(p => p.trim()).length;
      
      if (fixedCount > originalCount) {
        notes.push(`Add ${fixedCount - originalCount} new parameter(s) to all callers`);
      } else if (fixedCount < originalCount) {
        notes.push(`Remove ${originalCount - fixedCount} parameter(s) from all callers`);
      }
    }
    
    return notes.join('. ');
  }
  
  /**
   * Parse AI response into FixSuggestion
   */
  private parseAIResponse(response: string, issue: IssueContext): FixSuggestionV3 | null {
    try {
      // Try to extract structured data from response
      const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
      const fixedCode = codeMatch ? codeMatch[1].trim() : '';
      
      if (!fixedCode) return null;
      
      // Look for Type A/B indicators in response
      const isTypeA = /Type A|copy.?paste|drop.?in|direct replacement/i.test(response);
      const isTypeB = /Type B|adjust|modify|update callers|breaking/i.test(response);
      
      // Extract adjustment notes if Type B
      const adjustmentMatch = response.match(/Adjustment[s]?:?\s*([^.]+)/i);
      const adjustmentNotes = adjustmentMatch ? adjustmentMatch[1].trim() : undefined;
      
      // Analyze signature change
      const analysis = this.analyzeSignatureChange(
        issue.codeSnippet || '',
        fixedCode
      );
      
      return {
        issueId: `issue-${Date.now()}`,
        originalCode: issue.codeSnippet || '',
        fixedCode,
        explanation: this.extractExplanation(response),
        confidence: 'medium',
        estimatedMinutes: isTypeB ? 30 : 10,
        language: this.detectLanguage(issue.location.file),
        templateUsed: 'ai-generated',
        
        // Use AI hints or analysis
        fixType: isTypeB || analysis.signatureChanged ? 'B' : 'A',
        signatureChanged: analysis.signatureChanged,
        breakingChange: isTypeB || analysis.breakingChange,
        adjustmentNotes: adjustmentNotes || analysis.adjustmentNotes
      };
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Build AI prompt for fix generation
   */
  private buildAIPrompt(issue: IssueContext): string {
    return `
Analyze this code issue and generate a fix:

Issue: ${issue.title}
Severity: ${issue.severity}
Category: ${issue.category}
File: ${issue.location.file}
Line: ${issue.location.line}

${issue.description ? `Description: ${issue.description}` : ''}

${issue.codeSnippet ? `Current Code:\n\`\`\`\n${issue.codeSnippet}\n\`\`\`` : ''}

Generate a fixed version of the code. Clearly indicate if this is:
- Type A: Direct copy-paste replacement (same function signature)
- Type B: Requires adjustments (different signature, added parameters, async changes, etc.)

If Type B, explain what adjustments callers need to make.

Provide the fixed code in a code block.`;
  }

  /**
   * Extract explanation from AI response
   */
  private extractExplanation(response: string): string {
    // Remove code blocks
    const withoutCode = response.replace(/```[\s\S]*?```/g, '');
    
    // Extract first paragraph or sentence
    const lines = withoutCode.split('\n').filter(l => l.trim());
    return lines[0] || 'Fix generated by AI';
  }
  
  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php'
    };
    
    return languageMap[ext || ''] || 'unknown';
  }
  
  /**
   * Prioritize issues for fix generation
   */
  private prioritizeIssues(
    issues: IssueContext[],
    criteria: 'severity' | 'security' | 'performance'
  ): IssueContext[] {
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    
    return [...issues].sort((a, b) => {
      if (criteria === 'security') {
        // Prioritize security issues
        const aIsSecurity = a.category === 'security';
        const bIsSecurity = b.category === 'security';
        if (aIsSecurity && !bIsSecurity) return -1;
        if (!aIsSecurity && bIsSecurity) return 1;
      }
      
      if (criteria === 'performance') {
        // Prioritize performance issues
        const aIsPerf = a.category === 'performance';
        const bIsPerf = b.category === 'performance';
        if (aIsPerf && !bIsPerf) return -1;
        if (!aIsPerf && bIsPerf) return 1;
      }
      
      // Fall back to severity
      return severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity);
    });
  }
  
  /**
   * Format fix suggestion for display
   */
  formatSuggestion(suggestion: FixSuggestionV3): string {
    let output = '';
    
    // Type indicator
    if (suggestion.fixType === 'A') {
      output += '**🟢 Type A Fix - Direct Copy-Paste**\n';
      output += '*This fix maintains the same function signature and can be directly applied.*\n\n';
    } else {
      output += '**🟡 Type B Fix - Requires Adjustments**\n';
      output += '*This fix changes the function signature or behavior. Callers need updates.*\n';
      if (suggestion.adjustmentNotes) {
        output += `**Required adjustments:** ${suggestion.adjustmentNotes}\n`;
      }
      output += '\n';
    }
    
    // Explanation
    output += `**What to fix:** ${suggestion.explanation}\n\n`;
    
    // Code blocks
    if (suggestion.originalCode) {
      output += '**Original Code:**\n';
      output += `\`\`\`${suggestion.language}\n`;
      output += suggestion.originalCode;
      output += '\n\`\`\`\n\n';
    }
    
    if (suggestion.fixType === 'A') {
      output += '**Fixed Code (copy-paste ready):**\n';
    } else {
      output += '**Fixed Code (adjust before applying):**\n';
    }
    
    output += `\`\`\`${suggestion.language}\n`;
    output += suggestion.fixedCode;
    output += '\n\`\`\`\n\n';
    
    // Metadata
    output += `**Confidence:** ${suggestion.confidence}\n`;
    output += `**Estimated Time:** ${suggestion.estimatedMinutes} minutes\n`;
    
    if (suggestion.breakingChange) {
      output += '**⚠️ Breaking Change:** This fix may break existing code that calls this function.\n';
    }
    
    if (suggestion.templateUsed && suggestion.templateUsed !== 'ai-generated') {
      output += `**Template:** ${suggestion.templateUsed}\n`;
    }
    
    return output;
  }
}

export default FixSuggestionAgentV3;
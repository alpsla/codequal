/**
 * Enhanced Report Generator V8 with Type A/B Fix Distinction
 * 
 * Properly distinguishes between:
 * - Type A: Direct copy-paste fixes (same signature)
 * - Type B: Requires adjustments (different signature)
 */

import { ReportGeneratorV8Final } from './report-generator-v8-final';
import { FixSuggestionAgentV3, FixSuggestionV3 } from '../services/fix-suggestion-agent-v3';
import { IssueDeduplicator } from '../services/issue-deduplicator';

export class ReportGeneratorV8FinalEnhanced extends ReportGeneratorV8Final {
  private fixAgentV3: FixSuggestionAgentV3;
  private deduplicator: IssueDeduplicator;
  
  constructor() {
    super();
    this.fixAgentV3 = new FixSuggestionAgentV3();
    this.deduplicator = new IssueDeduplicator();
  }
  
  /**
   * Override generateReport method to add deduplication
   */
  async generateReport(analysisResult: any): Promise<string> {
    // First deduplicate the categorized issues
    if (analysisResult.categorized) {
      console.log('🔄 Deduplicating issues before report generation...');
      
      const beforeCounts = {
        new: analysisResult.categorized.newIssues?.length || 0,
        unchanged: analysisResult.categorized.unchangedIssues?.length || 0,
        fixed: analysisResult.categorized.fixedIssues?.length || 0
      };
      
      analysisResult.categorized = this.deduplicator.deduplicateCategorizedIssues({
        newIssues: analysisResult.categorized.newIssues || [],
        unchangedIssues: analysisResult.categorized.unchangedIssues || [],
        fixedIssues: analysisResult.categorized.fixedIssues || []
      });
      
      const afterCounts = {
        new: analysisResult.categorized.newIssues.length,
        unchanged: analysisResult.categorized.unchangedIssues.length,
        fixed: analysisResult.categorized.fixedIssues.length
      };
      
      const removed = (beforeCounts.new + beforeCounts.unchanged + beforeCounts.fixed) -
                     (afterCounts.new + afterCounts.unchanged + afterCounts.fixed);
      
      if (removed > 0) {
        console.log(`  ✅ Removed ${removed} duplicate issues`);
        console.log(`     New: ${beforeCounts.new} → ${afterCounts.new}`);
        console.log(`     Unchanged: ${beforeCounts.unchanged} → ${afterCounts.unchanged}`);
        console.log(`     Fixed: ${beforeCounts.fixed} → ${afterCounts.fixed}`);
      }
    }
    
    // Then proceed with normal generation
    return super.generateReport(analysisResult);
  }
  
  /**
   * Override the fix suggestion formatting to properly show Type A/B
   */
  protected formatFixSuggestion(
    enhancedIssue: any,
    fixSuggestion: any,
    file: string
  ): string {
    let content = '';
    
    // Check if we have the enhanced V3 fix suggestion with type info
    if (fixSuggestion.fixType) {
      content += this.formatEnhancedFixSuggestion(fixSuggestion as FixSuggestionV3);
    } else {
      // Analyze existing suggestion to determine type
      const analyzed = this.analyzeFixType(enhancedIssue, fixSuggestion);
      content += this.formatAnalyzedFix(analyzed, fixSuggestion, file);
    }
    
    return content;
  }
  
  /**
   * Format enhanced V3 fix suggestion with proper Type A/B indicators
   */
  private formatEnhancedFixSuggestion(suggestion: FixSuggestionV3): string {
    let content = '\n🔧 **Fix Suggestion:**\n';
    
    // Confidence and time estimate
    const confidenceEmoji = {
      high: '🟢',
      medium: '🟡',
      low: '🔴'
    };
    content += `${confidenceEmoji[suggestion.confidence]} **Confidence:** ${suggestion.confidence} | ⏱️ **Estimated Time:** ${suggestion.estimatedMinutes} minutes\n`;
    
    // Template or AI source
    if (suggestion.templateUsed && suggestion.templateUsed !== 'ai-generated') {
      content += `📋 **Template Applied:** ${suggestion.templateUsed}\n`;
    } else {
      content += `🤖 **AI Generated Fix**\n`;
    }
    
    content += '\n';
    
    // Type A or Type B with clear distinction
    if (suggestion.fixType === 'A') {
      content += '### 🟢 Type A Fix - Direct Copy-Paste\n';
      content += '*This fix maintains the same function signature. You can directly replace the code.*\n\n';
      content += '**What to do:** ' + suggestion.explanation + '\n\n';
      content += '**Fixed Code (copy-paste ready):**\n';
    } else {
      content += '### 🟡 Type B Fix - Requires Adjustments\n';
      content += '*This fix changes the function signature or behavior. Update all callers accordingly.*\n\n';
      
      if (suggestion.adjustmentNotes) {
        content += `⚠️ **Required Adjustments:** ${suggestion.adjustmentNotes}\n\n`;
      }
      
      if (suggestion.breakingChange) {
        content += '❗ **Breaking Change:** This fix will break existing code that calls this function.\n\n';
      }
      
      content += '**What to do:** ' + suggestion.explanation + '\n\n';
      content += '**Fixed Code (adjust before applying):**\n';
    }
    
    // Show the fixed code
    content += '```' + (suggestion.language || 'javascript') + '\n';
    content += suggestion.fixedCode + '\n';
    content += '```\n';
    
    // Show diff if we have original code
    if (suggestion.originalCode && suggestion.originalCode.trim()) {
      content += '\n<details>\n<summary>📊 View Changes</summary>\n\n';
      content += '**Original Code:**\n';
      content += '```' + suggestion.language + '\n';
      content += suggestion.originalCode + '\n';
      content += '```\n\n';
      
      // Highlight what changed if Type B
      if (suggestion.fixType === 'B' && suggestion.signatureChanged) {
        content += '**⚠️ Signature Changes:**\n';
        content += this.highlightSignatureChanges(suggestion.originalCode, suggestion.fixedCode);
        content += '\n';
      }
      
      content += '</details>\n';
    }
    
    return content;
  }
  
  /**
   * Analyze existing fix to determine if it's Type A or B
   */
  private analyzeFixType(issue: any, fixSuggestion: any): {
    fixType: 'A' | 'B';
    signatureChanged: boolean;
    breakingChange: boolean;
    adjustmentNotes?: string;
  } {
    // Default to Type A unless we detect signature changes
    let fixType: 'A' | 'B' = 'A';
    let signatureChanged = false;
    let breakingChange = false;
    let adjustmentNotes: string | undefined;
    
    const originalCode = issue.codeSnippet || fixSuggestion.originalCode || '';
    const fixedCode = fixSuggestion.fixedCode || '';
    
    // Check for function signature changes
    const originalSig = this.extractSignature(originalCode);
    const fixedSig = this.extractSignature(fixedCode);
    
    if (originalSig && fixedSig && originalSig !== fixedSig) {
      signatureChanged = true;
      fixType = 'B';
      
      // Check parameter count
      const originalParams = this.countParameters(originalSig);
      const fixedParams = this.countParameters(fixedSig);
      
      if (originalParams !== fixedParams) {
        breakingChange = true;
        if (fixedParams > originalParams) {
          adjustmentNotes = `Add ${fixedParams - originalParams} new parameter(s) to all function calls`;
        } else {
          adjustmentNotes = `Remove ${originalParams - fixedParams} parameter(s) from all function calls`;
        }
      }
    }
    
    // Check for async/sync changes
    const originalAsync = /\basync\s+/.test(originalCode);
    const fixedAsync = /\basync\s+/.test(fixedCode);
    
    if (originalAsync !== fixedAsync) {
      fixType = 'B';
      breakingChange = true;
      if (fixedAsync && !originalAsync) {
        adjustmentNotes = (adjustmentNotes ? adjustmentNotes + '. ' : '') + 
                         'Function is now async - add await to all calls';
      } else if (!fixedAsync && originalAsync) {
        adjustmentNotes = (adjustmentNotes ? adjustmentNotes + '. ' : '') + 
                         'Function is no longer async - remove await from calls';
      }
    }
    
    // Check for return type indicators
    if (fixedCode.includes('Promise<') && !originalCode.includes('Promise<')) {
      fixType = 'B';
      adjustmentNotes = (adjustmentNotes ? adjustmentNotes + '. ' : '') + 
                       'Function now returns a Promise - handle accordingly';
    }
    
    return {
      fixType,
      signatureChanged,
      breakingChange,
      adjustmentNotes
    };
  }
  
  /**
   * Format analyzed fix with proper Type A/B indication
   */
  private formatAnalyzedFix(
    analysis: ReturnType<typeof this.analyzeFixType>,
    fixSuggestion: any,
    file: string
  ): string {
    let content = '\n🔧 **Fix Suggestion:**\n';
    
    // Show confidence and time
    const confidence = fixSuggestion.confidence || 'medium';
    const time = analysis.fixType === 'A' ? 10 : 30; // More time for Type B
    const confidenceEmoji = { high: '🟢', medium: '🟡', low: '🔴' };
    
    content += `${confidenceEmoji[confidence as keyof typeof confidenceEmoji] || '🟡'} **Confidence:** ${confidence} | `;
    content += `⏱️ **Estimated Time:** ${fixSuggestion.estimatedMinutes || time} minutes\n`;
    
    if (fixSuggestion.templateUsed) {
      content += `📋 **Template Applied:** ${fixSuggestion.templateUsed}\n`;
    }
    
    content += '\n';
    
    // Type A or B section
    if (analysis.fixType === 'A') {
      content += '### 🟢 Type A Fix - Direct Copy-Paste\n';
      content += '*This fix maintains the same function signature. Safe to apply directly.*\n\n';
      
      if (fixSuggestion.explanation) {
        content += '**What to do:** ' + fixSuggestion.explanation + '\n\n';
      }
      
      content += '**Fixed Code (copy-paste ready):**\n';
      content += '```' + (fixSuggestion.language || this.getLanguageFromFileEnhanced(file)) + '\n';
      content += fixSuggestion.fixedCode + '\n';
      content += '```\n';
      
    } else {
      content += '### 🟡 Type B Fix - Requires Adjustments\n';
      content += '*This fix changes the function signature or behavior.*\n\n';
      
      if (analysis.adjustmentNotes) {
        content += `⚠️ **Required Adjustments:** ${analysis.adjustmentNotes}\n\n`;
      }
      
      if (analysis.breakingChange) {
        content += '❗ **Breaking Change Warning:** Update all code that calls this function.\n\n';
      }
      
      if (fixSuggestion.explanation) {
        content += '**What to do:** ' + fixSuggestion.explanation + '\n\n';
      }
      
      content += '**Fixed Code (adjust callers after applying):**\n';
      content += '```' + (fixSuggestion.language || this.getLanguageFromFileEnhanced(file)) + '\n';
      content += fixSuggestion.fixedCode + '\n';
      content += '```\n';
      
      // Add migration guide for Type B
      content += '\n**📝 Migration Steps:**\n';
      content += '1. Update the function with the fixed code above\n';
      content += '2. Find all places where this function is called\n';
      if (analysis.adjustmentNotes) {
        content += `3. ${analysis.adjustmentNotes}\n`;
      }
      content += '4. Test all affected code paths\n';
    }
    
    return content;
  }
  
  /**
   * Extract function signature from code
   */
  private extractSignature(code: string): string | null {
    const patterns = [
      /function\s+(\w+)\s*\(([^)]*)\)/,
      /const\s+(\w+)\s*=\s*\(([^)]*)\)/,
      /(\w+)\s*\(([^)]*)\)\s*[{:]/,
      /async\s+function\s+(\w+)\s*\(([^)]*)\)/,
      /async\s+(\w+)\s*\(([^)]*)\)/
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
   * Count parameters in a signature
   */
  private countParameters(signature: string): number {
    const paramMatch = signature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) return 0;
    
    const params = paramMatch[1].split(',').filter(p => p.trim());
    return params.length;
  }
  
  /**
   * Highlight what changed in signatures
   */
  private highlightSignatureChanges(original: string, fixed: string): string {
    const originalSig = this.extractSignature(original);
    const fixedSig = this.extractSignature(fixed);
    
    if (!originalSig || !fixedSig) return '';
    
    let content = '```diff\n';
    content += `- ${originalSig}\n`;
    content += `+ ${fixedSig}\n`;
    content += '```';
    
    return content;
  }
  
  /**
   * Get language from file extension (enhanced version)
   */
  protected getLanguageFromFileEnhanced(file: string): string {
    const ext = file.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
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
      'php': 'php',
      'cpp': 'cpp',
      'c': 'c'
    };
    
    return langMap[ext || ''] || 'text';
  }
}

export default ReportGeneratorV8FinalEnhanced;
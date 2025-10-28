/**
 * AI Response Normalizer
 * 
 * Universal service for normalizing AI agent responses across different models.
 * Handles type inconsistencies, missing fields, and format variations.
 * 
 * Problems it solves:
 * - correctedCode sometimes string, sometimes object
 * - Missing or undefined fix suggestions
 * - Inconsistent response formats across models
 * - Invalid JSON structures
 * 
 * Usage:
 *   const normalizer = new AIResponseNormalizer();
 *   const cleanResponse = normalizer.normalizeFixSuggestion(rawResponse);
 */

export interface FixSuggestion {
  fix: string;
  correctedCode: string;
  explanation: string;
  bestPractices?: string[];
}

export interface NormalizedIssue {
  id?: string;
  file: string;
  line: number;
  column?: number;
  severity: string;
  category: string;
  tool: string;
  rule: string;
  message: string;
  snippet?: string;
  fixSuggestion?: FixSuggestion;
  educationalLinks?: string[];
}

export interface RawFixSuggestion {
  fix?: string | any;
  correctedCode?: string | { code?: string } | any;
  code?: string;
  explanation?: string | any;
  bestPractices?: string[] | string | any;
}

export class AIResponseNormalizer {
  /**
   * Normalize a fix suggestion from any AI model
   */
  normalizeFixSuggestion(raw: RawFixSuggestion | undefined | null): FixSuggestion | undefined {
    if (!raw) {
      return undefined;
    }

    // Extract fix message
    const fix = this.extractString(raw.fix, 'No fix suggestion provided');

    // Extract corrected code (handles multiple formats)
    const correctedCode = this.extractCorrectedCode(raw);

    // Extract explanation
    const explanation = this.extractString(raw.explanation, '');

    // Extract best practices
    const bestPractices = this.extractBestPractices(raw.bestPractices);

    // Only return if we have meaningful content
    if (!fix && !correctedCode && !explanation) {
      return undefined;
    }

    return {
      fix,
      correctedCode,
      explanation,
      bestPractices
    };
  }

  /**
   * Extract corrected code from various formats
   */
  private extractCorrectedCode(raw: RawFixSuggestion): string {
    // Case 1: Direct string
    if (typeof raw.correctedCode === 'string') {
      return raw.correctedCode;
    }

    // Case 2: Object with code property
    if (raw.correctedCode && typeof raw.correctedCode === 'object') {
      const codeObj = raw.correctedCode as any;
      if (typeof codeObj.code === 'string') {
        return codeObj.code;
      }
    }

    // Case 3: Top-level code property
    if (typeof raw.code === 'string') {
      return raw.code;
    }

    // Case 4: No code found
    return '';
  }

  /**
   * Extract string from various formats
   */
  private extractString(value: any, defaultValue: string = ''): string {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && value.toString) {
      return value.toString();
    }
    return defaultValue;
  }

  /**
   * Extract best practices array
   */
  private extractBestPractices(value: any): string[] | undefined {
    // Case 1: Already an array
    if (Array.isArray(value)) {
      return value.filter(item => typeof item === 'string' && item.length > 0);
    }

    // Case 2: Single string - split by newlines or bullets
    if (typeof value === 'string') {
      const items = value
        .split(/\n|•|-/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
      return items.length > 0 ? items : undefined;
    }

    // Case 3: No best practices
    return undefined;
  }

  /**
   * Normalize issue severity
   */
  normalizeSeverity(severity: string | undefined): string {
    if (!severity) {
      return 'medium';
    }

    const normalized = severity.toLowerCase().trim();

    // Map common variations
    const severityMap: Record<string, string> = {
      critical: 'critical',
      high: 'high',
      medium: 'medium',
      low: 'low',
      info: 'info',
      warning: 'medium',
      error: 'high',
      blocker: 'critical',
      major: 'high',
      minor: 'low',
      trivial: 'info'
    };

    return severityMap[normalized] || 'medium';
  }

  /**
   * Normalize issue category
   */
  normalizeCategory(category: string | undefined): string {
    if (!category) {
      return 'Code Quality';
    }

    const normalized = category.toLowerCase().trim();

    // Map common variations
    const categoryMap: Record<string, string> = {
      security: 'Security',
      performance: 'Performance',
      'code quality': 'Code Quality',
      quality: 'Code Quality',
      architecture: 'Architecture',
      dependency: 'Dependencies',
      dependencies: 'Dependencies',
      style: 'Code Quality',
      maintainability: 'Code Quality',
      reliability: 'Code Quality',
      bug: 'Code Quality'
    };

    return categoryMap[normalized] || 'Code Quality';
  }

  /**
   * Clean AI-generated content (remove markdown artifacts, etc.)
   */
  cleanAIContent(content: string | undefined): string {
    if (!content) {
      return '';
    }

    return content
      .replace(/^```[\w]*\n/, '') // Remove opening code fence
      .replace(/\n```$/, '') // Remove closing code fence
      .replace(/^\s*[\*\-\+]\s*/gm, '') // Remove bullet points
      .trim();
  }

  /**
   * Normalize complete issue from AI agent
   */
  normalizeIssue(raw: any): NormalizedIssue | null {
    if (!raw || !raw.file || typeof raw.line !== 'number') {
      return null;
    }

    return {
      id: raw.id || undefined,
      file: raw.file,
      line: raw.line,
      column: raw.column || undefined,
      severity: this.normalizeSeverity(raw.severity),
      category: this.normalizeCategory(raw.category || raw.detectedCategory),
      tool: (raw.tool || 'unknown').toLowerCase(),
      rule: raw.rule || raw.ruleId || 'unknown',
      message: raw.message || 'No message provided',
      snippet: raw.snippet || undefined,
      fixSuggestion: this.normalizeFixSuggestion(raw.fixSuggestion),
      educationalLinks: this.normalizeEducationalLinks(raw.educationalLinks)
    };
  }

  /**
   * Normalize educational links
   */
  private normalizeEducationalLinks(links: any): string[] | undefined {
    if (!links) {
      return undefined;
    }

    if (Array.isArray(links)) {
      return links
        .filter(link => typeof link === 'string' && link.startsWith('http'))
        .slice(0, 5); // Limit to 5 links
    }

    return undefined;
  }

  /**
   * Validate fix suggestion has meaningful content
   */
  isValidFixSuggestion(fix: FixSuggestion | undefined): boolean {
    if (!fix) {
      return false;
    }

    // Must have at least one of: fix message, corrected code, or explanation
    const hasFix = fix.fix && fix.fix.trim().length > 10;
    const hasCode = fix.correctedCode && fix.correctedCode.trim().length > 10;
    const hasExplanation = fix.explanation && fix.explanation.trim().length > 10;

    return hasFix || hasCode || hasExplanation;
  }

  /**
   * Merge multiple fix suggestions (from different agents)
   */
  mergeFixSuggestions(fixes: (FixSuggestion | undefined)[]): FixSuggestion | undefined {
    const validFixes = fixes.filter(f => f && this.isValidFixSuggestion(f)) as FixSuggestion[];

    if (validFixes.length === 0) {
      return undefined;
    }

    if (validFixes.length === 1) {
      return validFixes[0];
    }

    // Merge multiple suggestions
    const merged: FixSuggestion = {
      fix: validFixes.map(f => f.fix).filter(Boolean).join('\n\n'),
      correctedCode: validFixes.find(f => f.correctedCode)?.correctedCode || '',
      explanation: validFixes.map(f => f.explanation).filter(Boolean).join('\n\n'),
      bestPractices: this.mergeArrays(validFixes.map(f => f.bestPractices || []))
    };

    return merged;
  }

  /**
   * Merge multiple arrays and remove duplicates
   */
  private mergeArrays(arrays: string[][]): string[] {
    const merged = arrays.flat();
    return [...new Set(merged)];
  }

  /**
   * Format code snippet with context
   */
  formatCodeSnippet(snippet: string | undefined, lineNumber: number): string {
    if (!snippet) {
      return '';
    }

    const lines = snippet.split('\n');
    const startLine = Math.max(1, lineNumber - 2);

    return lines
      .map((line, idx) => {
        const currentLine = startLine + idx;
        const marker = currentLine === lineNumber ? '→' : ' ';
        return `${marker} ${currentLine.toString().padStart(4)} | ${line}`;
      })
      .join('\n');
  }
}


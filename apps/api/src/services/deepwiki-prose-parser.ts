import { createLogger } from '@codequal/core/utils';

const logger = createLogger('deepwiki-prose-parser');

export interface ExtractedIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  location: {
    file: string;
    line: number;
    column?: number;
  };
  impact: string;
  remediation: {
    immediate: string;
    steps: string[];
  };
}

/**
 * Extract structured issues from prose text response
 */
export function extractIssuesFromProse(proseText: string): {
  vulnerabilities: ExtractedIssue[];
  scores: {
    overall: number;
    security: number;
    performance: number;
    maintainability: number;
    testing: number;
  };
} {
  logger.info('Extracting issues from prose response');
  const issues: ExtractedIssue[] = [];
  
  // Split text into lines for processing
  const lines = proseText.split('\n');
  
  // Pattern matching for common issue descriptions
  const issuePatterns = [
    // Security patterns
    /(?:SQL injection|XSS|Cross-site scripting|Authentication|Authorization|Security vulnerability|Insecure|Unvalidated|Unsafe)/i,
    // Performance patterns
    /(?:Performance|Slow|Inefficient|N\+1|Memory leak|Bottleneck|Optimization)/i,
    // Code quality patterns
    /(?:Code smell|Duplication|Complexity|Dead code|Unused|Deprecated|Anti-pattern)/i,
    // Testing patterns
    /(?:Test coverage|Missing tests|No tests|Untested|Test quality)/i,
    // Error handling patterns
    /(?:Error handling|Exception|Try-catch|Unhandled|Silent failure)/i,
    // Documentation patterns
    /(?:Documentation|Comments|TODO|FIXME|Missing docs)/i,
    // Dependency patterns
    /(?:Outdated|Vulnerable dependency|Security advisory|CVE-)/i
  ];
  
  // Look for numbered lists (common in AI responses)
  const numberedPattern = /^\s*(\d+)\.\s+\*?\*?(.+?)\*?\*?:?\s*(.+)/;
  const bulletPattern = /^\s*[-*]\s+\*?\*?(.+?)\*?\*?:?\s*(.+)/;
  
  let currentIssueIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for numbered list items
    const numberedMatch = line.match(numberedPattern);
    const bulletMatch = line.match(bulletPattern);
    
    if (numberedMatch || bulletMatch) {
      const title = numberedMatch ? numberedMatch[2].trim() : bulletMatch![1].trim();
      const description = numberedMatch ? numberedMatch[3].trim() : bulletMatch![2].trim();
      
      // Determine severity based on keywords
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      if (/critical|severe|dangerous|urgent/i.test(line)) {
        severity = 'critical';
      } else if (/high|important|significant|major/i.test(line)) {
        severity = 'high';
      } else if (/low|minor|trivial|cosmetic/i.test(line)) {
        severity = 'low';
      }
      
      // Determine category
      let category = 'quality';
      if (/security|vulnerabilit|injection|XSS|auth/i.test(title)) {
        category = 'security';
      } else if (/performance|slow|bottleneck|memory|optimization/i.test(title)) {
        category = 'performance';
      } else if (/test|coverage/i.test(title)) {
        category = 'testing';
      } else if (/dependency|package|library|outdated/i.test(title)) {
        category = 'dependencies';
      } else if (/documentation|docs|comment/i.test(title)) {
        category = 'documentation';
      }
      
      // Try to extract file and line information from the description or following lines
      let file = 'unknown';
      let line_num = 0;
      
      // Look for file paths in the current and next few lines
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        const fileLine = lines[j];
        
        // Common patterns for file references
        const filePatterns = [
          /(?:file|File|at|in|@)\s*[:\s]?\s*([\/\w\-\.]+\.\w+)(?:[:\s]+(?:line\s*)?(\d+))?/i,
          /([\/\w\-\.]+\.\w+):(\d+)/,
          /`([\/\w\-\.]+\.\w+)`/,
          /"([\/\w\-\.]+\.\w+)"/,
        ];
        
        for (const pattern of filePatterns) {
          const match = fileLine.match(pattern);
          if (match && match[1]) {
            file = match[1];
            if (match[2]) {
              line_num = parseInt(match[2]) || 0;
            }
            break;
          }
        }
        
        if (file !== 'unknown') break;
      }
      
      // Create the issue
      currentIssueIndex++;
      issues.push({
        id: `PROSE-${currentIssueIndex.toString().padStart(3, '0')}`,
        severity,
        category,
        title: title.replace(/[*_]/g, '').trim(),
        location: {
          file,
          line: line_num
        },
        impact: description,
        remediation: {
          immediate: `Address ${title.toLowerCase()}`,
          steps: [`Review and fix the ${category} issue in ${file}`]
        }
      });
    }
  }
  
  // If no structured issues found, try to extract general problems mentioned
  if (issues.length === 0) {
    for (const pattern of issuePatterns) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line) && line.length > 20) {
          // Found a potential issue mention
          const match = line.match(pattern);
          if (match) {
            currentIssueIndex++;
            issues.push({
              id: `PROSE-${currentIssueIndex.toString().padStart(3, '0')}`,
              severity: 'medium',
              category: 'quality',
              title: match[0],
              location: {
                file: 'unknown',
                line: 0
              },
              impact: line,
              remediation: {
                immediate: 'Review and address this issue',
                steps: ['Investigate and fix the identified problem']
              }
            });
            break; // Only one issue per pattern to avoid duplicates
          }
        }
      }
    }
  }
  
  // Calculate scores based on issues found
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;
  
  // Simple scoring algorithm (can be refined)
  const totalPenalty = (criticalCount * 20) + (highCount * 10) + (mediumCount * 5) + (lowCount * 2);
  const overall = Math.max(0, 100 - totalPenalty);
  
  // Category-specific scoring
  const securityIssues = issues.filter(i => i.category === 'security').length;
  const perfIssues = issues.filter(i => i.category === 'performance').length;
  const qualityIssues = issues.filter(i => i.category === 'quality' || i.category === 'documentation').length;
  const testIssues = issues.filter(i => i.category === 'testing').length;
  
  const scores = {
    overall,
    security: Math.max(0, 100 - (securityIssues * 15)),
    performance: Math.max(0, 100 - (perfIssues * 10)),
    maintainability: Math.max(0, 100 - (qualityIssues * 8)),
    testing: Math.max(0, 100 - (testIssues * 12))
  };
  
  logger.info(`Extracted ${issues.length} issues from prose (${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low)`);
  
  return {
    vulnerabilities: issues,
    scores
  };
}
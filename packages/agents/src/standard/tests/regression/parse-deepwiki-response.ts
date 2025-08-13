/**
 * Parse DeepWiki text response into structured issues
 */
export function parseDeepWikiResponse(content: string) {
  const issues = [];
  const lines = content.split('\n');
  
  // Pattern to match issue descriptions with severity
  const severityKeywords: Record<string, string> = {
    'critical': 'critical',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'vulnerability': 'high',
    'security': 'high',
    'bug': 'high',
    'error': 'high',
    'warning': 'medium',
    'potential': 'medium',
    'minor': 'low',
    'relaxed': 'medium',
    'unfixed': 'high',
    'inaccurate': 'medium',
    'corruption': 'critical',
    'dependency': 'low',
    'flaky': 'medium',
    'risk': 'high'
  };
  
  // Extract issues from numbered list OR bullet points
  let currentIssue: any = null;
  let currentSectionSeverity = 'medium'; // Default severity for current section
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for severity headers like "#### Critical Issues", "#### High Issues"
    // This sets the default severity for issues in that section
    if (line.match(/^#{1,4}\s+(Critical|High|Medium|Low)\s+Issues?/i)) {
      const severityMatch = line.match(/(Critical|High|Medium|Low)/i);
      if (severityMatch) {
        currentSectionSeverity = severityMatch[1].toLowerCase();
      }
      continue;
    }
    
    // Reset section severity if we hit a new section that's not a severity section
    if (line.match(/^#{1,4}\s+/) && !line.match(/(Critical|High|Medium|Low)\s+Issues?/i)) {
      currentSectionSeverity = 'medium';
    }
    
    // Match numbered items (e.g., "1. **Title**: Description") OR bullet points (e.g., "- **Title**: Description")
    const itemMatch = line.match(/^(\d+\.|-|\*)\s+(.+)/);
    if (itemMatch) {
      // Save previous issue if exists
      if (currentIssue) {
        issues.push(currentIssue);
      }
      
      // Parse the issue line
      const issueText = itemMatch[2];
      
      // Skip items that indicate no issues found
      if (issueText.toLowerCase().includes('no direct') || 
          issueText.toLowerCase().includes('no critical') ||
          issueText.toLowerCase().includes('not found') ||
          issueText.toLowerCase().includes('no issues')) {
        currentIssue = null; // Reset to prevent adding
        continue;
      }
      
      let title = issueText;
      let description = '';
      
      // Extract title from bold text if present
      const boldMatch = issueText.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) {
        title = boldMatch[1];
        description = issueText.replace(/\*\*[^*]+\*\*:?\s*/, '').trim();
      } else {
        // Split on colon if present
        const colonIndex = issueText.indexOf(':');
        if (colonIndex > 0 && colonIndex < 100) {
          title = issueText.substring(0, colonIndex).trim();
          description = issueText.substring(colonIndex + 1).trim();
        }
      }
      
      // Start with section severity as default
      let severity = currentSectionSeverity;
      
      // Look for explicit severity keywords in the issue text itself
      const lowerText = (title + ' ' + description).toLowerCase();
      
      // Check for explicit severity mentions first
      if (lowerText.includes('critical issue') || lowerText.includes('critical vulnerability')) {
        severity = 'critical';
      } else if (lowerText.includes('high severity') || lowerText.includes('high priority')) {
        severity = 'high';
      } else if (lowerText.includes('medium severity') || lowerText.includes('medium priority')) {
        severity = 'medium';
      } else if (lowerText.includes('low severity') || lowerText.includes('low priority') || lowerText.includes('minor')) {
        severity = 'low';
      } else {
        // Use keyword-based detection only if no explicit severity found
        // and only for specific strong indicators
        if (lowerText.includes('vulnerability') || lowerText.includes('security breach')) {
          severity = 'high';
        } else if (lowerText.includes('bug') && !lowerText.includes('minor')) {
          severity = 'medium';
        } else if (lowerText.includes('improvement') || lowerText.includes('enhancement')) {
          severity = 'low';
        }
        // Otherwise keep the section severity
      }
      
      // Determine category
      let category = 'code-quality';
      if (lowerText.includes('security') || lowerText.includes('vulnerability')) {
        category = 'security';
      } else if (lowerText.includes('performance') || lowerText.includes('slow')) {
        category = 'performance';
      } else if (lowerText.includes('test') || lowerText.includes('testing')) {
        category = 'testing';
      } else if (lowerText.includes('typescript') || lowerText.includes('type')) {
        category = 'type-safety';
      } else if (lowerText.includes('dependency') || lowerText.includes('external')) {
        category = 'dependencies';
      }
      
      currentIssue = {
        id: `deepwiki-${issues.length + 1}`,
        severity,
        category,
        title: title.replace(/\*\*/g, '').trim(),
        description: description || title,
        location: {
          file: 'unknown',
          line: 0
        }
      };
      
      // Look for file references in the title or description
      const fullText = title + ' ' + description;
      
      // Try multiple patterns to find file references
      const patterns = [
        /`([^`]+\.(ts|js|tsx|jsx|json|md|py|go|rs|java|cpp|c|h))`/, // backtick wrapped
        /\b(src\/[^\s,;:]+\.(ts|js|tsx|jsx|json|md))/, // src/ paths
        /\b([a-zA-Z0-9_\-]+\/[^\s,;:]+\.(ts|js|tsx|jsx|json|md))/, // folder/file paths
        /\b([a-zA-Z0-9_\-]+\.(ts|js|tsx|jsx|json|md))\b/, // just filename
        /in\s+([^\s]+\.(ts|js|tsx|jsx|json|md))/, // "in filename"
        /file:\s*([^\s]+\.(ts|js|tsx|jsx|json|md))/, // "file: filename"
      ];
      
      for (const pattern of patterns) {
        const fileMatch = fullText.match(pattern);
        if (fileMatch) {
          currentIssue.location.file = fileMatch[1];
          break;
        }
      }
      
      // Look for line numbers
      const lineMatch = description.match(/(?:line|Line)\s+(\d+)/);
      if (lineMatch) {
        currentIssue.location.line = parseInt(lineMatch[1]);
      }
    } else if (currentIssue && line.trim() && !line.match(/^\s*$/)) {
      // Continue description for current issue
      currentIssue.description += ' ' + line.trim();
      
      // Check for file/line info in continuation
      const fileMatch = line.match(/(?:`([^`]+\.(ts|js|tsx|jsx|json|md))`|(\w+\/[\w\-\.]+\.(ts|js|tsx|jsx|json|md)))/);
      if (fileMatch && currentIssue.location.file === 'unknown') {
        currentIssue.location.file = (fileMatch[1] || fileMatch[3]).replace(/`/g, '');
      }
      const lineMatch = line.match(/\(line (\d+)\)/);
      if (lineMatch) {
        currentIssue.location.line = parseInt(lineMatch[1]);
      }
    }
  }
  
  // Add the last issue
  if (currentIssue) {
    issues.push(currentIssue);
  }
  
  // Calculate scores based on issues found
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;
  
  const overallScore = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2));
  const securityScore = Math.max(0, 100 - 
    (issues.filter(i => i.category === 'security' && i.severity === 'critical').length * 25) -
    (issues.filter(i => i.category === 'security' && i.severity === 'high').length * 15));
  
  console.log(`Parsed ${issues.length} issues from DeepWiki response:`, {
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount
  });
  
  return {
    issues,
    scores: {
      overall: overallScore,
      security: securityScore,
      performance: Math.max(50, 90 - issues.filter(i => i.category === 'performance').length * 10),
      maintainability: Math.max(50, 90 - issues.filter(i => i.category === 'code-quality').length * 5),
      testing: Math.max(50, 90 - issues.filter(i => i.category === 'testing').length * 10)
    }
  };
}
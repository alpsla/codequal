/**
 * Parse DeepWiki text response into structured issues
 */
export async function parseDeepWikiResponse(content: string) {
  // Early validation for empty or invalid content
  if (!content || content.trim().length === 0) {
    console.warn('DeepWiki returned empty content');
    return {
      issues: [],
      scores: {
        overall: 100,
        security: 100,
        performance: 100,
        maintainability: 100,
        testing: 100
      }
    };
  }
  
  // Check for error responses
  if (content.includes('error') && content.length < 100) {
    console.error('DeepWiki returned an error:', content);
    return {
      issues: [],
      scores: {
        overall: 0,
        security: 0,
        performance: 0,
        maintainability: 0,
        testing: 0
      }
    };
  }
  
  // Import the UnifiedAIParser from the deepwiki services
  const { UnifiedAIParser } = require('../../deepwiki/services/unified-ai-parser');
  
  // Check if we should use AI parser
  // Disable AI parser if content is large or looks like structured text response
  const contentLength = content.length;
  const looksLikeStructuredText = content.includes('**Title:**') || content.includes('**Severity:**');
  const useAIParser = process.env.USE_AI_PARSER !== 'false' && 
                      process.env.FORCE_RULE_BASED !== 'true' &&
                      contentLength < 10000 && // Use rule-based for large responses to avoid timeout
                      !looksLikeStructuredText; // Use rule-based for structured text
  
  if (useAIParser) {
    try {
      console.log('Using UnifiedAIParser for DeepWiki response parsing...');
      const parser = new UnifiedAIParser();
      
      // Parse using the AI parser
      const result = await parser.parseDeepWikiResponse(content, {
        useAI: true,
        attemptStructuredParsing: true,
        maxRetries: 2
      });
      
      // The UnifiedAIParser returns allIssues, not issues
      const issues = result.allIssues || [];
      
      // Log parsing results
      console.log(`Parsed ${issues.length} issues from DeepWiki response (AI):`, {
        critical: issues.filter((i: any) => i.severity === 'critical').length,
        high: issues.filter((i: any) => i.severity === 'high').length,
        medium: issues.filter((i: any) => i.severity === 'medium').length,
        low: issues.filter((i: any) => i.severity === 'low').length
      });
      
      // Return in the expected format
      return {
        issues,
        scores: result.scores || {
          overall: 50,
          security: 50,
          performance: 50,
          maintainability: 50,
          testing: 50
        }
      };
    } catch (error) {
      console.warn('AI Parser failed, falling back to rule-based parser:', error);
      // Fall back to rule-based parsing
    }
  }
  
  // Original rule-based parsing logic as fallback
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
  
  // Initialize extracted metrics
  let testCoveragePercentage = 0;
  const dependencies: any = { outdated: [] };
  const codeQuality: any = {};
  const teamImpact: any = { contributors: 0, knowledgeSilos: [] };
  const education: any = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Extract test coverage percentage from various formats
    const coverageMatch = line.match(/(?:test coverage|coverage)(?:\s*is)?(?:\s*:)?\s*(\d+)%/i) ||
                         line.match(/Overall test coverage:\s*(\d+)%/i) ||
                         line.match(/(\d+)%\s*(?:test\s*)?coverage/i);
    if (coverageMatch) {
      const coverage = parseInt(coverageMatch[1]);
      // Always use the highest coverage value found (avoid 0% if we have better data)
      if (coverage > testCoveragePercentage) {
        testCoveragePercentage = coverage;
      }
    }
    
    // Extract dependency info
    if (line.includes('outdated') && (line.includes('package') || line.includes('dependency'))) {
      const depMatch = line.match(/(\w+(?:[-@/]\w+)*)\s*(?:from|:)?\s*([\d.]+)\s*(?:to|->)?\s*([\d.]+)/);
      if (depMatch) {
        dependencies.outdated.push({
          name: depMatch[1],
          current: depMatch[2],
          latest: depMatch[3]
        });
      }
    }
    
    // Extract team metrics
    const contributorMatch = line.match(/(\d+)\s*contributors?/i);
    if (contributorMatch) {
      teamImpact.contributors = parseInt(contributorMatch[1]);
    }
    
    // Check for separator between issues (for Title: format)
    if (line.trim() === '---' && currentIssue) {
      // Save current issue and prepare for next
      issues.push(currentIssue);
      currentIssue = null;
      continue;
    }
    
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
    // OR direct title format (e.g., "Title: Issue description")
    // OR new format with severity-category-id (e.g., "**[HIGH-DEPENDENCY-001] Title**")
    // Also match numbered items with **Title:** pattern
    const itemMatch = line.match(/^(\d+)\.\s+\*\*Title:\*\*\s+(.+)/) ||
                      line.match(/^(\d+\.|-|\*)\s+(.+)/) || 
                      (line.match(/^(Title|Issue Title):\s+(.+)/i) ? ['', 'Title:', line.replace(/^(Title|Issue Title):\s*/i, '')] : null) ||
                      (line.match(/^\*\*\[(\w+)-(\w+)-\d+\]\s+(.+)\*\*/) ? ['', 'Issue:', line] : null);
    if (itemMatch) {
      const isNumberedItem = /^\d+\./.test(itemMatch[1]);
      const isBulletItem = /^[-*]/.test(itemMatch[1]);
      const isTitleItem = itemMatch[1] === 'Title:';
      const isIssueItem = itemMatch[1] === 'Issue:';
      
      // If it's a numbered item or Title: format (main issue), save previous and start new
      if (isNumberedItem || isTitleItem || isIssueItem) {
        // Save previous issue if exists
        if (currentIssue) {
          issues.push(currentIssue);
        }
        
        // Parse the issue line
        const issueText = itemMatch[2] || itemMatch[0]; // Use full match if no group
        
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
        let extractedSeverity = currentSectionSeverity;
        let extractedCategory = 'code-quality';
        
        // Extract title from the **Title:** format if present
        const titleMatch = issueText.match(/\*\*Title:\*\*\s+(.+)/);
        if (titleMatch) {
          title = titleMatch[1];
        }
        
        // Check for new format: **[SEVERITY-CATEGORY-ID] Title**
        const enhancedFormatMatch = issueText.match(/\*\*\[(\w+)-(\w+)-\d+\]\s+(.+)\*\*/);
        if (enhancedFormatMatch) {
          extractedSeverity = enhancedFormatMatch[1].toLowerCase();
          extractedCategory = enhancedFormatMatch[2].toLowerCase().replace('_', '-');
          title = enhancedFormatMatch[3];
        } else {
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
        }
        
        // Initialize new issue with default values
        currentIssue = {
          id: `deepwiki-${issues.length + 1}`,
          severity: extractedSeverity,
          category: extractedCategory,
          title: title.replace(/\*\*/g, '').replace(/Issue Title/i, '').replace(/:/g, '').trim(),
          description: description || title,
          location: {
            file: 'unknown',
            line: 0
          }
        };
      } else if (isBulletItem && currentIssue) {
        // This is a sub-item of the current issue - parse it for metadata
        const subItemText = itemMatch[2];
        
        // Check for Impact field
        if (subItemText.match(/^Impact:/i)) {
          const impactMatch = subItemText.match(/^Impact:\s*(.+)/i);
          if (impactMatch) {
            currentIssue.impact = impactMatch[1];
          }
        }
        
        // Check for Location field (new format: "Location: path/to/file.ts:123")
        if (subItemText.match(/^Location:/i)) {
          const locationMatch = subItemText.match(/^Location:\s*([^:]+?)(?::(\d+))?$/i);
          if (locationMatch) {
            currentIssue.location.file = locationMatch[1].trim();
            if (locationMatch[2]) {
              currentIssue.location.line = parseInt(locationMatch[2]);
            }
          }
        }
        
        // Check for Code field
        if (subItemText.match(/^Code:/i)) {
          currentIssue.hasCodeSnippet = true;
        }
        
        // Check for Fix field
        if (subItemText.match(/^Fix:/i)) {
          currentIssue.hasFixSuggestion = true;
        }
        
        // Check for Test Coverage field
        if (subItemText.match(/^Test Coverage:/i)) {
          const tcMatch = subItemText.match(/^Test Coverage:\s*(.+)/i);
          if (tcMatch) {
            currentIssue.testCoverage = tcMatch[1].toLowerCase();
          }
        }
        
        // Check for severity
        if (subItemText.match(/\*?\*?Severity\*?\*?:\s*/i)) {
          const severityMatch = subItemText.match(/\*?\*?Severity\*?\*?:\s*(\w+)/i);
          if (severityMatch) {
            currentIssue.severity = severityMatch[1].toLowerCase();
          }
        }
        
        // Check for file path and line number
        if (subItemText.match(/\*?\*?File Path and Line Number\*?\*?:/i)) {
          const fileLineMatch = subItemText.match(/\*?\*?File Path and Line Number\*?\*?:\s*([^,\n]+?)(?:,\s*(?:line\s*)?(\d+|multiple lines))?/i);
          if (fileLineMatch) {
            currentIssue.location.file = fileLineMatch[1].trim();
            if (fileLineMatch[2] && fileLineMatch[2] !== 'multiple lines') {
              currentIssue.location.line = parseInt(fileLineMatch[2]);
            }
          }
        }
        
        // Check for specific code problem
        if (subItemText.match(/\*?\*?Specific Code Problem\*?\*?:/i)) {
          const problemMatch = subItemText.match(/\*?\*?Specific Code Problem\*?\*?:\s*(.+)/i);
          if (problemMatch && !currentIssue.description.includes(problemMatch[1])) {
            currentIssue.description += ' ' + problemMatch[1];
          }
        }
        
        // Check for recommendation
        if (subItemText.match(/\*?\*?Recommendation for Fixing\*?\*?:/i)) {
          const recMatch = subItemText.match(/\*?\*?Recommendation for Fixing\*?\*?:\s*(.+)/i);
          if (recMatch) {
            currentIssue.recommendation = recMatch[1];
          }
        }
        
        continue; // Don't create a new issue for sub-items
      }
      
      // Skip creating a new issue if this was a sub-item
      if (!isNumberedItem) {
        continue;
      }
      
      // Category and severity detection will happen from sub-items or content
    } else if (currentIssue && line.trim() && !line.match(/^\s*$/)) {
      // Check if this is a metadata line for the Title: format
      const metadataMatch = line.match(/^(File|Severity|Description|Recommendation|Code snippet):\s*(.+)/i);
      if (metadataMatch) {
        const [, field, value] = metadataMatch;
        const fieldLower = field.toLowerCase();
        
        if (fieldLower === 'file') {
          // Parse file and line from "File: path/to/file.ts, Line: 123"
          // The value already has everything after "File: "
          const parts = value.split(/,\s*Line:\s*/i);
          if (parts.length === 2) {
            currentIssue.location.file = parts[0].trim();
            currentIssue.location.line = parseInt(parts[1]);
          } else {
            // Just file path, no line number
            currentIssue.location.file = value.trim();
          }
        } else if (fieldLower === 'severity') {
          currentIssue.severity = value.toLowerCase().trim();
        } else if (fieldLower === 'description') {
          currentIssue.description = value.trim();
        } else if (fieldLower === 'recommendation') {
          currentIssue.recommendation = value.trim();
        }
        // Skip code snippet lines
      } else if (!line.startsWith('```') && !line.trim().startsWith('---')) {
        // Continue description for current issue
        currentIssue.description += ' ' + line.trim();
      }
      
      // Check for explicit severity in continuation lines (old format)
      const severityMatch = line.match(/(?:Severity|severity):\s*(critical|high|medium|low)/i);
      if (severityMatch) {
        currentIssue.severity = severityMatch[1].toLowerCase();
      }
      
      // Check for file/line info in continuation - handle various formats
      // Format 1: "File: path/to/file.ts, Line: 123"
      // Format 2: "File Path and Line Number: path/to/file.ts, line 45"
      // Format 3: "**File Path and Line Number**: test/main.ts, multiple lines"
      const fileLineMatch = line.match(/(?:File Path and Line Number|File|file):\s*\*?\*?([^,\n]+?)(?:,\s*(?:Line|line)s?\s*(\d+|multiple lines)?)?/i);
      if (fileLineMatch && currentIssue.location.file === 'unknown') {
        currentIssue.location.file = fileLineMatch[1].replace(/\*\*/g, '').trim();
        if (fileLineMatch[2] && fileLineMatch[2] !== 'multiple lines') {
          currentIssue.location.line = parseInt(fileLineMatch[2]);
        }
      } else {
        // Fallback to other patterns
        const fileMatch = line.match(/(?:`([^`]+\.(ts|js|tsx|jsx|json|md))`|(\w+\/[\w\-.]+\.(ts|js|tsx|jsx|json|md)))/);
        if (fileMatch && currentIssue.location.file === 'unknown') {
          currentIssue.location.file = (fileMatch[1] || fileMatch[3]).replace(/`/g, '');
        }
        
        const lineMatch = line.match(/(?:Line|line):\s*(\d+)/) || line.match(/\(line (\d+)\)/);
        if (lineMatch) {
          currentIssue.location.line = parseInt(lineMatch[1]);
        }
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
  
  console.log(`Parsed ${issues.length} issues from DeepWiki response (rule-based):`, {
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
    },
    dependencies,
    codeQuality: {
      testCoverage: testCoveragePercentage,
      ...codeQuality
    },
    teamImpact,
    education
  };
}
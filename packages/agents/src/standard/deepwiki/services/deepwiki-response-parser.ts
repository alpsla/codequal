import { 
  ArchitectureVisualizer, 
  ArchitectureComponent, 
  ComponentRelationship,
  ArchitectureDiagram 
} from './architecture-visualizer';

/**
 * Parse DeepWiki text response into structured issues with priority categories
 */
export function parseDeepWikiResponse(content: string) {
  const issues = [];
  const lines = content.split('\n');
  let architectureDiagram = '';
  let educationalInsights: any[] = [];
  let dependencies: any = { vulnerable: [], outdated: [], deprecated: [] };
  let detectedComponents: ArchitectureComponent[] = [];
  let detectedRelationships: ComponentRelationship[] = [];
  
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
  let inArchitectureDiagram = false;
  let architectureDiagramLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect components mentioned in the text
    const componentPatterns = [
      /(?:frontend|ui|client|web app).*?(?:React|Vue|Angular|Next\.js)/gi,
      /(?:backend|api|server|service).*?(?:Node\.js|Express|Django|FastAPI|Spring)/gi,
      /(?:database|db).*?(?:PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)/gi,
      /(?:cache|caching).*?(?:Redis|Memcached|CDN)/gi,
      /(?:queue|messaging).*?(?:RabbitMQ|Kafka|SQS|Redis)/gi
    ];
    
    componentPatterns.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const [componentType, tech] = match.split(/(?:with|using|in|:)\s*/i);
          const compId = `comp-${detectedComponents.length + 1}`;
          
          let type: ArchitectureComponent['type'] = 'service';
          if (componentType.toLowerCase().includes('frontend')) type = 'frontend';
          else if (componentType.toLowerCase().includes('database')) type = 'database';
          else if (componentType.toLowerCase().includes('cache')) type = 'cache';
          else if (componentType.toLowerCase().includes('queue')) type = 'queue';
          else if (componentType.toLowerCase().includes('backend')) type = 'backend';
          
          if (!detectedComponents.find(c => c.name === componentType && c.technology === tech)) {
            detectedComponents.push({
              id: compId,
              name: componentType.trim(),
              type,
              technology: tech?.trim(),
              responsibilities: [],
              issues: []
            });
          }
        });
      }
    });
    
    // Check for architecture diagram (ASCII art between ``` blocks)
    // Handle case where "Architecture Diagram" is on a separate line before ```
    if (line.includes('```')) {
      // Check if previous lines contain "architecture" or "diagram"
      let isArchDiagram = false;
      for (let j = Math.max(0, i - 3); j < i; j++) {
        if (lines[j].toLowerCase().includes('architecture') || 
            lines[j].toLowerCase().includes('diagram')) {
          isArchDiagram = true;
          break;
        }
      }
      
      if (isArchDiagram || inArchitectureDiagram) {
        inArchitectureDiagram = !inArchitectureDiagram;
        if (!inArchitectureDiagram && architectureDiagramLines.length > 0) {
          architectureDiagram = architectureDiagramLines.join('\n');
          architectureDiagramLines = [];
        }
        continue;
      }
    }
    
    if (inArchitectureDiagram) {
      architectureDiagramLines.push(line);
      continue;
    }
    
    // Parse dependency issues
    if (line.includes('CVE-') || line.includes('vulnerable')) {
      const cveMatch = line.match(/CVE-\d{4}-\d+/);
      const packageMatch = line.match(/(\S+)@(\S+)/);
      if (cveMatch && packageMatch) {
        dependencies.vulnerable.push({
          name: packageMatch[1],
          version: packageMatch[2],
          cve: cveMatch[0],
          severity: currentSectionSeverity
        });
      }
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
        /\b([a-zA-Z0-9_-]+\/[^\s,;:]+\.(ts|js|tsx|jsx|json|md))/, // folder/file paths
        /\b([a-zA-Z0-9_-]+\.(ts|js|tsx|jsx|json|md))\b/, // just filename
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
      const fileMatch = line.match(/(?:`([^`]+\.(ts|js|tsx|jsx|json|md))`|(\w+\/[\w\-.]+\.(ts|js|tsx|jsx|json|md)))/);
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
  
  // Calculate comprehensive scores
  const dependencyScore = Math.max(0, 100 - 
    (dependencies.vulnerable.length * 20) - 
    (dependencies.outdated.length * 10) - 
    (dependencies.deprecated.length * 5));
  
  // Generate enhanced architecture analysis
  let enhancedDiagram = architectureDiagram;
  let architecturePatterns: any[] = [];
  let architectureAntiPatterns: any[] = [];
  let architectureRecommendations: any[] = [];
  let architectureMetrics: any = {};
  
  if (detectedComponents.length > 0) {
    // Link issues to components
    issues.forEach(issue => {
      detectedComponents.forEach(comp => {
        if (issue.location?.file?.toLowerCase().includes(comp.name.toLowerCase()) ||
            issue.description?.toLowerCase().includes(comp.name.toLowerCase())) {
          comp.issues = comp.issues || [];
          comp.issues.push(issue.id);
        }
      });
    });
    
    // Generate relationships based on common patterns
    if (detectedComponents.some(c => c.type === 'frontend') && 
        detectedComponents.some(c => c.type === 'backend')) {
      detectedRelationships.push({
        from: detectedComponents.find(c => c.type === 'frontend')!.id,
        to: detectedComponents.find(c => c.type === 'backend')!.id,
        type: 'sync',
        protocol: 'HTTP/REST'
      });
    }
    
    if (detectedComponents.some(c => c.type === 'backend') && 
        detectedComponents.some(c => c.type === 'database')) {
      detectedRelationships.push({
        from: detectedComponents.find(c => c.type === 'backend')!.id,
        to: detectedComponents.find(c => c.type === 'database')!.id,
        type: 'sync',
        protocol: 'SQL'
      });
    }
    
    // Generate enhanced diagram if none provided
    if (!architectureDiagram && detectedComponents.length >= 2) {
      enhancedDiagram = ArchitectureVisualizer.generateSystemDiagram(
        detectedComponents,
        detectedRelationships
      );
    } else if (architectureDiagram) {
      // Enhance existing diagram
      enhancedDiagram = ArchitectureVisualizer.enhanceDiagram(
        architectureDiagram,
        detectedComponents
      );
    }
    
    // Analyze patterns and anti-patterns
    const patternAnalysis = ArchitectureVisualizer.analyzePatterns(
      detectedComponents,
      detectedRelationships
    );
    architecturePatterns = patternAnalysis.patterns;
    architectureAntiPatterns = patternAnalysis.antiPatterns;
    
    // Generate recommendations
    architectureRecommendations = ArchitectureVisualizer.generateRecommendations(
      detectedComponents,
      architecturePatterns,
      architectureAntiPatterns
    );
    
    // Calculate metrics
    architectureMetrics = ArchitectureVisualizer.calculateMetrics(
      detectedComponents,
      detectedRelationships
    );
  }
  
  const architectureScore = enhancedDiagram ? 
    (architectureMetrics.testability || 75) : 60;
  
  return {
    issues,
    scores: {
      overall: overallScore,
      security: securityScore,
      performance: Math.max(50, 90 - issues.filter(i => i.category === 'performance').length * 10),
      dependencies: dependencyScore,
      architecture: architectureScore,
      codeQuality: Math.max(50, 90 - issues.filter(i => i.category === 'code-quality').length * 5),
      testCoverage: Math.max(50, 90 - issues.filter(i => i.category === 'testing').length * 10)
    },
    dependencies,
    architecture: {
      diagram: enhancedDiagram,
      patterns: architecturePatterns,
      antiPatterns: architectureAntiPatterns,
      recommendations: architectureRecommendations,
      components: detectedComponents,
      relationships: detectedRelationships,
      metrics: architectureMetrics
    },
    education: {
      bestPractices: educationalInsights.filter(i => i.type === 'best-practice'),
      antiPatterns: educationalInsights.filter(i => i.type === 'anti-pattern')
    }
  };
}
// Export as a class for consistency with index.ts expectations
export class DeepWikiResponseParser {
  static parse(content: string) {
    return parseDeepWikiResponse(content);
  }
}


import { 
  ArchitectureVisualizer, 
  ArchitectureComponent, 
  ComponentRelationship,
  ArchitectureDiagram 
} from './architecture-visualizer';
import { parseEnhancedDependencies, dependenciesToIssues } from './enhanced-dependency-parser';
import { parseEnhancedCodeQuality, codeQualityToIssues } from './enhanced-code-quality-parser';

/**
 * Parse DeepWiki text response into structured issues with priority categories
 */
export function parseDeepWikiResponse(content: string) {
  const issues = [];
  const lines = content.split('\n');
  let architectureDiagram = '';
  const educationalInsights: any[] = [];
  
  // Use enhanced parsers
  const enhancedDependencies = parseEnhancedDependencies(content);
  const dependencies: any = enhancedDependencies;
  
  const codeQualityMetrics = parseEnhancedCodeQuality(content);
  
  const detectedComponents: ArchitectureComponent[] = [];
  const detectedRelationships: ComponentRelationship[] = [];
  let inEducationalSection = false;
  let currentEducationType: 'best-practice' | 'anti-pattern' | 'learning' | null = null;
  let currentEducationalItem: any = null;
  
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
    
    // Check for educational sections
    if (line.match(/^#{1,4}\s*(Educational Insights|Best Practices|Anti-Patterns|Learning|Key Takeaways)/i)) {
      inEducationalSection = true;
      if (line.match(/Best Practice/i)) {
        currentEducationType = 'best-practice';
      } else if (line.match(/Anti-Pattern/i)) {
        currentEducationType = 'anti-pattern';
      } else if (line.match(/Learning|Takeaway/i)) {
        currentEducationType = 'learning';
      }
      continue;
    }
    
    // Parse educational content
    if (inEducationalSection) {
      // Check if we're starting a new educational item
      const educationalItemMatch = line.match(/^(\d+\.|\*|-)\s*\*\*([^*]+)\*\*:\s*(.+)/);
      if (educationalItemMatch) {
        // Save previous educational item if exists
        if (currentEducationalItem) {
          educationalInsights.push(currentEducationalItem);
        }
        
        currentEducationalItem = {
          type: currentEducationType || 'learning',
          title: educationalItemMatch[2].trim(),
          description: educationalItemMatch[3].trim(),
          example: '',
          betterApproach: ''
        };
        continue;
      }
      
      // Check for example code blocks
      if (currentEducationalItem) {
        if (line.match(/^\s*Example:/i) || line.match(/^\s*```/)) {
          // Start capturing example
          const exampleLines = [];
          i++; // Move to next line
          while (i < lines.length && !lines[i].match(/^\s*```/)) {
            exampleLines.push(lines[i]);
            i++;
          }
          currentEducationalItem.example = exampleLines.join('\n').trim();
          continue;
        }
        
        if (line.match(/^\s*Better Approach:/i)) {
          // Start capturing better approach
          const betterLines = [];
          i++; // Move to next line
          while (i < lines.length && !lines[i].match(/^\s*```/) && !lines[i].match(/^(\d+\.|\*|-)/)) {
            if (lines[i].trim()) {
              betterLines.push(lines[i]);
            }
            i++;
          }
          currentEducationalItem.betterApproach = betterLines.join('\n').trim();
          i--; // Back up one line
          continue;
        }
        
        // Continue description
        if (line.trim() && !line.match(/^#{1,4}/) && !line.match(/^(\d+\.|\*|-)/)) {
          currentEducationalItem.description += ' ' + line.trim();
        }
      }
      
      // Check if we're leaving educational section
      if (line.match(/^#{1,4}\s*(?!Best Practice|Anti-Pattern|Learning|Educational|Key Takeaway)/i)) {
        if (currentEducationalItem) {
          educationalInsights.push(currentEducationalItem);
          currentEducationalItem = null;
        }
        inEducationalSection = false;
        currentEducationType = null;
      }
    }
    
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
    
    // Skip old dependency parsing as we're using enhanced parser
    
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
        // Clean up temporary capture fields
        delete currentIssue._captureMode;
        delete currentIssue._captureBuffer;
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
        },
        codeSnippet: undefined,
        recommendation: undefined,
        fixedCode: undefined
      };
      
      // Look for file references in the title or description
      const fullText = title + ' ' + description;
      
      // First check for explicit "File: path, Line: number" format
      const explicitFileLineMatch = fullText.match(/File:\s*([^\s,]+(?:\.[a-zA-Z]+)?),?\s*Line:\s*(\d+)/i);
      if (explicitFileLineMatch) {
        currentIssue.location.file = explicitFileLineMatch[1];
        currentIssue.location.line = parseInt(explicitFileLineMatch[2]);
        // Remove the file/line info from description to clean it up
        currentIssue.description = currentIssue.description.replace(/File:\s*[^\s,]+,?\s*Line:\s*\d+/i, '').trim();
      } else {
        // Try multiple patterns to find file references
        const patterns = [
          /`([^`]+\.(ts|js|tsx|jsx|json|md|py|go|rs|java|cpp|c|h))`/, // backtick wrapped
          /\b((?:source|src)\/[^\s,;:]+\.(ts|js|tsx|jsx|json|md))/, // source/ or src/ paths
          /\b([a-zA-Z0-9_-]+\/[^\s,;:]+\.(ts|js|tsx|jsx|json|md))/, // folder/file paths
          /\b([a-zA-Z0-9_-]+\.(ts|js|tsx|jsx|json|md))\b/, // just filename
          /in\s+([^\s]+\.(ts|js|tsx|jsx|json|md))/, // "in filename"
          /file:\s*([^\s,]+\.(ts|js|tsx|jsx|json|md))/, // "file: filename"
        ];
        
        for (const pattern of patterns) {
          const fileMatch = fullText.match(pattern);
          if (fileMatch) {
            currentIssue.location.file = fileMatch[1];
            break;
          }
        }
        
        // Look for line numbers separately if not found in explicit format
        const lineMatch = fullText.match(/(?:line|Line|L):\s*(\d+)/);
        if (lineMatch) {
          currentIssue.location.line = parseInt(lineMatch[1]);
        }
      }
    } else if (currentIssue) {
      // Handle special content markers
      if (line.match(/^\s*Code Snippet:/i)) {
        // Start capturing code snippet
        currentIssue._captureMode = 'codeSnippet';
        currentIssue._captureBuffer = [];
        continue;
      } else if (line.match(/^\s*Recommendation:/i)) {
        // Capture recommendation
        currentIssue._captureMode = 'recommendation';
        const recommendationText = line.replace(/^\s*Recommendation:\s*/i, '').trim();
        if (recommendationText) {
          currentIssue.recommendation = recommendationText;
        }
        continue;
      } else if (line.match(/^\s*Fixed Code:/i)) {
        // Start capturing fixed code
        currentIssue._captureMode = 'fixedCode';
        currentIssue._captureBuffer = [];
        continue;
      } else if (line.match(/^\s*Suggestion:/i)) {
        // Capture suggestion (alternative to recommendation)
        const suggestionText = line.replace(/^\s*Suggestion:\s*/i, '').trim();
        if (suggestionText) {
          currentIssue.suggestion = suggestionText;
        }
        continue;
      } else if (line.match(/^\s*Severity:/i)) {
        // Capture explicit severity
        const severityText = line.replace(/^\s*Severity:\s*/i, '').trim().toLowerCase();
        if (severityText && ['critical', 'high', 'medium', 'low'].includes(severityText)) {
          currentIssue.severity = severityText;
        }
        continue;
      }
      
      // Handle code block markers
      if (line.includes('```')) {
        if (currentIssue._captureMode && currentIssue._captureBuffer) {
          // End of code block - save captured content
          if (currentIssue._captureMode === 'codeSnippet') {
            currentIssue.codeSnippet = currentIssue._captureBuffer.join('\n').trim();
          } else if (currentIssue._captureMode === 'fixedCode') {
            currentIssue.fixedCode = currentIssue._captureBuffer.join('\n').trim();
          }
          currentIssue._captureMode = null;
          currentIssue._captureBuffer = null;
        } else if (currentIssue._captureMode) {
          // Start of code block - just skip the ``` line
        }
        continue;
      }
      
      // Capture content based on mode
      if (currentIssue._captureMode === 'codeSnippet' && currentIssue._captureBuffer) {
        currentIssue._captureBuffer.push(line);
      } else if (currentIssue._captureMode === 'fixedCode' && currentIssue._captureBuffer) {
        currentIssue._captureBuffer.push(line);
      } else if (currentIssue._captureMode === 'recommendation') {
        // Continue capturing multi-line recommendation
        if (line.trim()) {
          currentIssue.recommendation = (currentIssue.recommendation || '') + ' ' + line.trim();
        }
      } else if (line.trim() && !line.match(/^\s*$/)) {
        // Regular description continuation
        currentIssue.description += ' ' + line.trim();
        
        // Check for file/line info in continuation
        const explicitMatch = line.match(/File:\s*([^\s,]+(?:\.[a-zA-Z]+)?),?\s*Line:\s*(\d+)/i);
        if (explicitMatch) {
          if (currentIssue.location.file === 'unknown') {
            currentIssue.location.file = explicitMatch[1];
          }
          if (currentIssue.location.line === 0) {
            currentIssue.location.line = parseInt(explicitMatch[2]);
          }
          // Remove the file/line info from description
          currentIssue.description = currentIssue.description.replace(/File:\s*[^\s,]+,?\s*Line:\s*\d+/i, '').trim();
        } else {
          const fileMatch = line.match(/(?:`([^`]+\.(ts|js|tsx|jsx|json|md))`|(\w+\/[\w\-.]+\.(ts|js|tsx|jsx|json|md)))/);
          if (fileMatch && currentIssue.location.file === 'unknown') {
            currentIssue.location.file = (fileMatch[1] || fileMatch[3]).replace(/`/g, '');
          }
          const lineMatch = line.match(/(?:line|Line|L):\s*(\d+)/);
          if (lineMatch && currentIssue.location.line === 0) {
            currentIssue.location.line = parseInt(lineMatch[1]);
          }
        }
      }
    }
  }
  
  // Add the last issue
  if (currentIssue) {
    // Clean up temporary capture fields
    delete currentIssue._captureMode;
    delete currentIssue._captureBuffer;
    issues.push(currentIssue);
  }
  
  // Add the last educational item if exists
  if (currentEducationalItem) {
    educationalInsights.push(currentEducationalItem);
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
  
  // Add dependency issues to main issues array
  const dependencyIssues = dependenciesToIssues(dependencies);
  issues.push(...dependencyIssues);
  
  // Add code quality issues to main issues array
  const codeQualityIssues = codeQualityToIssues(codeQualityMetrics);
  issues.push(...codeQualityIssues);
  
  // Recalculate counts after adding all enhanced issues
  const finalCriticalCount = issues.filter(i => i.severity === 'critical').length;
  const finalHighCount = issues.filter(i => i.severity === 'high').length;
  const finalMediumCount = issues.filter(i => i.severity === 'medium').length;
  const finalLowCount = issues.filter(i => i.severity === 'low').length;
  
  console.log(`Parsed ${issues.length} issues from DeepWiki response (including ${dependencyIssues.length} dependency + ${codeQualityIssues.length} quality issues): { critical: ${finalCriticalCount}, high: ${finalHighCount}, medium: ${finalMediumCount}, low: ${finalLowCount} }`);
  
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
  
  // Calculate code quality score based on metrics
  const codeQualityScore = calculateCodeQualityScore(codeQualityMetrics, codeQualityIssues);
  
  return {
    issues,
    scores: {
      overall: overallScore,
      security: securityScore,
      performance: Math.max(50, 90 - issues.filter(i => i.category === 'performance').length * 10),
      dependencies: dependencyScore,
      architecture: architectureScore,
      codeQuality: codeQualityScore,
      testCoverage: codeQualityMetrics.testCoverage.overall || Math.max(50, 90 - issues.filter(i => i.category === 'testing').length * 10)
    },
    dependencies,
    codeQualityMetrics,
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

function calculateCodeQualityScore(metrics: any, issues: any[]): number {
  let score = 100;
  
  // Deduct for complexity
  if (metrics.complexity.cyclomatic.average > 10) {
    score -= Math.min(20, (metrics.complexity.cyclomatic.average - 10) * 2);
  }
  
  // Deduct for duplication
  if (metrics.duplication.percentage > 5) {
    score -= Math.min(15, metrics.duplication.percentage);
  }
  
  // Deduct for low test coverage
  if (metrics.testCoverage.overall > 0 && metrics.testCoverage.overall < 80) {
    score -= Math.min(20, (80 - metrics.testCoverage.overall) / 2);
  }
  
  // Deduct for code smells
  score -= Math.min(15, metrics.codeSmells.length * 3);
  
  // Deduct for technical debt
  if (metrics.technicalDebt.totalMinutes > 60) {
    score -= Math.min(10, metrics.technicalDebt.totalMinutes / 60);
  }
  
  // Also consider the number of quality issues
  score -= Math.min(20, issues.length * 2);
  
  return Math.max(0, Math.round(score));
}
// Export as a class for consistency with index.ts expectations
export class DeepWikiResponseParser {
  static parse(content: string) {
    return parseDeepWikiResponse(content);
  }
}


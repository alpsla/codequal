/**
 * DeepWiki Response Parser with Test Detection
 * 
 * Enhanced version that uses actual test file detection when DeepWiki returns 0% coverage.
 * Fixes BUG-026: Test Coverage Detection Failure
 */

import { 
  ArchitectureVisualizer, 
  ArchitectureComponent, 
  ComponentRelationship,
  ArchitectureDiagram 
} from './architecture-visualizer';
import { parseEnhancedDependencies, dependenciesToIssues } from './enhanced-dependency-parser';
import { parseEnhancedCodeQuality, codeQualityToIssues } from './enhanced-code-quality-parser';
import { testCoverageDetector, TestCoverageMetrics } from '../../utils/test-coverage-detector';

export interface ParseOptions {
  repoPath?: string;
  useTestDetection?: boolean;
  fallbackCoverage?: number;
}

/**
 * Parse DeepWiki text response with enhanced test coverage detection
 */
export async function parseDeepWikiResponseWithTestDetection(
  content: string, 
  options: ParseOptions = {}
): Promise<any> {
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
  const currentEducationalItem: any = null;
  
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
  
  // Priority categories
  const categoryMappings: Record<string, string> = {
    'security': 'security',
    'vulnerability': 'security',
    'authentication': 'security',
    'authorization': 'security',
    'encryption': 'security',
    'xss': 'security',
    'injection': 'security',
    'performance': 'performance',
    'optimization': 'performance',
    'memory': 'performance',
    'cpu': 'performance',
    'slow': 'performance',
    'inefficient': 'performance',
    'bug': 'bug',
    'error': 'bug',
    'crash': 'bug',
    'failure': 'bug',
    'broken': 'bug',
    'dependency': 'dependency',
    'package': 'dependency',
    'version': 'dependency',
    'outdated': 'dependency',
    'deprecated': 'dependency',
    'architecture': 'architecture',
    'design': 'architecture',
    'structure': 'architecture',
    'pattern': 'architecture',
    'smell': 'codeQuality',
    'complexity': 'codeQuality',
    'duplication': 'codeQuality',
    'duplicate': 'codeQuality',
    'redundant': 'codeQuality',
    'test': 'testing',
    'coverage': 'testing',
    'unit': 'testing',
    'integration': 'testing'
  };
  
  let currentIssue: any = null;
  const currentCategory: string | null = null;
  let isInCodeBlock = false;
  let codeBlockContent = '';
  let inArchitectureSection = false;
  const architecturePatterns: string[] = [];
  const architectureAntiPatterns: string[] = [];
  const architectureRecommendations: string[] = [];
  const architectureMetrics: any = {};
  
  // Parse issues from content (existing logic preserved)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Track code blocks
    if (trimmedLine.startsWith('```')) {
      if (isInCodeBlock && codeBlockContent && inArchitectureSection) {
        architectureDiagram = codeBlockContent;
      }
      isInCodeBlock = !isInCodeBlock;
      codeBlockContent = '';
      continue;
    }
    
    if (isInCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }
    
    // Check for architecture section
    if (trimmedLine.toLowerCase().includes('architecture') && 
        (trimmedLine.includes('##') || trimmedLine.includes('**'))) {
      inArchitectureSection = true;
    } else if (trimmedLine.includes('##') && !trimmedLine.toLowerCase().includes('architecture')) {
      inArchitectureSection = false;
    }
    
    // Educational section detection
    if (trimmedLine.toLowerCase().includes('education') || 
        trimmedLine.toLowerCase().includes('best practice') ||
        trimmedLine.toLowerCase().includes('anti-pattern')) {
      inEducationalSection = true;
      
      if (trimmedLine.toLowerCase().includes('best practice')) {
        currentEducationType = 'best-practice';
      } else if (trimmedLine.toLowerCase().includes('anti-pattern')) {
        currentEducationType = 'anti-pattern';
      } else {
        currentEducationType = 'learning';
      }
      continue;
    }
    
    // Parse educational items
    if (inEducationalSection && currentEducationType) {
      if (trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./)) {
        const educationalContent = trimmedLine.replace(/^[-\d+.]\s*/, '');
        
        // Extract pattern details
        const patternMatch = educationalContent.match(/^([^:]+):\s*(.+)/);
        if (patternMatch) {
          educationalInsights.push({
            type: currentEducationType,
            pattern: patternMatch[1].trim(),
            description: patternMatch[2].trim(),
            category: determineEducationalCategory(patternMatch[1])
          });
        } else {
          educationalInsights.push({
            type: currentEducationType,
            pattern: educationalContent,
            description: '',
            category: 'general'
          });
        }
      }
    }
    
    // Parse architecture patterns
    if (inArchitectureSection) {
      if (trimmedLine.toLowerCase().includes('pattern') && trimmedLine.includes(':')) {
        const patternMatch = trimmedLine.match(/pattern[s]?:\s*(.+)/i);
        if (patternMatch) {
          architecturePatterns.push(...patternMatch[1].split(',').map(p => p.trim()));
        }
      }
      
      if (trimmedLine.toLowerCase().includes('anti-pattern') && trimmedLine.includes(':')) {
        const antiPatternMatch = trimmedLine.match(/anti-pattern[s]?:\s*(.+)/i);
        if (antiPatternMatch) {
          architectureAntiPatterns.push(...antiPatternMatch[1].split(',').map(p => p.trim()));
        }
      }
      
      // Parse architecture components
      const componentMatch = trimmedLine.match(/Component:\s*([^,]+)(?:,\s*Type:\s*([^,]+))?(?:,\s*Responsibility:\s*(.+))?/i);
      if (componentMatch) {
        detectedComponents.push({
          id: componentMatch[1].trim().toLowerCase().replace(/\s+/g, '-'),
          name: componentMatch[1].trim(),
          type: (componentMatch[2] || 'service').trim() as any,
          responsibilities: componentMatch[3] ? [componentMatch[3].trim()] : []
        });
      }
      
      // Parse relationships
      const relationshipMatch = trimmedLine.match(/([^\s]+)\s*(?:->|→|depends on|uses|calls)\s*([^\s]+)/i);
      if (relationshipMatch) {
        detectedRelationships.push({
          from: relationshipMatch[1],
          to: relationshipMatch[2],
          type: 'dependency'
        });
      }
    }
    
    // Check for severity indicators
    let severity = 'medium';
    for (const [keyword, sev] of Object.entries(severityKeywords)) {
      if (trimmedLine.toLowerCase().includes(keyword)) {
        severity = sev;
        break;
      }
    }
    
    // Determine category
    let category = 'general';
    for (const [keyword, cat] of Object.entries(categoryMappings)) {
      if (trimmedLine.toLowerCase().includes(keyword)) {
        category = cat;
        break;
      }
    }
    
    // Match numbered issues or bullet points with descriptions
    const issueMatch = trimmedLine.match(/^(\d+\.|\*|-)\s*(.+)/);
    if (issueMatch) {
      const description = issueMatch[2];
      
      // Extract file and line information
      const locationMatch = description.match(/(?:in\s+)?([^\s]+\.(ts|js|tsx|jsx|py|go|java|rb|rs|cs))(?::(\d+))?/i);
      
      const issue = {
        id: `issue-${issues.length + 1}`,
        type: category === 'bug' ? 'bug' : 
              category === 'security' ? 'security' : 
              category === 'performance' ? 'performance' : 
              category === 'codeQuality' ? 'code-smell' : 'issue',
        severity: severity as 'critical' | 'high' | 'medium' | 'low',
        category: category,
        title: description.substring(0, 100),
        description: description,
        file: locationMatch ? locationMatch[1] : 'unknown',
        line: locationMatch && locationMatch[3] ? parseInt(locationMatch[3]) : 0,
        remediation: generateRemediation(category, severity, description)
      };
      
      issues.push(issue);
      currentIssue = issue;
    }
  }
  
  // Add dependency issues
  const dependencyIssues = dependenciesToIssues(enhancedDependencies);
  issues.push(...dependencyIssues);
  
  // Add code quality issues
  const codeQualityIssues = codeQualityToIssues(codeQualityMetrics);
  issues.push(...codeQualityIssues);
  
  // === ENHANCED TEST COVERAGE DETECTION ===
  let testCoverage = codeQualityMetrics.testCoverage?.overall || 0;
  
  // If test coverage is 0 and we have a repo path, try actual detection
  if (testCoverage === 0 && options.repoPath && options.useTestDetection !== false) {
    console.log('DeepWiki reported 0% test coverage, performing actual test detection...');
    
    try {
      const detectedMetrics: TestCoverageMetrics = await testCoverageDetector.detectTestCoverage(options.repoPath);
      
      if (detectedMetrics.hasTests) {
        console.log(`Detected ${detectedMetrics.testFiles} test files with estimated ${detectedMetrics.overall}% coverage`);
        testCoverage = detectedMetrics.overall;
        
        // Update code quality metrics with detected values
        codeQualityMetrics.testCoverage = {
          overall: detectedMetrics.overall,
          line: detectedMetrics.overall * 0.9, // Estimate line coverage
          branch: detectedMetrics.overall * 0.8, // Estimate branch coverage
          function: detectedMetrics.overall * 0.85, // Estimate function coverage
          statement: detectedMetrics.overall * 0.9, // Estimate statement coverage
          untested: []
        };
        
        // Add informational issue about detected tests
        if (detectedMetrics.overall < 80) {
          issues.push({
            id: `issue-test-coverage`,
            type: 'testing',
            severity: detectedMetrics.overall < 50 ? 'high' : 'medium',
            category: 'testing',
            title: `Test coverage at ${detectedMetrics.overall}% (${detectedMetrics.testFiles} test files detected)`,
            description: `Repository has ${detectedMetrics.testFiles} test files covering ${detectedMetrics.sourceFiles} source files (${(detectedMetrics.testToSourceRatio * 100).toFixed(1)}% ratio). Test frameworks: ${detectedMetrics.testFrameworks.join(', ') || 'Unknown'}. Consider increasing coverage to at least 80%.`,
            file: 'project',
            line: 0,
            remediation: `Add more tests to improve coverage. Current breakdown: Unit tests: ${detectedMetrics.testPatterns.unit}, Integration tests: ${detectedMetrics.testPatterns.integration}, E2E tests: ${detectedMetrics.testPatterns.e2e}`
          });
        }
      } else if (options.fallbackCoverage !== undefined) {
        // Use fallback coverage if provided
        testCoverage = options.fallbackCoverage;
      }
    } catch (error) {
      console.error('Error detecting test coverage:', error);
      // Fall back to DeepWiki value or default
      if (options.fallbackCoverage !== undefined) {
        testCoverage = options.fallbackCoverage;
      }
    }
  }
  
  // === VISUALIZATION ENHANCEMENT ===
  const visualizer = new ArchitectureVisualizer();
  let enhancedDiagram = architectureDiagram;
  
  if (!enhancedDiagram && detectedComponents.length > 0) {
    const diagram: ArchitectureDiagram = {
      type: 'component',
      title: 'System Architecture',
      diagram: '',
      components: detectedComponents,
      relationships: detectedRelationships
    };
    enhancedDiagram = ArchitectureVisualizer.generateComponentDiagram(detectedComponents, detectedRelationships);
  }
  
  // Calculate scores
  const securityScore = Math.max(0, 100 - issues.filter(i => i.category === 'security').reduce((acc, i) => {
    return acc + (i.severity === 'critical' ? 25 : i.severity === 'high' ? 15 : i.severity === 'medium' ? 8 : 3);
  }, 0));
  
  const dependencyScore = calculateDependenciesScore(enhancedDependencies);
  const architectureScore = calculateArchitectureScore(detectedComponents, architecturePatterns, architectureAntiPatterns);
  const overallScore = Math.round((securityScore + dependencyScore + architectureScore) / 3);
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
      testCoverage: testCoverage
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
  score -= Math.min(15, metrics.codeSmells.total * 2);
  
  // Deduct for maintainability issues
  if (metrics.maintainability.index < 70) {
    score -= Math.min(10, (70 - metrics.maintainability.index) / 3);
  }
  
  // Deduct for issue count
  score -= Math.min(20, issues.length * 3);
  
  return Math.max(0, Math.round(score));
}

function calculateDependenciesScore(dependencies: any): number {
  const { vulnerable, outdated, deprecated } = dependencies;
  
  let score = 100;
  
  // Deduct heavily for vulnerabilities
  vulnerable.forEach((dep: any) => {
    if (dep.severity === 'critical') score -= 20;
    else if (dep.severity === 'high') score -= 12;
    else if (dep.severity === 'medium') score -= 7;
    else score -= 3;
  });
  
  // Deduct for outdated packages
  outdated.forEach((dep: any) => {
    const versionsBehind = dep.versionsBehind || 1;
    score -= Math.min(5, versionsBehind);
  });
  
  // Deduct for deprecated packages
  score -= deprecated.length * 8;
  
  return Math.max(0, Math.round(score));
}

function calculateArchitectureScore(
  components: ArchitectureComponent[],
  patterns: string[],
  antiPatterns: string[]
): number {
  let score = 80; // Start with baseline
  
  // Add points for good patterns
  score += Math.min(15, patterns.length * 5);
  
  // Deduct for anti-patterns
  score -= antiPatterns.length * 10;
  
  // Add points for clear component structure
  if (components.length > 0) {
    score += Math.min(10, components.length * 2);
  }
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateRemediation(category: string, severity: string, description: string): string {
  const remediations: Record<string, string> = {
    'security': 'Apply security patches and follow OWASP guidelines',
    'performance': 'Optimize the code path and consider caching strategies',
    'bug': 'Fix the bug and add tests to prevent regression',
    'dependency': 'Update to the latest stable version and review changelog',
    'architecture': 'Refactor to follow SOLID principles and design patterns',
    'codeQuality': 'Refactor to reduce complexity and improve maintainability',
    'testing': 'Add unit tests and improve test coverage',
    'general': 'Review and address the issue according to best practices'
  };
  
  return remediations[category] || remediations.general;
}

function determineEducationalCategory(pattern: string): string {
  const lowered = pattern.toLowerCase();
  
  if (lowered.includes('security') || lowered.includes('auth')) return 'security';
  if (lowered.includes('performance') || lowered.includes('optim')) return 'performance';
  if (lowered.includes('test') || lowered.includes('coverage')) return 'testing';
  if (lowered.includes('design') || lowered.includes('pattern')) return 'architecture';
  if (lowered.includes('code') || lowered.includes('quality')) return 'codeQuality';
  
  return 'general';
}

// Export both the enhanced function and a wrapper for backward compatibility
export { parseDeepWikiResponseWithTestDetection as parseDeepWikiResponse };
export default parseDeepWikiResponseWithTestDetection;
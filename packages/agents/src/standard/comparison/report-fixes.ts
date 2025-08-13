/**
 * Report Generator Fixes
 * 
 * This file contains the corrected logic for:
 * 1. Breaking Changes categorization
 * 2. Dependencies scoring  
 * 3. Training section formatting
 */

import { Issue as BaseIssue } from '../types/analysis-types';

// Extend the base Issue type to ensure compatibility
export interface Issue extends Omit<BaseIssue, 'location'> {
  location?: { file: string; line?: number };
}

/**
 * FIX #1: Correct Breaking Changes Identification
 * Only identify actual breaking changes, not all critical issues
 */
export function identifyBreakingChanges(issues: Issue[]): Issue[] {
  return issues.filter(issue => {
    const msg = issue.message?.toLowerCase() || '';
    const cat = issue.category?.toLowerCase() || '';
    
    // Breaking changes are ONLY:
    // 1. Explicitly marked as breaking changes
    // 2. API contract changes
    // 3. Removed features/endpoints
    // 4. Incompatible schema changes
    
    const isBreakingChange = 
      cat === 'breaking-change' ||
      cat === 'breaking' ||
      msg.includes('breaking change') ||
      msg.includes('api contract') ||
      msg.includes('response format changed') ||
      msg.includes('parameter removed') ||
      msg.includes('endpoint removed') ||
      msg.includes('incompatible') ||
      msg.includes('migration required') ||
      (msg.includes('removed') && msg.includes('api'));
    
    // SQL injection, XSS, etc. are NOT breaking changes!
    const isSecurityIssue = 
      cat === 'security' ||
      msg.includes('injection') ||
      msg.includes('vulnerability') ||
      msg.includes('xss') ||
      msg.includes('csrf');
    
    // Security issues are NEVER breaking changes
    return isBreakingChange && !isSecurityIssue;
  });
}

/**
 * FIX #2: Correct Dependencies Scoring
 * Deduct points based on dependency issues found
 */
export function calculateDependenciesScore(issues: Issue[]): number {
  let score = 100;
  
  // Filter for dependency-related issues
  const depIssues = issues.filter(issue => {
    const cat = issue.category?.toLowerCase() || '';
    const file = issue.location?.file?.toLowerCase() || '';
    
    return cat === 'dependencies' || 
           cat === 'dependency' ||
           file.includes('package.json') ||
           file.includes('package-lock.json') ||
           file.includes('yarn.lock');
  });
  
  // Deduct points based on severity
  depIssues.forEach(issue => {
    switch(issue.severity) {
      case 'critical':
        score -= 25; // Major vulnerabilities
        break;
      case 'high':
        score -= 15; // Significant vulnerabilities
        break;
      case 'medium':
        score -= 10; // Moderate issues
        break;
      case 'low':
        score -= 5; // Minor issues
        break;
    }
  });
  
  // Never go below 0
  return Math.max(0, Math.round(score));
}

/**
 * FIX #3: Enhanced Educational Insights with Issue-Based Training
 * Links specific issues to detailed training recommendations for educator agent
 */
export function generateEducationalInsights(issues: Issue[]): string {
  const criticalIssues = issues.filter(i => i.severity === 'critical');
  const highIssues = issues.filter(i => i.severity === 'high');
  const mediumIssues = issues.filter(i => i.severity === 'medium');
  
  let section = '## 13. Educational Insights\n\n';
  section += '### 📚 Training Recommendations Based on Issues Found\n\n';
  
  // URGENT TRAINING - Critical Issues
  if (criticalIssues.length > 0) {
    section += '#### 🚨 URGENT TRAINING REQUIRED (Critical Issues Found)\n\n';
    
    // Group critical issues by category
    const criticalByCategory = groupIssuesByCategory(criticalIssues);
    
    for (const [category, categoryIssues] of Object.entries(criticalByCategory)) {
      section += `**${category.toUpperCase()} Training Required:**\n`;
      section += `*Based on ${categoryIssues.length} critical issue(s) found*\n\n`;
      
      // List specific issues and their training
      categoryIssues.slice(0, 3).forEach(issue => {
        section += `📍 Issue: "${issue.message}"\n`;
        if (issue.location) {
          section += `   Location: ${issue.location.file}:${issue.location.line || ''}\n`;
        }
        section += `   → Training Needed: ${getSpecificTraining(issue).join(', ')}\n\n`;
      });
      
      // Training topics for this category
      section += `**Recommended Topics:**\n`;
      getTrainingTopics(category, categoryIssues).forEach(topic => {
        section += `- ${topic}\n`;
      });
      section += '\n';
    }
  }
  
  // HIGH PRIORITY TRAINING - High Issues
  if (highIssues.length > 0) {
    section += '#### ⚠️ HIGH PRIORITY TRAINING (High Issues Found)\n\n';
    
    const highByCategory = groupIssuesByCategory(highIssues);
    
    for (const [category, categoryIssues] of Object.entries(highByCategory)) {
      section += `**${category.toUpperCase()} Skills Enhancement:**\n`;
      
      // Show examples with training
      categoryIssues.slice(0, 2).forEach(issue => {
        section += `- Issue: "${issue.message}"\n`;
        section += `  → Training: ${getSpecificTraining(issue)[0]}\n`;
      });
      section += '\n';
    }
  }
  
  // RECOMMENDED TRAINING - Medium Issues
  if (mediumIssues.length > 0) {
    section += '#### 📖 RECOMMENDED TRAINING\n';
    const topics = new Set<string>();
    mediumIssues.forEach(issue => {
      const cat = issue.category?.toLowerCase() || '';
      if (cat === 'code-quality') {
        topics.add('Clean Code Principles');
      } else if (cat === 'dependencies') {
        topics.add('Dependency Management');
      } else if (cat === 'architecture') {
        topics.add('Software Architecture Patterns');
      }
    });
    topics.forEach(topic => {
      section += `- ${topic}\n`;
    });
    section += '\n';
  }
  
  // SKILL METRICS
  section += '#### 📊 Skill Impact Summary\n\n';
  const securityIssues = issues.filter(i => i.category === 'security').length;
  const performanceIssues = issues.filter(i => i.category === 'performance').length;
  const qualityIssues = issues.filter(i => i.category === 'code-quality').length;
  
  if (securityIssues > 0) {
    section += `- **Security:** ${securityIssues} issues → Focus on secure coding practices\n`;
  }
  if (performanceIssues > 0) {
    section += `- **Performance:** ${performanceIssues} issues → Study optimization techniques\n`;
  }
  if (qualityIssues > 0) {
    section += `- **Code Quality:** ${qualityIssues} issues → Review clean code principles\n`;
  }
  
  if (issues.length === 0) {
    section += '### ✅ Excellent Work!\n';
    section += 'No immediate training needs identified. Keep up the good practices!\n';
  }
  
  return section;
}

// Helper functions
function groupIssuesByCategory(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};
  issues.forEach(issue => {
    const cat = issue.category || 'general';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(issue);
  });
  return groups;
}

function getSpecificTraining(issue: Issue): string[] {
  const message = issue.message.toLowerCase();
  const trainings: string[] = [];
  
  // Security training mapping
  if (message.includes('sql injection')) {
    trainings.push('SQL Injection Prevention & Parameterized Queries');
  } else if (message.includes('xss') || message.includes('cross-site')) {
    trainings.push('XSS Prevention & Output Encoding');
  } else if (message.includes('authentication') || message.includes('unauthenticated')) {
    trainings.push('Authentication Best Practices & OAuth2/JWT');
  } else if (message.includes('api key') || message.includes('credential')) {
    trainings.push('Secrets Management & Environment Variables');
  } else if (message.includes('cors')) {
    trainings.push('CORS Configuration & Security Headers');
  }
  // Performance training mapping
  else if (message.includes('n+1') || message.includes('query amplification')) {
    trainings.push('Database Query Optimization & N+1 Prevention');
  } else if (message.includes('memory leak')) {
    trainings.push('Memory Management & Garbage Collection');
  } else if (message.includes('cache') || message.includes('invalidation')) {
    trainings.push('Caching Strategies & Cache Invalidation');
  } else if (message.includes('index') || message.includes('database')) {
    trainings.push('Database Indexing & Query Performance');
  }
  // Architecture training mapping  
  else if (message.includes('circular') || message.includes('dependency')) {
    trainings.push('Dependency Injection & SOLID Principles');
  } else if (message.includes('coupling') || message.includes('boundaries')) {
    trainings.push('Microservices Architecture & Domain Boundaries');
  }
  // Dependencies training
  else if (message.includes('vulnerable') || message.includes('vulnerability')) {
    trainings.push('Dependency Security Scanning & Management');
  } else if (message.includes('outdated')) {
    trainings.push('Dependency Updates & Version Management');
  }
  // Code quality training
  else if (message.includes('error handling')) {
    trainings.push('Error Handling & Exception Management');
  } else if (message.includes('test') || message.includes('coverage')) {
    trainings.push('Test-Driven Development & Coverage');
  }
  
  // Default fallback
  if (trainings.length === 0) {
    trainings.push(`${issue.category || 'General'} Best Practices`);
  }
  
  return trainings;
}

function getTrainingTopics(category: string, issues: Issue[]): string[] {
  const topics: string[] = [];
  
  switch(category.toLowerCase()) {
    case 'security':
      topics.push('OWASP Top 10 Vulnerabilities');
      topics.push('Secure Coding Standards');
      topics.push('Authentication & Authorization');
      break;
    case 'performance':
      topics.push('Performance Profiling Tools');
      topics.push('Database Optimization');
      topics.push('Caching Strategies');
      break;
    case 'architecture':
      topics.push('Design Patterns');
      topics.push('SOLID Principles');
      topics.push('Microservices Best Practices');
      break;
    case 'dependencies':
      topics.push('Supply Chain Security');
      topics.push('Dependency Scanning');
      topics.push('Version Management');
      break;
    default:
      topics.push('Clean Code Principles');
      topics.push('Code Review Practices');
      break;
  }
  
  return topics;
}

/**
 * FIX #4: Validate Location Accuracy
 * Ensure locations point to real files and lines
 */
export function validateLocation(location: { file: string; line?: number }): boolean {
  // Check that file path looks valid
  if (!location.file || location.file.length === 0) {
    return false;
  }
  
  // Check for valid file extensions or paths
  const validPatterns = [
    /\.(ts|tsx|js|jsx|json|yml|yaml|md|py|java|go|rs|cpp|c|h)$/,
    /package\.json/,
    /\//  // Has directory separators
  ];
  
  const hasValidFormat = validPatterns.some(pattern => 
    pattern.test(location.file)
  );
  
  // Line number should be positive (if present)
  const hasValidLine = !location.line || (location.line > 0 && location.line < 100000);
  
  return hasValidFormat && hasValidLine;
}

/**
 * Example usage showing the fixes
 */
export function demonstrateFixes() {
  const testIssues: Issue[] = [
    // This should NOT be a breaking change
    {
      id: 'test-1',
      severity: 'critical',
      category: 'security',
      message: 'SQL injection vulnerability detected',
      location: { file: 'api/users.ts', line: 45 }
    } as Issue,
    // This SHOULD be a breaking change
    {
      id: 'test-2',
      severity: 'high',
      category: 'api' as any,
      message: 'API response format changed from array to object',
      location: { file: 'api/v1/endpoints.ts', line: 123 }
    } as Issue,
    // Dependency issue
    {
      id: 'test-3',
      severity: 'medium',
      category: 'dependencies',
      message: 'Package lodash has known vulnerabilities',
      location: { file: 'package.json', line: 34 }
    } as Issue
  ];
  
  console.log('=== FIXES DEMONSTRATION ===\n');
  
  // Fix #1: Breaking Changes
  const breakingChanges = identifyBreakingChanges(testIssues);
  console.log('Breaking Changes Found:', breakingChanges.length);
  console.log('- SQL injection included?', breakingChanges.some(i => i.message.includes('SQL')));
  console.log('- API change included?', breakingChanges.some(i => i.message.includes('API')));
  
  // Fix #2: Dependencies Score
  const depScore = calculateDependenciesScore(testIssues);
  console.log('\nDependencies Score:', depScore, '(should be 90, not 100)');
  
  // Fix #3: Training Section
  const training = generateEducationalInsights(testIssues);
  console.log('\nTraining Section (concise format):');
  console.log(training);
  
  // Fix #4: Location Validation
  console.log('\nLocation Validation:');
  testIssues.forEach(issue => {
    if (issue.location) {
      const isValid = validateLocation(issue.location);
      console.log(`- ${issue.location.file}:${issue.location.line} - ${isValid ? '✅' : '❌'}`);
    }
  });
}
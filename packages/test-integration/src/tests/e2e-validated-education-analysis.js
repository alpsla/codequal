#!/usr/bin/env node
/**
 * E2E CodeQual Analysis with Validated Educational Resources
 * Ensures all educational links are valid before offering them
 */

const chalk = require('chalk');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;
const { URLValidator } = require('../utils/url-validator');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

// Create URL validator instance
const urlValidator = new URLValidator();

async function runValidatedEducationAnalysis() {
  console.log(chalk.bold.blue('\n🚀 Running CodeQual Analysis with Validated Educational Resources\n'));

  try {
    // Simulate the analysis results with specific findings
    const analysisResults = {
      metadata: {
        analysisId: `analysis-${Date.now()}`,
        repository: 'https://github.com/vercel/next.js',
        prNumber: 45678,
        title: 'Fix memory leak in development server',
        author: 'john.doe',
        timestamp: new Date().toISOString()
      },
      prFindings: [
        {
          category: 'codeQuality',
          severity: 'low',
          issue: 'Missing JSDoc documentation',
          message: 'Missing documentation for disposal logic',
          location: 'packages/next/server/dev/hot-reloader.ts:122',
          suggestion: 'Add JSDoc explaining the memory leak fix',
          context: 'Memory leak fix implementation needs documentation'
        },
        {
          category: 'codeQuality',
          severity: 'low',
          issue: 'Magic number in test',
          message: 'Magic number should be constant',
          location: 'test/development/hot-reload-memory.test.ts:10',
          suggestion: 'Extract to named constant RELOAD_ITERATIONS',
          context: 'Test clarity and maintainability'
        },
        {
          category: 'performance',
          severity: 'medium',
          issue: 'Missing watcher limit',
          message: 'Consider implementing maximum watcher limit',
          location: 'packages/next/server/dev/hot-reloader.ts:124',
          suggestion: 'Add MAX_WATCHERS constant to prevent unbounded growth',
          context: 'Preventing edge cases with thousands of modules'
        },
        {
          category: 'architecture',
          severity: 'low',
          issue: 'Pattern not generalized',
          message: 'Resource disposal pattern could be generalized',
          location: 'packages/next/server/dev/hot-reloader.ts:130-145',
          suggestion: 'Create reusable DisposableWatcher class',
          context: 'Reusability across codebase'
        },
        {
          category: 'testing',
          severity: 'low',
          issue: 'Missing edge cases',
          message: 'Edge case testing opportunity',
          suggestion: 'Consider testing with extreme module counts',
          context: 'Comprehensive test coverage'
        }
      ],
      resolvedIssues: [
        {
          id: 'PERF-005',
          category: 'performance',
          issue: 'Memory leak in hot reload watcher',
          howFixed: 'Implemented proper resource disposal',
          lessonLearned: 'Always clean up watchers and listeners'
        },
        {
          id: 'ARCH-004',
          category: 'architecture',
          issue: 'Missing abstraction for resource disposal',
          howFixed: 'Added disposal pattern',
          lessonLearned: 'Explicit cleanup prevents leaks'
        }
      ],
      userContext: {
        currentSkills: {
          memoryManagement: 72,
          documentation: 45,
          testingPatterns: 82,
          securityAwareness: 65,
          architectureDesign: 70
        },
        weakestAreas: ['documentation', 'securityAwareness'],
        historicalPatterns: [
          'Often skips documentation',
          'Good at performance fixes',
          'Needs improvement in security considerations'
        ]
      }
    };

    // Process educational needs with URL validation
    const educationalRecommendations = await processValidatedEducationalNeeds(analysisResults);

    // Generate HTML report with validated education
    const htmlReport = generateValidatedEducationReport(analysisResults, educationalRecommendations);

    // Save reports
    const htmlPath = path.join(__dirname, '../../test-reports', 'validated-education-report.html');
    const jsonPath = path.join(__dirname, '../../test-reports', 'validated-education-data.json');
    
    await fs.writeFile(htmlPath, htmlReport);
    await fs.writeFile(jsonPath, JSON.stringify({
      analysisResults,
      educationalRecommendations,
      validationStats: educationalRecommendations.validationStats
    }, null, 2));

    console.log(chalk.green('✅ Analysis with Validated Education Complete!\n'));
    
    // Show validation statistics
    const stats = educationalRecommendations.validationStats;
    console.log(chalk.yellow('📊 URL Validation Statistics:'));
    console.log(chalk.gray(`  Total URLs checked: ${stats.totalChecked}`));
    console.log(chalk.green(`  Valid URLs: ${stats.valid}`));
    console.log(chalk.red(`  Invalid URLs: ${stats.invalid}`));
    console.log(chalk.blue(`  Replaced with alternatives: ${stats.replaced}`));
    
    console.log(chalk.yellow('\n📚 Educational Priorities:'));
    educationalRecommendations.prioritizedTopics.forEach((topic, index) => {
      const icon = index < 2 ? '⭐' : '📖';
      console.log(chalk.gray(`  ${icon} ${topic.topic} (Priority: ${topic.priority})`));
    });
    
    console.log(chalk.cyan('\n💡 To view the report:'));
    console.log(chalk.gray(`  open "${htmlPath}"`));

    return true;
  } catch (error) {
    console.log(chalk.red('❌ Analysis failed:'), error.message);
    return false;
  }
}

async function processValidatedEducationalNeeds(analysisResults) {
  // Analyze findings to determine educational priorities
  const topicScores = {};
  const topicDetails = {};

  // Score based on PR findings
  analysisResults.prFindings.forEach(finding => {
    const topics = mapFindingToEducationalTopics(finding);
    topics.forEach(topic => {
      topicScores[topic] = (topicScores[topic] || 0) + getSeverityScore(finding.severity);
      if (!topicDetails[topic]) topicDetails[topic] = { prFindings: [], repoIssues: [] };
      topicDetails[topic].prFindings.push(finding);
    });
  });

  // Add ALL repository issues (not just relevant ones)
  const allRepoIssues = [
    // Security issues
    { id: 'SEC-001', severity: 'high', issue: 'XSS vulnerability in SSR', category: 'security' },
    { id: 'SEC-002', severity: 'medium', issue: 'Missing CSRF validation', category: 'security' },
    // Performance issues
    { id: 'PERF-001', severity: 'high', issue: 'Unnecessary re-renders', category: 'performance' },
    { id: 'PERF-002', severity: 'medium', issue: 'Large bundle size', category: 'performance' },
    { id: 'PERF-003', severity: 'medium', issue: 'Inefficient bundle splitting', category: 'performance' },
    { id: 'PERF-004', severity: 'low', issue: 'Redundant file checks', category: 'performance' },
    // Architecture issues
    { id: 'ARCH-001', severity: 'medium', issue: 'Tight coupling', category: 'architecture' },
    { id: 'ARCH-002', severity: 'low', issue: 'Duplicated router logic', category: 'architecture' },
    { id: 'ARCH-003', severity: 'medium', issue: 'Circular dependencies', category: 'architecture' },
    { id: 'ARCH-005', severity: 'medium', issue: 'Inconsistent error handling', category: 'architecture' },
    { id: 'ARCH-006', severity: 'low', issue: 'Missing interface segregation', category: 'architecture' },
    { id: 'ARCH-007', severity: 'medium', issue: 'SSR/CSR state inconsistency', category: 'architecture' },
    { id: 'ARCH-008', severity: 'low', issue: 'Plugin lifecycle gaps', category: 'architecture' },
    // Code Quality issues
    { id: 'CQ-001', severity: 'low', issue: 'Complex functions', category: 'codeQuality' },
    { id: 'CQ-002', severity: 'low', issue: 'Missing TypeScript types', category: 'codeQuality' },
    { id: 'CQ-003', severity: 'medium', issue: 'Inconsistent naming', category: 'codeQuality' },
    { id: 'CQ-004', severity: 'low', issue: 'Dead code', category: 'codeQuality' },
    { id: 'CQ-005', severity: 'low', issue: 'Untracked TODOs', category: 'codeQuality' },
    { id: 'CQ-006', severity: 'medium', issue: 'Poor error context', category: 'codeQuality' },
    // Dependencies
    { id: 'DEP-001', severity: 'medium', issue: 'Outdated webpack', category: 'dependencies' },
    { id: 'DEP-002', severity: 'low', issue: 'Deprecated packages', category: 'dependencies' }
  ];

  allRepoIssues.forEach(issue => {
    const topics = mapRepoIssueToEducationalTopics(issue);
    topics.forEach(topic => {
      // Repository issues get significant weight
      topicScores[topic] = (topicScores[topic] || 0) + getSeverityScore(issue.severity) * 1.2;
      if (!topicDetails[topic]) topicDetails[topic] = { prFindings: [], repoIssues: [] };
      topicDetails[topic].repoIssues.push(issue);
    });
  });

  // Boost scores based on user's weak areas
  analysisResults.userContext.weakestAreas.forEach(area => {
    if (topicScores[area]) {
      topicScores[area] *= 2; // Stronger boost for weak areas
    }
  });

  // Boost scores for immediate PR findings
  Object.entries(topicDetails).forEach(([topic, details]) => {
    if (details.prFindings.length > 0) {
      topicScores[topic] = (topicScores[topic] || 0) * 1.5; // Immediate relevance boost
    }
  });

  // Get educational resources with URL validation
  const validationStats = {
    totalChecked: 0,
    valid: 0,
    invalid: 0,
    replaced: 0
  };

  // Sort topics by score
  const allTopics = [];
  for (const [topic, score] of Object.entries(topicScores)) {
    const resources = await getValidatedEducationalResources(topic, analysisResults, validationStats);
    
    if (resources.resources && resources.resources.length > 0) {
      allTopics.push({
        topic,
        priority: score > 15 ? 'IMMEDIATE' : score > 10 ? 'HIGH' : score > 5 ? 'MEDIUM' : 'LOW',
        score,
        resources,
        details: topicDetails[topic] || { prFindings: [], repoIssues: [] }
      });
    }
  }

  // Sort by score and limit to most relevant
  const prioritizedTopics = allTopics
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Limit to top 5 topics

  return {
    prioritizedTopics,
    immediateActions: getImmediateActions(analysisResults),
    skillGaps: identifySkillGaps(analysisResults),
    validationStats
  };
}

async function getValidatedEducationalResources(topic, context, stats) {
  const resourceMap = {
    architectureDesign: {
      title: 'Software Architecture & Design Patterns',
      description: 'Learn SOLID principles, reduce coupling, and prevent circular dependencies',
      resources: [
        {
          type: 'guide',
          title: 'Dependency Inversion Principle',
          url: 'https://martinfowler.com/articles/dipInTheWild.html',
          relevance: 'Addresses ARCH-001 tight coupling and ARCH-006 interface segregation'
        },
        {
          type: 'guide',
          title: 'SOLID Principles in TypeScript',
          url: 'https://www.typescriptlang.org/docs/handbook/2/classes.html',
          relevance: 'Foundation for addressing coupling and interface issues'
        },
        {
          type: 'guide',
          title: 'Circular Dependency Detection',
          url: 'https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de',
          relevance: 'Directly addresses ARCH-003 circular dependencies'
        },
        {
          type: 'example',
          title: 'Disposal Pattern Implementation',
          code: `// Generalized disposal pattern for ARCH-004
interface IDisposable {
  dispose(): void | Promise<void>;
}

class DisposableWatcher implements IDisposable {
  private watchers = new Map<string, FSWatcher>();
  
  watch(path: string): void {
    const watcher = fs.watch(path);
    this.watchers.set(path, watcher);
  }
  
  async dispose(): Promise<void> {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }
}`
        }
      ]
    },
    securityAwareness: {
      title: 'Security in Next.js Server-Side Code',
      description: 'Prevent XSS vulnerabilities in SSR contexts',
      resources: [
        {
          type: 'critical',
          title: 'Next.js SSR Security Guide',
          url: 'https://nextjs.org/docs/advanced-features/security-headers',
          relevance: 'Your repo has SEC-001 XSS vulnerability'
        },
        {
          type: 'guide',
          title: 'OWASP XSS Prevention Cheat Sheet',
          url: 'https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html',
          relevance: 'Comprehensive XSS prevention strategies'
        },
        {
          type: 'guide',
          title: 'CSRF Protection in Next.js',
          url: 'https://github.com/edge-csrf/nextjs-example',
          relevance: 'Addresses SEC-002 missing CSRF validation'
        }
      ]
    },
    documentation: {
      title: 'Documentation Best Practices for TypeScript',
      description: 'Learn JSDoc patterns specific to your memory management code',
      resources: [
        {
          type: 'guide',
          title: 'JSDoc for TypeScript Memory Management',
          url: 'https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html',
          relevance: 'Directly applicable to hot-reloader.ts'
        },
        {
          type: 'guide',
          title: 'TypeScript Documentation Best Practices',
          url: 'https://github.com/Microsoft/TypeScript/wiki/JSDoc-support-in-JavaScript',
          relevance: 'Comprehensive JSDoc patterns for TypeScript'
        }
      ]
    },
    testingPatterns: {
      title: 'Advanced Testing Patterns',
      description: 'Improve test quality with constants and edge cases',
      resources: [
        {
          type: 'guide',
          title: 'Eliminating Magic Numbers in Tests',
          url: 'https://kentcdodds.com/blog/common-testing-mistakes',
          relevance: 'Addresses your test constant issue'
        },
        {
          type: 'guide',
          title: 'JavaScript Testing Best Practices',
          url: 'https://github.com/goldbergyoni/javascript-testing-best-practices',
          relevance: 'Comprehensive testing patterns and edge cases'
        }
      ]
    },
    performance: {
      title: 'Performance Optimization',
      description: 'Implement resource limits and optimize watchers',
      resources: [
        {
          type: 'guide',
          title: 'Node.js Performance Best Practices',
          url: 'https://nodejs.org/en/docs/guides/simple-profiling/',
          relevance: 'Profile and optimize watcher performance'
        },
        {
          type: 'guide',
          title: 'Memory Management in Node.js',
          url: 'https://blog.risingstack.com/finding-a-memory-leak-in-node-js/',
          relevance: 'Advanced techniques for memory optimization'
        }
      ]
    }
  };

  const resources = resourceMap[topic];
  if (!resources) return {};

  // Validate all URLs in the resources
  for (const resource of resources.resources || []) {
    if (resource.url) {
      stats.totalChecked++;
      const result = await urlValidator.validateURL(resource.url);
      
      if (!result.valid) {
        stats.invalid++;
        
        // Try alternatives if available
        if (resource.urls && resource.urls.length > 1) {
          let foundValid = false;
          for (const altUrl of resource.urls.slice(1)) {
            const altResult = await urlValidator.validateURL(altUrl);
            if (altResult.valid) {
              resource.url = altUrl;
              stats.replaced++;
              foundValid = true;
              break;
            }
          }
          
          if (!foundValid) {
            // Try auto-generated alternatives
            const alternatives = urlValidator.getAlternatives(resource.urls[0]);
            for (const altUrl of alternatives) {
              const altResult = await urlValidator.validateURL(altUrl);
              if (altResult.valid) {
                resource.url = altUrl;
                stats.replaced++;
                foundValid = true;
                break;
              }
            }
          }
          
          if (!foundValid) {
            // Mark as invalid but keep in list with warning
            resource.validationError = 'URL not accessible';
          }
        } else {
          // Single URL - try alternatives
          const alternatives = urlValidator.getAlternatives(resource.url);
          let foundValid = false;
          
          for (const altUrl of alternatives) {
            const altResult = await urlValidator.validateURL(altUrl);
            if (altResult.valid) {
              resource.originalUrl = resource.url;
              resource.url = altUrl;
              stats.replaced++;
              foundValid = true;
              break;
            }
          }
          
          if (!foundValid) {
            resource.validationError = 'URL not accessible';
          }
        }
      } else {
        stats.valid++;
      }
    }
  }

  // Filter out resources with validation errors or without valid URLs
  resources.resources = resources.resources.filter(r => {
    // Keep code examples even without URLs
    if (r.type === 'example' && r.code) return true;
    
    // For all other resources, must have a valid URL
    return r.url && !r.validationError;
  });

  return resources;
}

function generateValidatedEducationReport(analysisResults, recommendations) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis - Validated Educational Resources</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            background: #f8f9fa;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            margin-bottom: 30px;
        }
        .validation-stats {
            background: #e3f2fd;
            border: 1px solid #64b5f6;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .validation-stats h3 {
            margin-top: 0;
            color: #1565c0;
        }
        .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .stat-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
        }
        .education-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        .priority-high {
            background: #fee2e2;
            color: #dc2626;
        }
        .priority-medium {
            background: #fef3c7;
            color: #d97706;
        }
        .priority-low {
            background: #dbeafe;
            color: #2563eb;
        }
        .education-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            background: #f9fafb;
        }
        .education-card.featured {
            border-color: #667eea;
            background: #f0f4ff;
            position: relative;
        }
        .featured-ribbon {
            position: absolute;
            top: -10px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 4px 16px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .resource-item {
            background: white;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            border: 1px solid #e5e7eb;
        }
        .resource-item.replaced {
            border-color: #60a5fa;
            background: #eff6ff;
        }
        .replaced-notice {
            font-size: 12px;
            color: #2563eb;
            margin-top: 5px;
        }
        .resource-type {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .type-guide { background: #dbeafe; color: #1e40af; }
        .type-example { background: #d1fae5; color: #065f46; }
        .type-critical { background: #fee2e2; color: #991b1b; }
        .code-example {
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 15px 0;
        }
        .code-example pre {
            margin: 0;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 14px;
        }
        .validation-success {
            color: #16a34a;
            font-size: 14px;
        }
        .validation-replaced {
            color: #2563eb;
            font-size: 14px;
        }
        .attribution {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
            font-size: 14px;
        }
        .attribution-pr {
            color: #7c3aed;
            font-weight: 600;
        }
        .attribution-repo {
            color: #dc2626;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 CodeQual Educational Recommendations</h1>
            <p>Validated learning resources tailored to your code analysis findings</p>
            <p><strong>Repository:</strong> ${analysisResults.metadata.repository}</p>
            <p><strong>PR #${analysisResults.metadata.prNumber}:</strong> ${analysisResults.metadata.title}</p>
        </div>

        <div class="validation-stats">
            <h3>📊 URL Validation Statistics</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${recommendations.validationStats.totalChecked}</div>
                    <div class="stat-label">URLs Checked</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #16a34a;">${recommendations.validationStats.valid}</div>
                    <div class="stat-label">Valid Links</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #2563eb;">${recommendations.validationStats.replaced}</div>
                    <div class="stat-label">Auto-Fixed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" style="color: #dc2626;">${recommendations.validationStats.invalid}</div>
                    <div class="stat-label">Invalid</div>
                </div>
            </div>
        </div>

        <div class="education-section">
            <h2>📚 Prioritized Learning Topics</h2>
            <p>Based on ${analysisResults.prFindings.length} PR findings and 23 repository issues, we've identified and validated the following educational priorities:</p>
            
            ${recommendations.prioritizedTopics.map((topic, index) => `
                <div class="education-card ${index < 2 ? 'featured' : ''}">
                    ${index < 2 ? '<div class="featured-ribbon">TOP PRIORITY</div>' : ''}
                    <h3>${topic.resources.title}
                        <span class="priority-badge priority-${topic.priority.toLowerCase()}">${topic.priority}</span>
                    </h3>
                    <p>${topic.resources.description}</p>
                    
                    <div class="attribution">
                        ${topic.details.prFindings.length > 0 ? 
                            `<span class="attribution-pr">PR Findings: ${topic.details.prFindings.length}</span>` : ''}
                        ${topic.details.prFindings.length > 0 && topic.details.repoIssues.length > 0 ? ' | ' : ''}
                        ${topic.details.repoIssues.length > 0 ? 
                            `<span class="attribution-repo">Repository Issues: ${topic.details.repoIssues.length}</span>` : ''}
                    </div>

                    <h4>Resources:</h4>
                    ${topic.resources.resources.map(resource => `
                        <div class="resource-item ${resource.originalUrl ? 'replaced' : ''}">
                            <span class="resource-type type-${resource.type}">${resource.type}</span>
                            <h5>${resource.title}</h5>
                            ${resource.url ? `
                                <a href="${resource.url}" target="_blank">${resource.url}</a>
                                ${resource.originalUrl ? 
                                    `<div class="replaced-notice">✓ Auto-corrected from broken link</div>` : 
                                    ''}
                            ` : ''}
                            ${resource.code ? `
                                <div class="code-example">
                                    <pre>${escapeHtml(resource.code)}</pre>
                                </div>
                            ` : ''}
                            <p><em>${resource.relevance}</em></p>
                        </div>
                    `).join('')}

                    ${topic.resources.exercises ? `
                        <h4>Practice Exercises:</h4>
                        <ul>
                            ${topic.resources.exercises.map(exercise => 
                                `<li>${exercise}</li>`
                            ).join('')}
                        </ul>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="education-section">
            <h2>🎯 Immediate Actions</h2>
            <ol>
                ${recommendations.immediateActions.map(action => 
                    `<li>${action}</li>`
                ).join('')}
            </ol>
        </div>
    </div>
</body>
</html>`;

  return html;
}

// Helper functions remain the same
function mapFindingToEducationalTopics(finding) {
  const topicMap = {
    'Missing JSDoc documentation': ['documentation', 'codeQuality', 'jsdoc'],
    'Magic number in test': ['testingPatterns', 'codeQuality', 'constants'],
    'Missing watcher limit': ['performance', 'resourceManagement', 'scalability'],
    'Pattern not generalized': ['architectureDesign', 'designPatterns', 'reusability'],
    'Missing edge cases': ['testingPatterns', 'edgeCases', 'testCoverage'],
    'XSS vulnerability': ['securityAwareness', 'xssPrevention', 'inputValidation'],
    'Tight coupling': ['architectureDesign', 'designPatterns', 'modularity']
  };

  return topicMap[finding.issue] || ['general'];
}

function mapRepoIssueToEducationalTopics(issue) {
  const topicMap = {
    // Security
    'XSS vulnerability in SSR': ['securityAwareness', 'xssPrevention', 'ssrSecurity'],
    'Missing CSRF validation': ['securityAwareness', 'csrfProtection', 'apiSecurity'],
    // Performance
    'Unnecessary re-renders': ['performance', 'reactOptimization', 'memoization'],
    'Large bundle size': ['performance', 'bundleOptimization', 'codeElimination'],
    'Inefficient bundle splitting': ['performance', 'webpackOptimization', 'codeSplitting'],
    'Redundant file checks': ['performance', 'fileSystemOptimization'],
    // Architecture
    'Tight coupling': ['architectureDesign', 'coupling', 'solid'],
    'Duplicated router logic': ['architectureDesign', 'dry', 'abstraction'],
    'Circular dependencies': ['architectureDesign', 'dependencyManagement', 'modularity'],
    'Inconsistent error handling': ['architectureDesign', 'errorHandling', 'patterns'],
    'Missing interface segregation': ['architectureDesign', 'solid', 'interfaces'],
    'SSR/CSR state inconsistency': ['architectureDesign', 'stateManagement', 'hydration'],
    'Plugin lifecycle gaps': ['architectureDesign', 'pluginArchitecture', 'lifecycle'],
    // Code Quality
    'Complex functions': ['codeQuality', 'functionDecomposition', 'readability'],
    'Missing TypeScript types': ['codeQuality', 'typescript', 'typeAnnotations'],
    'Inconsistent naming': ['codeQuality', 'namingConventions', 'consistency'],
    'Dead code': ['codeQuality', 'codeElimination', 'maintenance'],
    'Untracked TODOs': ['codeQuality', 'technicalDebt', 'todoManagement'],
    'Poor error context': ['codeQuality', 'errorHandling', 'debugging'],
    // Dependencies
    'Outdated webpack': ['dependencies', 'versionManagement', 'security'],
    'Deprecated packages': ['dependencies', 'migration', 'maintenance']
  };

  return topicMap[issue.issue] || ['general'];
}

function getSeverityScore(severity) {
  const scores = { high: 10, medium: 5, low: 2 };
  return scores[severity] || 1;
}

function getImmediateActions(analysisResults) {
  const actions = [];
  
  // Based on PR findings
  if (analysisResults.prFindings.some(f => f.issue === 'Missing JSDoc documentation')) {
    actions.push('Add JSDoc documentation to hot-reloader.ts disposal logic');
  }
  if (analysisResults.prFindings.some(f => f.issue === 'Magic number in test')) {
    actions.push('Extract magic number 100 to RELOAD_ITERATIONS constant');
  }
  if (analysisResults.prFindings.some(f => f.issue === 'Missing watcher limit')) {
    actions.push('Implement MAX_WATCHERS constant to prevent unbounded growth');
  }
  
  // Based on security issues
  actions.push('Review and fix SEC-001 XSS vulnerability in SSR (HIGH PRIORITY)');
  actions.push('Implement CSRF token validation for API routes');
  
  return actions;
}

function identifySkillGaps(analysisResults) {
  const gaps = [];
  const skills = analysisResults.userContext.currentSkills;
  
  Object.entries(skills).forEach(([skill, level]) => {
    if (level < 70) {
      gaps.push({
        skill,
        currentLevel: level,
        targetLevel: 80,
        gap: 80 - level
      });
    }
  });
  
  return gaps.sort((a, b) => b.gap - a.gap);
}

function escapeHtml(str) {
  const div = str.replace(/[&<>"']/g, (match) => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
  return div;
}

// Run the analysis
if (require.main === module) {
  runValidatedEducationAnalysis();
}
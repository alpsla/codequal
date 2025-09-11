#!/usr/bin/env node
/**
 * E2E CodeQual Analysis with Targeted Education
 * Passes structured findings to educational agent for precise learning recommendations
 */

const chalk = require('chalk');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs').promises;

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function runTargetedEducationAnalysis() {
  console.log(chalk.bold.blue('\n🚀 Running CodeQual Analysis with Targeted Education\n'));

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
      relevantRepoIssues: [
        {
          id: 'SEC-001',
          severity: 'high',
          issue: 'XSS vulnerability in SSR',
          relevance: 'Working in server-side code',
          file: 'packages/next/server/render.tsx'
        },
        {
          id: 'ARCH-001',
          severity: 'medium',
          issue: 'Tight coupling between modules',
          relevance: 'Architectural patterns in same codebase',
          file: 'packages/next/build/index.ts'
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

    // Simulate Educational Agent processing structured input
    const educationalRecommendations = processEducationalNeeds(analysisResults);

    // Generate HTML report with targeted education
    const htmlReport = generateTargetedEducationReport(analysisResults, educationalRecommendations);

    // Save reports
    const htmlPath = path.join(__dirname, '../../test-reports', 'targeted-education-report.html');
    await fs.writeFile(htmlPath, htmlReport);

    console.log(chalk.green('✅ Analysis with Targeted Education Complete!\n'));
    console.log(chalk.yellow('📚 Educational Priorities:'));
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

function processEducationalNeeds(analysisResults) {
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

  // Sort topics by score and limit to most relevant
  const allTopics = Object.entries(topicScores)
    .sort((a, b) => b[1] - a[1])
    .map(([topic, score]) => ({
      topic,
      priority: score > 15 ? 'IMMEDIATE' : score > 10 ? 'HIGH' : score > 5 ? 'MEDIUM' : 'LOW',
      score,
      resources: getEducationalResources(topic, analysisResults),
      details: topicDetails[topic] || { prFindings: [], repoIssues: [] }
    }));

  // Filter to only topics with actual issues and good resources
  const prioritizedTopics = allTopics.filter(topic => 
    topic.resources.resources && 
    topic.resources.resources.length > 0 &&
    (topic.details.prFindings.length > 0 || topic.details.repoIssues.length > 0)
  );

  return {
    prioritizedTopics,
    immediateActions: getImmediateActions(analysisResults),
    skillGaps: identifySkillGaps(analysisResults)
  };
}

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

function getEducationalResources(topic, context) {
  // Add resolved patterns from this PR
  const resolvedPatterns = {
    memoryManagement: {
      title: 'Memory Leak Prevention Patterns',
      description: 'Learn from the memory leak fix implemented in this PR',
      resources: [
        {
          type: 'example',
          title: 'Memory Leak Fix Pattern from This PR',
          code: `// Pattern: Always dispose resources before replacing
// From PERF-005 resolution
class HotReloader {
  private watchers = new Map<string, FSWatcher>();
  
  reloadModule(path: string) {
    // IMPORTANT: Dispose existing watcher first
    const existing = this.watchers.get(path);
    if (existing) {
      existing.close();
      this.watchers.delete(path);
    }
    
    // Then create new watcher
    const watcher = fs.watch(path, () => {...});
    this.watchers.set(path, watcher);
  }
}`,
          relevance: 'This pattern fixed PERF-005 memory leak in your PR'
        }
      ]
    }
  };

  const resourceMap = {
    architectureDesign: {
      title: 'Software Architecture & Design Patterns',
      description: 'Learn to create maintainable, scalable architectures and avoid common pitfalls',
      resources: [
        {
          type: 'guide',
          title: 'SOLID Principles in TypeScript',
          url: 'https://www.typescriptlang.org/docs/handbook/solid.html',
          relevance: 'Addresses coupling issues (ARCH-001) and interface segregation (ARCH-006)'
        },
        {
          type: 'guide',
          title: 'Avoiding Circular Dependencies',
          url: 'https://medium.com/visual-development/how-to-fix-nasty-circular-dependency-issues-once-and-for-all-in-javascript-typescript-a04c987cf0de',
          relevance: 'Directly addresses ARCH-003 circular dependency issue'
        },
        {
          type: 'example',
          title: 'Generalized Resource Disposal Pattern',
          code: `// Generic disposal pattern for your PR suggestion
interface IDisposable {
  dispose(): void | Promise<void>;
}

class DisposableRegistry {
  private disposables = new Set<IDisposable>();
  
  register<T extends IDisposable>(resource: T): T {
    this.disposables.add(resource);
    return resource;
  }
  
  async disposeAll(): Promise<void> {
    const promises = Array.from(this.disposables).map(d => d.dispose());
    this.disposables.clear();
    await Promise.all(promises);
  }
}

// Usage in hot-reloader.ts
class HotReloader {
  private registry = new DisposableRegistry();
  
  createWatcher(path: string) {
    const watcher = this.registry.register(new FileWatcher(path));
    return watcher;
  }
  
  async cleanup() {
    await this.registry.disposeAll();
  }
}`
        },
        {
          type: 'critical',
          title: 'Managing Dependencies in Large Codebases',
          url: 'https://martinfowler.com/articles/micro-frontends.html#SharedNothingArchitecture',
          relevance: 'Strategies for managing dependencies in monorepo architectures'
        }
      ],
      exercises: [
        'Extract the disposal pattern from hot-reloader.ts into a reusable utility',
        'Create a dependency graph of your modules to identify circular dependencies',
        'Implement the Dependency Inversion Principle for the build/runtime coupling',
        'Refactor duplicated router logic using the Strategy pattern'
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
          type: 'example',
          title: 'Documentation Example',
          code: `/**
 * Disposes of previous module watchers to prevent memory leaks
 * during hot reload cycles.
 * 
 * @remarks
 * This method should be called before creating new watchers
 * to ensure proper cleanup of resources.
 * 
 * @performance Reduces memory usage by ~15% in development mode
 * @since v13.4.0
 * 
 * @example
 * \`\`\`typescript
 * // Before creating new watchers
 * this.disposeWatchers();
 * this.createWatchers(modules);
 * \`\`\`
 */
private disposeWatchers(): void {
  this.watchers.forEach(watcher => {
    watcher.close();
  });
  this.watchers.clear();
}`
        }
      ],
      exercises: [
        'Document the memory leak fix in hot-reloader.ts',
        'Add @performance annotations to show impact',
        'Include @example showing proper usage'
      ]
    },
    testingPatterns: {
      title: 'Advanced Testing Patterns',
      description: 'Improve test quality with constants and edge cases',
      resources: [
        {
          type: 'guide',
          title: 'Eliminating Magic Numbers in Tests',
          url: 'https://kentcdodds.com/blog/avoid-nesting-when-youre-testing',
          relevance: 'Addresses your test constant issue'
        },
        {
          type: 'example',
          title: 'Test Constants Pattern',
          code: `// test/constants.ts
export const TEST_CONSTANTS = {
  RELOAD_ITERATIONS: 100,
  MAX_MEMORY_THRESHOLD: 50 * 1024 * 1024, // 50MB
  WATCHER_TIMEOUT: 5000
} as const;

// test/hot-reload-memory.test.ts
import { TEST_CONSTANTS } from './constants';

test('memory usage stays bounded', async () => {
  for (let i = 0; i < TEST_CONSTANTS.RELOAD_ITERATIONS; i++) {
    await performReload();
  }
  expect(getMemoryUsage()).toBeLessThan(TEST_CONSTANTS.MAX_MEMORY_THRESHOLD);
});`
        }
      ],
      exercises: [
        'Extract magic number 100 to RELOAD_ITERATIONS constant',
        'Create shared test constants file',
        'Add edge case test for 10,000 modules'
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
          type: 'example',
          title: 'Safe SSR Rendering',
          code: `// Unsafe - vulnerable to XSS
const html = \`<div>\${userInput}</div>\`;

// Safe - properly escaped
import { escape } from 'lodash';
const safeHtml = \`<div>\${escape(userInput)}</div>\`;

// Better - use React's built-in protection
return <div>{userInput}</div>; // React escapes by default`
        }
      ],
      exercises: [
        'Audit render.tsx for XSS vulnerabilities',
        'Implement content security policy',
        'Add input validation layer'
      ]
    },
    performance: {
      title: 'Resource Management at Scale',
      description: 'Implementing limits and preventing unbounded growth',
      resources: [
        {
          type: 'guide',
          title: 'Node.js Resource Management Patterns',
          url: 'https://nodejs.org/en/docs/guides/simple-profiling/',
          relevance: 'For your MAX_WATCHERS implementation'
        },
        {
          type: 'example',
          title: 'Bounded Resource Pattern',
          code: `class BoundedWatcherManager {
  private readonly MAX_WATCHERS = 1000;
  private readonly watchers = new Map<string, FSWatcher>();
  
  addWatcher(path: string, watcher: FSWatcher): void {
    if (this.watchers.size >= this.MAX_WATCHERS) {
      // Remove oldest watcher (LRU pattern)
      const firstKey = this.watchers.keys().next().value;
      this.watchers.get(firstKey)?.close();
      this.watchers.delete(firstKey);
      
      console.warn(\`Watcher limit reached, removed oldest: \${firstKey}\`);
    }
    
    this.watchers.set(path, watcher);
  }
}`
        }
      ],
      exercises: [
        'Implement MAX_WATCHERS in hot-reloader.ts',
        'Add metrics for watcher count',
        'Create LRU eviction strategy'
      ]
    },
    codeQuality: {
      title: 'Code Quality & Maintainability',
      description: 'Improve code readability, maintainability, and documentation practices',
      resources: [
        {
          type: 'guide',
          title: 'Clean Code in TypeScript',
          url: 'https://github.com/labs42io/clean-code-typescript',
          relevance: 'Addresses CQ-001 complex functions, CQ-003 naming conventions'
        },
        {
          type: 'guide',
          title: 'Effective Error Handling in Node.js',
          url: 'https://www.joyent.com/node-js/production/design/errors',
          relevance: 'Improves error context (CQ-006) and debugging capabilities'
        },
        {
          type: 'example',
          title: 'Function Decomposition Pattern',
          code: `// Before: Complex function (CQ-001)
function processHotReload(modules, options, callback) {
  // 50+ lines of code...
}

// After: Decomposed functions
function processHotReload(modules, options, callback) {
  const validModules = validateModules(modules);
  const watchers = createWatchers(validModules, options);
  registerCleanupHandlers(watchers);
  notifyCompletion(callback);
}

function validateModules(modules) { /* ... */ }
function createWatchers(modules, options) { /* ... */ }
function registerCleanupHandlers(watchers) { /* ... */ }
function notifyCompletion(callback) { /* ... */ }`,
          relevance: 'Addresses CQ-001 complex function issue'
        }
      ],
      exercises: [
        'Refactor complex functions in next-babel-loader.js',
        'Add TypeScript types to utils.js (CQ-002)',
        'Standardize naming conventions across modules',
        'Implement comprehensive error context in catch blocks'
      ]
    },
    reactOptimization: {
      title: 'React Performance Optimization',
      description: 'Eliminate unnecessary re-renders and optimize React applications',
      resources: [
        {
          type: 'guide',
          title: 'React Re-render Optimization Techniques',
          url: 'https://react.dev/reference/react/memo',
          relevance: 'Directly addresses PERF-001 unnecessary re-renders'
        },
        {
          type: 'example',
          title: 'Memoization Pattern for Dev Mode',
          code: `// Prevent re-renders in development mode
const DevBuildWatcher = React.memo(({ config, onUpdate }) => {
  // Memoize expensive computations
  const watchedFiles = useMemo(() => 
    computeWatchedFiles(config), [config.id]
  );
  
  // Stable callbacks prevent child re-renders
  const handleUpdate = useCallback((changes) => {
    onUpdate(changes);
  }, [onUpdate]);
  
  return <Watcher files={watchedFiles} onChange={handleUpdate} />;
}, (prevProps, nextProps) => {
  // Custom comparison for deep equality
  return deepEqual(prevProps.config, nextProps.config);
});`,
          relevance: 'Pattern to fix PERF-001 re-render issues'
        },
        {
          type: 'guide',
          title: 'Bundle Size Optimization',
          url: 'https://web.dev/articles/reduce-javascript-payloads-with-tree-shaking',
          relevance: 'Addresses PERF-002 large bundle size'
        }
      ],
      exercises: [
        'Implement React.memo for dev-build-watcher components',
        'Add useMemo hooks for expensive computations',
        'Profile and fix re-render issues in development mode'
      ]
    },
    dependencies: {
      title: 'Dependency Management Best Practices',
      description: 'Keep dependencies updated and manage technical debt',
      resources: [
        {
          type: 'guide',
          title: 'npm Dependency Management Guide',
          url: 'https://docs.npmjs.com/cli/v8/using-npm/dependency-management',
          relevance: 'Addresses DEP-001 outdated packages'
        },
        {
          type: 'guide',
          title: 'Migrating from Deprecated Packages',
          url: 'https://nodejs.org/api/deprecations.html',
          relevance: 'Handle DEP-002 deprecated querystring'
        },
        {
          type: 'example',
          title: 'Safe Dependency Update Process',
          code: `// package.json update strategy
{
  "scripts": {
    "deps:check": "npm outdated",
    "deps:audit": "npm audit",
    "deps:update": "npm update && npm test",
    "deps:major": "npx npm-check-updates -u && npm install && npm test"
  },
  "devDependencies": {
    "npm-check-updates": "^16.0.0"
  }
}

// Migrate from deprecated querystring
// Before:
const querystring = require('querystring');
const parsed = querystring.parse(url);

// After:
const parsed = new URLSearchParams(url);`,
          relevance: 'Safe update process for DEP-001 and migration for DEP-002'
        }
      ],
      exercises: [
        'Update webpack-sources from 2.3.0 to 3.2.3',
        'Replace querystring with URLSearchParams',
        'Set up automated dependency updates',
        'Create migration plan for major updates'
      ]
    }
  };

  // Include resolved patterns if relevant
  if (topic === 'performance' && resolvedPatterns.memoryManagement) {
    return {
      ...resourceMap[topic],
      resources: [
        ...resolvedPatterns.memoryManagement.resources,
        ...(resourceMap[topic]?.resources || [])
      ]
    };
  }

  return resourceMap[topic] || {
    title: topic.charAt(0).toUpperCase() + topic.slice(1).replace(/([A-Z])/g, ' $1').trim(),
    description: 'Resources for improving ' + topic,
    resources: [],
    exercises: []
  };
}

function getImmediateActions(results) {
  const actions = [];
  
  // Based on findings severity and user skill gaps
  if (results.prFindings.some(f => f.issue.includes('documentation'))) {
    actions.push('Add JSDoc to your memory leak fix before merging');
  }
  
  if (results.prFindings.some(f => f.issue.includes('Magic number'))) {
    actions.push('Extract the magic number 100 to a named constant');
  }
  
  if (results.relevantRepoIssues.some(i => i.severity === 'high')) {
    actions.push('Review security implications of server-side code changes');
  }
  
  return actions;
}

function identifySkillGaps(results) {
  const gaps = [];
  
  Object.entries(results.userContext.currentSkills).forEach(([skill, score]) => {
    if (score < 50) {
      gaps.push({
        skill,
        currentLevel: score,
        targetLevel: 70,
        relevantFindings: results.prFindings.filter(f => 
          mapFindingToEducationalTopics(f).includes(skill)
        ).length
      });
    }
  });
  
  return gaps.sort((a, b) => b.relevantFindings - a.relevantFindings);
}

function generateTargetedEducationReport(analysisResults, educationalRecommendations) {
  const topTwoTopics = educationalRecommendations.prioritizedTopics.slice(0, 2);
  const additionalTopics = educationalRecommendations.prioritizedTopics.slice(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeQual Analysis - Targeted Education</title>
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
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 14px;
            margin: 10px 0;
        }
        .immediate-actions {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .skill-gap {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .skill-bar {
            flex: 1;
            height: 20px;
            background: #e5e7eb;
            border-radius: 10px;
            margin: 0 15px;
            position: relative;
            overflow: hidden;
        }
        .skill-fill {
            height: 100%;
            background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
            transition: width 0.5s;
        }
        .expand-button {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin: 20px 0;
            transition: background 0.2s;
        }
        .expand-button:hover {
            background: #5a67d8;
        }
        .additional-topics {
            display: none;
            margin-top: 20px;
        }
        .additional-topics.show {
            display: block;
        }
        .exercise-list {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
        }
        .exercise-list li {
            margin: 8px 0;
            position: relative;
            padding-left: 24px;
        }
        .exercise-list li:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #667eea;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Personalized Learning Recommendations</h1>
            <p>Based on your PR analysis and skill profile</p>
        </div>

        <div class="education-section">
            <h2>🎯 Immediate Actions Required</h2>
            <div class="immediate-actions">
                <strong>Before merging this PR:</strong>
                <ol>
                    ${educationalRecommendations.immediateActions.map(action => 
                        `<li>${action}</li>`
                    ).join('')}
                </ol>
            </div>
        </div>

        <div class="education-section">
            <h2>📚 Priority Learning Topics</h2>
            <p>Based on ${analysisResults.prFindings.length} findings in your PR and your skill profile, 
               we've identified the following learning priorities:</p>

            ${topTwoTopics.map((topic, index) => `
                <div class="education-card featured">
                    <div class="featured-ribbon">TOP PRIORITY</div>
                    <h3>${topic.resources.title}
                        <span class="priority-badge priority-${topic.priority.toLowerCase()}">${topic.priority}</span>
                    </h3>
                    <p><strong>Why this matters:</strong> ${topic.resources.description}</p>
                    
                    ${(topic.details.prFindings.length > 0 || topic.details.repoIssues.length > 0) ? `
                        <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
                            ${topic.details.prFindings.length > 0 ? `
                                <strong style="color: #059669;">📝 From Your PR (${topic.details.prFindings.length}):</strong>
                                <ul style="margin: 5px 0 10px 0;">
                                    ${topic.details.prFindings.map(f => 
                                        `<li>${f.message} <small>(${f.location})</small></li>`
                                    ).join('')}
                                </ul>
                            ` : ''}
                            ${topic.details.repoIssues.length > 0 ? `
                                <strong style="color: #dc2626;">🏢 From Repository (${topic.details.repoIssues.length}):</strong>
                                <ul style="margin: 5px 0;">
                                    ${topic.details.repoIssues.slice(0, 3).map(i => 
                                        `<li>[${i.id}] ${i.issue} <small>(${i.severity})</small></li>`
                                    ).join('')}
                                    ${topic.details.repoIssues.length > 3 ? 
                                        `<li><em>...and ${topic.details.repoIssues.length - 3} more</em></li>` : ''}
                                </ul>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <h4>Resources:</h4>
                    ${topic.resources.resources.map(resource => `
                        <div class="resource-item">
                            <span class="resource-type type-${resource.type}">${resource.type}</span>
                            <h5 style="margin: 5px 0;">
                                ${resource.url ? 
                                    `<a href="${resource.url}" target="_blank">${resource.title}</a>` : 
                                    resource.title}
                            </h5>
                            <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                                ${resource.relevance}
                            </p>
                            ${resource.code ? `
                                <div class="code-example">
                                    <pre><code>${resource.code}</code></pre>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                    
                    <h4>Practice Exercises:</h4>
                    <div class="exercise-list">
                        <ul style="list-style: none; padding: 0; margin: 0;">
                            ${topic.resources.exercises.map(exercise => 
                                `<li>${exercise}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            `).join('')}

            ${additionalTopics.length > 0 ? `
                <button class="expand-button" onclick="toggleAdditional()" 
                        data-show-text="Show ${Math.min(5, additionalTopics.length)} More Learning Topics">
                    Show ${Math.min(5, additionalTopics.length)} More Learning Topics
                </button>
                
                <div class="additional-topics" id="additionalTopics">
                    ${additionalTopics.slice(0, 5).map(topic => `
                        <div class="education-card">
                            <h3>${topic.resources.title}
                                <span class="priority-badge priority-${topic.priority.toLowerCase()}">${topic.priority}</span>
                            </h3>
                            <p><strong>Why this matters:</strong> ${topic.resources.description}</p>
                            
                            ${(topic.details.prFindings.length > 0 || topic.details.repoIssues.length > 0) ? `
                                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0;">
                                    ${topic.details.prFindings.length > 0 ? `
                                        <strong style="color: #059669;">📝 From Your PR (${topic.details.prFindings.length}):</strong>
                                        <ul style="margin: 5px 0 10px 0;">
                                            ${topic.details.prFindings.map(f => 
                                                `<li>${f.message} <small>(${f.location})</small></li>`
                                            ).join('')}
                                        </ul>
                                    ` : ''}
                                    ${topic.details.repoIssues.length > 0 ? `
                                        <strong style="color: #dc2626;">🏢 From Repository (${topic.details.repoIssues.length}):</strong>
                                        <ul style="margin: 5px 0;">
                                            ${topic.details.repoIssues.slice(0, 3).map(i => 
                                                `<li>[${i.id}] ${i.issue} <small>(${i.severity})</small></li>`
                                            ).join('')}
                                            ${topic.details.repoIssues.length > 3 ? 
                                                `<li><em>...and ${topic.details.repoIssues.length - 3} more</em></li>` : ''}
                                        </ul>
                                    ` : ''}
                                </div>
                            ` : ''}
                            
                            <h4>Resources:</h4>
                            ${topic.resources.resources.map(resource => `
                                <div class="resource-item">
                                    <span class="resource-type type-${resource.type}">${resource.type}</span>
                                    <h5 style="margin: 5px 0;">
                                        ${resource.url ? 
                                            `<a href="${resource.url}" target="_blank">${resource.title}</a>` : 
                                            resource.title}
                                    </h5>
                                    <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                                        ${resource.relevance}
                                    </p>
                                    ${resource.code ? `
                                        <div class="code-example">
                                            <pre><code>${resource.code}</code></pre>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                            
                            ${topic.resources.exercises && topic.resources.exercises.length > 0 ? `
                                <h4>Practice Exercises:</h4>
                                <div class="exercise-list">
                                    <ul style="list-style: none; padding: 0; margin: 0;">
                                        ${topic.resources.exercises.map(exercise => 
                                            `<li>${exercise}</li>`
                                        ).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>

        <div class="education-section">
            <h2>📊 Your Skill Development Focus</h2>
            <p>Based on this PR and historical patterns, here are your priority skill gaps:</p>
            
            ${educationalRecommendations.skillGaps.map(gap => `
                <div class="skill-gap">
                    <span style="min-width: 150px; font-weight: 600;">${gap.skill}</span>
                    <div class="skill-bar">
                        <div class="skill-fill" style="width: ${gap.currentLevel}%"></div>
                    </div>
                    <span style="min-width: 100px; text-align: right;">
                        ${gap.currentLevel}% → ${gap.targetLevel}%
                    </span>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin: 5px 0 20px 0;">
                    ${gap.relevantFindings} findings in this PR relate to this skill
                </p>
            `).join('')}
        </div>

        <div class="education-section" style="background: #f0f4ff;">
            <h2>🎓 Learning Path Summary</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                <div>
                    <h4>This Week</h4>
                    <ul>
                        <li>Complete JSDoc documentation</li>
                        <li>Extract magic numbers</li>
                        <li>Review security patterns</li>
                    </ul>
                </div>
                <div>
                    <h4>This Month</h4>
                    <ul>
                        <li>Master resource disposal patterns</li>
                        <li>Implement bounded collections</li>
                        <li>Improve test coverage strategies</li>
                    </ul>
                </div>
                <div>
                    <h4>This Quarter</h4>
                    <ul>
                        <li>Architecture pattern mastery</li>
                        <li>Security-first development</li>
                        <li>Performance optimization expertise</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script>
        function toggleAdditional() {
            const additionalTopics = document.getElementById('additionalTopics');
            const button = document.querySelector('.expand-button');
            
            if (additionalTopics.classList.contains('show')) {
                additionalTopics.classList.remove('show');
                button.textContent = button.getAttribute('data-show-text');
            } else {
                additionalTopics.classList.add('show');
                button.textContent = 'Hide Additional Topics';
            }
        }
    </script>
</body>
</html>`;
}

// Run the analysis
if (require.main === module) {
  runTargetedEducationAnalysis()
    .then((success) => {
      if (success) {
        console.log(chalk.green.bold('\n✅ Targeted education analysis completed!'));
      } else {
        console.log(chalk.red.bold('\n❌ Targeted education analysis failed!'));
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:'), error);
      process.exit(1);
    });
}

module.exports = { runTargetedEducationAnalysis };
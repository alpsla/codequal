/**
 * Static Analysis Implementations for External Tools
 * 
 * These implementations provide fallback functionality when external services
 * are unavailable. They analyze code patterns statically without requiring
 * external APIs or running services.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from '../../utils/logger';

export interface StaticAnalysisResult {
  tool: string;
  findings: any[];
  metadata?: {
    executionTime: number;
    filesAnalyzed?: number;
    errors?: string[];
  };
}

/**
 * Static Bundlephobia Analysis
 * Analyzes package.json for large dependencies without API calls
 */
export class StaticBundlephobiaAnalyzer {
  // Known large packages with approximate sizes in KB (expanded list)
  private readonly KNOWN_LARGE_PACKAGES: Record<string, number> = {
    // Date/Time libraries
    'moment': 290,
    'moment-timezone': 468,
    'date-fns': 75,
    'dayjs': 7,
    'luxon': 71,
    
    // Utility libraries
    'lodash': 71,
    'underscore': 34,
    'ramda': 308,
    'rxjs': 92,
    'immutable': 63,
    
    // HTTP/Network
    'axios': 53,
    'got': 48,
    'request': 195,
    'superagent': 48,
    'node-fetch': 12,
    
    // Logging
    'winston': 184,
    'bunyan': 61,
    'pino': 32,
    'log4js': 89,
    
    // Markdown/Text
    'marked': 36,
    'markdown-it': 137,
    'showdown': 158,
    
    // Database/ORM
    '@supabase/supabase-js': 148,
    'sequelize': 281,
    'typeorm': 451,
    'mongoose': 201,
    'prisma': 312,
    
    // UI Frameworks
    'react': 10,
    'react-dom': 121,
    'vue': 91,
    'angular': 563,
    '@angular/core': 436,
    'svelte': 19,
    
    // UI Components
    'antd': 2200,
    '@mui/material': 1800,
    'bootstrap': 152,
    'semantic-ui': 730,
    'material-ui': 329,
    
    // Data Visualization
    'd3': 240,
    'chart.js': 189,
    'highcharts': 286,
    'plotly.js': 3400,
    'three': 562,
    
    // Build Tools (dev deps)
    'webpack': 380,
    'babel-core': 290,
    '@babel/core': 145,
    'typescript': 38000,
    'electron': 52000,
    'parcel': 420,
    
    // Cloud SDKs
    'aws-sdk': 2400,
    '@aws-sdk/client-s3': 180,
    'firebase': 850,
    '@google-cloud/storage': 3100,
    
    // Large utilities
    'core-js': 89,
    'jquery': 87,
    'xlsx': 856,
    'pdfjs-dist': 2400,
    'monaco-editor': 2900,
    'graphql': 240,
    
    // Testing (dev deps)
    'jest': 3200,
    'cypress': 4500,
    'puppeteer': 2900,
    '@testing-library/react': 36,
    
    // Bundlers
    'rollup': 520,
    'esbuild': 8900,
    'vite': 760,
  };

  async analyze(targetPath: string): Promise<StaticAnalysisResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    
    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return {
          tool: 'bundlephobia-static',
          findings: [],
          metadata: {
            executionTime: Date.now() - startTime,
            filesAnalyzed: 0,
            errors: ['No package.json found']
          }
        };
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      // Analyze production dependencies for size
      let totalBundleSize = 0;
      const largeDeps: Array<{name: string; size: number}> = [];
      
      // Check all production dependencies
      for (const [pkg, version] of Object.entries(packageJson.dependencies || {})) {
        const sizeKB = this.KNOWN_LARGE_PACKAGES[pkg] || 0;
        totalBundleSize += sizeKB;
        
        if (sizeKB > 0) {
          largeDeps.push({ name: pkg, size: sizeKB });
        }
        
        // Flag individual large packages
        if (sizeKB > 150) {  // Lowered threshold to 150KB
          findings.push({
            severity: sizeKB > 500 ? 'medium' : 'low',
            title: `Significant dependency: ${pkg}`,
            description: `${pkg} adds ~${sizeKB}KB to bundle (${Math.round(sizeKB * 0.3)}KB gzipped)`,
            recommendation: sizeKB > 300 
              ? `Consider lazy loading or code splitting for ${pkg}`
              : `Ensure tree-shaking is enabled for ${pkg}`,
            file: 'package.json',
            metrics: {
              estimatedSize: sizeKB * 1024,
              gzip: Math.round(sizeKB * 0.3 * 1024)
            }
          });
        }
      }
      
      // Report total bundle size if significant
      if (totalBundleSize > 1000) {  // 1MB total
        findings.push({
          severity: totalBundleSize > 2000 ? 'high' : 'medium',
          title: 'Large total bundle size',
          description: `Total estimated size: ${totalBundleSize}KB (${Math.round(totalBundleSize * 0.3)}KB gzipped)`,
          recommendation: 'Consider code splitting, lazy loading, or removing unused dependencies',
          file: 'package.json',
          metrics: {
            totalSize: totalBundleSize * 1024,
            topPackages: largeDeps.sort((a, b) => b.size - a.size).slice(0, 5)
          }
        });
      }
      
      // Check for specific large packages in any dependencies
      for (const [pkg, version] of Object.entries(dependencies || {})) {
        const isDevDependency = packageJson.devDependencies && packageJson.devDependencies[pkg];

        // Flag packages with many dependencies
        if (pkg.includes('aws-sdk') && !pkg.includes('client-')) {
          findings.push({
            severity: 'high',
            title: 'Monolithic AWS SDK detected',
            description: 'Using aws-sdk v2 which includes all services',
            recommendation: 'Migrate to @aws-sdk v3 with specific client packages',
            file: 'package.json'
          });
        }

        // Check for duplicate functionality only once per category
        // (moved outside the loop)
      }
      
      // Check for duplicate functionality (only report once)
      const duplicates = this.checkDuplicates(packageJson.dependencies || {});
      for (const dup of duplicates) {
        findings.push({
          severity: 'low',  // Reduced from medium
          title: `Duplicate functionality: ${dup.packages.join(', ')}`,
          description: `Multiple packages providing ${dup.functionality}`,
          recommendation: `Consider consolidating to a single package`,
          file: 'package.json'
        });
      }

      return {
        tool: 'bundlephobia-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed: 1
        }
      };
    } catch (error: any) {
      return {
        tool: 'bundlephobia-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }

  private checkDuplicates(dependencies: Record<string, any>): Array<{functionality: string; packages: string[]}> {
    const duplicates = [];
    const deps = Object.keys(dependencies || {});

    // Date libraries
    const dateLibs = deps.filter(d => ['moment', 'dayjs', 'date-fns', 'luxon'].includes(d));
    if (dateLibs.length > 1) {
      duplicates.push({ functionality: 'date manipulation', packages: dateLibs });
    }

    // HTTP clients
    const httpLibs = deps.filter(d => ['axios', 'node-fetch', 'got', 'request', 'superagent'].includes(d));
    if (httpLibs.length > 1) {
      duplicates.push({ functionality: 'HTTP client', packages: httpLibs });
    }

    // Utility libraries
    const utilLibs = deps.filter(d => ['lodash', 'underscore', 'ramda'].includes(d));
    if (utilLibs.length > 1) {
      duplicates.push({ functionality: 'utility functions', packages: utilLibs });
    }

    return duplicates;
  }
}

/**
 * Static Performance Pattern Analyzer (replaces Speedscope/Clinic)
 * Detects common performance anti-patterns in code
 */
export class StaticPerformanceAnalyzer {
  async analyze(targetPath: string): Promise<StaticAnalysisResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    let filesAnalyzed = 0;

    try {
      // Find all JS/TS files
      const files = this.findFiles(targetPath, ['.js', '.ts', '.jsx', '.tsx']);
      
      for (const file of files) {
        filesAnalyzed++;
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(targetPath, file);

        // Skip test files, archives, build outputs, examples, and scripts
        if (relativePath.includes('test') || 
            relativePath.includes('spec') || 
            relativePath.includes('_archive') ||
            relativePath.includes('dist') ||
            relativePath.includes('build') ||
            relativePath.includes('.test.') ||
            relativePath.includes('.spec.') ||
            relativePath.includes('example') ||
            relativePath.includes('script') ||
            relativePath.includes('generate-') ||  // Skip report generators
            relativePath.includes('debug-') ||      // Skip debug files
            relativePath.includes('demo') ||
            relativePath.includes('mcp-tools')) {   // Skip MCP tools
          continue;
        }

        // Check for sync operations in async contexts (only in production code)
        if (/async\s+function|\.then\(|await/.test(content)) {
          const syncOps = content.match(/(?:readFileSync|writeFileSync|execSync|accessSync|statSync)/g);
          if (syncOps && syncOps.length > 2) {  // Only flag if multiple sync ops
            findings.push({
              severity: 'medium',  // Reduced from high
              title: 'Multiple synchronous operations in async context',
              description: `Found ${syncOps.length} sync operations that could block event loop`,
              file: relativePath,
              recommendation: 'Use async versions of file system operations'
            });
          }
        }

        // Check for N+1 query patterns (only obvious cases)
        const loopWithFetch = /(?:for|while|\.map|\.forEach)\s*\([^)]*\)\s*(?:=>)?\s*{[^}]*(?:await\s+)?(?:fetch|axios\.(?:get|post|put|delete))\(/;
        if (loopWithFetch.test(content)) {
          findings.push({
            severity: 'high',
            title: 'N+1 query pattern detected',
            description: 'API/Database calls inside loops detected',
            file: relativePath,
            recommendation: 'Batch queries or use DataLoader pattern'
          });
        }

        // Check for memory leaks (only if significant imbalance)
        const eventListeners = content.match(/addEventListener/g);
        const removeListeners = content.match(/removeEventListener/g);
        if (eventListeners && eventListeners.length > 5 && 
            (!removeListeners || eventListeners.length > removeListeners.length * 2)) {
          findings.push({
            severity: 'medium',
            title: 'Potential memory leak',
            description: `${eventListeners.length} listeners added, only ${removeListeners?.length || 0} removed`,
            file: relativePath,
            recommendation: 'Ensure all event listeners are properly cleaned up'
          });
        }

        // Skip minor performance issues like array chaining
        // These are too noisy and not significant

        // Only flag console.log if there are many (not just a few debug statements)
        const consoleLogs = content.match(/console\.(log|debug|info)/g);
        if (consoleLogs && consoleLogs.length > 10) {
          findings.push({
            severity: 'low',
            title: 'Excessive console logging',
            description: `Found ${consoleLogs.length} console statements`,
            file: relativePath,
            recommendation: 'Use proper logging library with log levels'
          });
        }
      }

      return {
        tool: 'performance-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed
        }
      };
    } catch (error: any) {
      return {
        tool: 'performance-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          errors: [error.message]
        }
      };
    }
  }

  private findFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    const walk = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') {
            continue;
          }
          
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };
    
    walk(dir);
    return files;
  }
}

/**
 * Static API Endpoint Analyzer (replaces Autocannon)
 * Analyzes API route complexity without load testing
 */
export class StaticEndpointAnalyzer {
  async analyze(targetPath: string): Promise<StaticAnalysisResult> {
    const startTime = Date.now();
    const findings: any[] = [];
    let filesAnalyzed = 0;

    try {
      // Look for Express/Fastify/Next.js API routes
      const routeFiles = this.findRouteFiles(targetPath);
      
      for (const file of routeFiles) {
        filesAnalyzed++;
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(targetPath, file);

        // Check for missing rate limiting
        if (/(?:router|app)\.(get|post|put|delete|patch)/.test(content)) {
          if (!content.includes('rateLimit') && !content.includes('throttle')) {
            findings.push({
              severity: 'medium',
              title: 'Missing rate limiting',
              description: 'API endpoints without rate limiting detected',
              file: relativePath,
              recommendation: 'Add rate limiting middleware to prevent abuse'
            });
          }
        }

        // Check for missing caching headers
        if (/res\.(send|json|end)/.test(content)) {
          if (!content.includes('Cache-Control') && !content.includes('cache')) {
            findings.push({
              severity: 'low',
              title: 'Missing cache headers',
              description: 'Responses without cache control headers',
              file: relativePath,
              recommendation: 'Add appropriate Cache-Control headers'
            });
          }
        }

        // Check for heavy operations in request handlers
        const complexity = this.calculateComplexity(content);
        if (complexity > 30) {  // Increased threshold from 10 to 30
          findings.push({
            severity: complexity > 50 ? 'high' : 'medium',
            title: 'Very complex request handler',
            description: `Cyclomatic complexity: ${complexity}`,
            file: relativePath,
            recommendation: 'Consider breaking down complex logic or moving to background jobs'
          });
        }

        // Check for missing input validation
        if (/req\.(body|params|query)/.test(content)) {
          if (!content.includes('validate') && !content.includes('joi') && !content.includes('zod')) {
            findings.push({
              severity: 'high',
              title: 'Missing input validation',
              description: 'Request data used without validation',
              file: relativePath,
              recommendation: 'Add input validation using Joi, Zod, or similar'
            });
          }
        }
      }

      return {
        tool: 'endpoint-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed
        }
      };
    } catch (error: any) {
      return {
        tool: 'endpoint-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed,
          errors: [error.message]
        }
      };
    }
  }

  private findRouteFiles(dir: string): string[] {
    const files: string[] = [];
    
    const walk = (currentPath: string) => {
      try {
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
          if (item.startsWith('.') || 
              item === 'node_modules' || 
              item === 'dist' || 
              item === 'build' ||
              item.includes('test') ||
              item.includes('spec') ||
              item.includes('_archive')) {
            continue;
          }
          
          const fullPath = path.join(currentPath, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Check for API route directories
            if (item === 'routes' || item === 'api' || item === 'controllers') {
              walk(fullPath);
            } else if (currentPath.includes('pages') || currentPath.includes('app')) {
              walk(fullPath);
            }
          } else if ((item.endsWith('.js') || item.endsWith('.ts')) && 
                     !item.includes('.test.') && 
                     !item.includes('.spec.')) {
            // Check if it's likely a route file
            const content = fs.readFileSync(fullPath, 'utf8');
            if (/(?:router|app|express)\.(get|post|put|delete|patch)|export\s+(?:async\s+)?function\s+(?:GET|POST|PUT|DELETE)/.test(content)) {
              files.push(fullPath);
            }
          }
        }
      } catch (error) {
        // Ignore permission errors
      }
    };
    
    walk(dir);
    return files;
  }

  private calculateComplexity(code: string): number {
    let complexity = 1;
    
    // Count decision points
    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]/g, // ternary operator
      /&&/g,
      /\|\|/g
    ];
    
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }
}

/**
 * Static Module Cost Analyzer (replaces cost-of-modules)
 * Analyzes dependency costs without npm registry calls
 */
export class StaticModuleCostAnalyzer {
  async analyze(targetPath: string): Promise<StaticAnalysisResult> {
    const startTime = Date.now();
    const findings: any[] = [];

    try {
      const packageJsonPath = path.join(targetPath, 'package.json');
      const packageLockPath = path.join(targetPath, 'package-lock.json');
      
      if (!fs.existsSync(packageJsonPath)) {
        return {
          tool: 'module-cost-static',
          findings: [],
          metadata: {
            executionTime: Date.now() - startTime,
            errors: ['No package.json found']
          }
        };
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check node_modules size if it exists
      const nodeModulesPath = path.join(targetPath, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        const size = this.getDirectorySize(nodeModulesPath);
        const sizeMB = Math.round(size / 1024 / 1024);
        
        if (sizeMB > 500) {
          findings.push({
            severity: sizeMB > 1000 ? 'high' : 'medium',
            title: 'Large node_modules directory',
            description: `Total size: ${sizeMB}MB`,
            recommendation: 'Review and remove unused dependencies',
            file: 'node_modules'
          });
        }
      }

      // Count total dependencies
      const deps = Object.keys(packageJson.dependencies || {}).length;
      const devDeps = Object.keys(packageJson.devDependencies || {}).length;
      const total = deps + devDeps;

      if (total > 100) {
        findings.push({
          severity: total > 200 ? 'high' : 'medium',
          title: 'Too many dependencies',
          description: `${deps} runtime + ${devDeps} dev dependencies`,
          recommendation: 'Audit and remove unused dependencies',
          file: 'package.json'
        });
      }

      // Check for deprecated packages
      const deprecated = this.checkDeprecated(packageJson.dependencies);
      for (const pkg of deprecated) {
        findings.push({
          severity: 'medium',
          title: `Deprecated package: ${pkg.name}`,
          description: pkg.reason,
          recommendation: pkg.alternative,
          file: 'package.json'
        });
      }

      // Check for security advisories patterns
      const insecure = this.checkInsecurePatterns(packageJson.dependencies);
      for (const issue of insecure) {
        findings.push({
          severity: 'high',
          title: `Security concern: ${issue.package}`,
          description: issue.description,
          recommendation: issue.recommendation,
          file: 'package.json'
        });
      }

      return {
        tool: 'module-cost-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          filesAnalyzed: 1
        }
      };
    } catch (error: any) {
      return {
        tool: 'module-cost-static',
        findings,
        metadata: {
          executionTime: Date.now() - startTime,
          errors: [error.message]
        }
      };
    }
  }

  private getDirectorySize(dir: string): number {
    let size = 0;
    
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          size += this.getDirectorySize(fullPath);
        } else {
          size += stat.size;
        }
      }
    } catch (error) {
      // Ignore errors
    }
    
    return size;
  }

  private checkDeprecated(dependencies: Record<string, any>): Array<{name: string; reason: string; alternative: string}> {
    const deprecated = [];
    const deps = Object.keys(dependencies || {});

    const deprecatedPackages: Record<string, {reason: string; alternative: string}> = {
      'request': {
        reason: 'Package is deprecated and no longer maintained',
        alternative: 'Use axios, node-fetch, or got instead'
      },
      'node-uuid': {
        reason: 'Package renamed',
        alternative: 'Use uuid instead'
      },
      'jade': {
        reason: 'Package renamed',
        alternative: 'Use pug instead'
      },
      'bower': {
        reason: 'Bower is deprecated',
        alternative: 'Use npm or yarn for frontend dependencies'
      },
      'tslint': {
        reason: 'TSLint is deprecated',
        alternative: 'Use ESLint with TypeScript support'
      }
    };

    for (const dep of deps) {
      if (deprecatedPackages[dep]) {
        deprecated.push({
          name: dep,
          ...deprecatedPackages[dep]
        });
      }
    }

    return deprecated;
  }

  private checkInsecurePatterns(dependencies: Record<string, any>): Array<{package: string; description: string; recommendation: string}> {
    const issues = [];
    const deps = Object.keys(dependencies || {});

    // Check for packages with known issues
    if (deps.includes('jsonwebtoken') && !deps.includes('@types/jsonwebtoken')) {
      issues.push({
        package: 'jsonwebtoken',
        description: 'JWT implementation without TypeScript types',
        recommendation: 'Add @types/jsonwebtoken for type safety'
      });
    }

    if (deps.includes('bcrypt') && !deps.includes('bcryptjs')) {
      issues.push({
        package: 'bcrypt',
        description: 'Native bcrypt can have compatibility issues',
        recommendation: 'Consider bcryptjs for better portability'
      });
    }

    if (deps.includes('crypto')) {
      issues.push({
        package: 'crypto',
        description: 'crypto is a Node.js built-in module',
        recommendation: 'Remove from dependencies, it\'s already available'
      });
    }

    return issues;
  }
}

/**
 * Master static analyzer that runs all static analysis tools
 */
export class StaticAnalysisToolRunner {
  private analyzers = {
    bundlephobia: new StaticBundlephobiaAnalyzer(),
    performance: new StaticPerformanceAnalyzer(),
    endpoint: new StaticEndpointAnalyzer(),
    moduleCost: new StaticModuleCostAnalyzer()
  };

  async runAll(targetPath: string): Promise<StaticAnalysisResult[]> {
    const results = await Promise.all([
      this.analyzers.bundlephobia.analyze(targetPath),
      this.analyzers.performance.analyze(targetPath),
      this.analyzers.endpoint.analyze(targetPath),
      this.analyzers.moduleCost.analyze(targetPath)
    ]);

    return results;
  }

  async runSpecific(tool: string, targetPath: string): Promise<StaticAnalysisResult | null> {
    switch (tool) {
      case 'bundlephobia':
        return this.analyzers.bundlephobia.analyze(targetPath);
      case 'speedscope':
      case 'clinic':
        return this.analyzers.performance.analyze(targetPath);
      case 'autocannon':
        return this.analyzers.endpoint.analyze(targetPath);
      case 'cost-of-modules':
        return this.analyzers.moduleCost.analyze(targetPath);
      default:
        return null;
    }
  }
}
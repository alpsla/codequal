/**
 * Madge Direct Adapter
 * Uses madge npm package for circular dependency detection and visual dependency graphs
 */

import { DirectToolAdapter } from './base-adapter';
import {
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface MadgeResult {
  circular: string[][];
  warnings: string[];
  tree: Record<string, string[]>;
  skipped: string[];
  graph?: string; // Optional SVG/DOT graph output
}

interface DependencyMetrics {
  totalModules: number;
  circularDependencies: number;
  orphanedModules: number;
  avgDependencies: number;
  maxDependencies: number;
  dependencyDepth: number;
}

interface FileInfo {
  path: string;
  changeType?: 'added' | 'modified' | 'deleted';
  content?: string;
}

export class MadgeDirectAdapter extends DirectToolAdapter {
  readonly id = 'madge-direct';
  readonly name = 'Madge Circular Dependency Detector';
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'circular-dependency-detection',
      category: 'architecture',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']
    },
    {
      name: 'dependency-visualization',
      category: 'architecture',
      languages: ['javascript', 'typescript'],
      fileTypes: ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 1,
    executionMode: 'on-demand',
    timeout: 45000, // Madge can take time for large codebases
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  /**
   * Get health check command
   */
  protected getHealthCheckCommand(): { cmd: string; args: string[] } {
    return { cmd: 'npx', args: ['madge', '--version'] };
  }
  
  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    // Only for architecture agent
    if (context.agentRole !== 'architecture') {
      return false;
    }
    
    // Check for JavaScript/TypeScript files
    const supportedLangs = ['javascript', 'typescript'];
    return context.repository.languages.some(lang => 
      supportedLangs.includes(lang.toLowerCase())
    );
  }
  
  /**
   * Execute madge analysis
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const findings: ToolFinding[] = [];
      
      // Analyze based on file context
      const jsFiles = context.pr.files.filter(f => 
        f.changeType !== 'deleted' &&
        this.capabilities[0].fileTypes?.some(ext => f.path.endsWith(ext))
      );
      
      if (jsFiles.length === 0) {
        return this.createEmptyResult(startTime);
      }
      
      // IMPORTANT: Madge requires full repository context to properly detect circular dependencies
      // In a PR-only context, we can only analyze the changed files for potential issues
      
      // Add informational finding about limitations
      findings.push({
        type: 'info',
        severity: 'info',
        category: 'architecture',
        message: '⚠️ Limited analysis: Circular dependency detection requires full repository access',
        ruleId: 'limited-context',
        documentation: 'Madge analyzes the module dependency graph. In PR context, only changed files are analyzed, which may miss circular dependencies involving unchanged files. Consider running full repository analysis separately.'
      });
      
      // Analyze import/export patterns in changed files
      const importAnalysis = this.analyzeImportsInChangedFiles(jsFiles);
      
      // Check for potential circular patterns
      const potentialIssues = this.detectPotentialCircularPatterns(importAnalysis);
      findings.push(...potentialIssues);
      
      // Analyze file structure and coupling
      const structureFindings = this.analyzeFileStructure(jsFiles);
      findings.push(...structureFindings);
      
      // Calculate metrics based on available data
      const metrics = {
        filesAnalyzed: jsFiles.length,
        potentialIssues: potentialIssues.length,
        importComplexity: this.calculateImportComplexity(importAnalysis),
        architectureScore: this.calculateLimitedArchitectureScore(findings)
      };
      
      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics
      };
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'MADGE_FAILED',
          message: error instanceof Error ? error.message : String(error),
          recoverable: true
        }
      };
    }
  }
  
  /**
   * Analyze imports in changed files
   */
  private analyzeImportsInChangedFiles(files: FileInfo[]): Map<string, Set<string>> {
    const imports = new Map<string, Set<string>>();
    
    files.forEach(file => {
      if (!file.content) return;
      
      const fileImports = new Set<string>();
      
      // Extract import statements
      const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
      const requireRegex = /require\s*\(['"]([^'"]+)['"]/g;
      
      let match;
      while ((match = importRegex.exec(file.content)) !== null) {
        fileImports.add(match[1]);
      }
      while ((match = requireRegex.exec(file.content)) !== null) {
        fileImports.add(match[1]);
      }
      
      imports.set(file.path, fileImports);
    });
    
    return imports;
  }
  
  /**
   * Detect potential circular patterns in changed files
   */
  private detectPotentialCircularPatterns(imports: Map<string, Set<string>>): ToolFinding[] {
    const findings: ToolFinding[] = [];
    const filePaths = Array.from(imports.keys());
    
    // Check if any changed files import each other
    filePaths.forEach(fileA => {
      const fileAImports = imports.get(fileA) || new Set();
      
      filePaths.forEach(fileB => {
        if (fileA === fileB) return;
        
        const fileBImports = imports.get(fileB) || new Set();
        
        // Check if files might import each other (simplified check)
        const aImportsB = Array.from(fileAImports).some(imp => 
          fileB.includes(imp.replace(/\.\//, '').replace(/\.\.\//, ''))
        );
        const bImportsA = Array.from(fileBImports).some(imp => 
          fileA.includes(imp.replace(/\.\//, '').replace(/\.\.\//, ''))
        );
        
        if (aImportsB && bImportsA) {
          findings.push({
            type: 'issue',
            severity: 'high',
            category: 'architecture',
            message: `🔄 Potential circular dependency between ${path.basename(fileA)} and ${path.basename(fileB)}`,
            file: fileA,
            ruleId: 'potential-circular-dependency',
            documentation: 'These files appear to import each other. This could indicate a circular dependency. Run full repository analysis to confirm.'
          });
        }
      });
    });
    
    return findings;
  }
  
  /**
   * Analyze file structure and organization
   */
  private analyzeFileStructure(files: FileInfo[]): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // Check for deeply nested files
    files.forEach(file => {
      const depth = file.path.split('/').length;
      if (depth >= 5) {
        findings.push({
          type: 'suggestion',
          severity: 'low',
          category: 'architecture',
          message: `🏗️ Deeply nested file structure (${depth} levels): ${file.path}`,
          file: file.path,
          ruleId: 'deep-nesting',
          documentation: 'Deeply nested files can indicate complex architecture. Consider flattening the structure.'
        });
      }
    });
    
    // Check for large files with many imports
    files.forEach(file => {
      if (!file.content) return;
      
      const importCount = (file.content.match(/import\s+/g) || []).length +
                         (file.content.match(/require\s*\(/g) || []).length;
      
      if (importCount > 15) {
        findings.push({
          type: 'issue',
          severity: 'medium',
          category: 'architecture',
          message: `📦 High import count (${importCount} imports) may indicate high coupling`,
          file: file.path,
          ruleId: 'high-imports',
          documentation: 'Files with many imports might be doing too much. Consider splitting responsibilities.'
        });
      }
    });
    
    return findings;
  }
  
  /**
   * Calculate import complexity score
   */
  private calculateImportComplexity(imports: Map<string, Set<string>>): number {
    let totalImports = 0;
    imports.forEach(fileImports => {
      totalImports += fileImports.size;
    });
    
    const avgImports = imports.size > 0 ? totalImports / imports.size : 0;
    return Math.round(avgImports * 10) / 10;
  }
  
  /**
   * Calculate limited architecture score
   */
  private calculateLimitedArchitectureScore(findings: ToolFinding[]): number {
    let score = 10;
    
    findings.forEach(finding => {
      if (finding.severity === 'high') score -= 1;
      if (finding.severity === 'medium') score -= 0.5;
      if (finding.severity === 'low') score -= 0.2;
    });
    
    return Math.max(0, Math.round(score * 10) / 10);
  }
  
  /**
   * Get unique directories from file list
   */
  private getUniqueDirectories(files: FileInfo[]): string[] {
    const dirs = new Set<string>();
    
    files.forEach(file => {
      // Get parent directory
      const dir = path.dirname(file.path);
      
      // Add directory and its parents up to src/lib level
      let currentDir = dir;
      while (currentDir && currentDir !== '.' && currentDir !== '/') {
        dirs.add(currentDir);
        
        // Stop at common source directories
        if (currentDir.endsWith('/src') || 
            currentDir.endsWith('/lib') ||
            currentDir === 'src' ||
            currentDir === 'lib') {
          break;
        }
        
        currentDir = path.dirname(currentDir);
      }
    });
    
    // Return sorted directories, starting with most specific
    return Array.from(dirs).sort((a, b) => b.length - a.length);
  }
  
  /**
   * Check if directory has TypeScript configuration
   */
  private async hasTypeScriptConfig(dir: string): Promise<boolean> {
    try {
      await fs.access(path.join(dir, 'tsconfig.json'));
      return true;
    } catch {
      // Check parent directories
      const parentDir = path.dirname(dir);
      if (parentDir && parentDir !== dir && parentDir !== '/') {
        try {
          await fs.access(path.join(parentDir, 'tsconfig.json'));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }
  
  /**
   * Run madge analysis on a directory
   */
  private async runMadgeAnalysis(workingDir: string, isTypeScript: boolean): Promise<MadgeResult> {
    try {
      // Build madge command
      const args = ['madge', '--json'];
      
      if (isTypeScript) {
        args.push('--ts-config', './tsconfig.json');
      }
      
      // Add entry point (current directory)
      args.push('.');
      
      // Run madge
      const { stdout, stderr } = await execAsync(`npx ${args.join(' ')}`, {
        cwd: workingDir,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      if (stderr && !stderr.includes('warning')) {
        console.warn('Madge warnings:', stderr);
      }
      
      // Parse JSON output
      const result = JSON.parse(stdout);
      
      // Run circular check separately if not included
      if (!result.circular) {
        result.circular = await this.checkCircular(workingDir, isTypeScript);
      }
      
      return result;
    } catch (error) {
      console.error('Madge analysis error:', error);
      return {
        circular: [],
        warnings: [],
        tree: {},
        skipped: []
      };
    }
  }
  
  /**
   * Check specifically for circular dependencies
   */
  private async checkCircular(workingDir: string, isTypeScript: boolean): Promise<string[][]> {
    try {
      const args = ['madge', '--circular'];
      
      if (isTypeScript) {
        args.push('--ts-config', './tsconfig.json');
      }
      
      args.push('.');
      
      const { stdout } = await execAsync(`npx ${args.join(' ')}`, {
        cwd: workingDir,
        encoding: 'utf8'
      });
      
      // Parse circular dependencies from output
      if (!stdout || stdout.trim() === '' || stdout.includes('No circular dependency found')) {
        return [];
      }
      
      // Extract circular dependency chains
      const chains: string[][] = [];
      const lines = stdout.split('\n').filter(line => line.trim());
      
      let currentChain: string[] = [];
      lines.forEach(line => {
        if (line.includes('→')) {
          // Part of a chain
          const parts = line.split('→').map(p => p.trim());
          if (currentChain.length === 0) {
            currentChain.push(...parts);
          } else {
            currentChain.push(parts[parts.length - 1]);
          }
        } else if (currentChain.length > 0) {
          // End of chain
          chains.push([...currentChain]);
          currentChain = [];
        }
      });
      
      if (currentChain.length > 0) {
        chains.push(currentChain);
      }
      
      return chains;
    } catch {
      return [];
    }
  }
  
  /**
   * Generate findings for circular dependencies
   */
  private generateCircularFindings(circularDeps: string[][], directory: string): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    circularDeps.forEach((chain, index) => {
      const severity = this.getCircularSeverity(chain.length);
      
      findings.push({
        type: 'issue',
        severity,
        category: 'architecture',
        message: `🔄 Circular dependency detected: ${chain[0]} → ... → ${chain[chain.length - 1]}`,
        file: path.join(directory, chain[0]),
        ruleId: 'circular-dependency',
        documentation: this.formatCircularDoc(chain, index + 1)
      });
    });
    
    // Add summary finding if many circular dependencies
    if (circularDeps.length > 3) {
      findings.unshift({
        type: 'issue',
        severity: 'high',
        category: 'architecture',
        message: `⚠️ ${circularDeps.length} circular dependencies detected - architectural refactoring recommended`,
        file: directory,
        ruleId: 'multiple-circular-dependencies',
        documentation: this.formatMultipleCircularDoc(circularDeps)
      });
    }
    
    return findings;
  }
  
  /**
   * Analyze architecture metrics from madge result
   */
  private analyzeArchitectureMetrics(result: MadgeResult): DependencyMetrics {
    const tree = result.tree || {};
    const modules = Object.keys(tree);
    
    // Calculate dependency counts
    const dependencyCounts = modules.map(mod => tree[mod]?.length || 0);
    const totalDependencies = dependencyCounts.reduce((sum, count) => sum + count, 0);
    
    // Find orphaned modules (no dependencies and not imported)
    const imported = new Set<string>();
    Object.values(tree).forEach(deps => {
      deps.forEach(dep => imported.add(dep));
    });
    
    const orphaned = modules.filter(mod => 
      tree[mod].length === 0 && !imported.has(mod)
    );
    
    // Calculate dependency depth (simplified)
    const maxDepth = this.calculateMaxDepth(tree);
    
    return {
      totalModules: modules.length,
      circularDependencies: result.circular?.length || 0,
      orphanedModules: orphaned.length,
      avgDependencies: modules.length > 0 ? totalDependencies / modules.length : 0,
      maxDependencies: Math.max(...dependencyCounts, 0),
      dependencyDepth: maxDepth
    };
  }
  
  /**
   * Calculate maximum dependency depth
   */
  private calculateMaxDepth(tree: Record<string, string[]>, maxIterations = 20): number {
    let maxDepth = 0;
    const visited = new Set<string>();
    
    const calculateDepth = (module: string, currentDepth: number): number => {
      if (visited.has(module) || currentDepth > maxIterations) {
        return currentDepth;
      }
      
      visited.add(module);
      const deps = tree[module] || [];
      
      if (deps.length === 0) {
        return currentDepth;
      }
      
      const childDepths = deps.map(dep => 
        calculateDepth(dep, currentDepth + 1)
      );
      
      return Math.max(...childDepths, currentDepth);
    };
    
    Object.keys(tree).forEach(module => {
      visited.clear();
      const depth = calculateDepth(module, 0);
      maxDepth = Math.max(maxDepth, depth);
    });
    
    return maxDepth;
  }
  
  /**
   * Generate findings based on architecture metrics
   */
  private generateMetricFindings(metrics: DependencyMetrics, directory: string): ToolFinding[] {
    const findings: ToolFinding[] = [];
    
    // High average dependencies (coupling)
    if (metrics.avgDependencies > 10) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'architecture',
        message: `📊 High coupling detected: average ${metrics.avgDependencies.toFixed(1)} dependencies per module`,
        file: directory,
        ruleId: 'high-coupling',
        documentation: this.formatCouplingDoc(metrics)
      });
    }
    
    // Deep dependency chains
    if (metrics.dependencyDepth > 10) {
      findings.push({
        type: 'suggestion',
        severity: 'medium',
        category: 'architecture',
        message: `🏗️ Deep dependency chains detected: maximum depth of ${metrics.dependencyDepth}`,
        file: directory,
        ruleId: 'deep-dependencies',
        documentation: this.formatDepthDoc(metrics)
      });
    }
    
    // Orphaned modules
    if (metrics.orphanedModules > 0) {
      findings.push({
        type: 'suggestion',
        severity: 'low',
        category: 'architecture',
        message: `🔍 ${metrics.orphanedModules} potentially unused modules detected`,
        file: directory,
        ruleId: 'orphaned-modules',
        documentation: 'Consider removing unused modules to reduce bundle size and complexity.'
      });
    }
    
    // God modules (too many dependencies)
    if (metrics.maxDependencies > 20) {
      findings.push({
        type: 'issue',
        severity: 'medium',
        category: 'architecture',
        message: `🎯 Module with ${metrics.maxDependencies} dependencies detected - possible god object`,
        file: directory,
        ruleId: 'god-module',
        documentation: this.formatGodModuleDoc(metrics)
      });
    }
    
    return findings;
  }
  
  /**
   * Get severity based on circular dependency chain length
   */
  private getCircularSeverity(chainLength: number): ToolFinding['severity'] {
    if (chainLength <= 2) return 'medium';
    if (chainLength <= 4) return 'high';
    return 'critical'; // Long chains are very problematic
  }
  
  /**
   * Format circular dependency documentation
   */
  private formatCircularDoc(chain: string[], index: number): string {
    let doc = `## Circular Dependency #${index}\n\n`;
    doc += '**Dependency Chain:**\n';
    
    chain.forEach((module, i) => {
      doc += `${i + 1}. ${module}`;
      if (i < chain.length - 1) {
        doc += ' →\n';
      } else {
        doc += ' → (back to 1)\n';
      }
    });
    
    doc += '\n### Why This Is a Problem:\n';
    doc += '- Makes code harder to understand and maintain\n';
    doc += '- Can cause initialization issues\n';
    doc += '- Increases coupling between modules\n';
    doc += '- Makes testing more difficult\n';
    
    doc += '\n### How to Fix:\n';
    doc += '1. **Extract shared code** to a separate module\n';
    doc += '2. **Use dependency injection** instead of direct imports\n';
    doc += '3. **Restructure** to follow a layered architecture\n';
    doc += '4. **Consider events** or callbacks for loose coupling\n';
    
    return doc;
  }
  
  /**
   * Format multiple circular dependencies documentation
   */
  private formatMultipleCircularDoc(circularDeps: string[][]): string {
    let doc = '## Multiple Circular Dependencies Detected\n\n';
    doc += `Found ${circularDeps.length} circular dependency chains.\n\n`;
    
    doc += '### Summary of Circular Dependencies:\n';
    circularDeps.forEach((chain, i) => {
      doc += `${i + 1}. ${chain[0]} ↔ ... ↔ ${chain[chain.length - 1]} (${chain.length} modules)\n`;
    });
    
    doc += '\n### Architectural Impact:\n';
    doc += '- **High Coupling**: Modules are too tightly connected\n';
    doc += '- **Maintenance Risk**: Changes ripple through multiple modules\n';
    doc += '- **Testing Complexity**: Hard to test modules in isolation\n';
    doc += '- **Build Performance**: May impact bundling and tree-shaking\n';
    
    doc += '\n### Recommended Actions:\n';
    doc += '1. **Architectural Review**: Analyze module boundaries\n';
    doc += '2. **Dependency Inversion**: Apply SOLID principles\n';
    doc += '3. **Module Restructuring**: Consider domain-driven design\n';
    doc += '4. **Gradual Refactoring**: Fix one chain at a time\n';
    
    return doc;
  }
  
  /**
   * Format coupling documentation
   */
  private formatCouplingDoc(metrics: DependencyMetrics): string {
    let doc = '## High Module Coupling Detected\n\n';
    doc += `Average dependencies per module: ${metrics.avgDependencies.toFixed(1)}\n`;
    doc += `Maximum dependencies in a single module: ${metrics.maxDependencies}\n\n`;
    
    doc += '### Implications:\n';
    doc += '- Difficult to understand module responsibilities\n';
    doc += '- Changes have wide-ranging effects\n';
    doc += '- Hard to reuse modules independently\n';
    
    doc += '\n### Recommendations:\n';
    doc += '- Apply Single Responsibility Principle\n';
    doc += '- Use facade pattern for complex subsystems\n';
    doc += '- Consider module bundling strategies\n';
    
    return doc;
  }
  
  /**
   * Format dependency depth documentation
   */
  private formatDepthDoc(metrics: DependencyMetrics): string {
    let doc = '## Deep Dependency Chains\n\n';
    doc += `Maximum dependency depth: ${metrics.dependencyDepth} levels\n\n`;
    
    doc += '### Risks:\n';
    doc += '- Complex initialization order\n';
    doc += '- Difficult debugging and tracing\n';
    doc += '- Performance impact on module loading\n';
    
    doc += '\n### Solutions:\n';
    doc += '- Flatten dependency hierarchy\n';
    doc += '- Use dependency injection containers\n';
    doc += '- Apply layered architecture patterns\n';
    
    return doc;
  }
  
  /**
   * Format god module documentation
   */
  private formatGodModuleDoc(metrics: DependencyMetrics): string {
    let doc = '## God Module Detected\n\n';
    doc += `Found module with ${metrics.maxDependencies} dependencies.\n\n`;
    
    doc += '### Problems with God Modules:\n';
    doc += '- Violates Single Responsibility Principle\n';
    doc += '- Becomes a change hotspot\n';
    doc += '- Difficult to test and maintain\n';
    doc += '- Creates tight coupling across the system\n';
    
    doc += '\n### Refactoring Strategies:\n';
    doc += '1. **Split by Responsibility**: Separate concerns into focused modules\n';
    doc += '2. **Extract Interfaces**: Define clear contracts\n';
    doc += '3. **Use Composition**: Prefer composition over inheritance\n';
    doc += '4. **Apply Patterns**: Consider Factory, Strategy, or Observer patterns\n';
    
    return doc;
  }
  
  /**
   * Calculate overall metrics
   */
  private calculateOverallMetrics(
    circularDeps: string[][],
    totalModules: number,
    findings: ToolFinding[]
  ): Record<string, unknown> {
    const architectureScore = this.calculateArchitectureScore(
      circularDeps.length,
      totalModules,
      findings
    );
    
    return {
      totalModules,
      circularDependencies: circularDeps.length,
      architectureScore,
      criticalIssues: findings.filter(f => f.severity === 'critical').length,
      highIssues: findings.filter(f => f.severity === 'high').length,
      mediumIssues: findings.filter(f => f.severity === 'medium').length,
      suggestions: findings.filter(f => f.type === 'suggestion').length
    };
  }
  
  /**
   * Calculate architecture score (0-10)
   */
  private calculateArchitectureScore(
    circularCount: number,
    totalModules: number,
    findings: ToolFinding[]
  ): number {
    if (totalModules === 0) return 10;
    
    let score = 10;
    
    // Deduct for circular dependencies
    score -= circularCount * 0.5;
    
    // Deduct for critical issues
    const critical = findings.filter(f => f.severity === 'critical').length;
    score -= critical * 1;
    
    // Deduct for high issues
    const high = findings.filter(f => f.severity === 'high').length;
    score -= high * 0.5;
    
    // Deduct for medium issues
    const medium = findings.filter(f => f.severity === 'medium').length;
    score -= medium * 0.2;
    
    return Math.max(0, Math.round(score * 10) / 10);
  }
  
  /**
   * Create empty result when no files to analyze
   */
  private createEmptyResult(startTime: number): ToolResult {
    return {
      success: true,
      toolId: this.id,
      executionTime: Date.now() - startTime,
      findings: [],
      metrics: {
        filesAnalyzed: 0,
        totalModules: 0,
        circularDependencies: 0,
        architectureScore: 10,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        suggestions: 0
      }
    };
  }
  
  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Circular dependency detection and module visualization for JavaScript/TypeScript',
      author: 'CodeQual',
      homepage: 'https://github.com/pahen/madge',
      documentationUrl: 'https://docs.codequal.com/tools/madge',
      supportedRoles: ['architecture'] as AgentRole[],
      supportedLanguages: ['javascript', 'typescript'],
      supportedFrameworks: ['node', 'react', 'vue', 'angular', 'express', 'next', 'nuxt'],
      tags: ['madge', 'circular', 'dependencies', 'architecture', 'visualization', 'coupling'],
      securityVerified: true,
      lastVerified: new Date('2025-06-11')
    };
  }
}

// Export singleton instance
export const madgeDirectAdapter = new MadgeDirectAdapter();

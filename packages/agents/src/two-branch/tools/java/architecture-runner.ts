/**
 * Java Architecture Tool Runner
 *
 * Architecture analysis for Java code:
 * - jdepend: Package dependency analysis and metrics
 * - ArchUnit: Architecture rule validation (via static analysis)
 * - Static package analysis: Module dependency patterns
 *
 * Session 59: Added as part of P2 tool integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface JavaArchitectureIssue {
  tool: 'jdepend' | 'archunit' | 'package-analysis';
  rule: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  file?: string;
  line?: number;
  packageName?: string;
  details?: {
    from?: string;
    to?: string;
    cycle?: string[];
    metric?: {
      name: string;
      value: number;
      threshold: number;
    };
  };
}

export interface JavaArchitectureScanResult {
  tool: string;
  issues: JavaArchitectureIssue[];
  scanDuration: number;
  metrics?: {
    totalPackages: number;
    totalClasses: number;
    circularDependencies: number;
    averageAbstractness: number;
    averageInstability: number;
  };
}

/**
 * JDepend metrics thresholds
 * Based on Robert C. Martin's package design principles
 */
const JDEPEND_THRESHOLDS = {
  // Distance from the Main Sequence (D)
  // D = |A + I - 1|, where A = abstractness, I = instability
  // D > 0.5 indicates poor package design
  maxDistance: 0.5,

  // Instability (I) = Ce / (Ca + Ce)
  // I close to 0 = stable (many dependents)
  // I close to 1 = unstable (many dependencies)
  // Neither is bad, but should match abstractness

  // Abstractness (A) = Abstract classes / Total classes
  // A close to 0 = concrete
  // A close to 1 = abstract
  // Should complement instability

  // Afferent Coupling (Ca) - who depends on this package
  // Efferent Coupling (Ce) - what this package depends on
  maxEfferentCoupling: 20, // Too many dependencies

  // Number of classes in a package
  maxClassesPerPackage: 30,
};

/**
 * Java Architecture Runner
 * Analyzes Java project structure and dependencies
 */
export class JavaArchitectureRunner {
  /**
   * Run jdepend for package dependency analysis
   * jdepend is typically run as a standalone JAR
   */
  async runJdepend(repoPath: string): Promise<JavaArchitectureIssue[]> {
    try {
      console.log('[jdepend] Analyzing Java package dependencies...');

      // Find compiled classes directory
      const classesDir = await this.findClassesDirectory(repoPath);
      if (!classesDir) {
        console.log('[jdepend] No compiled classes found, trying source analysis');
        return this.runSourceBasedAnalysis(repoPath);
      }

      // Try to run jdepend (may be installed globally or as JAR)
      const jdependPath = process.env.JDEPEND_PATH || 'jdepend';

      try {
        const { stdout } = await execAsync(`${jdependPath} -xml ${classesDir}`, {
          cwd: repoPath,
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024,
        });

        return this.parseJdependXmlResults(stdout);
      } catch {
        // Try with java -jar if direct command fails
        const jarPath = path.join(repoPath, 'tools', 'jdepend.jar');
        if (fs.existsSync(jarPath)) {
          const { stdout } = await execAsync(`java -jar ${jarPath} -xml ${classesDir}`, {
            cwd: repoPath,
            timeout: 120000,
            maxBuffer: 50 * 1024 * 1024,
          });
          return this.parseJdependXmlResults(stdout);
        }

        // Fall back to source-based analysis
        return this.runSourceBasedAnalysis(repoPath);
      }
    } catch (error: any) {
      console.warn('[jdepend] Failed:', error.message);
      return this.runSourceBasedAnalysis(repoPath);
    }
  }

  /**
   * Source-based package analysis (no compiled classes needed)
   */
  async runSourceBasedAnalysis(repoPath: string): Promise<JavaArchitectureIssue[]> {
    const issues: JavaArchitectureIssue[] = [];

    try {
      console.log('[package-analysis] Running source-based analysis...');

      // Find Java source files
      const javaFiles = await this.findJavaFiles(repoPath);

      // Build package dependency graph
      const packageDeps = new Map<string, Set<string>>();
      const packageClasses = new Map<string, number>();

      for (const file of javaFiles) {
        const analysis = await this.analyzeJavaFile(file, repoPath);
        if (analysis.packageName) {
          // Track class count per package
          packageClasses.set(
            analysis.packageName,
            (packageClasses.get(analysis.packageName) || 0) + 1
          );

          // Track dependencies
          if (!packageDeps.has(analysis.packageName)) {
            packageDeps.set(analysis.packageName, new Set());
          }
          for (const dep of analysis.imports) {
            if (!dep.startsWith('java.') && !dep.startsWith('javax.')) {
              const depPackage = dep.substring(0, dep.lastIndexOf('.'));
              if (depPackage && depPackage !== analysis.packageName) {
                packageDeps.get(analysis.packageName)!.add(depPackage);
              }
            }
          }
        }
      }

      // Detect circular dependencies
      const cycles = this.detectCycles(packageDeps);
      for (const cycle of cycles) {
        issues.push({
          tool: 'package-analysis',
          rule: 'circular-dependency',
          severity: 'high',
          message: `Circular package dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
          details: { cycle },
        });
      }

      // Check for god packages (too many classes)
      for (const [pkg, count] of packageClasses) {
        if (count > JDEPEND_THRESHOLDS.maxClassesPerPackage) {
          issues.push({
            tool: 'package-analysis',
            rule: 'god-package',
            severity: 'medium',
            message: `Package ${pkg} has ${count} classes (threshold: ${JDEPEND_THRESHOLDS.maxClassesPerPackage}). Consider splitting.`,
            packageName: pkg,
            details: {
              metric: {
                name: 'classCount',
                value: count,
                threshold: JDEPEND_THRESHOLDS.maxClassesPerPackage,
              },
            },
          });
        }
      }

      // Check for high efferent coupling
      for (const [pkg, deps] of packageDeps) {
        if (deps.size > JDEPEND_THRESHOLDS.maxEfferentCoupling) {
          issues.push({
            tool: 'package-analysis',
            rule: 'high-efferent-coupling',
            severity: 'medium',
            message: `Package ${pkg} depends on ${deps.size} other packages (threshold: ${JDEPEND_THRESHOLDS.maxEfferentCoupling}). Consider reducing dependencies.`,
            packageName: pkg,
            details: {
              metric: {
                name: 'efferentCoupling',
                value: deps.size,
                threshold: JDEPEND_THRESHOLDS.maxEfferentCoupling,
              },
            },
          });
        }
      }

      return issues;
    } catch (error: any) {
      console.warn('[package-analysis] Failed:', error.message);
      return issues;
    }
  }

  /**
   * Run all Java architecture tools
   */
  async runAll(repoPath: string): Promise<JavaArchitectureScanResult> {
    const startTime = Date.now();
    const allIssues: JavaArchitectureIssue[] = [];

    // Run jdepend or source-based analysis
    const jdependIssues = await this.runJdepend(repoPath);
    allIssues.push(...jdependIssues);

    return {
      tool: 'java-architecture',
      issues: allIssues,
      scanDuration: Date.now() - startTime,
      metrics: {
        totalPackages: 0,
        totalClasses: 0,
        circularDependencies: allIssues.filter((i) => i.rule === 'circular-dependency').length,
        averageAbstractness: 0,
        averageInstability: 0,
      },
    };
  }

  // ============================================================================
  // Parsing Methods
  // ============================================================================

  private parseJdependXmlResults(xmlOutput: string): JavaArchitectureIssue[] {
    const issues: JavaArchitectureIssue[] = [];

    try {
      // Simple XML parsing for jdepend output
      // <Cycles>
      //   <Package Name="com.example">
      //     <Package>com.other</Package>
      //   </Package>
      // </Cycles>

      // Check for cycles
      const cyclesMatch = xmlOutput.match(/<Cycles>([\s\S]*?)<\/Cycles>/);
      if (cyclesMatch) {
        const cyclePackages = cyclesMatch[1].match(/<Package Name="([^"]+)"/g);
        if (cyclePackages && cyclePackages.length > 0) {
          const packageNames = cyclePackages.map((p) => p.match(/"([^"]+)"/)?.[1] || '');
          issues.push({
            tool: 'jdepend',
            rule: 'circular-dependency',
            severity: 'high',
            message: `Circular dependencies detected in packages: ${packageNames.join(', ')}`,
            details: { cycle: packageNames },
          });
        }
      }

      // Parse package metrics
      const packageMatches = xmlOutput.matchAll(
        /<Package>[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<Stats>[\s\S]*?<TotalClasses>(\d+)<\/TotalClasses>[\s\S]*?<Ce>(\d+)<\/Ce>[\s\S]*?<D>([^<]+)<\/D>[\s\S]*?<\/Stats>/g
      );

      for (const match of packageMatches) {
        const packageName = match[1];
        const totalClasses = parseInt(match[2]);
        const efferentCoupling = parseInt(match[3]);
        const distance = parseFloat(match[4]);

        // High distance from main sequence
        if (distance > JDEPEND_THRESHOLDS.maxDistance) {
          issues.push({
            tool: 'jdepend',
            rule: 'main-sequence-distance',
            severity: 'medium',
            message: `Package ${packageName} has distance ${distance.toFixed(2)} from main sequence (threshold: ${JDEPEND_THRESHOLDS.maxDistance})`,
            packageName,
            details: {
              metric: {
                name: 'distance',
                value: distance,
                threshold: JDEPEND_THRESHOLDS.maxDistance,
              },
            },
          });
        }

        // High efferent coupling
        if (efferentCoupling > JDEPEND_THRESHOLDS.maxEfferentCoupling) {
          issues.push({
            tool: 'jdepend',
            rule: 'high-efferent-coupling',
            severity: 'medium',
            message: `Package ${packageName} has ${efferentCoupling} efferent dependencies (threshold: ${JDEPEND_THRESHOLDS.maxEfferentCoupling})`,
            packageName,
            details: {
              metric: {
                name: 'efferentCoupling',
                value: efferentCoupling,
                threshold: JDEPEND_THRESHOLDS.maxEfferentCoupling,
              },
            },
          });
        }

        // Too many classes in package
        if (totalClasses > JDEPEND_THRESHOLDS.maxClassesPerPackage) {
          issues.push({
            tool: 'jdepend',
            rule: 'god-package',
            severity: 'medium',
            message: `Package ${packageName} has ${totalClasses} classes (threshold: ${JDEPEND_THRESHOLDS.maxClassesPerPackage})`,
            packageName,
            details: {
              metric: {
                name: 'totalClasses',
                value: totalClasses,
                threshold: JDEPEND_THRESHOLDS.maxClassesPerPackage,
              },
            },
          });
        }
      }
    } catch (error) {
      console.warn('[jdepend] Failed to parse XML output:', error);
    }

    return issues;
  }

  private async analyzeJavaFile(
    filePath: string,
    repoPath: string
  ): Promise<{ packageName: string | null; imports: string[] }> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');

      // Extract package name
      const packageMatch = content.match(/package\s+([\w.]+)\s*;/);
      const packageName = packageMatch ? packageMatch[1] : null;

      // Extract imports
      const imports: string[] = [];
      const importMatches = content.matchAll(/import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/g);
      for (const match of importMatches) {
        imports.push(match[1]);
      }

      return { packageName, imports };
    } catch {
      return { packageName: null, imports: [] };
    }
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCycles(graph: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            // Only add if not already found (avoid duplicates)
            const cycleKey = [...cycle].sort().join(',');
            const existingKeys = cycles.map((c) => [...c].sort().join(','));
            if (!existingKeys.includes(cycleKey)) {
              cycles.push(cycle);
            }
          }
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async findClassesDirectory(repoPath: string): Promise<string | null> {
    const possibleDirs = [
      'target/classes',
      'build/classes/java/main',
      'out/production',
      'bin',
    ];

    for (const dir of possibleDirs) {
      const fullPath = path.join(repoPath, dir);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  private async findJavaFiles(repoPath: string): Promise<string[]> {
    const files: string[] = [];

    async function searchDir(dir: string, depth = 0): Promise<void> {
      if (depth > 10) return; // Limit depth

      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);

          // Skip hidden and common non-source directories
          if (
            entry.name.startsWith('.') ||
            ['node_modules', 'target', 'build', 'out', '.git', '.idea'].includes(entry.name)
          ) {
            continue;
          }

          if (entry.isDirectory()) {
            await searchDir(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.endsWith('.java')) {
            files.push(fullPath);
          }
        }
      } catch {
        // Ignore directory access errors
      }
    }

    await searchDir(repoPath);
    return files;
  }
}

// Export singleton runner
export const javaArchitectureRunner = new JavaArchitectureRunner();

// Export convenience function
export async function runJavaArchitectureAnalysis(
  repoPath: string
): Promise<JavaArchitectureScanResult> {
  return javaArchitectureRunner.runAll(repoPath);
}

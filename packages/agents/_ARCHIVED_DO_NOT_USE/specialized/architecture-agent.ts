import { AnalysisResult } from '@codequal/core';

export class ArchitectureAgent {
  private config: any;
  
  constructor(config: any) {
    this.config = config;
  }

  async analyze(context: {
    prData: any;
    deepwikiContext: any;
    toolResults: any;
    vectorContext: any;
  }): Promise<AnalysisResult> {
    const { toolResults, deepwikiContext } = context;
    
    // Process architecture analysis results
    const circularDeps = this.findCircularDependencies(toolResults);
    const orphanModules = this.findOrphanModules(toolResults);
    const layerViolations = this.findLayerViolations(toolResults, deepwikiContext);
    const complexityIssues = this.findComplexityIssues(toolResults);
    const couplingMetrics = this.analyzeCoupling(toolResults);
    
    // Combine all architectural insights
    const allInsights = [
      ...circularDeps.map(dep => ({
        type: 'circular-dependency' as const,
        severity: 'high' as const,
        message: `Circular dependency detected: ${dep.cycle.join(' → ')} → ${dep.cycle[0]}`,
        location: {
          file: dep.cycle[0],
          line: 1
        },
        tool: dep.tool || 'madge', // Tool that detected circular dependencies
        source: 'static-analysis'
      })),
      ...orphanModules.map(module => ({
        type: 'orphan-module' as const,
        severity: 'medium' as const,
        message: `Orphan module detected: ${module.path} is not imported by any other module`,
        location: {
          file: module.path,
          line: 1
        },
        tool: module.tool || 'dependency-cruiser', // Tool that detected orphan modules
        source: 'static-analysis'
      })),
      ...layerViolations.map(violation => ({
        type: 'layer-violation' as const,
        severity: 'high' as const,
        message: `Architecture layer violation: ${violation.from} should not depend on ${violation.to}`,
        location: {
          file: violation.from,
          line: violation.line || 1
        },
        tool: violation.tool || 'dependency-cruiser', // Tool that detected layer violations
        source: 'static-analysis'
      })),
      ...complexityIssues.map(issue => ({
        type: 'high-complexity' as const,
        severity: 'medium' as const,
        message: `High complexity detected in ${issue.module}: ${issue.metric} = ${issue.value}`,
        location: {
          file: issue.module,
          line: 1
        },
        tool: issue.tool || 'complexity-report', // Tool that detected complexity issues
        source: 'static-analysis'
      }))
    ];

    // Generate architecture recommendations
    const recommendations = this.generateArchitectureRecommendations(
      circularDeps,
      orphanModules,
      layerViolations,
      complexityIssues,
      couplingMetrics
    );

    return {
      insights: allInsights,
      suggestions: [
        ...circularDeps.map(dep => ({
          file: dep.cycle[0],
          line: 1,
          suggestion: `Break circular dependency by introducing an interface or moving shared code to a separate module`,
          code: `// Consider extracting shared functionality to:\n// src/shared/${this.suggestModuleName(dep.cycle)}.ts`
        })),
        ...orphanModules.map(module => ({
          file: module.path,
          line: 1,
          suggestion: module.isTest ? 
            'This appears to be a test file - ensure it has corresponding test suites' :
            'Remove this orphan module or ensure it is properly imported where needed',
          code: module.suggestion
        })),
        ...layerViolations.map(violation => ({
          file: violation.from,
          line: violation.line || 1,
          suggestion: `Refactor to respect architectural layers: ${violation.suggestion}`,
          code: violation.refactoringHint
        }))
      ],
      metadata: {
        role: 'architecture',
        circularDependencies: circularDeps.length,
        orphanModules: orphanModules.length,
        layerViolations: layerViolations.length,
        complexityScore: this.calculateComplexityScore(complexityIssues),
        couplingScore: couplingMetrics.score,
        architectureHealth: this.calculateArchitectureHealth({
          circularDeps,
          orphanModules,
          layerViolations,
          complexityIssues,
          couplingMetrics
        })
      }
    };
  }

  private findCircularDependencies(toolResults: any): any[] {
    if (!toolResults || !toolResults.circularDependencies) {
      return [];
    }
    
    return toolResults.circularDependencies.map((cycle: string[]) => ({
      cycle,
      severity: cycle.length > 3 ? 'critical' : 'high',
      impact: this.assessCircularDependencyImpact(cycle)
    }));
  }

  private findOrphanModules(toolResults: any): any[] {
    if (!toolResults || !toolResults.orphanModules) {
      return [];
    }
    
    return toolResults.orphanModules.map((module: string) => ({
      path: module,
      isTest: this.isTestFile(module),
      isConfig: this.isConfigFile(module),
      suggestion: this.suggestOrphanResolution(module)
    }));
  }

  private findLayerViolations(toolResults: any, deepwikiContext: any): any[] {
    const violations: any[] = [];
    const layers = deepwikiContext?.architecture?.layers || this.getDefaultLayers();
    
    if (toolResults?.dependencies) {
      Object.entries(toolResults.dependencies).forEach(([from, deps]: [string, any]) => {
        const fromLayer = this.identifyLayer(from, layers);
        
        deps.forEach((to: string) => {
          const toLayer = this.identifyLayer(to, layers);
          
          if (this.isLayerViolation(fromLayer, toLayer, layers)) {
            violations.push({
              from,
              to,
              fromLayer,
              toLayer,
              suggestion: this.suggestLayerFix(fromLayer, toLayer),
              refactoringHint: this.generateRefactoringHint(from, to, fromLayer, toLayer)
            });
          }
        });
      });
    }
    
    return violations;
  }

  private findComplexityIssues(toolResults: any): any[] {
    const issues: any[] = [];
    const thresholds = {
      cyclomaticComplexity: 10,
      dependencyCount: 15,
      nestingDepth: 4,
      fileLength: 300
    };
    
    if (toolResults?.complexity) {
      Object.entries(toolResults.complexity).forEach(([module, metrics]: [string, any]) => {
        Object.entries(metrics).forEach(([metric, value]) => {
          if (thresholds[metric as keyof typeof thresholds] && 
              typeof value === 'number' && value > thresholds[metric as keyof typeof thresholds]) {
            issues.push({
              module,
              metric,
              value,
              threshold: thresholds[metric as keyof typeof thresholds],
              severity: this.getComplexitySeverity(metric, value as number)
            });
          }
        });
      });
    }
    
    return issues;
  }

  private analyzeCoupling(toolResults: any): any {
    const coupling = {
      afferent: 0,  // Incoming dependencies
      efferent: 0,  // Outgoing dependencies
      instability: 0,
      abstractness: 0,
      score: 10
    };
    
    if (toolResults?.dependencies) {
      // Calculate coupling metrics
      Object.entries(toolResults.dependencies).forEach(([module, deps]: [string, any]) => {
        coupling.efferent += deps.length;
      });
      
      // Calculate afferent coupling (who depends on each module)
      const dependencyMap = new Map<string, Set<string>>();
      Object.entries(toolResults.dependencies).forEach(([from, deps]: [string, any]) => {
        deps.forEach((to: string) => {
          if (!dependencyMap.has(to)) {
            dependencyMap.set(to, new Set());
          }
          dependencyMap.get(to)!.add(from);
        });
      });
      
      dependencyMap.forEach((dependents) => {
        coupling.afferent += dependents.size;
      });
      
      // Calculate instability (I = Ce / (Ca + Ce))
      const total = coupling.afferent + coupling.efferent;
      coupling.instability = total > 0 ? coupling.efferent / total : 0;
      
      // Score based on coupling metrics
      coupling.score = Math.max(0, 10 - (coupling.instability * 5));
    }
    
    return coupling;
  }

  private generateArchitectureRecommendations(
    circularDeps: any[],
    orphanModules: any[],
    layerViolations: any[],
    complexityIssues: any[],
    couplingMetrics: any
  ): any[] {
    const recommendations = [];
    
    // Critical: Circular dependencies
    if (circularDeps.length > 0) {
      recommendations.push({
        id: 'rec-arch-001',
        priority: 'critical' as const,
        category: 'architecture',
        action: `Resolve ${circularDeps.length} circular dependencies`,
        rationale: 'Circular dependencies make code hard to understand, test, and maintain',
        effort: 'medium' as const,
        impact: 'high' as const
      });
    }
    
    // High: Layer violations
    if (layerViolations.length > 0) {
      recommendations.push({
        id: 'rec-arch-002',
        priority: 'high' as const,
        category: 'architecture',
        action: `Fix ${layerViolations.length} architectural layer violations`,
        rationale: 'Layer violations break architectural boundaries and increase coupling',
        effort: 'high' as const,
        impact: 'high' as const
      });
    }
    
    // Medium: High coupling
    if (couplingMetrics.instability > 0.7) {
      recommendations.push({
        id: 'rec-arch-003',
        priority: 'medium' as const,
        category: 'architecture',
        action: 'Reduce module coupling through interface segregation',
        rationale: 'High coupling makes the system rigid and hard to change',
        effort: 'high' as const,
        impact: 'medium' as const
      });
    }
    
    // Medium: Complexity
    if (complexityIssues.length > 5) {
      recommendations.push({
        id: 'rec-arch-004',
        priority: 'medium' as const,
        category: 'maintainability',
        action: 'Refactor complex modules to reduce cognitive load',
        rationale: 'Complex code is error-prone and hard to maintain',
        effort: 'medium' as const,
        impact: 'medium' as const
      });
    }
    
    // Low: Orphan modules
    if (orphanModules.filter(m => !m.isTest && !m.isConfig).length > 0) {
      recommendations.push({
        id: 'rec-arch-005',
        priority: 'low' as const,
        category: 'cleanup',
        action: 'Remove or integrate orphan modules',
        rationale: 'Orphan modules add unnecessary complexity',
        effort: 'low' as const,
        impact: 'low' as const
      });
    }
    
    return recommendations;
  }

  private calculateArchitectureHealth(metrics: any): number {
    let score = 10;
    
    // Deduct for circular dependencies (severe issue)
    score -= metrics.circularDeps.length * 1.5;
    
    // Deduct for layer violations
    score -= metrics.layerViolations.length * 1;
    
    // Deduct for orphan modules (less severe)
    score -= metrics.orphanModules.filter((m: any) => !m.isTest).length * 0.3;
    
    // Deduct for high coupling
    score -= (1 - metrics.couplingMetrics.score / 10) * 2;
    
    // Deduct for complexity
    score -= Math.min(metrics.complexityIssues.length * 0.2, 2);
    
    return Math.max(0, Math.round(score * 10) / 10);
  }

  private calculateComplexityScore(issues: any[]): number {
    if (issues.length === 0) return 10;
    
    const avgExcess = issues.reduce((sum, issue) => {
      const excessRatio = issue.value / issue.threshold;
      return sum + excessRatio;
    }, 0) / issues.length;
    
    return Math.max(0, 10 - (avgExcess - 1) * 5);
  }

  // Helper methods
  private isTestFile(path: string): boolean {
    return /\.(test|spec|e2e)\.(ts|js|tsx|jsx)$/.test(path) ||
           path.includes('__tests__') ||
           path.includes('test/') ||
           path.includes('tests/');
  }

  private isConfigFile(path: string): boolean {
    return /\.(config|rc)\.(ts|js|json)$/.test(path) ||
           path.includes('config/') ||
           ['webpack', 'babel', 'jest', 'eslint', 'prettier'].some(tool => 
             path.toLowerCase().includes(tool)
           );
  }

  private getDefaultLayers(): any {
    return {
      presentation: ['ui', 'views', 'components', 'pages'],
      application: ['controllers', 'services', 'use-cases'],
      domain: ['models', 'entities', 'domain'],
      infrastructure: ['repositories', 'adapters', 'db', 'api']
    };
  }

  private identifyLayer(modulePath: string, layers: any): string {
    const pathLower = modulePath.toLowerCase();
    
    for (const [layer, patterns] of Object.entries(layers)) {
      if (Array.isArray(patterns) && patterns.some((pattern: string) => pathLower.includes(pattern))) {
        return layer;
      }
    }
    
    return 'unknown';
  }

  private isLayerViolation(fromLayer: string, toLayer: string, layers: any): boolean {
    const layerOrder = ['presentation', 'application', 'domain', 'infrastructure'];
    const fromIndex = layerOrder.indexOf(fromLayer);
    const toIndex = layerOrder.indexOf(toLayer);
    
    // Lower layers should not depend on higher layers
    return fromIndex > toIndex && fromIndex !== -1 && toIndex !== -1;
  }

  private assessCircularDependencyImpact(cycle: string[]): string {
    if (cycle.length > 5) return 'severe';
    if (cycle.length > 3) return 'high';
    return 'medium';
  }

  private suggestModuleName(cycle: string[]): string {
    // Extract common parts from file paths
    const commonParts = cycle[0].split('/').filter(part => 
      cycle.every(path => path.includes(part))
    );
    
    return commonParts.length > 0 ? commonParts.join('-') : 'shared-module';
  }

  private suggestOrphanResolution(modulePath: string): string {
    if (this.isTestFile(modulePath)) {
      return '// Ensure this test file is included in your test suite';
    }
    
    if (this.isConfigFile(modulePath)) {
      return '// Config files may not need direct imports';
    }
    
    return `// Consider importing this module where needed or removing it\n// Example: import { Something } from '${modulePath}';`;
  }

  private suggestLayerFix(fromLayer: string, toLayer: string): string {
    return `Move shared functionality to ${toLayer} layer or use dependency injection`;
  }

  private generateRefactoringHint(from: string, to: string, fromLayer: string, toLayer: string): string {
    return `// Consider using an interface or abstract class\ninterface ${this.extractModuleName(to)}Interface {\n  // Define contract here\n}`;
  }

  private extractModuleName(path: string): string {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.(ts|js|tsx|jsx)$/, '')
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }

  private getComplexitySeverity(metric: string, value: number): 'high' | 'medium' | 'low' {
    const severityMap: Record<string, Record<string, number>> = {
      cyclomaticComplexity: { high: 20, medium: 10 },
      dependencyCount: { high: 25, medium: 15 },
      nestingDepth: { high: 6, medium: 4 },
      fileLength: { high: 500, medium: 300 }
    };
    
    const thresholds = severityMap[metric];
    if (!thresholds) return 'medium';
    
    if (value >= thresholds.high) return 'high';
    if (value >= thresholds.medium) return 'medium';
    return 'low';
  }
}

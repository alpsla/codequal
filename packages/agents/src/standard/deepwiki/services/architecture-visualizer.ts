/**
 * Enhanced Architecture Visualization Service
 * Generates and enhances architecture diagrams from code analysis
 */

export interface ArchitectureDiagram {
  type: 'system' | 'data-flow' | 'component' | 'deployment' | 'sequence';
  title: string;
  diagram: string;
  description?: string;
  components?: ArchitectureComponent[];
  relationships?: ComponentRelationship[];
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'cache' | 'queue' | 'external' | 'service';
  technology?: string;
  responsibilities?: string[];
  issues?: string[];
}

export interface ComponentRelationship {
  from: string;
  to: string;
  type: 'sync' | 'async' | 'event' | 'data' | 'dependency';
  protocol?: string;
  description?: string;
}

export interface ArchitectureAnalysis {
  diagrams: ArchitectureDiagram[];
  patterns: ArchitecturePattern[];
  antiPatterns: ArchitectureAntiPattern[];
  recommendations: ArchitectureRecommendation[];
  metrics: ArchitectureMetrics;
}

export interface ArchitecturePattern {
  name: string;
  type: 'design' | 'architectural' | 'integration';
  description: string;
  benefits: string[];
  locations: string[];
}

export interface ArchitectureAntiPattern {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  solution: string;
  locations: string[];
}

export interface ArchitectureRecommendation {
  category: 'scalability' | 'security' | 'performance' | 'maintainability' | 'testability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  current: string;
  recommended: string;
  reasoning: string;
  effort: 'low' | 'medium' | 'high';
}

export interface ArchitectureMetrics {
  complexity: number; // 0-100, lower is better
  coupling: number; // 0-100, lower is better
  cohesion: number; // 0-100, higher is better
  modularity: number; // 0-100, higher is better
  testability: number; // 0-100, higher is better
}

export class ArchitectureVisualizer {
  /**
   * Generate a system architecture diagram based on detected components
   */
  static generateSystemDiagram(components: ArchitectureComponent[], relationships: ComponentRelationship[]): string {
    const layers = this.organizeLayers(components);
    const diagram: string[] = [];
    
    // Add title
    diagram.push('System Architecture Overview');
    diagram.push('═'.repeat(50));
    diagram.push('');
    
    // Frontend layer
    if (layers.frontend.length > 0) {
      diagram.push(this.drawLayer('Frontend Layer', layers.frontend, 'presentation'));
    }
    
    // API/Backend layer
    if (layers.backend.length > 0) {
      if (diagram.length > 3) diagram.push(this.drawConnector('vertical'));
      diagram.push(this.drawLayer('Backend Services', layers.backend, 'business'));
    }
    
    // Data layer
    if (layers.data.length > 0) {
      if (diagram.length > 3) diagram.push(this.drawConnector('vertical'));
      diagram.push(this.drawLayer('Data Layer', layers.data, 'data'));
    }
    
    // External services
    if (layers.external.length > 0) {
      diagram.push('');
      diagram.push(this.drawLayer('External Services', layers.external, 'external'));
    }
    
    return diagram.join('\n');
  }
  
  /**
   * Generate a data flow diagram showing how data moves through the system
   */
  static generateDataFlowDiagram(components: ArchitectureComponent[], dataFlows: ComponentRelationship[]): string {
    const diagram: string[] = [];
    
    diagram.push('Data Flow Diagram');
    diagram.push('═'.repeat(50));
    diagram.push('');
    
    // Group flows by source
    const flowsBySource = new Map<string, ComponentRelationship[]>();
    dataFlows.forEach(flow => {
      if (!flowsBySource.has(flow.from)) {
        flowsBySource.set(flow.from, []);
      }
      flowsBySource.get(flow.from)!.push(flow);
    });
    
    // Draw each flow path
    flowsBySource.forEach((flows, source) => {
      const sourceComp = components.find(c => c.id === source);
      if (!sourceComp) return;
      
      diagram.push(`┌─────────────────┐`);
      diagram.push(`│ ${this.padOrTruncate(sourceComp.name, 15)} │`);
      diagram.push(`└────────┬────────┘`);
      
      flows.forEach((flow, index) => {
        const targetComp = components.find(c => c.id === flow.to);
        if (!targetComp) return;
        
        const isLast = index === flows.length - 1;
        const prefix = isLast ? '         └' : '         ├';
        const arrow = flow.type === 'async' ? '╌╌╌▶' : '────▶';
        
        diagram.push(`${prefix}${arrow} [${flow.protocol || flow.type}] ${targetComp.name}`);
      });
      
      diagram.push('');
    });
    
    return diagram.join('\n');
  }
  
  /**
   * Generate a component dependency diagram
   */
  static generateComponentDiagram(components: ArchitectureComponent[], dependencies: ComponentRelationship[]): string {
    const diagram: string[] = [];
    
    diagram.push('Component Dependencies');
    diagram.push('═'.repeat(50));
    diagram.push('');
    
    // Create dependency tree
    const roots = this.findRootComponents(components, dependencies);
    
    roots.forEach(root => {
      diagram.push(...this.drawComponentTree(root, components, dependencies, 0));
    });
    
    return diagram.join('\n');
  }
  
  /**
   * Generate a deployment architecture diagram
   */
  static generateDeploymentDiagram(deploymentInfo: any): string {
    const diagram: string[] = [];
    
    diagram.push('Deployment Architecture');
    diagram.push('═'.repeat(50));
    diagram.push('');
    
    diagram.push('┌─────────────────────────────────────────────┐');
    diagram.push('│                  Cloud Provider              │');
    diagram.push('│  ┌─────────────┐  ┌─────────────┐          │');
    diagram.push('│  │ Load        │  │    CDN      │          │');
    diagram.push('│  │ Balancer    │  │  (Static)   │          │');
    diagram.push('│  └──────┬──────┘  └─────────────┘          │');
    diagram.push('│         │                                   │');
    diagram.push('│  ┌──────▼──────────────────────┐           │');
    diagram.push('│  │   Container Orchestration    │           │');
    diagram.push('│  │  ┌────────┐  ┌────────┐     │           │');
    diagram.push('│  │  │ App    │  │ Worker │     │           │');
    diagram.push('│  │  │ Pods   │  │ Pods   │     │           │');
    diagram.push('│  │  └────────┘  └────────┘     │           │');
    diagram.push('│  └──────────────────────────────┘           │');
    diagram.push('│         │                                   │');
    diagram.push('│  ┌──────▼──────┐  ┌─────────────┐          │');
    diagram.push('│  │  Database   │  │    Cache    │          │');
    diagram.push('│  │  Cluster    │  │   Cluster   │          │');
    diagram.push('│  └─────────────┘  └─────────────┘          │');
    diagram.push('└─────────────────────────────────────────────┘');
    
    return diagram.join('\n');
  }
  
  /**
   * Enhance an existing ASCII diagram with additional details
   */
  static enhanceDiagram(originalDiagram: string, components: ArchitectureComponent[]): string {
    let enhanced = originalDiagram;
    
    // Add legend if not present
    if (!enhanced.includes('Legend:')) {
      enhanced += '\n\nLegend:\n';
      enhanced += '────▶ Synchronous call\n';
      enhanced += '╌╌╌▶ Asynchronous call\n';
      enhanced += '═══▶ Data flow\n';
      enhanced += '- - ▶ Event/Message\n';
    }
    
    // Add component details if not present
    if (components.length > 0 && !enhanced.includes('Components:')) {
      enhanced += '\n\nComponents:\n';
      components.forEach(comp => {
        enhanced += `• ${comp.name}`;
        if (comp.technology) enhanced += ` (${comp.technology})`;
        if (comp.issues && comp.issues.length > 0) {
          enhanced += ` ⚠️ ${comp.issues.length} issues`;
        }
        enhanced += '\n';
      });
    }
    
    return enhanced;
  }
  
  /**
   * Analyze architecture patterns from the codebase structure
   */
  static analyzePatterns(components: ArchitectureComponent[], relationships: ComponentRelationship[]): {
    patterns: ArchitecturePattern[];
    antiPatterns: ArchitectureAntiPattern[];
  } {
    const patterns: ArchitecturePattern[] = [];
    const antiPatterns: ArchitectureAntiPattern[] = [];
    
    // Check for common patterns
    if (this.hasLayeredArchitecture(components, relationships)) {
      patterns.push({
        name: 'Layered Architecture',
        type: 'architectural',
        description: 'Clear separation between presentation, business, and data layers',
        benefits: ['Separation of concerns', 'Maintainability', 'Testability'],
        locations: ['Frontend', 'API', 'Services', 'Database']
      });
    }
    
    if (this.hasMicroservices(components)) {
      patterns.push({
        name: 'Microservices',
        type: 'architectural',
        description: 'Services are deployed and scaled independently',
        benefits: ['Scalability', 'Technology diversity', 'Fault isolation'],
        locations: components.filter(c => c.type === 'service').map(c => c.name)
      });
    }
    
    // Check for anti-patterns
    if (this.hasCircularDependencies(relationships)) {
      antiPatterns.push({
        name: 'Circular Dependencies',
        severity: 'high',
        description: 'Components have circular references creating tight coupling',
        impact: 'Makes code hard to maintain, test, and can cause runtime issues',
        solution: 'Introduce interfaces or dependency inversion to break cycles',
        locations: this.findCircularDependencies(relationships)
      });
    }
    
    if (this.hasGodObject(components)) {
      const godObjects = components.filter(c => 
        c.responsibilities && c.responsibilities.length > 5
      );
      antiPatterns.push({
        name: 'God Object',
        severity: 'medium',
        description: 'Components with too many responsibilities',
        impact: 'Violates single responsibility principle, hard to maintain',
        solution: 'Split into smaller, focused components',
        locations: godObjects.map(c => c.name)
      });
    }
    
    return { patterns, antiPatterns };
  }
  
  /**
   * Generate architecture recommendations based on analysis
   */
  static generateRecommendations(
    components: ArchitectureComponent[],
    patterns: ArchitecturePattern[],
    antiPatterns: ArchitectureAntiPattern[]
  ): ArchitectureRecommendation[] {
    const recommendations: ArchitectureRecommendation[] = [];
    
    // Scalability recommendations
    if (!patterns.some(p => p.name === 'Caching Layer')) {
      recommendations.push({
        category: 'scalability',
        priority: 'high',
        current: 'Direct database queries for all requests',
        recommended: 'Implement caching layer (Redis/Memcached)',
        reasoning: 'Reduce database load and improve response times',
        effort: 'medium'
      });
    }
    
    // Security recommendations
    if (!components.some(c => c.name.toLowerCase().includes('auth'))) {
      recommendations.push({
        category: 'security',
        priority: 'critical',
        current: 'No dedicated authentication service detected',
        recommended: 'Implement centralized authentication/authorization service',
        reasoning: 'Centralized security reduces vulnerabilities and improves consistency',
        effort: 'high'
      });
    }
    
    // Performance recommendations
    if (components.filter(c => c.type === 'database').length > 3) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        current: 'Multiple database connections',
        recommended: 'Implement connection pooling and consider database consolidation',
        reasoning: 'Reduce connection overhead and improve resource utilization',
        effort: 'low'
      });
    }
    
    // Maintainability recommendations
    antiPatterns.forEach(ap => {
      if (ap.name === 'God Object') {
        recommendations.push({
          category: 'maintainability',
          priority: ap.severity as any,
          current: ap.description,
          recommended: ap.solution,
          reasoning: ap.impact,
          effort: 'medium'
        });
      }
    });
    
    return recommendations;
  }
  
  // Helper methods
  private static organizeLayers(components: ArchitectureComponent[]) {
    return {
      frontend: components.filter(c => c.type === 'frontend'),
      backend: components.filter(c => c.type === 'backend' || c.type === 'service'),
      data: components.filter(c => c.type === 'database' || c.type === 'cache'),
      external: components.filter(c => c.type === 'external')
    };
  }
  
  private static drawLayer(title: string, components: ArchitectureComponent[], style: string): string {
    const lines: string[] = [];
    const width = Math.max(title.length + 4, ...components.map(c => c.name.length + 4), 20);
    
    lines.push('┌' + '─'.repeat(width) + '┐');
    lines.push('│ ' + this.padOrTruncate(title, width - 2) + ' │');
    lines.push('├' + '─'.repeat(width) + '┤');
    
    components.forEach(comp => {
      let compStr = comp.name;
      if (comp.technology) compStr += ` (${comp.technology})`;
      if (comp.issues && comp.issues.length > 0) compStr += ' ⚠️';
      lines.push('│ ' + this.padOrTruncate(compStr, width - 2) + ' │');
    });
    
    lines.push('└' + '─'.repeat(width) + '┘');
    return lines.join('\n');
  }
  
  private static drawConnector(type: 'vertical' | 'horizontal'): string {
    if (type === 'vertical') {
      return '         │\n         ▼';
    }
    return '────▶';
  }
  
  private static padOrTruncate(str: string, length: number): string {
    if (str.length > length) {
      return str.substring(0, length - 3) + '...';
    }
    return str.padEnd(length);
  }
  
  private static findRootComponents(
    components: ArchitectureComponent[],
    dependencies: ComponentRelationship[]
  ): ArchitectureComponent[] {
    const hasIncoming = new Set(dependencies.map(d => d.to));
    return components.filter(c => !hasIncoming.has(c.id));
  }
  
  private static drawComponentTree(
    component: ArchitectureComponent,
    allComponents: ArchitectureComponent[],
    dependencies: ComponentRelationship[],
    level: number
  ): string[] {
    const lines: string[] = [];
    const indent = '  '.repeat(level);
    const prefix = level === 0 ? '' : '├─ ';
    
    lines.push(`${indent}${prefix}${component.name}`);
    
    const childDeps = dependencies.filter(d => d.from === component.id);
    childDeps.forEach(dep => {
      const child = allComponents.find(c => c.id === dep.to);
      if (child) {
        lines.push(...this.drawComponentTree(child, allComponents, dependencies, level + 1));
      }
    });
    
    return lines;
  }
  
  private static hasLayeredArchitecture(
    components: ArchitectureComponent[],
    relationships: ComponentRelationship[]
  ): boolean {
    const hasFrontend = components.some(c => c.type === 'frontend');
    const hasBackend = components.some(c => c.type === 'backend' || c.type === 'service');
    const hasData = components.some(c => c.type === 'database');
    return hasFrontend && hasBackend && hasData;
  }
  
  private static hasMicroservices(components: ArchitectureComponent[]): boolean {
    return components.filter(c => c.type === 'service').length >= 3;
  }
  
  private static hasCircularDependencies(relationships: ComponentRelationship[]): boolean {
    // Simple check - for production, use proper graph cycle detection
    const deps = new Map<string, Set<string>>();
    relationships.forEach(r => {
      if (!deps.has(r.from)) deps.set(r.from, new Set());
      deps.get(r.from)!.add(r.to);
    });
    
    // Check for simple cycles (A -> B -> A)
    for (const [from, tos] of deps.entries()) {
      for (const to of tos) {
        if (deps.has(to) && deps.get(to)!.has(from)) {
          return true;
        }
      }
    }
    return false;
  }
  
  private static findCircularDependencies(relationships: ComponentRelationship[]): string[] {
    const cycles: string[] = [];
    const deps = new Map<string, Set<string>>();
    
    relationships.forEach(r => {
      if (!deps.has(r.from)) deps.set(r.from, new Set());
      deps.get(r.from)!.add(r.to);
    });
    
    for (const [from, tos] of deps.entries()) {
      for (const to of tos) {
        if (deps.has(to) && deps.get(to)!.has(from)) {
          cycles.push(`${from} <-> ${to}`);
        }
      }
    }
    
    return [...new Set(cycles)];
  }
  
  private static hasGodObject(components: ArchitectureComponent[]): boolean {
    return components.some(c => c.responsibilities && c.responsibilities.length > 5);
  }
  
  /**
   * Calculate architecture metrics
   */
  static calculateMetrics(
    components: ArchitectureComponent[],
    relationships: ComponentRelationship[]
  ): ArchitectureMetrics {
    const totalComponents = components.length;
    const totalRelationships = relationships.length;
    
    // Complexity: based on number of relationships per component
    const avgRelationships = totalComponents > 0 ? totalRelationships / totalComponents : 0;
    const complexity = Math.min(100, avgRelationships * 10);
    
    // Coupling: based on inter-layer dependencies
    const crossLayerDeps = relationships.filter(r => {
      const from = components.find(c => c.id === r.from);
      const to = components.find(c => c.id === r.to);
      return from && to && from.type !== to.type;
    }).length;
    const coupling = Math.min(100, (crossLayerDeps / Math.max(1, totalRelationships)) * 100);
    
    // Cohesion: based on intra-component relationships
    const cohesion = 100 - coupling; // Simplified - inverse of coupling
    
    // Modularity: based on component independence
    const independentComponents = components.filter(c => {
      const hasNoDeps = !relationships.some(r => r.to === c.id);
      const hasMinimalDeps = relationships.filter(r => r.from === c.id).length <= 2;
      return hasNoDeps || hasMinimalDeps;
    }).length;
    const modularity = (independentComponents / Math.max(1, totalComponents)) * 100;
    
    // Testability: based on coupling and modularity
    const testability = (modularity + (100 - coupling)) / 2;
    
    return {
      complexity: Math.round(complexity),
      coupling: Math.round(coupling),
      cohesion: Math.round(cohesion),
      modularity: Math.round(modularity),
      testability: Math.round(testability)
    };
  }
}
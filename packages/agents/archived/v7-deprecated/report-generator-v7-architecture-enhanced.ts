/**
 * Enhanced Architecture Section for Report Generator V7
 * 
 * Integrates actual architecture visualization from DeepWiki analysis.
 * Fixes BUG-029: Architecture V7 Template Not Displaying Enhanced Content
 */

import { Issue } from '../types/analysis-types';

export interface ArchitectureData {
  diagram?: string;
  patterns?: string[];
  antiPatterns?: string[];
  recommendations?: string[];
  components?: Array<{
    name: string;
    type: string;
    responsibility?: string;
    dependencies?: string[];
  }>;
  relationships?: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  metrics?: {
    componentCount?: number;
    relationshipCount?: number;
    couplingScore?: number;
    cohesionScore?: number;
  };
}

export class ArchitectureSectionGenerator {
  
  /**
   * Generate enhanced architecture analysis section with actual visualization
   */
  async generateArchitectureAnalysis(
    newIssues: Issue[],
    architectureData?: ArchitectureData,
    featureBranchResult?: any
  ): Promise<string> {
    const archIssues = newIssues.filter(i => 
      i.category === 'architecture' || (i.category as any) === 'design'
    );
    
    // Calculate score based on issues and patterns
    let score = 100;
    
    // Deduct for architecture issues
    score -= archIssues.filter(i => i.severity === 'critical').length * 15;
    score -= archIssues.filter(i => i.severity === 'high').length * 10;
    score -= archIssues.filter(i => i.severity === 'medium').length * 5;
    score -= archIssues.filter(i => i.severity === 'low').length * 2;
    
    // Deduct for anti-patterns
    if (architectureData?.antiPatterns) {
      score -= architectureData.antiPatterns.length * 8;
    }
    
    // Add points for good patterns
    if (architectureData?.patterns) {
      score += Math.min(15, architectureData.patterns.length * 3);
    }
    
    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));
    const grade = this.getGrade(score);
    
    let section = `## 4. Architecture Analysis

### Score: ${score}/100 (Grade: ${grade})

**Score Breakdown:**
- Design Patterns: ${this.calculatePatternScore(architectureData)}/100
- Modularity: ${this.calculateModularityScore(architectureData)}/100
- Scalability: ${this.calculateScalabilityScore(architectureData, archIssues)}/100
- Coupling & Cohesion: ${this.calculateCouplingScore(architectureData)}/100

`;

    // Add architecture diagram - use actual or fallback
    section += `### Architecture Overview

`;
    
    if (architectureData?.diagram && architectureData.diagram.trim()) {
      // Use actual diagram from DeepWiki/Architecture Visualizer
      section += '```\n';
      section += architectureData.diagram;
      section += '\n```\n\n';
    } else if (architectureData?.components && architectureData.components.length > 0) {
      // Generate diagram from components
      section += this.generateDiagramFromComponents(architectureData.components, architectureData.relationships);
    } else {
      // Use intelligent fallback based on detected technology
      section += this.generateFallbackDiagram(featureBranchResult);
    }

    // Add component details if available
    if (architectureData?.components && architectureData.components.length > 0) {
      section += `### Components (${architectureData.components.length} detected)

| Component | Type | Responsibility | Dependencies |
|-----------|------|----------------|--------------|
`;
      
      architectureData.components.forEach(comp => {
        const deps = comp.dependencies?.join(', ') || 'None';
        section += `| ${comp.name} | ${comp.type} | ${comp.responsibility || 'N/A'} | ${deps} |\n`;
      });
      
      section += '\n';
    }

    // Add patterns if available
    if (architectureData?.patterns && architectureData.patterns.length > 0) {
      section += `### Design Patterns Detected

`;
      architectureData.patterns.forEach(pattern => {
        section += `- ✅ **${pattern}**: Well-implemented design pattern\n`;
      });
      section += '\n';
    }

    // Add anti-patterns if detected
    if (architectureData?.antiPatterns && architectureData.antiPatterns.length > 0) {
      section += `### Anti-Patterns Detected

`;
      architectureData.antiPatterns.forEach(antiPattern => {
        section += `- ⚠️ **${antiPattern}**: Consider refactoring to improve design\n`;
      });
      section += '\n';
    }

    // Add architectural findings
    section += `### Architectural Findings

`;

    if (archIssues.length === 0 && (!architectureData?.antiPatterns || architectureData.antiPatterns.length === 0)) {
      section += '✅ Architecture maintains good separation of concerns\n';
      section += '✅ No architectural anti-patterns detected\n';
      section += '✅ Good modularity and scalability patterns\n';
      
      if (architectureData?.patterns && architectureData.patterns.length > 0) {
        section += `✅ ${architectureData.patterns.length} positive design patterns implemented\n`;
      }
    } else {
      if (archIssues.length > 0) {
        section += `⚠️ ${archIssues.length} architectural concerns found:\n\n`;
        
        archIssues.forEach((issue, idx) => {
          section += `${idx + 1}. **${this.getIssueMessage(issue)}**\n`;
          section += `   - File: ${issue.location?.file || 'unknown'}\n`;
          section += `   - Severity: ${issue.severity}\n`;
          section += `   - Recommendation: ${issue.remediation || 'Review and refactor'}\n\n`;
        });
      }
      
      if (architectureData?.antiPatterns && architectureData.antiPatterns.length > 0) {
        section += `\n⚠️ ${architectureData.antiPatterns.length} anti-patterns require attention\n`;
      }
    }

    // Add recommendations if available
    if (architectureData?.recommendations && architectureData.recommendations.length > 0) {
      section += `\n### Architectural Recommendations

`;
      architectureData.recommendations.forEach((rec, idx) => {
        section += `${idx + 1}. ${rec}\n`;
      });
      section += '\n';
    }

    // Add metrics if available
    if (architectureData?.metrics) {
      section += `### Architecture Metrics

- **Components**: ${architectureData.metrics.componentCount || 'N/A'}
- **Relationships**: ${architectureData.metrics.relationshipCount || 'N/A'}
- **Coupling Score**: ${architectureData.metrics.couplingScore || 'N/A'}/100 (lower is better)
- **Cohesion Score**: ${architectureData.metrics.cohesionScore || 'N/A'}/100 (higher is better)

`;
    }

    return section;
  }

  /**
   * Generate diagram from detected components
   */
  private generateDiagramFromComponents(
    components: any[],
    relationships?: any[]
  ): string {
    let diagram = '```\n';
    
    // Group components by type
    const layers: Record<string, any[]> = {};
    components.forEach(comp => {
      const type = comp.type || 'module';
      if (!layers[type]) layers[type] = [];
      layers[type].push(comp);
    });
    
    // Generate layer-based diagram
    const layerOrder = ['frontend', 'api', 'service', 'business', 'data', 'database', 'module'];
    
    layerOrder.forEach(layerType => {
      if (layers[layerType] && layers[layerType].length > 0) {
        diagram += `┌${'─'.repeat(50)}┐\n`;
        diagram += `│  ${layerType.toUpperCase()} LAYER${' '.repeat(50 - layerType.length - 11)}│\n`;
        diagram += `│  `;
        
        layers[layerType].forEach((comp, idx) => {
          if (idx > 0 && idx % 3 === 0) {
            diagram += `│\n│  `;
          }
          diagram += `[${comp.name}] `;
        });
        
        diagram += `${' '.repeat(48 - (layers[layerType].join(' ').length % 48))}│\n`;
        diagram += `└${'─'.repeat(50)}┘\n`;
        
        // Add arrow to next layer
        if (layerOrder.indexOf(layerType) < layerOrder.length - 1) {
          diagram += `${' '.repeat(25)}│\n`;
          diagram += `${' '.repeat(25)}▼\n`;
        }
      }
    });
    
    // Add relationships if available
    if (relationships && relationships.length > 0) {
      diagram += '\n\nRelationships:\n';
      relationships.slice(0, 10).forEach(rel => {
        diagram += `  ${rel.from} → ${rel.to} (${rel.type})\n`;
      });
      
      if (relationships.length > 10) {
        diagram += `  ... and ${relationships.length - 10} more relationships\n`;
      }
    }
    
    diagram += '```\n\n';
    return diagram;
  }

  /**
   * Generate intelligent fallback diagram based on technology stack
   */
  private generateFallbackDiagram(featureBranchResult?: any): string {
    // Detect technology stack from files or metadata
    const hasReact = featureBranchResult?.files?.some((f: string) => 
      f.includes('.tsx') || f.includes('.jsx') || f.includes('React')
    );
    const hasNode = featureBranchResult?.files?.some((f: string) => 
      f.includes('package.json') || f.includes('.js') || f.includes('node')
    );
    const hasDatabase = featureBranchResult?.files?.some((f: string) => 
      f.includes('database') || f.includes('model') || f.includes('schema')
    );
    
    let diagram = '```\n';
    
    if (hasReact) {
      // React-based architecture
      diagram += `┌─────────────────────────────────────────┐
│           Frontend (React)              │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   UI     │  │  Redux/  │  │  API   ││
│  │Components│  │  Context │  │ Client ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
                    │
`;
    } else {
      // Generic frontend
      diagram += `┌─────────────────────────────────────────┐
│           Presentation Layer            │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   Views  │  │Controllers│  │ Routes ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
                    │
`;
    }
    
    if (hasNode) {
      diagram += `┌─────────────────────────────────────────┐
│         Application Layer (Node.js)     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   API    │  │  Services │  │  Auth  ││
│  │ Endpoints│  │   Logic   │  │ & Auth ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
`;
    } else {
      diagram += `┌─────────────────────────────────────────┐
│           Business Logic Layer          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Services │  │  Domain   │  │  Utils ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
`;
    }
    
    if (hasDatabase) {
      diagram += `                    │
┌─────────────────────────────────────────┐
│           Data Access Layer             │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │   ORM/   │  │Repository│  │ Cache  ││
│  │   Models │  │ Pattern  │  │ Layer  ││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│           Storage Layer                 │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Database │  │  Redis   │  │  File  ││
│  │   SQL    │  │  Cache   │  │ Storage││
│  └──────────┘  └──────────┘  └────────┘│
└─────────────────────────────────────────┘`;
    }
    
    diagram += '\n```\n\n';
    return diagram;
  }

  /**
   * Calculate pattern score
   */
  private calculatePatternScore(architectureData?: ArchitectureData): number {
    if (!architectureData) return 70;
    
    let score = 70;
    
    // Add points for good patterns
    if (architectureData.patterns) {
      score += Math.min(25, architectureData.patterns.length * 5);
    }
    
    // Deduct for anti-patterns
    if (architectureData.antiPatterns) {
      score -= architectureData.antiPatterns.length * 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate modularity score
   */
  private calculateModularityScore(architectureData?: ArchitectureData): number {
    if (!architectureData) return 75;
    
    let score = 75;
    
    // Good modularity if components are well-defined
    if (architectureData.components) {
      const componentCount = architectureData.components.length;
      if (componentCount >= 3 && componentCount <= 20) {
        score += 15;
      } else if (componentCount > 20) {
        score -= 10; // Too many components might indicate over-engineering
      }
      
      // Check for clear responsibilities
      const withResponsibilities = architectureData.components.filter(c => c.responsibility).length;
      score += Math.min(10, (withResponsibilities / componentCount) * 10);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate scalability score
   */
  private calculateScalabilityScore(architectureData?: ArchitectureData, issues?: Issue[]): number {
    let score = 80;
    
    // Check for scalability patterns
    if (architectureData?.patterns) {
      const scalabilityPatterns = ['microservices', 'event-driven', 'cqrs', 'saga', 'cache', 'queue'];
      const hasScalabilityPatterns = architectureData.patterns.some(p => 
        scalabilityPatterns.some(sp => p.toLowerCase().includes(sp))
      );
      if (hasScalabilityPatterns) score += 10;
    }
    
    // Check for scalability anti-patterns
    if (architectureData?.antiPatterns) {
      const scalabilityAntiPatterns = ['monolith', 'tight-coupling', 'god-object', 'singleton'];
      const hasAntiPatterns = architectureData.antiPatterns.some(p => 
        scalabilityAntiPatterns.some(ap => p.toLowerCase().includes(ap))
      );
      if (hasAntiPatterns) score -= 15;
    }
    
    // Deduct for scalability issues
    if (issues) {
      const scalabilityIssues = issues.filter(i => 
        i.description?.toLowerCase().includes('scalab') ||
        i.description?.toLowerCase().includes('performance') ||
        i.description?.toLowerCase().includes('bottleneck')
      );
      score -= scalabilityIssues.length * 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate coupling and cohesion score
   */
  private calculateCouplingScore(architectureData?: ArchitectureData): number {
    if (!architectureData) return 70;
    
    let score = 70;
    
    // Use provided metrics if available
    if (architectureData.metrics) {
      if (architectureData.metrics.couplingScore !== undefined) {
        // Lower coupling is better, so invert the score
        score = 100 - architectureData.metrics.couplingScore;
      }
      if (architectureData.metrics.cohesionScore !== undefined) {
        // Higher cohesion is better
        score = (score + architectureData.metrics.cohesionScore) / 2;
      }
    }
    
    // Analyze relationships for coupling
    if (architectureData.relationships && architectureData.components) {
      const relationshipRatio = architectureData.relationships.length / architectureData.components.length;
      if (relationshipRatio > 3) {
        // Too many relationships indicate high coupling
        score -= 15;
      } else if (relationshipRatio < 1.5) {
        // Good level of decoupling
        score += 10;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get grade from score
   */
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get issue message
   */
  private getIssueMessage(issue: Issue): string {
    return issue.title || issue.description || 'Architecture issue detected';
  }
}

export default ArchitectureSectionGenerator;
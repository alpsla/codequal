/**
 * Mermaid Diagram MCP Adapter
 * Generates dependency graphs, architecture diagrams, and learning path flowcharts
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  Tool,
  ToolResult,
  ToolFinding,
  AnalysisContext,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

export interface MermaidDiagramConfig {
  type: 'flowchart' | 'graph' | 'sequence' | 'class' | 'state' | 'journey' | 'gantt' | 'gitgraph';
  direction?: 'TD' | 'LR' | 'RL' | 'BT'; // Top-Down, Left-Right, Right-Left, Bottom-Top
  theme: 'default' | 'dark' | 'forest' | 'neutral';
  title: string;
  description?: string;
}

export interface DiagramElement {
  id: string;
  label: string;
  type: 'node' | 'edge' | 'subgraph';
  properties?: Record<string, unknown>;
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    color?: string;
    fontSize?: number;
  };
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    label: string;
    type: 'file' | 'package' | 'module' | 'class' | 'function';
    metadata: {
      path?: string;
      language?: string;
      size?: number;
      complexity?: number;
      dependencies?: string[];
    };
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'imports' | 'extends' | 'implements' | 'calls' | 'depends';
    weight?: number;
  }>;
  clusters?: Array<{
    id: string;
    label: string;
    nodes: string[];
  }>;
}

export interface LearningPath {
  title: string;
  description: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    prerequisites?: string[];
    resources?: string[];
  }>;
  milestones?: Array<{
    id: string;
    title: string;
    criteria: string[];
  }>;
}

export interface MermaidGenerationResult {
  mermaidCode: string;
  svgContent?: string;
  pngBuffer?: Buffer;
  diagramType: string;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    generatedAt: Date;
    complexity: 'low' | 'medium' | 'high';
  };
}

export class MermaidMCPAdapter implements Tool {
  readonly id = 'mermaid-mcp';
  readonly name = 'Mermaid Diagram Generator';
  readonly type = 'mcp' as const;
  readonly version = '1.0.0';
  
  readonly capabilities: ToolCapability[] = [
    {
      name: 'dependency-graph',
      category: 'documentation',
      languages: ['javascript', 'typescript', 'python', 'java', 'csharp'],
      fileTypes: ['js', 'ts', 'py', 'java', 'cs']
    },
    {
      name: 'architecture-diagram',
      category: 'documentation',
      languages: [],
      fileTypes: []
    },
    {
      name: 'learning-path',
      category: 'documentation', // Changed from 'educational' to valid category
      languages: [],
      fileTypes: []
    },
    {
      name: 'flowchart-generation',
      category: 'documentation',
      languages: [],
      fileTypes: []
    }
  ];
  
  readonly requirements: ToolRequirements = {
    minFiles: 0, // Can work with metadata
    executionMode: 'on-demand',
    timeout: 25000, // 25 seconds
    authentication: {
      type: 'none',
      required: false
    }
  };
  
  readonly applicableRoles: AgentRole[] = ['reporting', 'educational', 'architecture'];
  readonly description = 'Generates Mermaid diagrams for dependency visualization, architecture documentation, and learning path flowcharts';

  /**
   * Check if tool can analyze given context
   */
  canAnalyze(context: AnalysisContext): boolean {
    return true; // Can work with any context
  }

  /**
   * Execute analysis (main method)
   */
  async analyze(context: AnalysisContext): Promise<ToolResult> {
    return this.execute(context);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  async execute(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const diagramType = this.determineDiagramType(context);
      const config = this.getDefaultConfig(diagramType, context);
      
      let result: MermaidGenerationResult;
      
      switch (diagramType) {
        case 'dependency-graph':
          result = await this.generateDependencyGraph(context, config);
          break;
        case 'architecture-diagram':
          result = await this.generateArchitectureDiagram(context, config);
          break;
        case 'learning-path':
          result = await this.generateLearningPath(context, config);
          break;
        case 'findings-flow':
          result = await this.generateFindingsFlowchart(context, config);
          break;
        default:
          result = await this.generateGenericFlowchart(context, config);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        toolId: this.id,
        executionTime,
        findings: [],
        metrics: {
          nodeCount: result.metadata.nodeCount,
          edgeCount: result.metadata.edgeCount
        }
      };
      
    } catch (error) {
      return {
        success: false,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        error: {
          code: 'MERMAID_GENERATION_FAILED',
          message: `Mermaid diagram generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          recoverable: true
        },
        findings: []
      };
    }
  }

  private determineDiagramType(context: AnalysisContext): string {
    if (context.agentRole === 'educational') {
      return 'learning-path';
    }
    
    if (context.agentRole === 'architecture') {
      return 'architecture-diagram';
    }
    
    // Check for PR files to suggest dependency analysis
    if (context.pr?.files && context.pr.files.length > 0) {
      return 'dependency-graph';
    }
    
    return 'generic-flowchart';
  }

  private getDefaultConfig(diagramType: string, context: AnalysisContext): MermaidDiagramConfig {
    const title = this.generateTitle(diagramType, context);
    
    return {
      type: this.getConfigType(diagramType),
      direction: diagramType === 'learning-path' ? 'TD' : 'LR',
      theme: 'default',
      title,
      description: `Generated ${diagramType} for ${context.repository?.name || 'analysis'}`
    };
  }

  private getConfigType(diagramType: string): MermaidDiagramConfig['type'] {
    switch (diagramType) {
      case 'dependency-graph':
      case 'architecture-diagram':
        return 'graph';
      case 'learning-path':
      case 'findings-flow':
        return 'flowchart';
      default:
        return 'flowchart';
    }
  }

  private generateTitle(diagramType: string, context: AnalysisContext): string {
    const repoName = context.repository?.name || 'Unknown';
    const prNumber = context.pr?.prNumber || '';
    
    switch (diagramType) {
      case 'dependency-graph':
        return `Dependency Graph - ${repoName}${prNumber ? ` PR #${prNumber}` : ''}`;
      case 'architecture-diagram':
        return `Architecture Overview - ${repoName}`;
      case 'learning-path':
        return `Learning Path - Code Quality Improvement`;
      case 'findings-flow':
        return `Analysis Findings - ${repoName}${prNumber ? ` PR #${prNumber}` : ''}`;
      default:
        return `Code Analysis Diagram`;
    }
  }

  private async generateDependencyGraph(context: AnalysisContext, config: MermaidDiagramConfig): Promise<MermaidGenerationResult> {
    const dependencies = this.extractDependencies(context);
    
    let mermaidCode = `graph ${config.direction || 'LR'}\n`;
    mermaidCode += `    %% ${config.title}\n\n`;
    
    // Add styling
    mermaidCode += `    classDef fileNode fill:#e1f5fe,stroke:#0277bd,stroke-width:2px\n`;
    mermaidCode += `    classDef packageNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px\n`;
    mermaidCode += `    classDef moduleNode fill:#e8f5e8,stroke:#388e3c,stroke-width:2px\n\n`;
    
    // Generate nodes
    dependencies.nodes.forEach(node => {
      const nodeId = this.sanitizeId(node.id);
      const label = node.label.replace(/"/g, '\\"');
      
      switch (node.type) {
        case 'file':
          mermaidCode += `    ${nodeId}["📄 ${label}"]:::fileNode\n`;
          break;
        case 'package':
          mermaidCode += `    ${nodeId}["📦 ${label}"]:::packageNode\n`;
          break;
        case 'module':
          mermaidCode += `    ${nodeId}["🔧 ${label}"]:::moduleNode\n`;
          break;
        default:
          mermaidCode += `    ${nodeId}["${label}"]\n`;
      }
    });
    
    mermaidCode += '\n';
    
    // Generate edges
    dependencies.edges.forEach(edge => {
      const sourceId = this.sanitizeId(edge.source);
      const targetId = this.sanitizeId(edge.target);
      const edgeStyle = this.getEdgeStyle(edge.type);
      
      mermaidCode += `    ${sourceId} ${edgeStyle} ${targetId}\n`;
    });
    
    // Add clusters if available
    if (dependencies.clusters && dependencies.clusters.length > 0) {
      mermaidCode += '\n';
      dependencies.clusters.forEach((cluster, index) => {
        mermaidCode += `    subgraph cluster${index}["${cluster.label}"]\n`;
        cluster.nodes.forEach(nodeId => {
          mermaidCode += `        ${this.sanitizeId(nodeId)}\n`;
        });
        mermaidCode += `    end\n`;
      });
    }
    
    const svgContent = await this.renderToSVG(mermaidCode);
    
    return {
      mermaidCode,
      svgContent,
      diagramType: 'dependency-graph',
      metadata: {
        nodeCount: dependencies.nodes.length,
        edgeCount: dependencies.edges.length,
        generatedAt: new Date(),
        complexity: this.assessComplexity(dependencies.nodes.length, dependencies.edges.length)
      }
    };
  }

  private async generateArchitectureDiagram(context: AnalysisContext, config: MermaidDiagramConfig): Promise<MermaidGenerationResult> {
    const findings: any[] = [];
    const architecture = this.extractArchitectureInfo(context, findings);
    
    let mermaidCode = `graph ${config.direction || 'TD'}\n`;
    mermaidCode += `    %% ${config.title}\n\n`;
    
    // Styling
    mermaidCode += `    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px\n`;
    mermaidCode += `    classDef backend fill:#e8f5e8,stroke:#388e3c,stroke-width:2px\n`;
    mermaidCode += `    classDef database fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n`;
    mermaidCode += `    classDef external fill:#fce4ec,stroke:#c2185b,stroke-width:2px\n\n`;
    
    // Generate architecture layers
    mermaidCode += `    subgraph "Presentation Layer"\n`;
    mermaidCode += `        UI["🖥️ User Interface"]:::frontend\n`;
    mermaidCode += `        API["🔌 API Gateway"]:::frontend\n`;
    mermaidCode += `    end\n\n`;
    
    mermaidCode += `    subgraph "Business Layer"\n`;
    mermaidCode += `        BL["⚙️ Business Logic"]:::backend\n`;
    mermaidCode += `        SERV["🔧 Services"]:::backend\n`;
    mermaidCode += `    end\n\n`;
    
    mermaidCode += `    subgraph "Data Layer"\n`;
    mermaidCode += `        DB["🗄️ Database"]:::database\n`;
    mermaidCode += `        CACHE["⚡ Cache"]:::database\n`;
    mermaidCode += `    end\n\n`;
    
    // Add connections
    mermaidCode += `    UI --> API\n`;
    mermaidCode += `    API --> BL\n`;
    mermaidCode += `    BL --> SERV\n`;
    mermaidCode += `    SERV --> DB\n`;
    mermaidCode += `    SERV --> CACHE\n`;
    
    // Add findings as annotations
    if (findings.length > 0) {
      mermaidCode += '\n    %% Architecture Issues\n';
      findings.forEach((finding: any, index: number) => {
        if (finding.category === 'architecture') {
          mermaidCode += `    ISSUE${index}["⚠️ ${finding.title}"]:::external\n`;
        }
      });
    }
    
    const svgContent = await this.renderToSVG(mermaidCode);
    
    return {
      mermaidCode,
      svgContent,
      diagramType: 'architecture-diagram',
      metadata: {
        nodeCount: 6 + findings.filter((f: any) => f.category === 'architecture').length,
        edgeCount: 5,
        generatedAt: new Date(),
        complexity: 'medium'
      }
    };
  }

  private async generateLearningPath(context: AnalysisContext, config: MermaidDiagramConfig): Promise<MermaidGenerationResult> {
    const learningPath = this.extractLearningPath(context);
    
    let mermaidCode = `flowchart ${config.direction || 'TD'}\n`;
    mermaidCode += `    %% ${config.title}\n\n`;
    
    // Styling for different difficulty levels
    mermaidCode += `    classDef beginner fill:#e8f5e8,stroke:#4caf50,stroke-width:2px\n`;
    mermaidCode += `    classDef intermediate fill:#fff3e0,stroke:#ff9800,stroke-width:2px\n`;
    mermaidCode += `    classDef advanced fill:#ffebee,stroke:#f44336,stroke-width:2px\n`;
    mermaidCode += `    classDef milestone fill:#f3e5f5,stroke:#9c27b0,stroke-width:3px\n\n`;
    
    // Start node
    mermaidCode += `    START([🚀 Start Learning Journey])\n\n`;
    
    let previousNode = 'START';
    
    // Generate learning steps
    learningPath.steps.forEach((step, index) => {
      const stepId = `STEP${index}`;
      const stepLabel = `${step.title}\\n⏱️ ${step.estimatedTime}`;
      const styleClass = step.difficulty;
      
      mermaidCode += `    ${stepId}["${stepLabel}"]:::${styleClass}\n`;
      mermaidCode += `    ${previousNode} --> ${stepId}\n`;
      
      // Add prerequisites as additional connections
      if (step.prerequisites && step.prerequisites.length > 0) {
        step.prerequisites.forEach(prereq => {
          const prereqStepIndex = learningPath.steps.findIndex(s => s.title === prereq);
          if (prereqStepIndex >= 0 && prereqStepIndex < index) {
            mermaidCode += `    STEP${prereqStepIndex} -.-> ${stepId}\n`;
          }
        });
      }
      
      previousNode = stepId;
    });
    
    // Add milestones
    if (learningPath.milestones && learningPath.milestones.length > 0) {
      mermaidCode += '\n    %% Milestones\n';
      learningPath.milestones.forEach((milestone, index) => {
        const milestoneId = `MILESTONE${index}`;
        mermaidCode += `    ${milestoneId}["🏆 ${milestone.title}"]:::milestone\n`;
        
        // Connect to relevant steps (simplified: connect to last step before milestone)
        const stepIndex = Math.min(index * 2, learningPath.steps.length - 1);
        mermaidCode += `    STEP${stepIndex} --> ${milestoneId}\n`;
      });
    }
    
    // End node
    mermaidCode += `\n    END([🎯 Learning Complete])\n`;
    mermaidCode += `    ${previousNode} --> END\n`;
    
    const svgContent = await this.renderToSVG(mermaidCode);
    
    return {
      mermaidCode,
      svgContent,
      diagramType: 'learning-path',
      metadata: {
        nodeCount: learningPath.steps.length + 2 + (learningPath.milestones?.length || 0),
        edgeCount: learningPath.steps.length + 1,
        generatedAt: new Date(),
        complexity: this.assessComplexity(learningPath.steps.length, learningPath.steps.length)
      }
    };
  }

  private async generateFindingsFlowchart(context: AnalysisContext, config: MermaidDiagramConfig): Promise<MermaidGenerationResult> {
    const findings: any[] = [];
    const categories = this.groupFindingsByCategory(findings);
    
    let mermaidCode = `flowchart ${config.direction || 'TD'}\n`;
    mermaidCode += `    %% ${config.title}\n\n`;
    
    // Styling
    mermaidCode += `    classDef critical fill:#ffebee,stroke:#d32f2f,stroke-width:3px\n`;
    mermaidCode += `    classDef high fill:#fff3e0,stroke:#f57c00,stroke-width:2px\n`;
    mermaidCode += `    classDef medium fill:#fff8e1,stroke:#fbc02d,stroke-width:2px\n`;
    mermaidCode += `    classDef low fill:#e8f5e8,stroke:#388e3c,stroke-width:2px\n\n`;
    
    // Analysis start
    mermaidCode += `    START([📊 Code Analysis])\n\n`;
    
    // Category nodes
    Object.entries(categories).forEach(([category, categoryFindings]) => {
      if (categoryFindings.length > 0) {
        const categoryId = category.toUpperCase();
        const categoryLabel = `${this.getCategoryIcon(category)} ${category.charAt(0).toUpperCase() + category.slice(1)}\\n${categoryFindings.length} issues`;
        
        mermaidCode += `    ${categoryId}["${categoryLabel}"]\n`;
        mermaidCode += `    START --> ${categoryId}\n`;
        
        // Add critical findings
        const criticalFindings = categoryFindings.filter(f => f.severity === 'critical');
        if (criticalFindings.length > 0) {
          criticalFindings.slice(0, 3).forEach((finding: any, index: number) => {
            const findingId = `${categoryId}_CRITICAL_${index}`;
            const findingLabel = `⚠️ ${finding.title.substring(0, 30)}...`;
            
            mermaidCode += `    ${findingId}["${findingLabel}"]:::critical\n`;
            mermaidCode += `    ${categoryId} --> ${findingId}\n`;
          });
        }
      }
    });
    
    // Summary node
    const totalFindings = findings.length;
    const criticalCount = findings.filter((f: any) => f.severity === 'critical').length;
    
    mermaidCode += `\n    SUMMARY["📋 Summary\\n${totalFindings} total issues\\n${criticalCount} critical"]\n`;
    
    Object.keys(categories).forEach(category => {
      if (categories[category].length > 0) {
        mermaidCode += `    ${category.toUpperCase()} --> SUMMARY\n`;
      }
    });
    
    const svgContent = await this.renderToSVG(mermaidCode);
    
    return {
      mermaidCode,
      svgContent,
      diagramType: 'findings-flow',
      metadata: {
        nodeCount: Object.keys(categories).length + 2,
        edgeCount: Object.keys(categories).length * 2,
        generatedAt: new Date(),
        complexity: totalFindings > 20 ? 'high' : totalFindings > 10 ? 'medium' : 'low'
      }
    };
  }

  private async generateGenericFlowchart(context: AnalysisContext, config: MermaidDiagramConfig): Promise<MermaidGenerationResult> {
    let mermaidCode = `flowchart ${config.direction || 'TD'}\n`;
    mermaidCode += `    %% ${config.title}\n\n`;
    
    // Simple generic flowchart
    mermaidCode += `    START([🔍 Analysis Start])\n`;
    mermaidCode += `    PROCESS["📊 Processing Code"]\n`;
    mermaidCode += `    RESULTS["📋 Generate Results"]\n`;
    mermaidCode += `    END([✅ Complete])\n\n`;
    
    mermaidCode += `    START --> PROCESS\n`;
    mermaidCode += `    PROCESS --> RESULTS\n`;
    mermaidCode += `    RESULTS --> END\n`;
    
    const svgContent = await this.renderToSVG(mermaidCode);
    
    return {
      mermaidCode,
      svgContent,
      diagramType: 'generic-flowchart',
      metadata: {
        nodeCount: 4,
        edgeCount: 3,
        generatedAt: new Date(),
        complexity: 'low'
      }
    };
  }

  private extractDependencies(context: AnalysisContext): DependencyGraph {
    // Create simplified dependency graph from file information
    
    // Fallback: create basic dependency graph from file information
    const nodes = (context.pr?.files || []).slice(0, 10).map((file, index) => ({
      id: `file_${index}`,
      label: file.path.split('/').pop() || file.path,
      type: 'file' as const,
      metadata: {
        path: file.path,
        language: this.detectLanguage(file.path),
        size: file.content?.length || 0
      }
    }));
    
    const edges = nodes.slice(0, -1).map((node, index) => ({
      source: node.id,
      target: nodes[index + 1].id,
      type: 'depends' as const
    }));
    
    return { nodes, edges };
  }

  private extractArchitectureInfo(context: AnalysisContext, findings: any[]): any {
    // Extract architecture information from context and findings
    const architectureFindings = findings.filter(f => f.category === 'architecture');
    return {
      layers: ['presentation', 'business', 'data'],
      issues: architectureFindings
    };
  }

  private extractLearningPath(context: AnalysisContext): LearningPath {
    // Default learning path based on context
    const findings: any[] = [];
    const hasSecurityIssues = findings.some((f: any) => f.category === 'security');
    const hasPerformanceIssues = findings.some((f: any) => f.category === 'performance');
    const hasQualityIssues = findings.some((f: any) => f.category === 'codeQuality');
    
    const steps = [];
    
    if (hasSecurityIssues) {
      steps.push({
        id: 'security-basics',
        title: 'Security Fundamentals',
        description: 'Learn basic security principles and common vulnerabilities',
        estimatedTime: '2 hours',
        difficulty: 'beginner' as const
      });
    }
    
    if (hasQualityIssues) {
      steps.push({
        id: 'code-quality',
        title: 'Code Quality Best Practices',
        description: 'Improve code maintainability and readability',
        estimatedTime: '3 hours',
        difficulty: 'intermediate' as const
      });
    }
    
    if (hasPerformanceIssues) {
      steps.push({
        id: 'performance-optimization',
        title: 'Performance Optimization',
        description: 'Learn to identify and fix performance bottlenecks',
        estimatedTime: '4 hours',
        difficulty: 'advanced' as const
      });
    }
    
    // Default step if no specific issues
    if (steps.length === 0) {
      steps.push({
        id: 'general-improvement',
        title: 'Code Review Best Practices',
        description: 'Learn effective code review techniques',
        estimatedTime: '1 hour',
        difficulty: 'beginner' as const
      });
    }
    
    return {
      title: 'Code Quality Improvement Path',
      description: 'Personalized learning path based on code analysis',
      steps
    };
  }

  private groupFindingsByCategory(findings: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {
      security: [],
      architecture: [],
      performance: [],
      codeQuality: [],
      dependencies: []
    };
    
    findings.forEach(finding => {
      const category = finding.category || 'codeQuality';
      if (categories[category]) {
        categories[category].push(finding);
      }
    });
    
    return categories;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      security: '🔒',
      architecture: '🏗️',
      performance: '⚡',
      codeQuality: '🔧',
      dependencies: '📦'
    };
    
    return icons[category] || '📄';
  }

  private getEdgeStyle(edgeType: string): string {
    switch (edgeType) {
      case 'imports':
        return '-->';
      case 'extends':
        return '==>';
      case 'implements':
        return '-.->'; 
      case 'calls':
        return '-->';
      default:
        return '-->';
    }
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'cpp': 'cpp',
      'c': 'c'
    };
    
    return langMap[ext || ''] || 'unknown';
  }

  private assessComplexity(nodeCount: number, edgeCount: number): 'low' | 'medium' | 'high' {
    const complexity = nodeCount + edgeCount;
    if (complexity > 50) return 'high';
    if (complexity > 20) return 'medium';
    return 'low';
  }

  private async renderToSVG(mermaidCode: string): Promise<string> {
    // In a real implementation, this would use Mermaid CLI or puppeteer
    // For now, return a placeholder SVG
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f9f9f9"/>
  <text x="400" y="300" text-anchor="middle" font-family="Arial" font-size="16">
    Mermaid Diagram Generated
  </text>
  <text x="400" y="320" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
    ${mermaidCode.split('\n').length} lines of Mermaid code
  </text>
</svg>`;
  }

  private extractRepoName(url: string): string {
    const match = url.match(/\/([^\/]+)\/([^\/]+)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : 'Unknown Repository';
  }

  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      author: 'CodeQual Team',
      supportedRoles: this.applicableRoles,
      supportedLanguages: ['javascript', 'typescript', 'python', 'java', 'csharp'],
      tags: ['diagram', 'visualization', 'mermaid', 'documentation'],
      securityVerified: true,
      lastVerified: new Date()
    };
  }
}
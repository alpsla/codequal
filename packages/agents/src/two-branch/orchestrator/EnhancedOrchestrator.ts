/**
 * Enhanced Orchestrator that runs all 5 specialist agents
 * 
 * For each language, runs:
 * 1. Security Agent
 * 2. Code Quality Agent
 * 3. Dependencies Agent
 * 4. Performance Agent
 * 5. Architecture Agent
 */

import { UnifiedSecurityOrchestrator } from './UnifiedSecurityOrchestrator';
import { MultiToolSecurityAgent } from '../agents/MultiToolSecurityAgent';
import { MultiToolCodeQualityAgent } from '../agents/MultiToolCodeQualityAgent';
import { MultiToolDependencyAgent } from '../agents/MultiToolDependencyAgent';
import { MultiToolPerformanceAgent } from '../agents/MultiToolPerformanceAgent';
import { MultiToolArchitectureAgent } from '../agents/MultiToolArchitectureAgent';
import { ModelAwareBaseAgent } from '../agents/ModelAwareBaseAgent';

interface EnhancedLanguageAnalysis {
  language: string;
  agents: {
    security: any;
    quality: any;
    dependencies: any;
    performance: any;
    architecture: any;
  };
  findings: any[];
  tools: string[];
  modelsUsed: Record<string, string>;
  executionTime: number;
}

export class EnhancedOrchestrator extends UnifiedSecurityOrchestrator {
  private specialistAgents: Map<string, any[]>;
  
  constructor(config?: any) {
    super(config);
    this.initializeSpecialistAgents();
  }
  
  private initializeSpecialistAgents() {
    // Initialize all 5 specialist agents for each language
    this.specialistAgents = new Map();
    
    // For all languages, we use the multi-tool agents
    const languages = ['javascript', 'typescript', 'python', 'ruby', 'go', 'rust', 'php', 'java', 'csharp', 'swift'];
    
    languages.forEach(lang => {
      this.specialistAgents.set(lang, [
        new MultiToolSecurityAgent(),
        new MultiToolCodeQualityAgent(),
        new MultiToolDependencyAgent(),
        new MultiToolPerformanceAgent(),
        new MultiToolArchitectureAgent()
      ]);
    });
  }
  
  /**
   * Override to run all 5 specialist agents per language
   */
  protected async analyzeLanguage(
    language: string,
    request: any
  ): Promise<any> {
    console.log(`🔍 Analyzing ${language} with 5 specialist agents...`);
    
    const agents = this.specialistAgents.get(language) || this.specialistAgents.get('javascript');
    if (!agents) {
      console.warn(`No agents available for ${language}`);
      return null;
    }
    
    const startTime = Date.now();
    const filesForLanguage = request.files.filter(f => 
      this.getFileLanguage(f.path) === language
    );
    
    const agentResults = {
      security: null as any,
      quality: null as any,
      dependencies: null as any,
      performance: null as any,
      architecture: null as any
    };
    
    const modelsUsed: Record<string, string> = {};
    const allFindings: any[] = [];
    const allTools: Set<string> = new Set();
    
    // Run all 5 agents
    const agentNames = ['security', 'quality', 'dependencies', 'performance', 'architecture'];
    
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const agentType = agentNames[i];
      
      console.log(`  • Running ${agentType} agent...`);
      
      try {
        const result = await agent.analyze({
          language,
          targetPath: '/tmp/analysis',
          context: { pr: request.prNumber }
        });
        
        agentResults[agentType] = {
          agent: agent.constructor.name,
          issues: result.issues?.length || 0,
          tools: result.tools || [],
          executionTime: result.metadata?.totalExecutionTime || 0
        };
        
        // Track model used if agent extends ModelAwareBaseAgent
        if (agent instanceof ModelAwareBaseAgent) {
          const model = agent.getCurrentModel();
          if (model) {
            modelsUsed[agentType] = `${model.primary_provider}/${model.primary_model}`;
          }
        } else {
          // Default model tracking
          modelsUsed[agentType] = 'claude-3-haiku'; // or whatever is actually used
        }
        
        // Collect findings
        if (result.issues) {
          allFindings.push(...result.issues);
        }
        
        // Collect tools
        if (result.tools) {
          result.tools.forEach(tool => allTools.add(tool));
        }
        
      } catch (error) {
        console.error(`    ✗ ${agentType} agent failed:`, error.message);
        agentResults[agentType] = {
          agent: agent.constructor.name,
          error: error.message,
          issues: 0,
          tools: []
        };
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log(`  ✓ ${language} analysis complete:`, allFindings.length, 'findings in', executionTime, 'ms');
    console.log(`  • Models used:`, Object.entries(modelsUsed).map(([k,v]) => `${k}=${v}`).join(', '));
    
    // Return enhanced result
    return {
      language,
      agents: agentResults,
      filesAnalyzed: filesForLanguage.length,
      tools: Array.from(allTools),
      findings: this.normalizeFindings(allFindings, language),
      modelsUsed,
      executionTime
    };
  }
  
  private getFileLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'java': 'java',
      'cs': 'csharp',
      'swift': 'swift',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'h': 'c',
      'hpp': 'cpp'
    };
    return langMap[ext || ''] || 'unknown';
  }
  
  /**
   * Get a report of which tools are enabled/disabled
   */
  public getToolsReport(): any {
    const allTools = [
      // JavaScript/TypeScript tools
      'eslint', 'jshint', 'tslint', 'typescript', 'flow', 'standard',
      'dependency-cruiser', 'complexity-report', 'eslint-plugin-sonarjs',
      'webpack-bundle-analyzer', 'lighthouse',
      
      // Python tools
      'pylint', 'flake8', 'mypy', 'bandit', 'safety', 'black', 'isort',
      'ruff', 'prospector', 'radon',
      
      // Ruby tools
      'rubocop', 'brakeman', 'bundler-audit', 'reek', 'rails_best_practices',
      'fasterer', 'flay', 'flog',
      
      // Go tools
      'golangci-lint', 'go-vet', 'gosec', 'staticcheck', 'gocyclo',
      'ineffassign', 'deadcode', 'goconst',
      
      // Rust tools
      'cargo-clippy', 'cargo-audit', 'cargo-outdated', 'rustfmt',
      
      // PHP tools
      'phpstan', 'psalm', 'phpcs', 'phpmd', 'phpcpd', 'security-checker',
      
      // Java tools
      'checkstyle', 'pmd', 'spotbugs', 'error-prone', 'nullaway',
      
      // C# tools
      'roslyn-analyzers', 'fxcop', 'stylecop', 'security-code-scan',
      
      // Multi-language tools
      'sonarqube', 'semgrep', 'codeql', 'trivy', 'snyk', 'veracode'
    ];
    
    const report = {
      total: allTools.length,
      categories: {
        core: [] as string[],
        optional: [] as string[],
        commercial: [] as string[],
        external: [] as string[],
        notImplemented: [] as string[]
      }
    };
    
    // Categorize tools based on implementation status
    allTools.forEach(tool => {
      // Check if tool is implemented
      if (['snyk', 'veracode', 'sonarqube'].includes(tool)) {
        report.categories.commercial.push(tool);
      } else if (['lighthouse', 'bundlephobia'].includes(tool)) {
        report.categories.external.push(tool);
      } else if (['eslint', 'pylint', 'rubocop', 'golangci-lint'].includes(tool)) {
        report.categories.core.push(tool);
      } else if (['reek', 'rails_best_practices', 'flay', 'flog'].includes(tool)) {
        report.categories.optional.push(tool);
      } else {
        report.categories.notImplemented.push(tool);
      }
    });
    
    return report;
  }
}
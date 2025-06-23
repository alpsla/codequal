/**
 * Context 7 MCP Adapter
 * Provides real-time documentation, version-specific information, and working code examples
 * Integration with Context 7 service for up-to-date technical documentation
 */

import { BaseMCPAdapter } from './base-mcp-adapter';
import {
  AnalysisContext,
  ToolResult,
  ToolFinding,
  ToolMetadata,
  ToolCapability,
  ToolRequirements,
  AgentRole
} from '../../core/interfaces';

export interface Context7SearchParams {
  query: string;
  language?: string;
  framework?: string;
  version?: string;
  includeExamples?: boolean;
  maxResults?: number;
}

export interface Context7Documentation {
  title: string;
  content: string;
  url: string;
  version: string;
  lastUpdated: string;
  confidence: number;
  examples?: Context7CodeExample[];
}

export interface Context7CodeExample {
  title: string;
  code: string;
  language: string;
  description: string;
  validated: boolean;
  source: string;
  version: string;
}

export interface Context7VersionInfo {
  package: string;
  currentVersion: string;
  latestVersion: string;
  releaseDate: string;
  changelog: string;
  breakingChanges?: string[];
  compatibilityNotes?: string[];
}

export class Context7MCPAdapter extends BaseMCPAdapter {
  readonly id = 'context7-mcp';
  readonly name = 'Context 7 Documentation Service';
  readonly version = '1.0.0';
  readonly capabilities: ToolCapability[] = [
    { name: 'real-time-docs', category: 'documentation' },
    { name: 'version-info', category: 'documentation' },
    { name: 'working-examples', category: 'documentation' },
    { name: 'package-compatibility', category: 'documentation' }
  ];
  readonly requirements: ToolRequirements = {
    executionMode: 'on-demand',
    timeout: 30000,
    authentication: {
      type: 'api-key',
      required: false
    }
  };

  protected mcpServerArgs = ['-y', '@upstash/context7-mcp'];

  canAnalyze(context: AnalysisContext): boolean {
    // Context 7 can provide documentation for any educational context
    return context.agentRole === 'educational';
  }

  async analyze(context: AnalysisContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      await this.initializeMCPServer();
      
      const findings: ToolFinding[] = [];
      const documentation: Context7Documentation[] = [];
      const codeExamples: Context7CodeExample[] = [];
      const versionInfo: Context7VersionInfo[] = [];

      // Extract analysis topics for documentation search
      const searchTopics = this.extractSearchTopics(context);
      
      // Search for real-time documentation
      for (const topic of searchTopics) {
        const docs = await this.searchDocumentation({
          query: topic,
          language: context.repository.primaryLanguage || 'typescript',
          includeExamples: true,
          maxResults: 5
        });
        
        documentation.push(...docs);
        
        // Extract code examples from documentation
        docs.forEach(doc => {
          if (doc.examples) {
            codeExamples.push(...doc.examples);
          }
        });
        
        // Create findings for educational value
        docs.forEach(doc => {
          findings.push({
            type: 'info',
            severity: 'info',
            category: 'educational',
            message: `Educational resource: ${doc.title}`,
            documentation: `Up-to-date documentation for ${topic}`,
            file: 'educational-content',
            line: 1,
            column: 1
          });
        });
      }

      // Get version information for packages mentioned in the analysis
      const packages = this.extractPackageNames(context);
      for (const packageName of packages) {
        const version = await this.getVersionInfo(packageName);
        if (version) {
          versionInfo.push(version);
          
          // Create findings for version updates
          if (version.currentVersion !== version.latestVersion) {
            findings.push({
              type: 'suggestion',
              severity: 'medium',
              category: 'educational',
              message: `Package ${packageName} has newer version available`,
              documentation: `Current: ${version.currentVersion}, Latest: ${version.latestVersion}`,
              file: 'package.json',
              line: 1,
              column: 1
            });
          }
        }
      }

      return {
        success: true,
        toolId: this.id,
        executionTime: Date.now() - startTime,
        findings,
        metrics: {
          filesAnalyzed: 0,
          documentsFound: documentation.length,
          codeExamples: codeExamples.length,
          packagesChecked: versionInfo.length
        }
      };
    } catch (error) {
      return this.createErrorResult(error as Error, startTime);
    }
  }

  /**
   * Search for real-time documentation using Context 7
   */
  private async searchDocumentation(params: Context7SearchParams): Promise<Context7Documentation[]> {
    try {
      const result = await this.executeMCPCommand<{
        documents: Array<{
          title: string;
          content: string;
          url: string;
          version: string;
          lastUpdated: string;
          confidence: number;
          examples?: Array<{
            title: string;
            code: string;
            language: string;
            description: string;
            validated: boolean;
            source: string;
            version: string;
          }>;
        }>;
      }>({
        method: 'search_documentation',
        params
      });

      return result.documents.map(doc => ({
        title: doc.title,
        content: doc.content,
        url: doc.url,
        version: doc.version,
        lastUpdated: doc.lastUpdated,
        confidence: doc.confidence,
        examples: doc.examples || []
      }));
    } catch (error) {
      console.warn(`Context 7 documentation search failed for "${params.query}":`, error);
      return [];
    }
  }

  /**
   * Get version information for a package
   */
  private async getVersionInfo(packageName: string): Promise<Context7VersionInfo | null> {
    try {
      const result = await this.executeMCPCommand<Context7VersionInfo>({
        method: 'get_version_info',
        params: { package: packageName }
      });

      return result;
    } catch (error) {
      console.warn(`Context 7 version info failed for "${packageName}":`, error);
      return null;
    }
  }

  /**
   * Get working code examples for a specific topic
   */
  async getWorkingExamples(topic: string, language = 'typescript'): Promise<Context7CodeExample[]> {
    try {
      const result = await this.executeMCPCommand<{
        examples: Context7CodeExample[];
      }>({
        method: 'get_working_examples',
        params: { topic, language }
      });

      return result.examples;
    } catch (error) {
      console.warn(`Context 7 examples search failed for "${topic}":`, error);
      return [];
    }
  }

  /**
   * Extract search topics from analysis context
   */
  private extractSearchTopics(context: AnalysisContext): string[] {
    const topics = new Set<string>();
    
    // Extract from agent role
    if (context.agentRole === 'security') {
      topics.add('security best practices');
      topics.add('vulnerability prevention');
    }
    if (context.agentRole === 'performance') {
      topics.add('performance optimization');
      topics.add('code profiling');
    }
    if (context.agentRole === 'architecture') {
      topics.add('software architecture patterns');
      topics.add('design patterns');
    }
    if (context.agentRole === 'codeQuality') {
      topics.add('clean code principles');
      topics.add('refactoring techniques');
    }

    // Extract from language/framework if specified
    if (context.repository.primaryLanguage) {
      topics.add(`${context.repository.primaryLanguage} best practices`);
      topics.add(`${context.repository.primaryLanguage} documentation`);
    }

    // Default educational topics if none found
    if (topics.size === 0) {
      topics.add('software development best practices');
      topics.add('code quality improvement');
    }

    return Array.from(topics);
  }

  /**
   * Extract package names from analysis context
   */
  private extractPackageNames(context: AnalysisContext): string[] {
    const packages = new Set<string>();
    
    // Try to extract from files (simplified - would need more robust parsing)
    context.pr.files.forEach(file => {
      if (file.path === 'package.json') {
        try {
          const packageJson = JSON.parse(file.content);
          const deps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          Object.keys(deps).forEach(pkg => packages.add(pkg));
        } catch {
          // Ignore JSON parsing errors
        }
      }
    });

    // Extract common packages from imports (simplified)
    const importRegex = /(?:import.*from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    context.pr.files.forEach(file => {
      let match;
      while ((match = importRegex.exec(file.content)) !== null) {
        const packageName = match[1] || match[2];
        if (packageName && !packageName.startsWith('.') && !packageName.startsWith('/')) {
          // Extract package name (remove path parts)
          const cleanName = packageName.split('/')[0];
          if (cleanName.startsWith('@')) {
            packages.add(`${cleanName}/${packageName.split('/')[1]}`);
          } else {
            packages.add(cleanName);
          }
        }
      }
    });

    return Array.from(packages).slice(0, 10); // Limit to avoid overwhelming the service
  }

  getMetadata(): ToolMetadata {
    return {
      id: this.id,
      name: this.name,
      description: 'Real-time documentation search with up-to-date version information and working code examples',
      author: 'CodeQual',
      supportedRoles: ['educational' as AgentRole],
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust'],
      tags: ['documentation', 'examples', 'version-info'],
      securityVerified: true,
      lastVerified: new Date()
    };
  }
}
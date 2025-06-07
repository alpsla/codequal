/**
 * Three-Tier Analysis Utilities
 * 
 * This file provides utility functions for the ThreeTierAnalysisService
 * to help integrate with the repository model configuration system and
 * prepare analysis results for storage and presentation.
 */

import { RepositoryModelSelectionService, AnalysisTier } from '../services/RepositoryModelSelectionService';
import { RepositoryContext, AnalysisResult, AnalysisResultType } from '../types/repository';
import { RepositoryProvider } from '../config/models/repository-model-config';
import { Logger } from '../utils/logger';
import { ModelConfig, DeepWikiProvider } from './DeepWikiClient';

/**
 * Report structure for repository analysis
 */
export interface RepositoryAnalysisReport {
  /**
   * Report ID
   */
  id: string;
  
  /**
   * Report title
   */
  title: string;
  
  /**
   * Repository context
   */
  repository: RepositoryContext;
  
  /**
   * Analysis tier used
   */
  tier: AnalysisTier;
  
  /**
   * Report sections
   */
  sections: ReportSection[];
  
  /**
   * Summary of findings
   */
  summary: string;
  
  /**
   * Key findings and recommendations
   */
  keyFindings: string[];
  
  /**
   * Analysis results
   */
  results: AnalysisResult[];
  
  /**
   * Metadata
   */
  metadata: {
    /**
     * Analysis date
     */
    analyzedAt: string;
    
    /**
     * Models used for analysis
     */
    models: {
      provider: string;
      model: string;
      role: string;
    }[];
    
    /**
     * Repository characteristics
     */
    repositoryStats: {
      sizeBytes: number;
      fileCount: number;
      commitCount: number;
      contributorCount: number;
      mainLanguage: string;
      languages: {
        name: string;
        percentage: number;
      }[];
    };
    
    /**
     * Analysis duration in ms
     */
    duration: number;
    
    /**
     * Token usage
     */
    tokenUsage?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
  
  /**
   * Visualizations
   */
  visualizations?: ReportVisualization[];
}

/**
 * Report section
 */
export interface ReportSection {
  /**
   * Section ID
   */
  id: string;
  
  /**
   * Section title
   */
  title: string;
  
  /**
   * Section content
   */
  content: string;
  
  /**
   * Section level (1-4)
   */
  level: number;
  
  /**
   * Subsections
   */
  subsections?: ReportSection[];
  
  /**
   * Associated results
   */
  results?: AnalysisResult[];
  
  /**
   * Associated visualizations
   */
  visualizations?: ReportVisualization[];
}

/**
 * Report visualization
 */
export interface ReportVisualization {
  /**
   * Visualization ID
   */
  id: string;
  
  /**
   * Visualization title
   */
  title: string;
  
  /**
   * Visualization type
   */
  type: 'chart' | 'graph' | 'table' | 'code' | 'image';
  
  /**
   * Chart type if applicable
   */
  chartType?: 'bar' | 'line' | 'pie' | 'radar' | 'heatmap' | 'scatter' | 'network';
  
  /**
   * Visualization data
   */
  data: Record<string, unknown>;
  
  /**
   * Configuration for rendering
   */
  config: Record<string, unknown>;
  
  /**
   * Description of the visualization
   */
  description?: string;
  
  /**
   * Source of the data
   */
  source?: string;
}

/**
 * Vector chunk types for storing in a vector database
 */
export enum VectorChunkType {
  SUMMARY = 'summary',
  SECTION = 'section',
  FINDING = 'finding',
  CODE = 'code',
  RECOMMENDATION = 'recommendation',
  METADATA = 'metadata'
}

/**
 * Vector chunk for storage in a vector database
 */
export interface VectorChunk {
  /**
   * Chunk ID
   */
  id: string;
  
  /**
   * Report ID
   */
  reportId: string;
  
  /**
   * Repository ID
   */
  repositoryId: string;
  
  /**
   * Chunk type
   */
  type: VectorChunkType;
  
  /**
   * Chunk content
   */
  content: string;
  
  /**
   * Metadata for the chunk
   */
  metadata: {
    /**
     * Repository context
     */
    repository: {
      owner: string;
      repo: string;
      language: string;
    };
    
    /**
     * Section path if applicable
     */
    sectionPath?: string[];
    
    /**
     * Finding type if applicable
     */
    findingType?: AnalysisResultType;
    
    /**
     * Associated files if applicable
     */
    files?: string[];
    
    /**
     * Analysis date
     */
    analyzedAt: string;
    
    /**
     * Custom metadata
     */
    [key: string]: unknown;
  };
  
  /**
   * Vector embedding (populated by vector DB)
   */
  embedding?: number[];
}

/**
 * Chunking options for vector database storage
 */
export interface ChunkingOptions {
  /**
   * Maximum number of tokens per chunk
   */
  maxTokens: number;
  
  /**
   * Overlap between chunks in tokens
   */
  overlap: number;
  
  /**
   * Whether to include metadata in chunks
   */
  includeMetadata: boolean;
  
  /**
   * Whether to split sections
   */
  splitSections: boolean;
  
  /**
   * Whether to chunk results individually
   */
  chunkResultsIndividually: boolean;
}

/**
 * Utilities for ThreeTierAnalysisService
 */
export class ThreeTierAnalysisUtils {
  /**
   * Constructor
   * @param logger Logger instance
   * @param modelSelectionService Repository model selection service
   */
  constructor(
    private logger: Logger,
    private modelSelectionService: RepositoryModelSelectionService
  ) {
    this.logger.info('ThreeTierAnalysisUtils initialized');
  }
  
  /**
   * Map RepositoryProvider to DeepWikiProvider
   * @param repositoryProvider Repository provider
   * @returns DeepWiki provider
   */
  private mapRepositoryProviderToDeepWiki(repositoryProvider: RepositoryProvider): DeepWikiProvider {
    // For now, default to openai for all repository providers
    // This can be extended based on specific requirements
    switch (repositoryProvider) {
      case RepositoryProvider.GITHUB:
      case RepositoryProvider.GITLAB:
      case RepositoryProvider.BITBUCKET:
      case RepositoryProvider.OTHER:
      default:
        return 'openai';
    }
  }
  
  /**
   * Get model configuration for repository analysis
   * @param repository Repository context
   * @param tier Analysis tier
   * @returns Model configuration
   */
  getModelConfigForRepository(
    repository: RepositoryContext,
    tier: AnalysisTier
  ): ModelConfig<DeepWikiProvider> {
    const modelConfig = this.modelSelectionService.getModelForRepository(repository, tier);
    
    return {
      provider: this.mapRepositoryProviderToDeepWiki(modelConfig.provider),
      model: modelConfig.model || 'gpt-4o'
    };
  }
  
  /**
   * Get model configuration for PR analysis
   * @param repository Repository context
   * @param prSizeBytes PR size in bytes
   * @param tier Analysis tier
   * @returns Model configuration
   */
  getModelConfigForPR(
    repository: RepositoryContext,
    prSizeBytes: number,
    tier: AnalysisTier
  ): ModelConfig<DeepWikiProvider> {
    const modelConfig = this.modelSelectionService.getModelForPR(repository, prSizeBytes, tier);
    
    return {
      provider: this.mapRepositoryProviderToDeepWiki(modelConfig.provider),
      model: modelConfig.model || 'gpt-4o'
    };
  }
  
  /**
   * Create a skeleton repository analysis report
   * @param repository Repository context
   * @param tier Analysis tier
   * @returns Repository analysis report skeleton
   */
  createReportSkeleton(
    repository: RepositoryContext,
    tier: AnalysisTier
  ): RepositoryAnalysisReport {
    const reportId = `repo_${repository.owner}_${repository.repo}_${Date.now()}`;
    
    return {
      id: reportId,
      title: `${repository.owner}/${repository.repo} Repository Analysis`,
      repository,
      tier,
      sections: [],
      summary: '',
      keyFindings: [],
      results: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        models: [],
        repositoryStats: {
          sizeBytes: repository.sizeBytes || 0,
          fileCount: 0,
          commitCount: repository.commitCount || 0,
          contributorCount: repository.contributorCount || 0,
          mainLanguage: repository.language,
          languages: [
            { name: repository.language, percentage: 100 }
          ]
        },
        duration: 0
      },
      visualizations: []
    };
  }
  
  /**
   * Create vector chunks from a repository analysis report
   * @param report Repository analysis report
   * @param options Chunking options
   * @returns Vector chunks
   */
  createVectorChunks(
    report: RepositoryAnalysisReport,
    options: ChunkingOptions = {
      maxTokens: 1000,
      overlap: 100,
      includeMetadata: true,
      splitSections: true,
      chunkResultsIndividually: true
    }
  ): VectorChunk[] {
    const chunks: VectorChunk[] = [];
    
    // Add summary chunk
    chunks.push({
      id: `${report.id}_summary`,
      reportId: report.id,
      repositoryId: `${report.repository.owner}/${report.repository.repo}`,
      type: VectorChunkType.SUMMARY,
      content: report.summary,
      metadata: {
        repository: {
          owner: report.repository.owner,
          repo: report.repository.repo,
          language: report.repository.language
        },
        analyzedAt: report.metadata.analyzedAt
      }
    });
    
    // Add section chunks
    if (report.sections.length > 0) {
      this.processSectionsForChunking(report, report.sections, chunks, options);
    }
    
    // Add result chunks
    if (options.chunkResultsIndividually && report.results.length > 0) {
      for (const result of report.results) {
        chunks.push({
          id: `${report.id}_result_${chunks.length}`,
          reportId: report.id,
          repositoryId: `${report.repository.owner}/${report.repository.repo}`,
          type: VectorChunkType.FINDING,
          content: `${result.title}: ${result.description}${result.suggestedFix ? '\n\nSuggested fix: ' + result.suggestedFix : ''}`,
          metadata: {
            repository: {
              owner: report.repository.owner,
              repo: report.repository.repo,
              language: report.repository.language
            },
            findingType: result.type,
            files: result.files,
            analyzedAt: report.metadata.analyzedAt
          }
        });
        
        // Add educational content as a separate chunk if available
        if (result.educationalContent) {
          chunks.push({
            id: `${report.id}_edu_${chunks.length}`,
            reportId: report.id,
            repositoryId: `${report.repository.owner}/${report.repository.repo}`,
            type: VectorChunkType.RECOMMENDATION,
            content: result.educationalContent,
            metadata: {
              repository: {
                owner: report.repository.owner,
                repo: report.repository.repo,
                language: report.repository.language
              },
              findingType: result.type,
              analyzedAt: report.metadata.analyzedAt
            }
          });
        }
      }
    }
    
    return chunks;
  }
  
  /**
   * Process report sections for chunking
   * @param report Repository analysis report
   * @param sections Report sections
   * @param chunks Vector chunks array to populate
   * @param options Chunking options
   * @param parentPath Parent section path
   * @private
   */
  private processSectionsForChunking(
    report: RepositoryAnalysisReport,
    sections: ReportSection[],
    chunks: VectorChunk[],
    options: ChunkingOptions,
    parentPath: string[] = []
  ): void {
    for (const section of sections) {
      const sectionPath = [...parentPath, section.title];
      
      // Add section content as a chunk
      chunks.push({
        id: `${report.id}_section_${chunks.length}`,
        reportId: report.id,
        repositoryId: `${report.repository.owner}/${report.repository.repo}`,
        type: VectorChunkType.SECTION,
        content: section.content,
        metadata: {
          repository: {
            owner: report.repository.owner,
            repo: report.repository.repo,
            language: report.repository.language
          },
          sectionPath,
          analyzedAt: report.metadata.analyzedAt
        }
      });
      
      // Process subsections recursively
      if (section.subsections && section.subsections.length > 0) {
        this.processSectionsForChunking(report, section.subsections, chunks, options, sectionPath);
      }
      
      // Add section results if not chunking results individually
      if (!options.chunkResultsIndividually && section.results && section.results.length > 0) {
        const resultsContent = section.results.map(r => 
          `${r.title}: ${r.description}${r.suggestedFix ? '\n\nSuggested fix: ' + r.suggestedFix : ''}`
        ).join('\n\n');
        
        chunks.push({
          id: `${report.id}_section_results_${chunks.length}`,
          reportId: report.id,
          repositoryId: `${report.repository.owner}/${report.repository.repo}`,
          type: VectorChunkType.FINDING,
          content: resultsContent,
          metadata: {
            repository: {
              owner: report.repository.owner,
              repo: report.repository.repo,
              language: report.repository.language
            },
            sectionPath,
            analyzedAt: report.metadata.analyzedAt
          }
        });
      }
    }
  }
  
  /**
   * Convert DeepWiki visualization data to report visualizations
   * @param deepWikiVisualizations DeepWiki visualization data
   * @returns Report visualizations
   */
  convertDeepWikiVisualizations(deepWikiVisualizations: Record<string, unknown>[]): ReportVisualization[] {
    const visualizations: ReportVisualization[] = [];
    
    for (const viz of deepWikiVisualizations) {
      try {
        // Convert DeepWiki chart format to our standard format
        const reportViz: ReportVisualization = {
          id: `viz_${visualizations.length}`,
          title: (viz.title as string) || 'Visualization',
          type: this.mapVisualizationType(viz.type as string),
          chartType: this.mapChartType(viz.chartType as string),
          data: (viz.data as Record<string, unknown>) || {},
          config: this.convertVisualizationConfig(viz),
          description: viz.description as string | undefined
        };
        
        visualizations.push(reportViz);
      } catch (error) {
        this.logger.error('Error converting DeepWiki visualization', { error, viz });
      }
    }
    
    return visualizations;
  }
  
  /**
   * Map DeepWiki visualization type to our type
   * @param deepWikiType DeepWiki visualization type
   * @returns Our visualization type
   * @private
   */
  private mapVisualizationType(deepWikiType: string | undefined): 'chart' | 'graph' | 'table' | 'code' | 'image' {
    const typeMap: Record<string, 'chart' | 'graph' | 'table' | 'code' | 'image'> = {
      'chart': 'chart',
      'graph': 'graph',
      'table': 'table',
      'code': 'code',
      'image': 'image',
      // Add mappings for other DeepWiki types
      'bar': 'chart',
      'line': 'chart',
      'pie': 'chart',
      'network': 'graph',
      'dependency': 'graph',
      'heatmap': 'chart'
    };
    
    return (deepWikiType && typeMap[deepWikiType]) || 'chart';
  }
  
  /**
   * Map DeepWiki chart type to our chart type
   * @param deepWikiChartType DeepWiki chart type
   * @returns Our chart type
   * @private
   */
  private mapChartType(deepWikiChartType: string | undefined): 'bar' | 'line' | 'pie' | 'radar' | 'heatmap' | 'scatter' | 'network' | undefined {
    const chartTypeMap: Record<string, 'bar' | 'line' | 'pie' | 'radar' | 'heatmap' | 'scatter' | 'network'> = {
      'bar': 'bar',
      'line': 'line',
      'pie': 'pie',
      'radar': 'radar',
      'heatmap': 'heatmap',
      'scatter': 'scatter',
      'network': 'network',
      // Add mappings for other DeepWiki chart types
      'dependency': 'network',
      'force': 'network'
    };
    
    return deepWikiChartType ? chartTypeMap[deepWikiChartType] : undefined;
  }
  
  /**
   * Convert DeepWiki visualization config to our config format
   * @param deepWikiViz DeepWiki visualization
   * @returns Our visualization config
   * @private
   */
  private convertVisualizationConfig(deepWikiViz: Record<string, unknown>): Record<string, unknown> {
    // Start with a base configuration
    const config: Record<string, unknown> = {
      responsive: true,
      maintainAspectRatio: true,
      ...(deepWikiViz.config as Record<string, unknown> || {})
    };
    
    // Add type-specific configurations
    if (deepWikiViz.type === 'chart') {
      // Configure for chart.js
      config.plugins = {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          enabled: true
        }
      };
    } else if (deepWikiViz.type === 'graph') {
      // Configure for network graphs (vis.js or similar)
      config.physics = {
        enabled: true,
        solver: 'forceAtlas2Based'
      };
      config.interaction = {
        hover: true,
        zoomView: true
      };
    }
    
    return config;
  }
  
  /**
   * Generate HTML for a visualization
   * @param visualization Report visualization
   * @returns HTML for the visualization
   */
  generateVisualizationHtml(visualization: ReportVisualization): string {
    switch (visualization.type) {
      case 'chart':
        return this.generateChartHtml(visualization);
      case 'graph':
        return this.generateGraphHtml(visualization);
      case 'table':
        return this.generateTableHtml(visualization);
      case 'code':
        return this.generateCodeHtml(visualization);
      case 'image':
        return this.generateImageHtml(visualization);
      default:
        return `<div class="visualization">Unsupported visualization type: ${visualization.type}</div>`;
    }
  }
  
  /**
   * Generate HTML for a chart visualization
   * @param visualization Chart visualization
   * @returns HTML for the chart
   * @private
   */
  private generateChartHtml(visualization: ReportVisualization): string {
    // Create a unique ID for the chart
    const chartId = `chart_${visualization.id}`;
    
    // Convert configuration to JSON string
    const configJson = JSON.stringify(visualization.config);
    const dataJson = JSON.stringify(visualization.data);
    
    // Generate HTML for the chart using Chart.js
    return `
      <div class="visualization chart-visualization">
        <h3>${visualization.title}</h3>
        ${visualization.description ? `<p>${visualization.description}</p>` : ''}
        <div class="chart-container" style="position: relative; height:400px; width:100%">
          <canvas id="${chartId}"></canvas>
        </div>
        <script>
          (function() {
            const ctx = document.getElementById('${chartId}').getContext('2d');
            const data = ${dataJson};
            const config = ${configJson};
            config.type = '${visualization.chartType || 'bar'}';
            config.data = data;
            new Chart(ctx, config);
          })();
        </script>
      </div>
    `;
  }
  
  /**
   * Generate HTML for a graph visualization
   * @param visualization Graph visualization
   * @returns HTML for the graph
   * @private
   */
  private generateGraphHtml(visualization: ReportVisualization): string {
    // Create a unique ID for the graph
    const graphId = `graph_${visualization.id}`;
    
    // Convert configuration to JSON string
    const configJson = JSON.stringify(visualization.config);
    const dataJson = JSON.stringify(visualization.data);
    
    // Generate HTML for the graph using vis.js
    return `
      <div class="visualization graph-visualization">
        <h3>${visualization.title}</h3>
        ${visualization.description ? `<p>${visualization.description}</p>` : ''}
        <div id="${graphId}" class="graph-container" style="height:500px; width:100%"></div>
        <script>
          (function() {
            const container = document.getElementById('${graphId}');
            const data = ${dataJson};
            const options = ${configJson};
            const network = new vis.Network(container, data, options);
          })();
        </script>
      </div>
    `;
  }
  
  /**
   * Generate HTML for a table visualization
   * @param visualization Table visualization
   * @returns HTML for the table
   * @private
   */
  private generateTableHtml(visualization: ReportVisualization): string {
    // Extract data for the table
    const { headers, rows } = visualization.data as { headers?: unknown[], rows?: unknown[][] };
    
    // Generate HTML for the table
    let tableHtml = `
      <div class="visualization table-visualization">
        <h3>${visualization.title}</h3>
        ${visualization.description ? `<p>${visualization.description}</p>` : ''}
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
    `;
    
    // Add headers
    if (headers && Array.isArray(headers)) {
      for (const header of headers) {
        tableHtml += `<th>${header}</th>`;
      }
    }
    
    tableHtml += `
              </tr>
            </thead>
            <tbody>
    `;
    
    // Add rows
    if (rows && Array.isArray(rows)) {
      for (const row of rows) {
        tableHtml += '<tr>';
        if (Array.isArray(row)) {
          for (const cell of row) {
            tableHtml += `<td>${cell}</td>`;
          }
        }
        tableHtml += '</tr>';
      }
    }
    
    tableHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    return tableHtml;
  }
  
  /**
   * Generate HTML for a code visualization
   * @param visualization Code visualization
   * @returns HTML for the code
   * @private
   */
  private generateCodeHtml(visualization: ReportVisualization): string {
    // Extract code and language
    const { code, language } = visualization.data as { code?: string, language?: string };
    
    // Generate HTML for the code with syntax highlighting
    return `
      <div class="visualization code-visualization">
        <h3>${visualization.title}</h3>
        ${visualization.description ? `<p>${visualization.description}</p>` : ''}
        <pre><code class="language-${language || 'plaintext'}">${code || ''}</code></pre>
      </div>
    `;
  }
  
  /**
   * Generate HTML for an image visualization
   * @param visualization Image visualization
   * @returns HTML for the image
   * @private
   */
  private generateImageHtml(visualization: ReportVisualization): string {
    // Extract image data
    const { src, alt, width, height } = visualization.data as { src?: string, alt?: string, width?: string | number, height?: string | number };
    
    // Generate HTML for the image
    return `
      <div class="visualization image-visualization">
        <h3>${visualization.title}</h3>
        ${visualization.description ? `<p>${visualization.description}</p>` : ''}
        <div class="image-container">
          <img src="${src || ''}" alt="${alt || visualization.title}" ${width ? `width="${width}"` : ''} ${height ? `height="${height}"` : ''}>
        </div>
      </div>
    `;
  }
}

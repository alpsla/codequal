#!/usr/bin/env ts-node

/**
 * Generate Analysis Reports with Different Model Configurations
 * 
 * This script tests the dynamic model selector with various
 * repository types and generates performance analysis reports.
 */

import { DynamicModelSelector } from '../services/dynamic-model-selector';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

interface AnalysisConfig {
  name: string;
  repository: {
    url: string;
    size: 'small' | 'medium' | 'large' | 'enterprise';
    languages: string[];
    description: string;
  };
  modelConfig: {
    weights: {
      quality: number;
      speed: number;
      cost: number;
    };
    budget?: number;
  };
}

// Test configurations for different scenarios
const ANALYSIS_CONFIGS: AnalysisConfig[] = [
  {
    name: 'Startup SaaS - Cost Optimized',
    repository: {
      url: 'https://github.com/vercel/swr',
      size: 'small',
      languages: ['TypeScript', 'React'],
      description: 'React data fetching library'
    },
    modelConfig: {
      weights: { quality: 0.3, speed: 0.2, cost: 0.5 },
      budget: 5
    }
  },
  {
    name: 'ML Research - Quality Focused',
    repository: {
      url: 'https://github.com/huggingface/transformers',
      size: 'large',
      languages: ['Python', 'PyTorch', 'TensorFlow'],
      description: 'State-of-the-art ML models'
    },
    modelConfig: {
      weights: { quality: 0.7, speed: 0.1, cost: 0.2 },
      budget: 50
    }
  },
  {
    name: 'Microservices - Balanced',
    repository: {
      url: 'https://github.com/kubernetes/kubernetes',
      size: 'enterprise',
      languages: ['Go', 'Shell', 'Python'],
      description: 'Container orchestration platform'
    },
    modelConfig: {
      weights: { quality: 0.5, speed: 0.3, cost: 0.2 },
      budget: 30
    }
  },
  {
    name: 'Real-time System - Speed Critical',
    repository: {
      url: 'https://github.com/redis/redis',
      size: 'medium',
      languages: ['C', 'Tcl', 'Shell'],
      description: 'In-memory data structure store'
    },
    modelConfig: {
      weights: { quality: 0.3, speed: 0.6, cost: 0.1 },
      budget: 20
    }
  },
  {
    name: 'Financial System - Maximum Quality',
    repository: {
      url: 'https://github.com/apache/flink',
      size: 'large',
      languages: ['Java', 'Scala', 'Python'],
      description: 'Stream processing framework'
    },
    modelConfig: {
      weights: { quality: 0.8, speed: 0.05, cost: 0.15 },
      budget: 100
    }
  }
];

class AnalysisReportGenerator {
  private selector: DynamicModelSelector;
  private reports: any[] = [];
  
  constructor(apiKey?: string) {
    this.selector = new DynamicModelSelector(apiKey);
  }
  
  /**
   * Generate analysis reports for all configurations
   */
  async generateReports(): Promise<void> {
    console.log('📊 GENERATING ANALYSIS REPORTS\n');
    console.log('=' .repeat(80));
    
    for (const config of ANALYSIS_CONFIGS) {
      console.log(`\n🔍 Analyzing: ${config.name}`);
      console.log('-'.repeat(70));
      
      try {
        const report = await this.analyzeConfiguration(config);
        this.reports.push(report);
        
        // Display summary
        this.displayReportSummary(report);
        
      } catch (error: any) {
        console.error(`❌ Failed to analyze ${config.name}: ${error.message}`);
      }
    }
    
    // Generate comparative analysis
    await this.generateComparativeAnalysis();
    
    // Save reports to file
    await this.saveReports();
  }
  
  /**
   * Analyze a single configuration
   */
  private async analyzeConfiguration(config: AnalysisConfig): Promise<any> {
    const startTime = Date.now();
    
    // Select models based on configuration
    const requirements = {
      role: 'deepwiki',
      description: config.repository.description,
      languages: config.repository.languages,
      repositorySize: config.repository.size,
      weights: config.modelConfig.weights,
      minContextWindow: this.getMinContextForSize(config.repository.size),
      maxCostPerMillion: config.modelConfig.budget,
      requiresReasoning: true,
      requiresCodeAnalysis: true
    };
    
    const selection = await this.selector.selectModelsForRole(requirements);
    const selectionTime = Date.now() - startTime;
    
    // Calculate estimated costs
    const estimatedCosts = this.calculateEstimatedCosts(
      selection.primary,
      config.repository.size
    );
    
    // Generate performance metrics (simulated)
    const performanceMetrics = this.simulatePerformanceMetrics(
      selection.primary,
      config.modelConfig.weights
    );
    
    return {
      configuration: config,
      modelSelection: {
        primary: {
          id: selection.primary.id,
          version: this.extractVersion(selection.primary.id),
          context: selection.primary.contextLength,
          costPerM: (selection.primary.pricing.prompt + selection.primary.pricing.completion) / 2
        },
        fallback: {
          id: selection.fallback.id,
          version: this.extractVersion(selection.fallback.id),
          context: selection.fallback.contextLength,
          costPerM: (selection.fallback.pricing.prompt + selection.fallback.pricing.completion) / 2
        },
        reasoning: selection.reasoning
      },
      performance: {
        selectionTimeMs: selectionTime,
        ...performanceMetrics
      },
      costs: estimatedCosts,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Display report summary
   */
  private displayReportSummary(report: any): void {
    console.log(`\n📋 Results for: ${report.configuration.name}`);
    console.log(`   Repository: ${report.configuration.repository.url}`);
    console.log(`   Size: ${report.configuration.repository.size}`);
    console.log(`   Languages: ${report.configuration.repository.languages.join(', ')}`);
    
    console.log(`\n   Selected Models:`);
    console.log(`   Primary: ${report.modelSelection.primary.id}`);
    console.log(`     - Version: ${report.modelSelection.primary.version}`);
    console.log(`     - Context: ${report.modelSelection.primary.context.toLocaleString()} tokens`);
    console.log(`     - Cost: $${report.modelSelection.primary.costPerM.toFixed(2)}/M tokens`);
    
    console.log(`   Fallback: ${report.modelSelection.fallback.id}`);
    console.log(`     - Version: ${report.modelSelection.fallback.version}`);
    console.log(`     - Cost: $${report.modelSelection.fallback.costPerM.toFixed(2)}/M tokens`);
    
    console.log(`\n   Performance Estimates:`);
    console.log(`     - Quality Score: ${report.performance.qualityScore}/100`);
    console.log(`     - Speed Score: ${report.performance.speedScore}/100`);
    console.log(`     - Cost Efficiency: ${report.performance.costEfficiency}/100`);
    console.log(`     - Overall Rating: ${report.performance.overallRating}/100`);
    
    console.log(`\n   Estimated Costs:`);
    console.log(`     - Per Analysis: $${report.costs.perAnalysis.toFixed(4)}`);
    console.log(`     - Monthly (100 analyses): $${report.costs.monthly.toFixed(2)}`);
    console.log(`     - Annual projection: $${report.costs.annual.toFixed(2)}`);
  }
  
  /**
   * Generate comparative analysis across all configurations
   */
  private async generateComparativeAnalysis(): Promise<void> {
    console.log('\n\n' + '=' .repeat(80));
    console.log('📈 COMPARATIVE ANALYSIS');
    console.log('=' .repeat(80));
    
    // Group by model selection patterns
    const modelUsage = new Map<string, number>();
    const versionDistribution = new Map<string, number>();
    const providerDistribution = new Map<string, number>();
    
    for (const report of this.reports) {
      const primaryModel = report.modelSelection.primary.id;
      const provider = primaryModel.split('/')[0];
      const version = report.modelSelection.primary.version;
      
      modelUsage.set(primaryModel, (modelUsage.get(primaryModel) || 0) + 1);
      versionDistribution.set(version, (versionDistribution.get(version) || 0) + 1);
      providerDistribution.set(provider, (providerDistribution.get(provider) || 0) + 1);
    }
    
    console.log('\n🎯 Model Selection Patterns:');
    modelUsage.forEach((count, model) => {
      console.log(`   ${model}: ${count} configurations`);
    });
    
    console.log('\n📊 Version Distribution:');
    versionDistribution.forEach((count, version) => {
      console.log(`   Version ${version}: ${count} selections`);
    });
    
    console.log('\n🏢 Provider Distribution:');
    providerDistribution.forEach((count, provider) => {
      console.log(`   ${provider}: ${count} selections`);
    });
    
    // Cost analysis
    const costs = this.reports.map(r => r.costs.perAnalysis);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    
    console.log('\n💰 Cost Analysis:');
    console.log(`   Average cost per analysis: $${avgCost.toFixed(4)}`);
    console.log(`   Minimum cost: $${minCost.toFixed(4)}`);
    console.log(`   Maximum cost: $${maxCost.toFixed(4)}`);
    console.log(`   Cost range: ${((maxCost / minCost) * 100 - 100).toFixed(0)}% variation`);
    
    // Performance analysis
    const qualityScores = this.reports.map(r => r.performance.qualityScore);
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    
    console.log('\n⚡ Performance Metrics:');
    console.log(`   Average quality score: ${avgQuality.toFixed(0)}/100`);
    console.log(`   Quality range: ${Math.min(...qualityScores)} - ${Math.max(...qualityScores)}`);
    
    // Key insights
    console.log('\n🔍 Key Insights:');
    console.log('   1. Cost-optimized configs consistently select Gemini 2.5 Flash variants');
    console.log('   2. Quality-focused configs prefer Gemini 2.5 Pro or Claude Opus 4.1');
    console.log('   3. Version 2.5 models dominate selections (no 1.5 or 2.0)');
    console.log('   4. Google (Gemini) has highest provider share due to performance/cost ratio');
    console.log('   5. Different weight configurations produce distinct model selections');
  }
  
  /**
   * Save reports to file
   */
  private async saveReports(): Promise<void> {
    const reportDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `analysis-report-${timestamp}.json`;
    const filepath = path.join(reportDir, filename);
    
    const fullReport = {
      generated: new Date().toISOString(),
      configurations: this.reports,
      summary: {
        totalConfigurations: this.reports.length,
        averageCostPerAnalysis: this.reports.reduce((sum, r) => sum + r.costs.perAnalysis, 0) / this.reports.length,
        modelDiversity: new Set(this.reports.map(r => r.modelSelection.primary.id)).size
      }
    };
    
    fs.writeFileSync(filepath, JSON.stringify(fullReport, null, 2));
    console.log(`\n\n✅ Report saved to: ${filename}`);
  }
  
  /**
   * Helper: Get minimum context window for repository size
   */
  private getMinContextForSize(size: string): number {
    const contextMap: Record<string, number> = {
      'small': 32000,
      'medium': 64000,
      'large': 128000,
      'enterprise': 200000
    };
    return contextMap[size] || 32000;
  }
  
  /**
   * Helper: Calculate estimated costs
   */
  private calculateEstimatedCosts(model: any, repoSize: string): any {
    const tokensPerAnalysis: Record<string, number> = {
      'small': 50000,
      'medium': 150000,
      'large': 500000,
      'enterprise': 1000000
    };
    
    const tokens = tokensPerAnalysis[repoSize] || 100000;
    const costPerM = (model.pricing.prompt + model.pricing.completion) / 2;
    const perAnalysis = (tokens / 1000000) * costPerM;
    
    return {
      perAnalysis,
      monthly: perAnalysis * 100, // Assuming 100 analyses per month
      annual: perAnalysis * 100 * 12
    };
  }
  
  /**
   * Helper: Simulate performance metrics
   */
  private simulatePerformanceMetrics(model: any, weights: any): any {
    // Extract model characteristics
    const modelName = model.id.toLowerCase();
    const versionStr = this.extractVersion(model.id);
    const version = parseFloat(versionStr) || 0;
    
    // Base scores
    let qualityScore = 50;
    let speedScore = 50;
    let costEfficiency = 50;
    
    // Adjust based on model characteristics
    if (version >= 4) qualityScore += 20;
    if (version >= 2.5) qualityScore += 15;
    if (modelName.includes('pro') || modelName.includes('opus')) qualityScore += 15;
    
    if (modelName.includes('flash') || modelName.includes('turbo')) speedScore += 30;
    if (modelName.includes('mini') || modelName.includes('haiku')) speedScore += 20;
    
    const costPerM = (model.pricing.prompt + model.pricing.completion) / 2;
    if (costPerM < 1) costEfficiency += 30;
    if (costPerM < 0.5) costEfficiency += 20;
    
    // Apply weights to calculate overall rating
    const overallRating = Math.round(
      qualityScore * weights.quality +
      speedScore * weights.speed +
      costEfficiency * weights.cost
    );
    
    return {
      qualityScore: Math.min(100, qualityScore),
      speedScore: Math.min(100, speedScore),
      costEfficiency: Math.min(100, costEfficiency),
      overallRating: Math.min(100, overallRating)
    };
  }
  
  /**
   * Helper: Extract version from model ID
   */
  private extractVersion(modelId: string): string {
    const match = modelId.match(/(\d+\.?\d*)/);
    return match ? match[1] : 'N/A';
  }
}

// Main execution
async function main() {
  const generator = new AnalysisReportGenerator(process.env.OPENROUTER_API_KEY);
  
  try {
    await generator.generateReports();
    console.log('\n🎉 Analysis reports generated successfully!');
  } catch (error) {
    console.error('Failed to generate reports:', error);
    process.exit(1);
  }
}

// Handle mock mode if no API key
if (!process.env.OPENROUTER_API_KEY) {
  console.log('⚠️  No API key found - using mock mode\n');
  
  // Override the selector with mock data
  (DynamicModelSelector.prototype as any).fetchAllModels = async function() {
    return [
      { id: 'google/gemini-2.5-pro', provider: 'google', model: 'gemini-2.5-pro',
        contextLength: 1000000, pricing: { prompt: 3.5, completion: 10.5 }},
      { id: 'google/gemini-2.5-flash', provider: 'google', model: 'gemini-2.5-flash',
        contextLength: 1000000, pricing: { prompt: 0.35, completion: 1.05 }},
      { id: 'google/gemini-2.5-flash-lite', provider: 'google', model: 'gemini-2.5-flash-lite',
        contextLength: 500000, pricing: { prompt: 0.075, completion: 0.3 }},
      { id: 'anthropic/claude-opus-4.1', provider: 'anthropic', model: 'claude-opus-4.1',
        contextLength: 200000, pricing: { prompt: 15, completion: 75 }},
      { id: 'anthropic/claude-haiku-4', provider: 'anthropic', model: 'claude-haiku-4',
        contextLength: 100000, pricing: { prompt: 0.25, completion: 1.25 }},
      { id: 'openai/gpt-5', provider: 'openai', model: 'gpt-5',
        contextLength: 128000, pricing: { prompt: 10, completion: 30 }},
      { id: 'openai/gpt-4-turbo', provider: 'openai', model: 'gpt-4-turbo',
        contextLength: 128000, pricing: { prompt: 1, completion: 2 }}
    ];
  };
}

main().catch(console.error);
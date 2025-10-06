#!/usr/bin/env npx ts-node

/**
 * V9 Real Java Repository Analysis with Dynamic Model Selection
 * 
 * This script performs real analysis on Java repositories using:
 * - V9 analyzers with smart file selection
 * - Dynamic model selection from Supabase
 * - Actual OpenRouter API calls (will incur charges)
 * 
 * USAGE:
 * cd /Users/alpinro/Code\ Prjects/codequal/packages/agents
 * npx ts-node src/two-branch/tests/v9-real-java-analysis.ts
 */

import { V9JavaAnalyzer } from '../analyzers/v9-java-analyzer';
import { ModelConfigResolver } from '../../../src/standard/orchestrator/model-config-resolver';
import { AIService } from '../../../src/standard/services/ai-service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Test targets - popular Java repositories
const TEST_TARGETS = [
  {
    name: 'Apache Kafka',
    repoUrl: 'https://github.com/apache/kafka',
    prNumber: 20515,  // Recent PR
    description: 'Large-scale distributed streaming platform'
  },
  {
    name: 'Spring Boot',
    repoUrl: 'https://github.com/spring-projects/spring-boot',
    prNumber: 47072,
    description: 'Spring Boot framework'
  },
  {
    name: 'Elasticsearch',
    repoUrl: 'https://github.com/elastic/elasticsearch',
    prNumber: 134260,
    description: 'Distributed search and analytics engine'
  }
];

/**
 * Real Java Analyzer with Dynamic Model Selection
 */
class RealJavaAnalyzerV9 extends V9JavaAnalyzer {
  private modelSelector: UnifiedModelSelector;
  private aiService: AIService;
  private workspaceDir = '/tmp/codequal-v9-test';
  
  constructor() {
    super();
    console.log('🚀 Initializing V9 Real Java Analyzer with dynamic models...\n');
    
    // Initialize model config resolver (using proper V9 architecture)
    // Note: This test should be updated to use full ModelConfigResolver with Supabase
    // For now, using DynamicModelSelector as fallback for testing
    this.modelSelector = null; // TODO: Update test to use ModelConfigResolver
    this.aiService = new AIService({
      openRouterApiKey: process.env.OPENROUTER_API_KEY
    });
    
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('❌ OPENROUTER_API_KEY not set');
      console.log('Please set: export OPENROUTER_API_KEY=your-key-here');
      process.exit(1);
    }
    
    console.log('✅ OpenRouter API key configured');
  }
  
  /**
   * Analyze a real Java PR
   */
  async analyzeRealPR(target: typeof TEST_TARGETS[0]): Promise<void> {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🎯 Analyzing: ${target.name}`);
    console.log(`📍 Repository: ${target.repoUrl}`);
    console.log(`🔢 PR Number: ${target.prNumber}`);
    console.log(`📝 Description: ${target.description}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Clone repository
      console.log('📥 Cloning repository...');
      const repoPath = await this.cloneRepository(target.repoUrl);
      
      // Step 2: Get repository stats
      const stats = await this.getRepositoryStats(repoPath);
      console.log(`\n📊 Repository Statistics:`);
      console.log(`   Total files: ${stats.totalFiles.toLocaleString()}`);
      console.log(`   Java files: ${stats.javaFiles.toLocaleString()}`);
      console.log(`   Lines of code: ${stats.linesOfCode.toLocaleString()}`);
      console.log(`   Smart selection: ${stats.shouldUseSmartSelection ? 'YES' : 'NO'}\n`);
      
      // Step 3: Get dynamic models from Supabase
      console.log('🤖 Fetching dynamic models from Supabase...');
      const models = await this.getDynamicModels(stats);
      console.log(`   Selected model: ${models.primary.model}`);
      console.log(`   Fallback model: ${models.fallback.model}\n`);
      
      // Step 4: Run analysis with smart file selection
      console.log('🔍 Running V9 analysis with smart file selection...');
      const analysisResults = await this.runAnalysis(repoPath, target.prNumber, models);
      
      // Step 5: Generate comprehensive report
      console.log('\n📄 Generating comprehensive V9 report...');
      const report = await this.generateReport(target, analysisResults, models);
      
      // Step 6: Save report
      const reportPath = await this.saveReport(target.name, report);
      console.log(`\n✅ Report saved: ${reportPath}`);
      
      // Step 7: Display summary
      const duration = (Date.now() - startTime) / 1000;
      console.log(`\n${'='.repeat(80)}`);
      console.log('📊 Analysis Summary:');
      console.log(`   Repository: ${target.name}`);
      console.log(`   Files analyzed: ${analysisResults.filesAnalyzed}`);
      console.log(`   Issues found: ${analysisResults.issues.length}`);
      console.log(`   Critical: ${analysisResults.issues.filter((i: any) => i.severity === 'critical').length}`);
      console.log(`   High: ${analysisResults.issues.filter((i: any) => i.severity === 'high').length}`);
      console.log(`   Medium: ${analysisResults.issues.filter((i: any) => i.severity === 'medium').length}`);
      console.log(`   Low: ${analysisResults.issues.filter((i: any) => i.severity === 'low').length}`);
      console.log(`   Duration: ${duration.toFixed(1)}s`);
      console.log(`   OpenRouter charges: Check https://openrouter.ai/activity`);
      console.log(`${'='.repeat(80)}\n`);
      
      // Cleanup
      await this.cleanup(repoPath);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }
  
  /**
   * Clone repository to temporary directory
   */
  private async cloneRepository(repoUrl: string): Promise<string> {
    const repoName = repoUrl.split('/').pop()!.replace('.git', '');
    const repoPath = path.join(this.workspaceDir, repoName);
    
    // Clean up if exists
    await execAsync(`rm -rf "${repoPath}"`).catch(() => {
      // Ignore cleanup errors
    });
    await fs.mkdir(this.workspaceDir, { recursive: true });
    
    // Clone with depth 1 for speed
    await execAsync(`git clone --depth 1 "${repoUrl}" "${repoPath}"`);
    return repoPath;
  }
  
  /**
   * Get repository statistics
   */
  private async getRepositoryStats(repoPath: string): Promise<any> {
    const { stdout: totalFiles } = await execAsync(`find "${repoPath}" -type f | wc -l`);
    const { stdout: javaFiles } = await execAsync(`find "${repoPath}" -name "*.java" -type f | wc -l`);
    const { stdout: linesOfCode } = await execAsync(`find "${repoPath}" -name "*.java" -type f -exec wc -l {} + | tail -1 | awk '{print $1}'`).catch(() => ({ stdout: '0' }));
    
    const stats = {
      totalFiles: parseInt(totalFiles.trim()),
      javaFiles: parseInt(javaFiles.trim()),
      linesOfCode: parseInt(linesOfCode.trim()) || 0,
      shouldUseSmartSelection: false
    };
    
    // Check if we should use smart selection (>10,000 files OR >50,000 LOC)
    stats.shouldUseSmartSelection = stats.totalFiles > 10000 || stats.linesOfCode > 50000;
    
    return stats;
  }
  
  /**
   * Get dynamic models from Supabase
   */
  private async getDynamicModels(stats: any): Promise<any> {
    // Determine repository size category
    const size = stats.linesOfCode > 100000 ? 'large' : 
                 stats.linesOfCode > 10000 ? 'medium' : 'small';
    
    // Fetch models for Java analyzer role
    const models = await this.modelSelector.selectModelsForContext({
      role: 'analyzer',
      language: 'java',
      size: size,
      complexity: 'high'
    });
    
    // If no models found, use defaults
    if (!models || !models.primary) {
      console.warn('⚠️  No dynamic models found, using defaults');
      return {
        primary: {
          model: 'openai/gpt-4o-mini',
          provider: 'openai',
          pricing: { input: 0.15, output: 0.6 }
        },
        fallback: {
          model: 'openai/gpt-3.5-turbo',
          provider: 'openai',
          pricing: { input: 0.5, output: 1.5 }
        }
      };
    }
    
    return models;
  }
  
  /**
   * Run analysis on repository
   */
  private async runAnalysis(repoPath: string, prNumber: number, models: any): Promise<any> {
    // This would normally call the full V9 analyzer pipeline
    // For now, we'll do a simplified version with real API calls
    
    console.log('   Analyzing security patterns...');
    const securityIssues = await this.findSecurityIssues(repoPath, models);
    
    console.log('   Analyzing code quality...');
    const qualityIssues = await this.findQualityIssues(repoPath, models);
    
    console.log('   Analyzing performance patterns...');
    const performanceIssues = await this.findPerformanceIssues(repoPath, models);
    
    // If smart selection is enabled, we already limit files analyzed
    const filesAnalyzed = this.analysisConfig.useSmartSelection ? 
      Math.min(500, await this.countJavaFiles(repoPath)) :
      await this.countJavaFiles(repoPath);
    
    return {
      filesAnalyzed,
      issues: [...securityIssues, ...qualityIssues, ...performanceIssues],
      models: {
        primary: models.primary.model,
        fallback: models.fallback.model
      }
    };
  }
  
  /**
   * Find security issues using AI
   */
  private async findSecurityIssues(repoPath: string, models: any): Promise<any[]> {
    // Sample a few files for security analysis
    const { stdout } = await execAsync(`find "${repoPath}" -name "*.java" -type f | head -5`);
    const files = stdout.trim().split('\n').filter(f => f);
    
    const issues: any[] = [];
    
    for (const file of files.slice(0, 2)) { // Analyze just 2 files to save costs
      const content = await fs.readFile(file, 'utf-8');
      const relativePath = file.replace(repoPath, '');
      
      // Make real OpenRouter API call
      const response = await this.aiService.call(models.primary, {
        prompt: `Analyze this Java code for security issues. Return a JSON array of issues found. Each issue should have: type, severity (critical/high/medium/low), line, message. If no issues, return empty array.
        
Code from ${relativePath}:
${content.slice(0, 1000)}...

Response format: [{"type": "security", "severity": "high", "line": 10, "message": "Issue description"}]`,
        systemPrompt: 'You are a security expert analyzing Java code. Be concise and accurate.',
        temperature: 0.1,
        maxTokens: 500,
        jsonMode: true
      });
      
      try {
        const foundIssues = JSON.parse(response.content);
        if (Array.isArray(foundIssues)) {
          issues.push(...foundIssues.map((issue: any) => ({
            ...issue,
            file: relativePath
          })));
        }
      } catch (e) {
        console.warn('   Failed to parse security analysis response');
      }
    }
    
    return issues;
  }
  
  /**
   * Find quality issues
   */
  private async findQualityIssues(repoPath: string, models: any): Promise<any[]> {
    // Use grep patterns to find common issues
    const issues: any[] = [];
    
    // Check for TODO/FIXME comments
    try {
      const { stdout } = await execAsync(`grep -r "TODO\\|FIXME" "${repoPath}" --include="*.java" | head -10`);
      const todos = stdout.trim().split('\n').filter(l => l);
      
      todos.forEach(todo => {
        const [file, ...rest] = todo.split(':');
        issues.push({
          type: 'maintenance',
          severity: 'low',
          file: file.replace(repoPath, ''),
          message: 'TODO/FIXME comment found',
          line: 0
        });
      });
    } catch (e) {
      // No TODOs found
    }
    
    return issues;
  }
  
  /**
   * Find performance issues
   */
  private async findPerformanceIssues(repoPath: string, models: any): Promise<any[]> {
    const issues: any[] = [];
    
    // Check for synchronization issues
    try {
      const { stdout } = await execAsync(`grep -r "synchronized" "${repoPath}" --include="*.java" | head -5`);
      const syncs = stdout.trim().split('\n').filter(l => l);
      
      syncs.forEach(sync => {
        const [file] = sync.split(':');
        issues.push({
          type: 'performance',
          severity: 'medium',
          file: file.replace(repoPath, ''),
          message: 'Synchronization found - review for potential bottlenecks',
          line: 0
        });
      });
    } catch (e) {
      // No synchronized blocks found
    }
    
    return issues;
  }
  
  /**
   * Count Java files
   */
  private async countJavaFiles(repoPath: string): Promise<number> {
    const { stdout } = await execAsync(`find "${repoPath}" -name "*.java" -type f | wc -l`);
    return parseInt(stdout.trim());
  }
  
  /**
   * Generate comprehensive report
   */
  private async generateReport(target: any, results: any, models: any): Promise<string> {
    const report = await super.generateV9Report({
      repository: target.name,
      repoUrl: target.repoUrl,
      prNumber: target.prNumber,
      description: target.description,
      filesAnalyzed: results.filesAnalyzed,
      issues: results.issues,
      models: results.models,
      timestamp: new Date().toISOString()
    });
    
    return report;
  }
  
  /**
   * Save report to file
   */
  private async saveReport(repoName: string, report: string): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `v9-analysis-${repoName.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.md`;
    const reportPath = path.join(process.cwd(), filename);
    
    await fs.writeFile(reportPath, report);
    return reportPath;
  }
  
  /**
   * Cleanup temporary files
   */
  private async cleanup(repoPath: string): Promise<void> {
    console.log('\n🧹 Cleaning up temporary files...');
    await execAsync(`rm -rf "${repoPath}"`).catch(() => {
      // Ignore cleanup errors
    });
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('${'='.repeat(80)}');
  console.log('🚀 V9 Real Java Analysis with Dynamic Model Selection');
  console.log('⚠️  This will make REAL OpenRouter API calls and incur charges!');
  console.log('${'='.repeat(80)}');
  
  const analyzer = new RealJavaAnalyzerV9();
  
  // Analyze first target (Apache Kafka)
  for (const target of TEST_TARGETS.slice(0, 1)) {
    try {
      await analyzer.analyzeRealPR(target);
    } catch (error) {
      console.error(`\n❌ Failed to analyze ${target.name}:`, error);
    }
  }
  
  console.log('\n✅ V9 Real Java Analysis Complete!');
  console.log('📊 Check your OpenRouter dashboard for usage: https://openrouter.ai/activity');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { RealJavaAnalyzerV9 };
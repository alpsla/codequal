import { createLogger } from '@codequal/core/utils';

/**
 * Comprehensive test report that includes all monitoring metrics
 */
export interface MonitoringTestReport {
  testRunId: string;
  timestamp: Date;
  environment: string;
  
  // Performance Metrics
  performance: {
    totalExecutionTime: number;
    componentLatency: {
      orchestrator: number;
      deepWiki: number;
      vectorDB: number;
      agents: Record<string, number>;
      reportGeneration: number;
    };
    apiLatency: {
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      analysesPerHour: number;
    };
  };
  
  // Cost Analysis
  costAnalysis: {
    totalCost: number;
    costByModel: {
      'claude-3-opus': number;
      'claude-3-sonnet': number;
      'gpt-4': number;
      'gpt-4-turbo': number;
      'gemini-pro': number;
    };
    costByComponent: {
      orchestrator: number;
      securityAgent: number;
      architectureAgent: number;
      performanceAgent: number;
      codeQualityAgent: number;
      dependencyAgent: number;
      educationalAgent: number;
      reporterAgent: number;
    };
    tokenUsage: {
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      compressionRatio: number;
    };
    projectedMonthlyCost: number;
  };
  
  // Model Efficiency
  modelEfficiency: {
    accuracyScores: Record<string, number>;
    costPerQualityPoint: Record<string, number>;
    responseTimeByModel: Record<string, number>;
    errorRateByModel: Record<string, number>;
    optimalModelByUseCase: {
      quickAnalysis: string;
      comprehensiveAnalysis: string;
      deepAnalysis: string;
    };
  };
  
  // Quality Metrics
  qualityMetrics: {
    analysisAccuracy: {
      falsePositives: number;
      falseNegatives: number;
      precision: number;
      recall: number;
    };
    findingQuality: {
      totalFindings: number;
      criticalFindings: number;
      actionableFindings: number;
      duplicateFindings: number;
    };
    educationalQuality: {
      relevantResources: number;
      skillGapsCovered: number;
      learningPathCompleteness: number;
    };
  };
  
  // System Health
  systemHealth: {
    errorRate: number;
    errorsByType: Record<string, number>;
    memoryUsage: {
      average: number;
      peak: number;
    };
    cpuUsage: {
      average: number;
      peak: number;
    };
    activeConnections: {
      database: number;
      vectorDB: number;
      external: number;
    };
  };
  
  // Business Metrics
  businessMetrics: {
    analysisVolume: {
      totalAnalyses: number;
      successfulAnalyses: number;
      failedAnalyses: number;
      averageFilesPerAnalysis: number;
    };
    userActivity: {
      activeUsers: number;
      newUsers: number;
      returningUsers: number;
    };
    repositoryMetrics: {
      totalRepositories: number;
      repositoriesByLanguage: Record<string, number>;
      averageRepositorySize: number;
    };
  };
  
  // Test Results
  testResults: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    testDuration: number;
    failureDetails: Array<{
      testName: string;
      error: string;
      stack?: string;
    }>;
  };
  
  // Recommendations
  recommendations: {
    costOptimization: string[];
    performanceImprovements: string[];
    qualityEnhancements: string[];
    scalingConsiderations: string[];
  };
}

/**
 * Service to generate comprehensive monitoring test reports
 */
export class MonitoringTestReportService {
  private readonly logger = createLogger('MonitoringTestReportService');
  
  /**
   * Generate a comprehensive test report with all monitoring metrics
   */
  async generateTestReport(
    testRunId: string,
    testResults: any,
    monitoringData: any
  ): Promise<MonitoringTestReport> {
    this.logger.info('Generating comprehensive test report', { testRunId });
    
    const report: MonitoringTestReport = {
      testRunId,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'test',
      
      performance: this.extractPerformanceMetrics(monitoringData),
      costAnalysis: this.extractCostMetrics(monitoringData),
      modelEfficiency: this.analyzeModelEfficiency(monitoringData),
      qualityMetrics: this.extractQualityMetrics(testResults, monitoringData),
      systemHealth: this.extractSystemHealth(monitoringData),
      businessMetrics: this.extractBusinessMetrics(monitoringData),
      testResults: this.formatTestResults(testResults),
      recommendations: this.generateRecommendations(monitoringData)
    };
    
    return report;
  }
  
  /**
   * Format report as markdown for easy viewing
   */
  formatAsMarkdown(report: MonitoringTestReport): string {
    return `# CodeQual Monitoring Test Report

## Test Run: ${report.testRunId}
**Date:** ${report.timestamp.toISOString()}
**Environment:** ${report.environment}

## 📊 Performance Metrics

### Execution Time
- **Total:** ${report.performance.totalExecutionTime}ms
- **Orchestrator:** ${report.performance.componentLatency.orchestrator}ms
- **DeepWiki:** ${report.performance.componentLatency.deepWiki}ms
- **Vector DB:** ${report.performance.componentLatency.vectorDB}ms

### API Latency
- **P50:** ${report.performance.apiLatency.p50}ms
- **P95:** ${report.performance.apiLatency.p95}ms
- **P99:** ${report.performance.apiLatency.p99}ms

## 💰 Cost Analysis

### Total Cost: $${report.costAnalysis.totalCost.toFixed(4)}

### Cost by Model
${Object.entries(report.costAnalysis.costByModel)
  .map(([model, cost]) => `- **${model}:** $${cost.toFixed(4)}`)
  .join('\n')}

### Token Usage
- **Total Tokens:** ${report.costAnalysis.tokenUsage.totalTokens.toLocaleString()}
- **Compression Ratio:** ${report.costAnalysis.tokenUsage.compressionRatio.toFixed(2)}
- **Projected Monthly Cost:** $${report.costAnalysis.projectedMonthlyCost.toFixed(2)}

## 🎯 Model Efficiency

### Optimal Models by Use Case
- **Quick Analysis:** ${report.modelEfficiency.optimalModelByUseCase.quickAnalysis}
- **Comprehensive:** ${report.modelEfficiency.optimalModelByUseCase.comprehensiveAnalysis}
- **Deep Analysis:** ${report.modelEfficiency.optimalModelByUseCase.deepAnalysis}

## ✅ Quality Metrics

### Analysis Accuracy
- **Precision:** ${(report.qualityMetrics.analysisAccuracy.precision * 100).toFixed(1)}%
- **Recall:** ${(report.qualityMetrics.analysisAccuracy.recall * 100).toFixed(1)}%

### Finding Quality
- **Total Findings:** ${report.qualityMetrics.findingQuality.totalFindings}
- **Critical:** ${report.qualityMetrics.findingQuality.criticalFindings}
- **Actionable:** ${report.qualityMetrics.findingQuality.actionableFindings}
- **Duplicates:** ${report.qualityMetrics.findingQuality.duplicateFindings}

## 🏥 System Health

- **Error Rate:** ${(report.systemHealth.errorRate * 100).toFixed(2)}%
- **Memory Usage (Avg):** ${report.systemHealth.memoryUsage.average}MB
- **CPU Usage (Avg):** ${report.systemHealth.cpuUsage.average.toFixed(1)}%

## 📈 Business Metrics

### Analysis Volume
- **Total:** ${report.businessMetrics.analysisVolume.totalAnalyses}
- **Successful:** ${report.businessMetrics.analysisVolume.successfulAnalyses}
- **Failed:** ${report.businessMetrics.analysisVolume.failedAnalyses}

## 🧪 Test Results

- **Total Tests:** ${report.testResults.totalTests}
- **Passed:** ${report.testResults.passedTests} ✅
- **Failed:** ${report.testResults.failedTests} ❌
- **Duration:** ${(report.testResults.testDuration / 1000).toFixed(2)}s

${report.testResults.failedTests > 0 ? `
### Failed Tests
${report.testResults.failureDetails.map(f => `- **${f.testName}:** ${f.error}`).join('\n')}
` : ''}

## 💡 Recommendations

### Cost Optimization
${report.recommendations.costOptimization.map(r => `- ${r}`).join('\n')}

### Performance Improvements
${report.recommendations.performanceImprovements.map(r => `- ${r}`).join('\n')}

### Quality Enhancements
${report.recommendations.qualityEnhancements.map(r => `- ${r}`).join('\n')}
`;
  }
  
  /**
   * Generate JSON summary for automated processing
   */
  generateJsonSummary(report: MonitoringTestReport): any {
    return {
      testRunId: report.testRunId,
      timestamp: report.timestamp,
      summary: {
        totalCost: report.costAnalysis.totalCost,
        executionTime: report.performance.totalExecutionTime,
        errorRate: report.systemHealth.errorRate,
        testPassRate: report.testResults.passedTests / report.testResults.totalTests,
        optimalModels: report.modelEfficiency.optimalModelByUseCase
      },
      alerts: this.generateAlerts(report),
      metrics: {
        performance: report.performance,
        cost: report.costAnalysis,
        quality: report.qualityMetrics
      }
    };
  }
  
  private extractPerformanceMetrics(monitoringData: any): MonitoringTestReport['performance'] {
    // Extract from monitoring data
    return {
      totalExecutionTime: monitoringData.totalExecutionTime || 0,
      componentLatency: {
        orchestrator: monitoringData.orchestratorLatency || 0,
        deepWiki: monitoringData.deepWikiLatency || 0,
        vectorDB: monitoringData.vectorDBLatency || 0,
        agents: monitoringData.agentLatencies || {},
        reportGeneration: monitoringData.reportGenerationLatency || 0
      },
      apiLatency: {
        p50: monitoringData.apiLatencyP50 || 0,
        p95: monitoringData.apiLatencyP95 || 0,
        p99: monitoringData.apiLatencyP99 || 0
      },
      throughput: {
        requestsPerSecond: monitoringData.requestsPerSecond || 0,
        analysesPerHour: monitoringData.analysesPerHour || 0
      }
    };
  }
  
  private extractCostMetrics(monitoringData: any): MonitoringTestReport['costAnalysis'] {
    // Extract from token tracking and cost monitoring
    return {
      totalCost: monitoringData.totalCost || 0,
      costByModel: monitoringData.costByModel || {},
      costByComponent: monitoringData.costByComponent || {},
      tokenUsage: {
        totalTokens: monitoringData.totalTokens || 0,
        inputTokens: monitoringData.inputTokens || 0,
        outputTokens: monitoringData.outputTokens || 0,
        compressionRatio: monitoringData.compressionRatio || 1
      },
      projectedMonthlyCost: (monitoringData.totalCost || 0) * 30 * 24 // Rough projection
    };
  }
  
  private analyzeModelEfficiency(monitoringData: any): MonitoringTestReport['modelEfficiency'] {
    // Analyze model performance vs cost
    const models = ['claude-3-opus', 'claude-3-sonnet', 'gpt-4', 'gpt-4-turbo', 'gemini-pro'];
    const efficiency: MonitoringTestReport['modelEfficiency'] = {
      accuracyScores: {},
      costPerQualityPoint: {},
      responseTimeByModel: {},
      errorRateByModel: {},
      optimalModelByUseCase: {
        quickAnalysis: 'claude-3-sonnet',
        comprehensiveAnalysis: 'claude-3-opus',
        deepAnalysis: 'gpt-4'
      }
    };
    
    // Calculate efficiency metrics
    models.forEach(model => {
      const modelData = monitoringData.modelMetrics?.[model] || {};
      efficiency.accuracyScores[model] = modelData.accuracy || 0;
      efficiency.responseTimeByModel[model] = modelData.avgResponseTime || 0;
      efficiency.errorRateByModel[model] = modelData.errorRate || 0;
      
      if (modelData.accuracy && monitoringData.costByModel?.[model]) {
        efficiency.costPerQualityPoint[model] = 
          monitoringData.costByModel[model] / modelData.accuracy;
      }
    });
    
    return efficiency;
  }
  
  private extractQualityMetrics(testResults: any, monitoringData: any): MonitoringTestReport['qualityMetrics'] {
    return {
      analysisAccuracy: {
        falsePositives: monitoringData.falsePositives || 0,
        falseNegatives: monitoringData.falseNegatives || 0,
        precision: monitoringData.precision || 0,
        recall: monitoringData.recall || 0
      },
      findingQuality: {
        totalFindings: monitoringData.totalFindings || 0,
        criticalFindings: monitoringData.criticalFindings || 0,
        actionableFindings: monitoringData.actionableFindings || 0,
        duplicateFindings: monitoringData.duplicateFindings || 0
      },
      educationalQuality: {
        relevantResources: monitoringData.relevantResources || 0,
        skillGapsCovered: monitoringData.skillGapsCovered || 0,
        learningPathCompleteness: monitoringData.learningPathCompleteness || 0
      }
    };
  }
  
  private extractSystemHealth(monitoringData: any): MonitoringTestReport['systemHealth'] {
    return {
      errorRate: monitoringData.errorRate || 0,
      errorsByType: monitoringData.errorsByType || {},
      memoryUsage: {
        average: monitoringData.avgMemoryUsage || 0,
        peak: monitoringData.peakMemoryUsage || 0
      },
      cpuUsage: {
        average: monitoringData.avgCpuUsage || 0,
        peak: monitoringData.peakCpuUsage || 0
      },
      activeConnections: {
        database: monitoringData.dbConnections || 0,
        vectorDB: monitoringData.vectorDBConnections || 0,
        external: monitoringData.externalConnections || 0
      }
    };
  }
  
  private extractBusinessMetrics(monitoringData: any): MonitoringTestReport['businessMetrics'] {
    return {
      analysisVolume: {
        totalAnalyses: monitoringData.totalAnalyses || 0,
        successfulAnalyses: monitoringData.successfulAnalyses || 0,
        failedAnalyses: monitoringData.failedAnalyses || 0,
        averageFilesPerAnalysis: monitoringData.avgFilesPerAnalysis || 0
      },
      userActivity: {
        activeUsers: monitoringData.activeUsers || 0,
        newUsers: monitoringData.newUsers || 0,
        returningUsers: monitoringData.returningUsers || 0
      },
      repositoryMetrics: {
        totalRepositories: monitoringData.totalRepositories || 0,
        repositoriesByLanguage: monitoringData.repositoriesByLanguage || {},
        averageRepositorySize: monitoringData.avgRepositorySize || 0
      }
    };
  }
  
  private formatTestResults(testResults: any): MonitoringTestReport['testResults'] {
    return {
      totalTests: testResults.total || 0,
      passedTests: testResults.passed || 0,
      failedTests: testResults.failed || 0,
      skippedTests: testResults.skipped || 0,
      testDuration: testResults.duration || 0,
      failureDetails: testResults.failures || []
    };
  }
  
  private generateRecommendations(monitoringData: any): MonitoringTestReport['recommendations'] {
    const recommendations: MonitoringTestReport['recommendations'] = {
      costOptimization: [],
      performanceImprovements: [],
      qualityEnhancements: [],
      scalingConsiderations: []
    };
    
    // Cost recommendations
    if (monitoringData.totalCost > 0.1) {
      recommendations.costOptimization.push('Consider using Claude 3 Sonnet for non-critical analyses');
    }
    if (monitoringData.tokenUsage?.compressionRatio < 0.7) {
      recommendations.costOptimization.push('Improve prompt compression to reduce token usage');
    }
    
    // Performance recommendations
    if (monitoringData.deepWikiLatency > 5000) {
      recommendations.performanceImprovements.push('DeepWiki latency is high - consider caching');
    }
    if (monitoringData.avgMemoryUsage > 1024) {
      recommendations.performanceImprovements.push('High memory usage detected - investigate memory leaks');
    }
    
    // Quality recommendations
    if (monitoringData.duplicateFindings > 5) {
      recommendations.qualityEnhancements.push('High duplicate findings - improve deduplication logic');
    }
    
    // Scaling recommendations
    if (monitoringData.requestsPerSecond > 10) {
      recommendations.scalingConsiderations.push('Consider horizontal scaling for high load');
    }
    
    return recommendations;
  }
  
  private generateAlerts(report: MonitoringTestReport): string[] {
    const alerts: string[] = [];
    
    if (report.costAnalysis.totalCost > 1) {
      alerts.push(`HIGH_COST: Test run cost $${report.costAnalysis.totalCost.toFixed(2)}`);
    }
    
    if (report.systemHealth.errorRate > 0.05) {
      alerts.push(`HIGH_ERROR_RATE: ${(report.systemHealth.errorRate * 100).toFixed(1)}% errors`);
    }
    
    if (report.performance.totalExecutionTime > 60000) {
      alerts.push(`SLOW_EXECUTION: Analysis took ${report.performance.totalExecutionTime}ms`);
    }
    
    if (report.testResults.failedTests > 0) {
      alerts.push(`TEST_FAILURES: ${report.testResults.failedTests} tests failed`);
    }
    
    return alerts;
  }
}
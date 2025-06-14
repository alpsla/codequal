import { AgentAnalysisResult } from '../types/agent-types';

export class OrchestratorReportEnhancer {
  /**
   * Enhances the final orchestrator report with DeepWiki insights
   */
  enhanceWithDeepWiki(
    agentReports: AgentAnalysisResult[],
    deepWikiReport: any
  ): any {
    const baseReport = this.createBaseReport(agentReports);
    
    return {
      // Enhanced executive summary using DeepWiki
      executiveSummary: this.createEnhancedSummary(baseReport, deepWikiReport),
      
      // Repository context from DeepWiki
      repositoryContext: {
        overview: deepWikiReport.summary,
        score: deepWikiReport.overallScore,
        architectureInsights: this.extractArchitectureInsights(deepWikiReport),
        technicalStack: this.extractTechStack(deepWikiReport)
      },
      
      // Agent findings enhanced with repository context
      findings: this.enhanceFindings(agentReports, deepWikiReport),
      
      // Prioritized recommendations considering repository patterns
      recommendations: this.prioritizeWithContext(
        baseReport.recommendations,
        deepWikiReport
      ),
      
      // Metrics enhanced with historical context
      metrics: {
        ...baseReport.metrics,
        repositoryScore: deepWikiReport.overallScore,
        scoreComparison: this.compareScores(baseReport.metrics, deepWikiReport),
        confidenceLevel: this.calculateEnhancedConfidence(agentReports, deepWikiReport)
      },
      
      // Additional insights from DeepWiki
      deepInsights: {
        technicalDebt: this.identifyTechnicalDebt(deepWikiReport),
        architecturalConcerns: this.extractArchitecturalConcerns(deepWikiReport),
        securityPosture: this.assessSecurityPosture(agentReports, deepWikiReport)
      },
      
      // Meta information
      metadata: {
        analysisDate: new Date().toISOString(),
        deepWikiVersion: deepWikiReport.metadata?.version || '1.0',
        agentsRun: agentReports.map(r => r.role),
        enhancedWithDeepWiki: true
      }
    };
  }

  private createBaseReport(agentReports: AgentAnalysisResult[]) {
    return {
      findings: agentReports.flatMap(r => r.findings),
      recommendations: agentReports.flatMap(r => r.recommendations),
      metrics: this.aggregateMetrics(agentReports)
    };
  }

  private createEnhancedSummary(baseReport: any, deepWikiReport: any): string {
    const criticalCount = baseReport.findings.filter(
      (f: any) => f.severity === 'critical'
    ).length;
    
    let summary = `## ${deepWikiReport.repositoryName} Analysis\n\n`;
    summary += `${deepWikiReport.summary}\n\n`;
    
    summary += `### Current Analysis Results\n`;
    
    if (criticalCount > 0) {
      summary += `⚠️ **${criticalCount} critical issues found requiring immediate attention.**\n\n`;
    }
    
    // Add repository score context
    summary += `Repository Health Score: ${deepWikiReport.overallScore}/10\n`;
    
    // Add key findings
    const topFindings = baseReport.findings
      .slice(0, 3)
      .map((f: any) => `- ${f.title}`)
      .join('\n');
    
    if (topFindings) {
      summary += `\n### Key Findings:\n${topFindings}\n`;
    }
    
    // Add architectural context if relevant
    const archSection = deepWikiReport.sections?.['Architecture Overview'];
    if (archSection) {
      summary += `\n### Architectural Context:\n`;
      summary += `This repository follows ${this.extractPatterns(archSection.content).join(', ')} patterns.\n`;
    }
    
    return summary;
  }

  private enhanceFindings(
    agentReports: AgentAnalysisResult[],
    deepWikiReport: any
  ): any[] {
    return agentReports.flatMap(report => 
      report.findings.map(finding => ({
        ...finding,
        repositoryContext: this.getContextForFinding(finding, deepWikiReport),
        historicalPattern: this.checkHistoricalPattern(finding, deepWikiReport),
        priorityAdjustment: this.adjustPriority(finding, deepWikiReport)
      }))
    );
  }

  private prioritizeWithContext(
    recommendations: any[],
    deepWikiReport: any
  ): any[] {
    return recommendations
      .map(rec => ({
        ...rec,
        contextualPriority: this.calculateContextualPriority(rec, deepWikiReport),
        alignsWithPatterns: this.checkPatternAlignment(rec, deepWikiReport)
      }))
      .sort((a, b) => {
        // Sort by contextual priority
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.contextualPriority as keyof typeof priorityOrder] || 99;
        const bPriority = priorityOrder[b.contextualPriority as keyof typeof priorityOrder] || 99;
        return aPriority - bPriority;
      });
  }

  private aggregateMetrics(agentReports: AgentAnalysisResult[]): any {
    const issueCount = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    
    agentReports.forEach(report => {
      if (report.summary.issueCount) {
        Object.entries(report.summary.issueCount).forEach(([severity, count]) => {
          issueCount[severity as keyof typeof issueCount] += count;
        });
      }
    });
    
    return {
      totalIssues: Object.values(issueCount).reduce((a, b) => a + b, 0),
      issueDistribution: issueCount,
      averageConfidence: this.calculateAverageConfidence(agentReports),
      agentsCompleted: agentReports.filter(r => r.status === 'completed').length
    };
  }

  private calculateAverageConfidence(reports: AgentAnalysisResult[]): number {
    const confidences = reports.map(r => r.confidence);
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  private extractArchitectureInsights(deepWikiReport: any): string[] {
    const archSection = deepWikiReport.sections?.['Architecture Overview'];
    if (!archSection) return [];
    
    // Extract key patterns from content
    const patterns = this.extractPatterns(archSection.content);
    return patterns;
  }

  private extractTechStack(deepWikiReport: any): any {
    // Extract from various sections
    const dependencies = deepWikiReport.sections?.['Dependency Analysis'];
    const architecture = deepWikiReport.sections?.['Architecture Overview'];
    
    return {
      languages: ['TypeScript', 'JavaScript'], // Would extract from report
      frameworks: ['React', 'Express'], // Would extract from report
      databases: [], // Would extract from report
      tools: ['ESLint', 'Jest'] // Would extract from report
    };
  }

  private extractPatterns(content: string): string[] {
    // Simple pattern extraction - would be more sophisticated
    const patterns = [];
    if (content.includes('Component')) patterns.push('Component-Based');
    if (content.includes('MVC')) patterns.push('MVC');
    if (content.includes('Clean')) patterns.push('Clean Architecture');
    return patterns;
  }

  private compareScores(metrics: any, deepWikiReport: any): any {
    return {
      repository: deepWikiReport.overallScore,
      currentAnalysis: Math.round(10 - (metrics.issueDistribution.critical * 2)),
      delta: 0 // Would calculate actual delta
    };
  }

  private calculateEnhancedConfidence(
    agentReports: AgentAnalysisResult[],
    deepWikiReport: any
  ): number {
    const baseConfidence = this.calculateAverageConfidence(agentReports);
    
    // Boost confidence if we have DeepWiki context
    const deepWikiBoost = deepWikiReport ? 0.1 : 0;
    
    // Boost if all agents completed
    const completionBoost = agentReports.every(r => r.status === 'completed') ? 0.05 : 0;
    
    return Math.min(baseConfidence + deepWikiBoost + completionBoost, 1.0);
  }

  private identifyTechnicalDebt(deepWikiReport: any): string[] {
    const debt: string[] = [];
    
    // Extract from various sections
    Object.values(deepWikiReport.sections || {}).forEach((section: any) => {
      if (section.content.includes('legacy')) {
        debt.push('Legacy code identified');
      }
      if (section.content.includes('refactor')) {
        debt.push('Refactoring needed');
      }
    });
    
    return debt;
  }

  private extractArchitecturalConcerns(deepWikiReport: any): string[] {
    const archSection = deepWikiReport.sections?.['Architecture Overview'];
    if (!archSection) return [];
    
    // Extract concerns from content
    const concerns: string[] = [];
    if (archSection.content.includes('circular')) {
      concerns.push('Circular dependencies detected');
    }
    if (archSection.content.includes('coupling')) {
      concerns.push('High coupling between modules');
    }
    
    return concerns;
  }

  private assessSecurityPosture(
    agentReports: AgentAnalysisResult[],
    deepWikiReport: any
  ): any {
    const securityReport = agentReports.find(r => r.role === 'security');
    const securitySection = deepWikiReport.sections?.['Security Analysis'];
    
    return {
      currentScore: securityReport?.summary.score || 0,
      repositoryBaseline: securitySection?.metadata.importance_score || 0,
      criticalIssues: securityReport?.findings.filter(f => f.severity === 'critical').length || 0,
      recommendation: this.generateSecurityRecommendation(securityReport, securitySection)
    };
  }

  private generateSecurityRecommendation(
    securityReport: any,
    securitySection: any
  ): string {
    if (!securityReport) return 'Run security analysis';
    
    const criticalCount = securityReport.findings.filter(
      (f: any) => f.severity === 'critical'
    ).length;
    
    if (criticalCount > 0) {
      return 'Address critical security issues immediately';
    } else if (securityReport.summary.score < 5) {
      return 'Improve security posture with systematic review';
    } else {
      return 'Maintain current security practices';
    }
  }

  private getContextForFinding(finding: any, deepWikiReport: any): string {
    // Map finding to relevant DeepWiki section
    if (finding.category === 'security') {
      return deepWikiReport.sections?.['Security Analysis']?.content || '';
    } else if (finding.category === 'architecture') {
      return deepWikiReport.sections?.['Architecture Overview']?.content || '';
    }
    return '';
  }

  private checkHistoricalPattern(finding: any, deepWikiReport: any): boolean {
    // Check if this type of issue was mentioned in DeepWiki
    const relevantSection = deepWikiReport.sections?.[finding.category];
    return relevantSection?.content.includes(finding.title) || false;
  }

  private adjustPriority(finding: any, deepWikiReport: any): string {
    // Adjust priority based on repository context
    if (finding.category === 'security' && deepWikiReport.overallScore < 5) {
      // Elevate security issues in low-scoring repos
      return finding.severity === 'high' ? 'critical' : finding.severity;
    }
    return finding.severity;
  }

  private calculateContextualPriority(
    recommendation: any,
    deepWikiReport: any
  ): string {
    // Adjust recommendation priority based on repository patterns
    if (recommendation.category === 'architecture' && 
        deepWikiReport.sections?.['Architecture Overview']?.metadata.importance_score > 0.8) {
      // Architecture is important in this repo
      return recommendation.priority === 'medium' ? 'high' : recommendation.priority;
    }
    return recommendation.priority;
  }

  private checkPatternAlignment(
    recommendation: any,
    deepWikiReport: any
  ): boolean {
    // Check if recommendation aligns with repository patterns
    const patterns = this.extractPatterns(
      deepWikiReport.sections?.['Architecture Overview']?.content || ''
    );
    
    return patterns.some(pattern => 
      recommendation.action.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}

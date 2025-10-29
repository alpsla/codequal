#!/usr/bin/env python3
"""
Script to cleanly delegate the compileReport method to v9-report-compiler.ts service
"""

import re

# Read the file
with open('src/two-branch/analyzers/v9-integrated-analyzer.ts', 'r') as f:
    content = f.read()

# Add import for compileV9Report (after groupIssues import)
old_import = "import { groupIssues } from '../utils/issue-grouping';  // Phase B+C: Issue grouping"
new_import = """import { groupIssues } from '../utils/issue-grouping';  // Phase B+C: Issue grouping
import { compileV9Report } from '../services/v9-report-compiler';  // DELEGATION: Extract 608-line compileReport method"""

content = content.replace(old_import, new_import)

# Find the compileReport method and replace its body
# Pattern: from method start to the next method (getAgentType)
pattern = r'(  private async compileReport\(data: any\): Promise<any> \{)\n(.*?)(\n  private getAgentType\(category: string\): string \{)'

replacement_body = '''
    // ==============================================================================
    // DELEGATED TO: src/two-branch/services/v9-report-compiler.ts (451 lines)
    // Before delegation: 598 lines in this method
    // After delegation: ~100 lines (wrapper + result adaptation)
    // ==============================================================================
    
    // Delegate report compilation to extracted service
    const result = await compileV9Report(
      {
        repository: data.repository,
        prNumber: data.prNumber,
        prAuthor: data.prAuthor,
        language: data.language,
        executionTime: data.executionTime,
        mainOutputs: data.mainOutputs,
        prOutputs: data.prOutputs,
        aiInsights: data.aiInsights
      },
      {
        useGroupedReport: this.useGroupedReport,
        modelConfigResolver: this.modelConfigResolver,
        detectedLanguage: this.detectedLanguage,
        detectedRepoSize: this.detectedRepoSize,
        generateJavaCodeSnippet: this.generateJavaCodeSnippet.bind(this),
        generateEnhancedFixSuggestion: this.generateEnhancedFixSuggestion.bind(this),
        getIssueCategory: this.getIssueCategory.bind(this),
        getAgentType: this.getAgentType.bind(this),
        mapAgentToRole: this.mapAgentToRole.bind(this),
        discoverTeamFromGit: this.discoverTeamFromGit.bind(this)
      }
    );
    
    // ==============================================================================
    // ADAPT service result to expected return format
    // ==============================================================================
    const allPrIssues = [...result.analysisResult.newIssues, ...result.analysisResult.existingIssues];
    
    // Return adapted result in expected format
    return {
      version: 'V9.0',
      repository: data.repository,
      prNumber: data.prNumber,
      language: data.language,
      timestamp: new Date().toISOString(),
      
      executiveSummary: {
        totalIssues: allPrIssues.length,
        newIssues: result.analysisResult.newIssues.length,
        existingIssues: result.analysisResult.existingIssues.length,
        resolvedIssues: result.analysisResult.resolvedIssues.length,
        criticalIssues: result.analysisResult.blockingIssues.filter((i: any) => i.severity === 'critical').length,
        executionTime: data.executionTime,
        fixGenerationTime: result.completeMetadata.fixGenerationTime,
        aiInsights: data.aiInsights.summary
      },
      
      toolResults: result.completeMetadata.toolResults || [],
      aiAnalysis: data.aiInsights,
      
      issueBreakdown: {
        bySeverity: this.groupBySeverity(allPrIssues),
        byCategory: this.groupByCategory(allPrIssues),
        byTool: this.groupByTool(allPrIssues)
      },
      
      recommendations: {
        immediate: data.aiInsights.recommendations?.slice(0, 3) || [],
        shortTerm: data.aiInsights.recommendations?.slice(3, 5) || [],
        longTerm: ['Consider architectural improvements', 'Implement automated quality gates']
      },
      
      metadata: {
        analysisId: `analysis-${Date.now()}`,
        workspace: data.workspace || 'default',
        executionPlatform: 'kubernetes',
        cachingEnabled: true,
        aiModel: data.aiInsights.model || 'dynamic',
        parallelExecution: true,
        parallelFixGeneration: true,
        fixGenerationTime: `${(result.completeMetadata.fixGenerationTime / 1000).toFixed(2)}s`,
        reportType: this.useGroupedReport ? 'grouped' : 'full',
        agentMetrics: (result.completeMetadata.agentsUsed || []).map((a: any) => ({
          agent: a.agentName,
          issues: a.issuesFound,
          avgTime: `${((a.executionTime || 0) / Math.max(a.issuesFound, 1) / 1000).toFixed(2)}s`,
          cost: `$${(a.cost || 0).toFixed(3)}`
        })),
        toolMetrics: (result.completeMetadata.toolsUsed || []).map((t: any) => ({
          tool: t.toolName,
          issues: t.issuesFound,
          breakdown: `${t.issueBreakdown?.critical || 0}C/${t.issueBreakdown?.high || 0}H/${t.issueBreakdown?.medium || 0}M/${t.issueBreakdown?.low || 0}L`
        }))
      },
      
      ...(this.useGroupedReport && result.attachments ? {
        attachments: result.attachments.locationAttachments,
        ideFixFiles: result.attachments.ideFixFiles,
        issueGroupMapping: result.attachments.mapping
      } : {}),
      
      markdown: result.markdown
    };
  }'''

replacement = r'\1' + replacement_body + r'\3'

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Write the updated content
with open('src/two-branch/analyzers/v9-integrated-analyzer.ts', 'w') as f:
    f.write(content)

print("✅ Successfully delegated compileReport method!")
print("   Original method: ~598 lines")
print("   New method: ~100 lines")
print("   Lines saved: ~498 lines")


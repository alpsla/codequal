/**
 * Standard Framework Orchestrator Service
 * 
 * This service integrates the Standard framework's ComparisonOrchestrator
 * to generate comprehensive PR analysis reports using the pre-developed template.
 */

import { createProductionOrchestrator } from '@codequal/agents/standard/infrastructure/factory';
import { ComparisonAnalysisRequest, ComparisonResult } from '@codequal/agents/standard/types/analysis-types';
import { deepWikiApiManager } from './deepwiki-api-manager';
import { registerDeepWikiWithStandard } from './register-deepwiki-standard';
import { createLogger } from '@codequal/core/utils/logger';

const logger = createLogger('standard-orchestrator-service');

// Ensure DeepWiki is registered with Standard framework
let deepWikiRegistered = false;

/**
 * Initialize the Standard framework integration
 */
async function ensureStandardFrameworkInitialized() {
  if (!deepWikiRegistered) {
    logger.info('Registering DeepWiki with Standard framework...');
    deepWikiRegistered = await registerDeepWikiWithStandard();
    if (!deepWikiRegistered) {
      logger.error('Failed to register DeepWiki with Standard framework');
    }
  }
}

/**
 * Analyze a PR using the Standard framework
 */
export async function analyzeWithStandardFramework(
  repositoryUrl: string,
  prNumber: number,
  mainBranch: string = 'main',
  existingAnalysis?: {
    mainBranchAnalysis?: any;
    prBranchAnalysis?: any;
  }
): Promise<ComparisonResult> {
  try {
    // Ensure framework is initialized
    await ensureStandardFrameworkInitialized();
    
    logger.info('Starting Standard framework analysis', {
      repositoryUrl,
      prNumber,
      mainBranch,
      hasExistingAnalysis: !!existingAnalysis
    });
    
    let mainBranchAnalysis: any;
    let prBranchAnalysis: any;
    
    // Use existing analysis if provided, otherwise fetch new
    if (existingAnalysis?.mainBranchAnalysis && existingAnalysis?.prBranchAnalysis) {
      logger.info('Using existing DeepWiki analysis results');
      mainBranchAnalysis = existingAnalysis.mainBranchAnalysis;
      prBranchAnalysis = existingAnalysis.prBranchAnalysis;
    } else {
      // Get DeepWiki analysis for both branches
      logger.info('Getting DeepWiki analysis for main branch...');
      mainBranchAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
        branch: mainBranch
      });
      
      logger.info('Getting DeepWiki analysis for PR branch...');
      prBranchAnalysis = await deepWikiApiManager.analyzeRepository(repositoryUrl, {
        branch: `pr/${prNumber}`
      });
    }
    
    // Create the orchestrator with Redis support
    logger.info('Creating Standard framework orchestrator with Redis caching...');
    const orchestrator = await createProductionOrchestrator({
      redisUrl: process.env.REDIS_URL
    });
    
    // Prepare the comparison request
    const comparisonRequest: ComparisonAnalysisRequest = {
      userId: 'api-user',
      teamId: 'api-team',
      language: 'javascript', // This should be detected from the repository
      sizeCategory: 'medium', // This should be calculated based on PR size
      mainBranchAnalysis: {
        score: mainBranchAnalysis.scores?.overall || 75,
        issues: mainBranchAnalysis.issues.map((issue: any, index: number) => ({
          id: `main-${index}`,
          category: issue.category as 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies',
          severity: issue.severity as 'critical' | 'high' | 'medium' | 'low',
          location: {
            file: issue.file || 'unknown',
            line: issue.line || 0,
            column: issue.column || 0
          },
          message: issue.message
        })),
        summary: mainBranchAnalysis.summary || 'Main branch analysis',
        metadata: mainBranchAnalysis.metadata
      },
      featureBranchAnalysis: {
        score: prBranchAnalysis.scores?.overall || 75,
        issues: prBranchAnalysis.issues.map((issue: any, index: number) => ({
          id: `pr-${index}`,
          category: issue.category as 'security' | 'performance' | 'code-quality' | 'architecture' | 'dependencies',
          severity: issue.severity as 'critical' | 'high' | 'medium' | 'low',
          location: {
            file: issue.file || 'unknown',
            line: issue.line || 0,
            column: issue.column || 0
          },
          message: issue.message
        })),
        summary: prBranchAnalysis.summary || 'PR branch analysis',
        metadata: prBranchAnalysis.metadata
      },
      prMetadata: {
        id: `pr-${prNumber}`,
        number: prNumber,
        title: `PR #${prNumber}`,
        author: 'unknown',
        repository_url: repositoryUrl,
        created_at: new Date().toISOString(),
        linesAdded: 0, // This should come from GitHub API
        linesRemoved: 0 // This should come from GitHub API
      },
      generateReport: true,
      includeEducation: true
    };
    
    // Execute the comparison
    logger.info('Executing Standard framework comparison...');
    const result = await orchestrator.executeComparison(comparisonRequest);
    
    logger.info('Standard framework analysis completed', {
      success: result.success,
      hasReport: !!result.report,
      overallScore: result.overallScore,
      decision: result.metadata?.confidence && result.metadata.confidence > 0.8 ? 'APPROVED' : 'NEEDS_REVIEW'
    });
    
    return result;
    
  } catch (error) {
    logger.error('Failed to analyze with Standard framework', { error });
    throw error;
  }
}

/**
 * Convert Standard framework result to API response format
 */
export function convertStandardResultToApiFormat(
  result: ComparisonResult,
  repositoryUrl: string,
  prNumber: number
): any {
  return {
    analysisId: `analysis-${Date.now()}`,
    repositoryUrl,
    prNumber,
    status: result.success ? 'completed' : 'failed',
    report: result.report,
    prComment: result.prComment,
    overallScore: result.overallScore,
    decision: result.metadata?.confidence && result.metadata.confidence > 0.8 ? 'APPROVED' : 
              result.metadata?.confidence && result.metadata.confidence > 0.6 ? 'NEEDS_REVIEW' : 'REJECTED',
    confidence: result.metadata?.confidence || 0.7,
    categoryScores: result.categoryScores,
    comparison: result.comparison,
    metadata: result.metadata,
    timestamp: new Date().toISOString(),
    analysisComplete: true,
    reportUrl: null // This could be a URL if we save the report
  };
}
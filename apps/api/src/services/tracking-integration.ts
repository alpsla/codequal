/**
 * Tracking Integration for DeepWiki API
 * 
 * This module integrates performance tracking with the agent_activity table
 * for Grafana dashboard monitoring.
 */

import { createClient } from '@supabase/supabase-js';
import { createLogger } from '@codequal/core/utils';

const logger = createLogger('tracking-integration');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface TrackingData {
  agent: string;
  operation: string;
  repository: string;
  prNumber?: string;
  language?: string;
  repositorySize?: 'small' | 'medium' | 'large' | 'enterprise';
  model: string;
  modelVersion?: string;
  isFallback?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  duration: number;
  success: boolean;
  error?: string;
  retryCount?: number;
  cost?: number;
}

/**
 * Track a DeepWiki API call for monitoring
 */
export async function trackDeepWikiCall(data: TrackingData): Promise<void> {
  try {
    // Calculate cost based on model and tokens
    let cost = 0;
    if (data.inputTokens && data.outputTokens) {
      const pricing = getModelPricing(data.model);
      cost = (data.inputTokens * pricing.input / 1000) + (data.outputTokens * pricing.output / 1000);
    }
    
    // Prepare record for database
    const record = {
      timestamp: Date.now(),
      agent_role: data.agent,
      operation: data.operation,
      repository_url: data.repository,
      pr_number: data.prNumber,
      language: data.language || 'TypeScript',
      repository_size: data.repositorySize || 'medium',
      model_used: data.model,
      model_version: data.modelVersion || 'latest',
      is_fallback: data.isFallback || false,
      input_tokens: data.inputTokens || 0,
      output_tokens: data.outputTokens || 0,
      duration_ms: data.duration,
      success: data.success,
      error: data.error || null,
      retry_count: data.retryCount || 0,
      cost: parseFloat(cost.toFixed(6))
    };
    
    // Insert into database
    const { error } = await supabase
      .from('agent_activity')
      .insert(record);
    
    if (error) {
      logger.error('Failed to track DeepWiki call:', error);
    } else {
      logger.debug(`Tracked DeepWiki call: ${data.operation} for ${data.repository}`);
    }
  } catch (error) {
    // Don't let tracking errors break the main flow
    logger.error('Error in tracking:', error);
  }
}

/**
 * Get model pricing for cost calculation
 */
function getModelPricing(model: string): { input: number; output: number } {
  const pricing: Record<string, { input: number; output: number }> = {
    'openai/gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'openai/gpt-4': { input: 0.03, output: 0.06 },
    'openai/gpt-4o': { input: 0.005, output: 0.015 },
    'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
    'claude-3-haiku': { input: 0.00025, output: 0.00125 },
    'claude-3-opus': { input: 0.015, output: 0.075 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4': { input: 0.03, output: 0.06 }
  };
  
  // Default pricing if model not found
  return pricing[model] || { input: 0.001, output: 0.002 };
}

/**
 * Track multiple operations as part of a single analysis
 */
export async function trackAnalysisOperations(
  repositoryUrl: string,
  prNumber: string | undefined,
  operations: Array<{
    agent: string;
    operation: string;
    model: string;
    duration: number;
    success: boolean;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
  }>
): Promise<void> {
  // Determine repository size based on URL (simplified logic)
  let repoSize: 'small' | 'medium' | 'large' = 'medium';
  if (repositoryUrl.includes('ky') || repositoryUrl.includes('is-')) {
    repoSize = 'small';
  } else if (repositoryUrl.includes('vscode') || repositoryUrl.includes('next.js')) {
    repoSize = 'large';
  }
  
  // Track each operation
  for (const op of operations) {
    await trackDeepWikiCall({
      agent: op.agent,
      operation: op.operation,
      repository: repositoryUrl,
      prNumber,
      repositorySize: repoSize,
      model: op.model,
      duration: op.duration,
      success: op.success,
      inputTokens: op.inputTokens,
      outputTokens: op.outputTokens,
      error: op.error
    });
  }
}
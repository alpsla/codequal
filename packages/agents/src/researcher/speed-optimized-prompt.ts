/**
 * Speed-Optimized Prompt Generator for Model Research
 * 
 * Creates prompts that emphasize speed requirements for different roles
 */

export function generateSpeedOptimizedPrompt(role: string): string {
  const basePrompt = `
You are researching AI models for the ${role} role.

CRITICAL REQUIREMENTS:
`;

  switch (role) {
    case 'ai-parser':
      return basePrompt + `
1. **SPEED IS THE TOP PRIORITY** - The model MUST respond within 5 seconds
2. Response time is MORE important than perfect accuracy
3. The model should be:
   - FAST (< 5 second response time)
   - Good enough quality for parsing tasks (70%+ accuracy is sufficient)
   - Cost-effective for high-volume usage
   
AVOID:
- Slow models like Claude Opus (even if they're more accurate)
- Models that prioritize quality over speed
- Any model with >5 second typical response time

PREFER:
- Models with "flash", "turbo", or "fast" in their names
- Models optimized for speed
- Models with <2 second response times

Evaluation weights:
- Speed: 50%
- Quality: 30%
- Cost: 20%

The parser runs hundreds of times per day, so SPEED is absolutely critical.
`;

    case 'deepwiki':
      return basePrompt + `
1. Quality and deep understanding are most important
2. Speed is less critical (background process)
3. The model should be:
   - Highly capable for complex analysis
   - Good at understanding large codebases
   - Worth the extra time for accuracy
   
Evaluation weights:
- Quality: 50%
- Cost: 30%
- Speed: 20%
`;

    case 'comparison':
      return basePrompt + `
1. Balance between speed and quality
2. The model should be:
   - Reasonably fast (< 10 seconds)
   - Good quality for comparison tasks
   - Cost-effective
   
Evaluation weights:
- Quality: 40%
- Speed: 35%
- Cost: 25%
`;

    case 'researcher':
      return basePrompt + `
1. Cost-effectiveness for high-volume research (3000+ queries/day)
2. The model should be:
   - Economical for frequent use
   - Fast enough for interactive research
   - Good quality for discovery tasks
   
Evaluation weights:
- Cost: 35%
- Quality: 35%
- Speed: 30%
`;

    default:
      return basePrompt + `
1. General purpose model selection
2. Balanced requirements

Evaluation weights:
- Quality: 40%
- Cost: 30%
- Speed: 30%
`;
  }
}

/**
 * Extract speed metrics from model metadata
 */
export function extractSpeedMetrics(modelData: any): {
  responseTime?: number;
  throughput?: number;
  latency?: number;
  estimatedResponseTime?: number;
} {
  const metrics: any = {};
  
  // Look for speed indicators in model name
  const name = (modelData.id || modelData.model || '').toLowerCase();
  
  if (name.includes('flash')) {
    metrics.estimatedResponseTime = 1.5; // Flash models are typically very fast
  } else if (name.includes('turbo')) {
    metrics.estimatedResponseTime = 2.0; // Turbo models are fast
  } else if (name.includes('fast')) {
    metrics.estimatedResponseTime = 2.5;
  } else if (name.includes('opus') || name.includes('pro')) {
    metrics.estimatedResponseTime = 8.0; // Larger models are slower
  } else if (name.includes('haiku') || name.includes('3.5')) {
    metrics.estimatedResponseTime = 1.0; // Small models are fastest
  } else {
    metrics.estimatedResponseTime = 5.0; // Default estimate
  }
  
  // Extract from metadata if available
  if (modelData.performance) {
    metrics.responseTime = modelData.performance.avgResponseTime;
    metrics.throughput = modelData.performance.throughput;
    metrics.latency = modelData.performance.latency;
  }
  
  return metrics;
}

/**
 * Score model based on speed requirements
 */
export function scoreModelForSpeed(
  modelData: any,
  role: string
): number {
  const speedMetrics = extractSpeedMetrics(modelData);
  const estimatedTime = speedMetrics.responseTime || speedMetrics.estimatedResponseTime || 5.0;
  
  // Role-specific speed scoring
  switch (role) {
    case 'ai-parser':
      // Harsh penalty for slow models
      if (estimatedTime <= 2) return 100;
      if (estimatedTime <= 3) return 85;
      if (estimatedTime <= 5) return 60;
      if (estimatedTime <= 8) return 20;
      return 0; // Too slow for AI parser
      
    case 'deepwiki':
      // Speed less important
      if (estimatedTime <= 5) return 100;
      if (estimatedTime <= 10) return 90;
      if (estimatedTime <= 15) return 80;
      return 70;
      
    default:
      // Balanced scoring
      if (estimatedTime <= 3) return 100;
      if (estimatedTime <= 5) return 80;
      if (estimatedTime <= 10) return 60;
      return 40;
  }
}
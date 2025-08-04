"use strict";
/**
 * DeepWiki Model Selection Prompt
 *
 * This prompt is specifically designed for the DeepWiki role to select
 * optimal models for comprehensive repository analysis.
 *
 * Weights:
 * - Quality: 60% (most important for accurate analysis)
 * - Cost: 30% (budget considerations)
 * - Speed: 10% (less critical for batch analysis)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeepWikiModelSelectionPrompt = createDeepWikiModelSelectionPrompt;
function createDeepWikiModelSelectionPrompt(candidates, context) {
    return `You are an expert AI model selector specializing in repository analysis tools. Select the best PRIMARY and FALLBACK models for DeepWiki comprehensive repository analysis.

ROLE: deepwiki
DESCRIPTION: Comprehensive repository analysis for architecture, security, performance, code quality, dependencies, and educational recommendations
LANGUAGE: ${context.language}
REPOSITORY SIZE: ${context.repositorySize}
${context.complexity ? `COMPLEXITY: ${context.complexity}/10` : ''}

SCORING WEIGHTS FOR DEEPWIKI:
- Quality: 60% (accuracy, depth of analysis, understanding of code patterns)
- Cost: 30% (operational efficiency for large-scale analysis)
- Speed: 10% (batch processing, not real-time critical)

REQUIREMENTS:
- Primary model must excel at deep code understanding and pattern recognition
- Must handle ${context.repositorySize} repositories with ${context.language} effectively
- Should identify security vulnerabilities, performance bottlenecks, and architectural issues
- Capable of generating educational recommendations based on findings
- Fallback model should be reliable with lower cost but maintain acceptable quality
- NO hardcoded filtering - consider all available models
- Prefer models released within the last 6 months
- Consider context window size for large repositories

CANDIDATE MODELS (with evaluation scores):
${candidates.map((model, i) => `
${i + 1}. ${model.id}
   Provider: ${model.provider}
   Context Window: ${model.context_length?.toLocaleString() || 'Unknown'} tokens
   Quality Score: ${model.scores?.quality || 'N/A'}/10
   Cost Score: ${model.scores?.cost || 'N/A'}/10
   Speed Score: ${model.scores?.speed || 'N/A'}/10
   Freshness: ${model.release_date || 'Unknown'} (${model.age_months || '?'} months old)
   Price: $${model.pricing?.prompt || '?'}/$${model.pricing?.completion || '?'} per 1M tokens
   Key Features: ${model.features || 'General purpose'}
`).join('')}

SELECTION CRITERIA:
1. For PRIMARY model, prioritize:
   - Highest quality score (60% weight)
   - Strong ${context.language} understanding
   - Proven track record in code analysis
   - Adequate context window for ${context.repositorySize} repos
   - Recent release (preferably < 6 months)

2. For FALLBACK model, consider:
   - Good quality/cost balance
   - Reliable availability
   - Different provider than primary (for redundancy)
   - Still capable of comprehensive analysis

OUTPUT FORMAT (JSON only):
{
  "primary": {
    "number": <candidate number>,
    "model_id": "<full model ID>",
    "reasoning": "<explain why this model best fits DeepWiki's needs for ${context.language} ${context.repositorySize} repositories>"
  },
  "fallback": {
    "number": <candidate number>,
    "model_id": "<full model ID>",
    "reasoning": "<explain why this is a good fallback option balancing quality and cost>"
  },
  "analysis": "<brief analysis of how these models will handle repository analysis tasks>",
  "estimated_quality": <0-100 expected analysis quality>,
  "estimated_cost_per_repo": <rough estimate in USD>
}`;
}
/**
 * Example usage:
 *
 * const context = {
 *   repositoryUrl: 'https://github.com/vercel/next.js',
 *   language: 'typescript',
 *   repositorySize: 'enterprise',
 *   complexity: 8
 * };
 *
 * const candidates = [
 *   {
 *     id: 'anthropic/claude-opus-4',
 *     provider: 'anthropic',
 *     context_length: 200000,
 *     scores: { quality: 9.5, cost: 7.0, speed: 7.5 },
 *     release_date: '2025-04-01',
 *     age_months: 3,
 *     pricing: { prompt: 15, completion: 75 },
 *     features: 'Best-in-class code understanding, 72.5% SWE-bench'
 *   },
 *   // ... more candidates
 * ];
 *
 * const prompt = createDeepWikiModelSelectionPrompt(candidates, context);
 */ 

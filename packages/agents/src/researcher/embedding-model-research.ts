/**
 * Embedding Model Research Prompt for RESEARCHER Agent
 * 
 * Uses the same approach as translator research to find optimal embedding models
 * available through unified API providers like OpenRouter, Together AI, or Replicate
 */

export const EMBEDDING_MODEL_RESEARCH = (() => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const sixMonthsAgo = new Date(currentDate.setMonth(currentDate.getMonth() - 6));
  const sixMonthsAgoFormatted = `${sixMonthsAgo.toLocaleString('default', { month: 'long' })} ${sixMonthsAgo.getFullYear()}`;
  
  return `Find the SINGLE BEST embedding model available through UNIFIED API PROVIDERS for code and documentation embeddings.

**CRITICAL REQUIREMENT: UNIFIED API PROVIDERS ONLY**
- Focus on models available through OpenRouter, Together AI, Replicate, or similar unified APIs
- Single billing, single API key requirement
- NO direct provider APIs (no separate OpenAI, Anthropic, etc. keys)
- Must support embedding generation, not just chat/completion

**TIME FRAME: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 3-6 months (since ${sixMonthsAgoFormatted})
- Prioritize models with the most recent training data (${currentYear} releases)
- Do NOT consider older models even if they were previously good
- Check for newest embedding capabilities released in ${currentYear}

**EMBEDDING MODEL REQUIREMENTS:**
- Generate high-quality text embeddings for semantic search
- Support code understanding and technical documentation
- Handle multiple programming languages effectively
- Provide consistent vector dimensions (512, 768, 1536, etc.)
- Fast inference time for real-time applications
- Cost-effective for high-volume operations

**UNIFIED PROVIDER RESEARCH (${currentMonth} ${currentYear}):**
Search for embedding models from unified API providers:

1. **OpenRouter (openrouter.ai):**
   - Check if they now support embedding models
   - Look for any recent announcements about embedding support
   - Search their model list for embedding-specific endpoints

2. **Together AI (together.ai):**
   - Search for embedding models in their catalog
   - Look for models like BAAI/bge-*, sentence-transformers/*
   - Check for code-specific embedding models

3. **Replicate (replicate.com):**
   - Search for embedding model deployments
   - Look for popular embedding models with API access
   - Check for custom embedding model hosting

4. **Hugging Face Inference API:**
   - Search for hosted embedding models
   - Look for models with embedding pipelines
   - Check pricing for inference endpoints

5. **Other Unified Providers:**
   - Anyscale Endpoints
   - Banana.dev
   - Modal.com
   - RunPod Serverless
   - Any new unified API providers

**EVALUATION CRITERIA:**
- **Embedding Quality** (40%): MTEB benchmark scores, code understanding
- **Speed/Performance** (30%): Inference latency, throughput
- **Cost** (30%): Price per 1K tokens/requests

**SCORING FORMULA:**
Total Score = (Quality × 0.4) + (Speed × 0.3) + (Cost × 0.3)

**SPECIFIC SEARCH QUERIES:**
- "OpenRouter embedding models ${currentYear}"
- "Together AI embedding API"
- "Replicate text embeddings"
- "Unified API embedding models"
- "Single API key embedding service"
- "Code embedding models API"

**OUTPUT FORMAT:**
{
  "researchDate": "${currentDate.toISOString().split('T')[0]}",
  "unifiedProvider": {
    "name": "Together AI",
    "apiEndpoint": "https://api.together.xyz/v1/embeddings",
    "billingModel": "per-token",
    "requiresSeparateKeys": false
  },
  "recommendation": {
    "primary": {
      "provider": "together",
      "model": "BAAI/bge-large-en-v1.5",
      "modelPath": "togethercomputer/m2-bert-80M-32k",
      "dimensions": 1024,
      "maxTokens": 512,
      "mtebScore": 63.5,
      "capabilities": {
        "codeUnderstanding": 8.5,
        "documentEmbedding": 9.0,
        "multilingualSupport": 7.5,
        "contextWindow": 8192
      },
      "pricing": {
        "per1kTokens": 0.00008,
        "freeTrialAvailable": true,
        "volumeDiscounts": "available"
      },
      "performance": {
        "avgLatencyMs": 45,
        "throughputRPS": 100
      },
      "integration": {
        "sdkAvailable": true,
        "openAICompatible": true,
        "exampleCode": "client.embeddings.create(model='BAAI/bge-large-en-v1.5', input=text)"
      }
    },
    "fallback": {
      "provider": "huggingface",
      "model": "sentence-transformers/all-MiniLM-L12-v2",
      "hostingOption": "Inference API",
      "dimensions": 384,
      "reasoning": "Reliable, free tier available, good performance"
    },
    "selfHosted": {
      "model": "nomic-embed-text-v1.5",
      "requirements": "4GB GPU RAM",
      "dockerImage": "available",
      "reasoning": "Best open-source option for self-hosting"
    }
  },
  "alternativeProviders": [
    {
      "provider": "Replicate",
      "embeddingSupport": true,
      "models": ["nateraw/bge-large-en-v1.5", "..."],
      "pros": "Easy deployment, pay-per-use",
      "cons": "Higher latency than dedicated services"
    }
  ],
  "notRecommended": {
    "openrouter": {
      "reason": "Does not support embedding models as of ${currentMonth} ${currentYear}",
      "lastChecked": "${currentDate.toISOString().split('T')[0]}",
      "alternative": "Use for LLM calls, separate embedding provider"
    }
  },
  "migrationStrategy": {
    "fromOpenAI": {
      "steps": [
        "1. Sign up for recommended unified provider",
        "2. Update API endpoint and authentication",
        "3. Adjust dimension handling if needed",
        "4. Test with sample embeddings"
      ],
      "estimatedEffort": "2-4 hours",
      "codeChangesRequired": "minimal"
    }
  },
  "costComparison": {
    "currentOpenAI": "$0.00002/1k tokens",
    "recommendedOption": "$0.00008/1k tokens",
    "monthlySavingsEstimate": "Depends on volume",
    "breakEvenPoint": "Consider self-hosting above 10M embeddings/month"
  }
}

**IMPORTANT NOTES:**
1. If NO unified providers support embeddings, clearly state this
2. Provide best alternative approach (e.g., dedicated embedding service)
3. Consider hybrid solutions (unified for LLMs, specialized for embeddings)
4. Always verify current availability with actual API tests
5. Include code examples for integration

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}`;
})();
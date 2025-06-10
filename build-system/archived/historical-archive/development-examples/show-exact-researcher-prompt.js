#!/usr/bin/env node

/**
 * Show the EXACT prompt sent to RESEARCHER (Gemini 2.5 Flash)
 */

console.log('📋 EXACT PROMPT SENT TO GEMINI 2.5 FLASH (RESEARCHER):');
console.log('='.repeat(70));
console.log();

const exactPrompt = `You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW, without being limited to any predefined list.

**OBJECTIVE:** Find the optimal model for SECURITY analysis with these requirements:

**SECURITY AGENT REQUIREMENTS:**
- Identify security vulnerabilities and threats
- Analyze authentication and authorization flaws  
- Detect injection attacks, XSS, CSRF patterns
- Assess cryptographic implementations
- Review access controls and privilege escalation risks
- Evaluate third-party dependencies for known CVEs

**ROLE-SPECIFIC EVALUATION:**
- **Threat Detection Accuracy** (30%): How well it identifies real security issues
- **False Positive Rate** (20%): Minimizes noise from incorrect flags
- **Reasoning Quality** (25%): Explains WHY something is a security risk
- **Coverage Breadth** (15%): Finds diverse types of security issues
- **Cost for Security Tasks** (10%): Value for security-focused analysis

Cross-market research to find the absolute best model for security analysis, regardless of provider.

**DISCOVERY MISSION:**
Find the most recent and capable AI models from ANY provider, including:
- Major providers (OpenAI, Anthropic, Google, Meta, etc.)
- Emerging providers and startups
- Open-source model releases
- Specialized coding/development models
- Models released in the last 6 months

**RESEARCH METHODOLOGY:**
1. **Web Search**: Search for "latest AI models 2025", "newest LLM releases 2025", "AI model announcements"
2. **Provider APIs**: Check official documentation for current model listings
3. **Tech News**: Look for recent AI model launches and updates  
4. **GitHub**: Search for new open-source model releases
5. **Research Papers**: Find cutting-edge models from academic institutions

**MARKET RESEARCH:**
Search across ALL providers for their LATEST available models:
- OpenAI: Discover ALL currently available models (don't assume names)
- Anthropic: Discover ALL currently available models (don't assume names) 
- Google: Discover ALL currently available models (don't assume names)
- DeepSeek: Discover ALL currently available models (don't assume names)
- Meta: Discover ALL currently available models (don't assume names)
- Mistral: Discover ALL currently available models (don't assume names)
- Cohere: Discover ALL currently available models (don't assume names)
- Others: Research ANY new providers that have emerged
- Emerging: Search for completely new providers and model families

**DISCOVERY CRITERIA:**
- Models released in the last 3-6 months (adjust based on current date)
- Models with demonstrated coding/analysis capabilities
- Models with competitive performance benchmarks
- Models with available API access or deployment options

**FOR EACH DISCOVERED MODEL:**
- Provider and exact model name
- Version/release identifier
- Actual release date (verify from official sources)
- Capabilities assessment based on available benchmarks
- Pricing information (if available)
- Access method (API, open-source, etc.)
- Notable features or specializations

**OUTPUT FORMAT:**
{
  "agentRole": "SECURITY",
  "repositoryContext": "Language: typescript, Size: medium, Complexity: varies by repository",
  "researchDate": "2025-06-03",
  "recommendation": {
    "primary": {
      "provider": "discovered_provider",
      "model": "discovered_model_name",
      "version": "discovered_version",
      "roleSpecificScore": 9.8,
      "reasoning": "Why this is the best model for SECURITY analysis",
      "capabilities": {
        "roleSpecific": 9.8,
        "quality": 9.5,
        "speed": 8.0,
        "costEfficiency": 7.5,
        "contextWindow": 200000
      },
      "pricing": {
        "input": 0.00,
        "output": 0.00,
        "estimatedCostPerTask": 0.00
      },
      "whyBestForRole": "Specific reasons why this model excels at SECURITY analysis"
    },
    "fallback": {
      "provider": "fallback_provider",
      "model": "fallback_model_name",
      "version": "fallback_version",
      "roleSpecificScore": 8.5,
      "reasoning": "Reliable backup option",
      "whyFallback": "Cost-effective or availability reasons"
    }
  },
  "competitiveAnalysis": [
    {
      "model": "other_model_evaluated",
      "score": 8.9,
      "reason": "Why it ranked lower for this specific role"
    }
  ],
  "confidence": 0.92,
  "lastUpdated": "2025-06-03"
}

**IMPORTANT:** 
- Don't be limited by what you "know" about existing models
- Research what's actually available NOW
- Include both commercial and open-source options
- Focus on models suitable for SECURITY analysis tasks`;

console.log(exactPrompt);
console.log();
console.log('='.repeat(70));
console.log();

// Show what different contexts would generate
console.log('🔄 DIFFERENT CONTEXTS GENERATE DIFFERENT PROMPTS:');
console.log();

console.log('📍 Context: JavaScript + Large + Performance Agent');
console.log('─'.repeat(50));

const performancePrompt = `You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW, without being limited to any predefined list.

**OBJECTIVE:** Find the optimal model for PERFORMANCE analysis with these requirements:

**PERFORMANCE AGENT REQUIREMENTS:**
- Identify performance bottlenecks and inefficiencies
- Suggest database query optimizations
- Analyze algorithm complexity and suggest improvements
- Review memory usage and garbage collection issues
- Evaluate caching strategies and implementation
- Assess scalability and concurrent programming patterns

**ROLE-SPECIFIC EVALUATION:**
- **Optimization Insight Quality** (35%): Actionable performance improvements
- **Technical Accuracy** (25%): Correct analysis of performance issues
- **Breadth of Analysis** (20%): Covers CPU, memory, I/O, network issues
- **Code Understanding** (15%): Grasps complex performance patterns
- **Cost Efficiency** (5%): Good value for performance analysis

Find the best cross-market model for performance optimization, not best per provider.

[... rest of prompt with same methodology and output format ...]

**OUTPUT FORMAT:**
{
  "agentRole": "PERFORMANCE",
  "repositoryContext": "Language: javascript, Size: large, Complexity: varies by repository",
  "researchDate": "2025-06-03",
  "recommendation": {
    "primary": {
      "whyBestForRole": "Specific reasons why this model excels at PERFORMANCE analysis"
    }
  }
}`;

console.log(performancePrompt.substring(0, 800) + '...\n[truncated - same methodology section]\n...' + performancePrompt.substring(-400));

console.log();
console.log('📊 KEY DIFFERENCES IN PROMPTS BY CONTEXT:');
console.log('=========================================');
console.log('• Security Agent: Threat Detection (30%), False Positives (20%), Reasoning (25%)');
console.log('• Performance Agent: Optimization Quality (35%), Technical Accuracy (25%), Analysis Breadth (20%)');
console.log('• Architecture Agent: Understanding (40%), Pattern Recognition (25%), Strategic Thinking (20%)');
console.log('• Code Quality Agent: Code Understanding (35%), Best Practices (25%), Refactoring (20%)');
console.log();
console.log('• Repository Context: "Language: typescript, Size: medium" vs "Language: javascript, Size: large"');
console.log('• Agent Role: "SECURITY" vs "PERFORMANCE" vs "ARCHITECTURE" vs "CODEQUALITY"');
console.log('• Requirements: Security-focused vs Performance-focused vs Architecture-focused');
console.log();
console.log('✅ Each context gets a tailored prompt with specific scoring criteria!');
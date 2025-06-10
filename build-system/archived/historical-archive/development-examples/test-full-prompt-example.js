#!/usr/bin/env node

/**
 * Full RESEARCHER Prompt Example
 * 
 * Shows the complete prompt that would be sent to Gemini 2.5 Flash
 * for cross-market model research.
 */

console.log('🔍 Full RESEARCHER Prompt Example\n');

// Simulate the actual prompt generation
const currentYear = new Date().getFullYear();
const agentRole = 'SECURITY';

const roleRequirements = `
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
`;

const fullPrompt = `
You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW, without being limited to any predefined list.

**OBJECTIVE:** Find the optimal model for ${agentRole} analysis with these requirements:
${roleRequirements}

**DISCOVERY MISSION:**
Find the most recent and capable AI models from ANY provider, including:
- Major providers (OpenAI, Anthropic, Google, Meta, etc.)
- Emerging providers and startups
- Open-source model releases
- Specialized coding/development models
- Models released in the last 6 months

**RESEARCH METHODOLOGY:**
1. **Web Search**: Search for "latest AI models ${currentYear}", "newest LLM releases ${currentYear}", "AI model announcements"
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

**OUTPUT FORMAT:**
{
  "agentRole": "${agentRole}",
  "researchDate": "${new Date().toISOString().split('T')[0]}",
  "recommendation": {
    "primary": {
      "provider": "discovered_provider",
      "model": "discovered_model_name",
      "version": "discovered_version",
      "roleSpecificScore": 9.8,
      "reasoning": "Why this is the best model for ${agentRole.toLowerCase()} analysis",
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
      "whyBestForRole": "Specific reasons why this model excels at ${agentRole.toLowerCase()} analysis"
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
  "lastUpdated": "${new Date().toISOString().split('T')[0]}"
}

**IMPORTANT:** 
- Don't be limited by what you "know" about existing models
- Research what's actually available NOW
- Include both commercial and open-source options
- Focus on models suitable for ${agentRole} analysis tasks
`;

console.log('📋 COMPLETE PROMPT TO BE SENT TO GEMINI 2.5 FLASH:');
console.log('='.repeat(60));
console.log(fullPrompt);
console.log('='.repeat(60));

console.log(`\n📊 Prompt Analysis:`);
console.log(`• Length: ${fullPrompt.length} characters`);
console.log(`• Target Role: ${agentRole}`);
console.log(`• Current Year: ${currentYear} (dynamic)`);
console.log(`• Hardcoded Models: NONE ✅`);
console.log(`• Hardcoded Versions: NONE ✅`);
console.log(`• Provider Assumptions: NONE ✅`);

console.log(`\n🤖 What Gemini 2.5 Flash Would Do:`);
console.log('==================================');
console.log(`1. Search web for "latest AI models ${currentYear}"`);
console.log(`2. Check OpenAI, Anthropic, Google, etc. current API docs`);
console.log(`3. Look for recent model announcements and releases`);
console.log(`4. Find specialized security analysis models`);
console.log(`5. Evaluate each discovered model against security criteria`);
console.log(`6. Return THE SINGLE BEST model for security + fallback`);

console.log(`\n🎯 Expected Response Format:`);
console.log('=============================');
console.log(`{`);
console.log(`  "agentRole": "SECURITY",`);
console.log(`  "recommendation": {`);
console.log(`    "primary": {`);
console.log(`      "provider": "anthropic",`);
console.log(`      "model": "claude-4-opus",  // Whatever is actually latest`);
console.log(`      "roleSpecificScore": 9.8,`);
console.log(`      "whyBestForRole": "Superior reasoning for threat detection"`);
console.log(`    },`);
console.log(`    "fallback": {`);
console.log(`      "provider": "google",`);
console.log(`      "model": "gemini-3-flash", // Whatever is cost-effective backup`);
console.log(`    }`);
console.log(`  }`);
console.log(`}`);

console.log(`\n✅ This prompt is completely dynamic and future-proof!`);
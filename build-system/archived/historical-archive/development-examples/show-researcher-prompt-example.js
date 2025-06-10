#!/usr/bin/env node

/**
 * Show Exact RESEARCHER Prompt Example
 * 
 * Demonstrates the complete prompt that Gemini 2.5 Flash receives
 * in the cached template system.
 */

console.log('📋 EXACT RESEARCHER PROMPT EXAMPLES\n');

// STEP 1: Template Initialization (sent once per session)
const templateInitialization = `You are a cutting-edge AI model researcher. I will provide you with a base research template once, then send context-specific parameters that reference this template.

**BASE RESEARCH TEMPLATE [ID: RESEARCH_TEMPLATE_V1]:**

Find the SINGLE BEST AI model across ALL providers for {AGENT_ROLE} analysis.

**DISCOVERY MISSION:**
- Major providers (OpenAI, Anthropic, Google, Meta, etc.)
- Emerging providers and startups  
- Open-source releases
- Models released last 3-6 months

**RESEARCH METHODOLOGY:**
1. **Web Search**: "latest AI models {CURRENT_YEAR}", "newest LLM releases {CURRENT_YEAR}"
2. **Provider APIs**: Check current documentation
3. **GitHub**: New open-source models
4. **Tech News**: Recent launches

**MARKET RESEARCH:**
Search ALL providers for LATEST models:
- OpenAI: Discover ALL current models (no assumptions)
- Anthropic: Discover ALL current models (no assumptions)
- Google: Discover ALL current models (no assumptions)
- DeepSeek: Discover ALL current models (no assumptions)
- Meta/Mistral/Cohere: Discover ALL current models

**DISCOVERY CRITERIA:**
- Latest versions only
- Demonstrated {LANGUAGE}/{FRAMEWORK} capabilities
- {SIZE} repository performance
- {COMPLEXITY} complexity handling

**OUTPUT FORMAT:**
{
  "repositoryContext": {CONTEXT_JSON},
  "recommendation": {
    "primary": { "provider": "...", "model": "...", "contextSpecificScore": 9.8 },
    "fallback": { "provider": "...", "model": "...", "contextSpecificScore": 8.5 }
  }
}

**CRITICAL:** Find THE SINGLE BEST across ALL providers for {SPECIFIC_CONTEXT}, NOT generic models.

---

Please confirm you have cached this template as [RESEARCH_TEMPLATE_V1]. I will now send context-specific research requests that reference this template.`;

// STEP 2: Context-Specific Request (sent for each context)
const contextRequest = `**RESEARCH REQUEST [Session: 1748917288917]**
Reference Template: [RESEARCH_TEMPLATE_V1]

**CONTEXT PARAMETERS:**
- Language: typescript
- Frameworks: electron, webpack, monaco-editor
- Repository Size: medium
- Complexity: 2.3x
- Agent Role: SECURITY
- Year: 2025

**ROLE-SPECIFIC REQUIREMENTS:**
• Threat detection in typescript/electron/webpack/monaco-editor
• Authentication/authorization analysis
• Injection attack detection
• Framework-specific security patterns
• Desktop application security considerations

**EVALUATION CRITERIA:**
• Threat Detection (30%): Real security issues
• False Positives (20%): Noise minimization
• Reasoning (25%): Explains WHY
• Coverage (15%): Issue diversity
• Cost (10%): Value for security

**SPECIFIC OBJECTIVE:**
Find optimal model for typescript/electron/webpack/monaco-editor security analysis in medium repositories with 2.3x complexity.

Apply the cached [RESEARCH_TEMPLATE_V1] with these parameters.`;

console.log('🔄 STEP 1: TEMPLATE INITIALIZATION (sent once per session)');
console.log('═'.repeat(70));
console.log('📤 Sent to Gemini 2.5 Flash:');
console.log('─'.repeat(50));
console.log(templateInitialization);
console.log('\n📊 Template Stats:');
console.log(`• Length: ${templateInitialization.length} characters`);
console.log(`• Tokens: ~${Math.round(templateInitialization.length * 0.75)} tokens`);
console.log('• Frequency: Once per session (e.g., daily)');
console.log('• Purpose: Cache base research methodology');

console.log('\n\n🎯 STEP 2: CONTEXT-SPECIFIC REQUEST (sent for each context)');
console.log('═'.repeat(70));
console.log('📤 Sent to Gemini 2.5 Flash:');
console.log('─'.repeat(50));
console.log(contextRequest);
console.log('\n📊 Context Request Stats:');
console.log(`• Length: ${contextRequest.length} characters`);
console.log(`• Tokens: ~${Math.round(contextRequest.length * 0.75)} tokens`);
console.log('• Frequency: Each context combination');
console.log('• Purpose: Apply template to specific requirements');

console.log('\n\n💬 EXPECTED GEMINI 2.5 FLASH RESPONSE:');
console.log('═'.repeat(70));

const expectedResponse = `I have cached the base research template as [RESEARCH_TEMPLATE_V1].

For your typescript/electron/webpack/monaco-editor security analysis request, I've researched the latest AI models across all providers:

{
  "repositoryContext": {
    "language": "typescript",
    "frameworks": ["electron", "webpack", "monaco-editor"],
    "size": "medium",
    "complexity": 2.3,
    "agentRole": "SECURITY"
  },
  "recommendation": {
    "primary": {
      "provider": "anthropic",
      "model": "claude-4-sonnet",
      "version": "claude-4-sonnet-20250603",
      "contextSpecificScore": 9.7,
      "threatDetection": 9.8,
      "falsePositiveRate": 9.2,
      "reasoning": 9.6,
      "whyBestForContext": "Exceptional at TypeScript security analysis, understands Electron security model, excels at desktop app threat detection"
    },
    "fallback": {
      "provider": "google",
      "model": "gemini-2.5-flash",
      "version": "gemini-2.5-flash-20250603", 
      "contextSpecificScore": 8.4,
      "whyFallback": "Cost-effective backup with good TypeScript/Electron knowledge"
    }
  },
  "competitiveAnalysis": [
    {
      "model": "gpt-5-turbo",
      "score": 8.9,
      "reason": "Good TypeScript skills but weaker on Electron-specific security patterns"
    },
    {
      "model": "deepseek-coder-v3",
      "score": 8.2, 
      "reason": "Strong coding analysis but less specialized for desktop app security"
    }
  ],
  "researchSummary": "Analyzed 23 models across 8 providers. Claude 4 Sonnet emerged as best for TypeScript/Electron security due to superior reasoning about desktop application security patterns and Electron-specific vulnerabilities.",
  "confidence": 0.94,
  "lastUpdated": "2025-06-03"
}`;

console.log(expectedResponse);

console.log('\n\n📊 TOKEN COST COMPARISON:');
console.log('═'.repeat(70));

const templateTokens = Math.round(templateInitialization.length * 0.75);
const contextTokens = Math.round(contextRequest.length * 0.75);
const responseTokens = Math.round(expectedResponse.length * 0.75);

console.log('🔄 CACHED APPROACH:');
console.log(`• Template (once): ${templateTokens} tokens`);
console.log(`• Context request: ${contextTokens} tokens`);
console.log(`• Response: ${responseTokens} tokens`);
console.log(`• Total per request: ${contextTokens + responseTokens} tokens`);
console.log(`• Template amortized across requests`);

console.log('\n📝 NON-CACHED APPROACH:');
const nonCachedPrompt = templateTokens + contextTokens;
console.log(`• Full prompt each time: ${nonCachedPrompt} tokens`);
console.log(`• Response: ${responseTokens} tokens`);
console.log(`• Total per request: ${nonCachedPrompt + responseTokens} tokens`);

const savings = (nonCachedPrompt + responseTokens) - (contextTokens + responseTokens);
const savingsPercent = (savings / (nonCachedPrompt + responseTokens)) * 100;

console.log('\n💰 SAVINGS:');
console.log(`• Saved per request: ${savings} tokens (${Math.round(savingsPercent)}%)`);
console.log(`• On 50 contexts: ${savings * 50} tokens saved`);
console.log(`• Perfect for scheduled runs!`);

console.log('\n\n🔄 SESSION WORKFLOW:');
console.log('═'.repeat(70));
console.log('1. Daily 9 AM: Initialize session with template');
console.log('2. Send 48 context requests (all language/size/role combinations)');
console.log('3. Receive 48 specialized model recommendations');
console.log('4. Update CANONICAL_MODEL_VERSIONS with discoveries');
console.log('5. Next day: Repeat with fresh session');
console.log('\n✅ Result: Always current models with minimal token cost!');
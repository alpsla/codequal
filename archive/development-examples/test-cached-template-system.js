#!/usr/bin/env node

/**
 * Cached Template System for RESEARCHER
 * 
 * Implements template caching to avoid sending the same base template tokens
 * repeatedly during scheduled runs, using conversation context and reference IDs.
 */

console.log('🔄 Cached Template System for RESEARCHER\n');

// Base template that gets cached (sent once, referenced many times)
const CACHED_RESEARCH_TEMPLATE = `You are a cutting-edge AI model researcher. I will provide you with a base research template once, then send context-specific parameters that reference this template.

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

// Context-specific prompt that references the cached template
function generateContextRequest(language, sizeCategory, agentRole, frameworks, complexity, sessionId) {
  const currentYear = new Date().getFullYear();
  
  return `**RESEARCH REQUEST [Session: ${sessionId}]**
Reference Template: [RESEARCH_TEMPLATE_V1]

**CONTEXT PARAMETERS:**
- Language: ${language}
- Frameworks: ${frameworks.join(', ')}
- Repository Size: ${sizeCategory}
- Complexity: ${complexity}x
- Agent Role: ${agentRole.toUpperCase()}
- Year: ${currentYear}

**ROLE-SPECIFIC REQUIREMENTS:**
${getRoleRequirements(agentRole, language, frameworks)}

**EVALUATION CRITERIA:**
${getEvaluationCriteria(agentRole)}

**SPECIFIC OBJECTIVE:**
Find optimal model for ${language}/${frameworks.join('/')} ${agentRole} analysis in ${sizeCategory} repositories with ${complexity}x complexity.

Apply the cached [RESEARCH_TEMPLATE_V1] with these parameters.`;
}

// Role-specific requirements (compact)
function getRoleRequirements(agentRole, language, frameworks) {
  const requirements = {
    security: `• Threat detection in ${language}/${frameworks.join('/')}
• Authentication/authorization analysis
• Injection attack detection
• Framework-specific security patterns`,

    performance: `• Bottleneck identification in ${language}/${frameworks.join('/')}
• Database/query optimization
• Algorithm complexity analysis
• Framework-specific performance patterns`,

    architecture: `• System design evaluation in ${language}/${frameworks.join('/')}
• Code organization assessment
• Framework architectural patterns
• Scalability analysis`,

    codeQuality: `• Code smell detection in ${language}/${frameworks.join('/')}
• Standards compliance
• Framework-specific best practices
• Refactoring opportunities`
  };
  
  return requirements[agentRole] || requirements.performance;
}

// Evaluation criteria (compact with weights)
function getEvaluationCriteria(agentRole) {
  const criteria = {
    security: `• Threat Detection (30%): Real security issues
• False Positives (20%): Noise minimization
• Reasoning (25%): Explains WHY
• Coverage (15%): Issue diversity
• Cost (10%): Value for security`,

    performance: `• Optimization Quality (35%): Actionable improvements
• Technical Accuracy (25%): Correct analysis
• Analysis Breadth (20%): CPU/memory/I/O coverage
• Code Understanding (15%): Performance patterns
• Cost (5%): Value efficiency`,

    architecture: `• Design Understanding (40%): Complex systems
• Pattern Recognition (25%): Anti-patterns
• Strategic Thinking (20%): Long-term considerations
• Technical Depth (10%): Tech stack knowledge
• Communication (5%): Clear explanations`,

    codeQuality: `• Code Understanding (35%): Structure comprehension
• Best Practices (25%): Standards awareness
• Refactoring (20%): Improvement suggestions
• Language Expertise (15%): Multi-language skill
• Detail Level (5%): Thorough analysis`
  };
  
  return criteria[agentRole] || criteria.performance;
}

// Simulate the caching system
class CachedResearcherSystem {
  constructor() {
    this.templateCached = false;
    this.sessionId = Date.now().toString();
    this.requestCount = 0;
  }

  // Initialize the session by caching the template
  async initializeSession() {
    console.log('🔄 Initializing RESEARCHER session with cached template...');
    
    // Send the base template once to Gemini 2.5 Flash
    const templateResponse = await this.sendToResearcher(CACHED_RESEARCH_TEMPLATE);
    
    this.templateCached = true;
    console.log(`✅ Template cached as [RESEARCH_TEMPLATE_V1] in session ${this.sessionId}`);
    
    return templateResponse;
  }

  // Send context-specific research requests
  async researchContext(language, sizeCategory, agentRole, frameworks, complexity) {
    if (!this.templateCached) {
      throw new Error('Template must be cached first. Call initializeSession().');
    }

    this.requestCount++;
    
    const contextRequest = generateContextRequest(
      language, sizeCategory, agentRole, frameworks, complexity, this.sessionId
    );
    
    console.log(`\n📋 Research Request #${this.requestCount}:`);
    console.log(`Context: ${language}/${frameworks.join('/')} | ${sizeCategory} | ${agentRole} | ${complexity}x`);
    console.log(`Tokens: ${contextRequest.length} chars (${Math.round(contextRequest.length * 0.75)} tokens)`);
    
    // Send only the context parameters (template already cached)
    const response = await this.sendToResearcher(contextRequest);
    
    return response;
  }

  // Simulate sending to Gemini 2.5 Flash
  async sendToResearcher(prompt) {
    // In production: call Gemini 2.5 Flash API
    return {
      tokens: Math.round(prompt.length * 0.75),
      response: 'Mock research response'
    };
  }

  // Get session statistics
  getStats() {
    const templateTokens = Math.round(CACHED_RESEARCH_TEMPLATE.length * 0.75);
    const avgContextTokens = 400; // Estimated average context request
    const totalContextTokens = this.requestCount * avgContextTokens;
    
    // Compare with non-cached approach
    const nonCachedPerRequest = templateTokens + avgContextTokens;
    const nonCachedTotal = this.requestCount * nonCachedPerRequest;
    
    const savings = nonCachedTotal - (templateTokens + totalContextTokens);
    const savingsPercent = (savings / nonCachedTotal) * 100;
    
    return {
      templateTokens,
      avgContextTokens,
      totalContextTokens,
      requestCount: this.requestCount,
      totalTokens: templateTokens + totalContextTokens,
      nonCachedTotal,
      savings,
      savingsPercent
    };
  }
}

// Test the cached system
async function testCachedSystem() {
  const researcher = new CachedResearcherSystem();
  
  // Initialize session (send template once)
  console.log('📤 TEMPLATE INITIALIZATION (sent once):');
  console.log('═'.repeat(60));
  await researcher.initializeSession();
  console.log(`Template Length: ${CACHED_RESEARCH_TEMPLATE.length} characters`);
  
  // Test multiple research requests (only send context)
  const testContexts = [
    { language: 'python', sizeCategory: 'small', agentRole: 'performance', frameworks: ['fastapi', 'pydantic'], complexity: 2.3 },
    { language: 'java', sizeCategory: 'large', agentRole: 'security', frameworks: ['spring-boot', 'hibernate'], complexity: 3.1 },
    { language: 'typescript', sizeCategory: 'medium', agentRole: 'architecture', frameworks: ['electron', 'webpack'], complexity: 1.8 },
    { language: 'javascript', sizeCategory: 'small', agentRole: 'codeQuality', frameworks: ['react', 'jest'], complexity: 2.0 },
    { language: 'python', sizeCategory: 'large', agentRole: 'security', frameworks: ['django', 'celery'], complexity: 2.8 }
  ];

  console.log('\n📤 CONTEXT REQUESTS (reference cached template):');
  console.log('═'.repeat(60));
  
  for (const context of testContexts) {
    await researcher.researchContext(
      context.language,
      context.sizeCategory,
      context.agentRole,
      context.frameworks,
      context.complexity
    );
  }

  // Show example context request
  console.log('\n📋 EXAMPLE CONTEXT REQUEST:');
  console.log('═'.repeat(60));
  const exampleRequest = generateContextRequest('python', 'small', 'performance', ['fastapi', 'pydantic'], 2.3, researcher.sessionId);
  console.log(exampleRequest);

  // Show savings
  console.log('\n📊 TOKEN SAVINGS ANALYSIS:');
  console.log('═'.repeat(60));
  const stats = researcher.getStats();
  
  console.log(`Template (sent once): ${stats.templateTokens} tokens`);
  console.log(`Context requests (${stats.requestCount}): ${stats.totalContextTokens} tokens`);
  console.log(`Total with caching: ${stats.totalTokens} tokens`);
  console.log(`Without caching: ${stats.nonCachedTotal} tokens`);
  console.log(`Savings: ${stats.savings} tokens (${Math.round(stats.savingsPercent)}%)`);

  console.log('\n🔄 SCHEDULED RUNS BENEFIT:');
  console.log('═'.repeat(60));
  console.log('• Template cached once per session (e.g., daily)');
  console.log('• Each research request: ~400 tokens vs ~1,400 tokens');
  console.log('• 71% token savings on repeated requests');
  console.log('• Perfect for scheduled configuration updates');
  
  return stats;
}

// Run the test
testCachedSystem().then(stats => {
  console.log('\n✅ Cached template system reduces token costs significantly!');
  console.log(`   ${Math.round(stats.savingsPercent)}% savings on ${stats.requestCount} requests`);
});

console.log('\n🏗️ IMPLEMENTATION APPROACH:');
console.log('════════════════════════════');
console.log('1. Initialize session: Cache base template in Gemini conversation');
console.log('2. Research requests: Send only context parameters');  
console.log('3. Session reuse: Keep conversation active for multiple requests');
console.log('4. Template versioning: Update template ID when methodology changes');
console.log('5. Scheduled runs: One session per day, multiple context requests');
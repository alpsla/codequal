/**
 * Preview Test Prompts - Shows progressive optimization from baseline
 */

// Test example: security analysis of microsoft/fluentui-emoji
const testContext = {
  repositoryName: 'microsoft/fluentui-emoji',
  language: 'javascript',
  size: 'small',
  complexity: 2,
  agentRole: 'security',
  priceTier: 'standard'
};

/**
 * BASELINE: Current Production Prompt (What we're optimizing FROM)
 */
console.log('='.repeat(80));
console.log('BASELINE: CURRENT PRODUCTION PROMPT');
console.log('='.repeat(80));

const baselineSystem = `You are a cutting-edge AI model researcher. I will provide you with a base research template once, then send context-specific parameters that reference this template.

**BASE RESEARCH TEMPLATE [ID: RESEARCH_TEMPLATE_V1]:**

Find the SINGLE BEST AI model across ALL providers for security analysis.

**DISCOVERY MISSION:**
- Major providers (OpenAI, Anthropic, Google, Meta, etc.)
- Emerging providers and startups (xAI/Grok, Inflection/Pi, Character.AI, etc.)
- Open-source releases
- Models released last 3-6 months
- **IMPORTANT**: Also search for ANY other AI providers not listed

**RESEARCH METHODOLOGY:**
1. **Web Search**: "latest AI models 2025", "newest LLM releases 2025", "new AI companies 2025"
2. **Provider APIs**: Check current documentation
3. **GitHub**: New open-source models
4. **Tech News**: Recent launches and announcements
5. **Startup News**: New AI companies and their models

**MARKET RESEARCH:**
Search ALL providers for LATEST models:
- OpenAI: Discover ALL current models (no assumptions)
- Anthropic: Discover ALL current models (no assumptions)
- Google: Discover ALL current models (no assumptions)
- DeepSeek: Discover ALL current models (no assumptions)
- Meta/Mistral/Cohere: Discover ALL current models
- **Others**: xAI/Grok, Inflection/Pi, Aleph Alpha, AI21, Stability AI, and ANY NEW providers

**DISCOVERY CRITERIA:**
- Latest versions only
- Demonstrated javascript/javascript capabilities
- small repository performance
- 2 complexity handling

**OUTPUT FORMAT:**
Return EXACTLY 2 rows in CSV format:
provider,model,cost_input,cost_output,tier,context_tokens
xai,grok-3,5.0,15.0,PREMIUM,100000
anthropic,claude-3.5-sonnet,3.0,15.0,PREMIUM,200000

**OUTPUT LIMITS:**
- CSV format: Maximum 500 characters total
- Focus on essential information only

**CRITICAL:** 
- Find THE SINGLE BEST across ALL providers for specific context, NOT generic models
- Include providers beyond the common ones (search for Grok, Pi, etc.)
- Return EXACTLY 2 rows: primary and fallback`;

const baselineUser = `**RESEARCH REQUEST [Session: session_123456]**
Reference Template: [RESEARCH_TEMPLATE_V1]

**CONTEXT PARAMETERS:**
- Language: javascript
- Frameworks: javascript
- Repository Size: small
- Complexity: 2x
- Agent Role: security
- Price Tier: standard
- Year: 2025
- Output Format: CSV

**ROLE-SPECIFIC REQUIREMENTS:**
- Identify security vulnerabilities and threats
- Analyze authentication and authorization flaws
- Detect injection attacks, XSS, CSRF patterns
- Assess cryptographic implementations

**EVALUATION CRITERIA:**
Threat Detection Accuracy (30%), False Positive Rate (20%), Reasoning Quality (25%)

**SPECIFIC OBJECTIVE:**
Find optimal model for javascript/javascript security analysis in small repositories with 2x complexity.

**PRICE CONSTRAINTS:**
Balance cost and performance, maximum $0.05 per 1K tokens

**OUTPUT INSTRUCTIONS:**
Use CSV format from template. Return EXACTLY 2 rows: primary and fallback. Maximum 500 chars.

Apply the cached [RESEARCH_TEMPLATE_V1] with these parameters.`;

console.log('\n📊 TOKEN ESTIMATE: ~' + Math.ceil((baselineSystem + baselineUser).length / 4) + ' tokens');

/**
 * OPTIMIZATION 1: Reduced Sections (25% reduction)
 */
console.log('\n\n' + '='.repeat(80));
console.log('OPTIMIZATION 1: REDUCED SECTIONS (25% REDUCTION)');
console.log('='.repeat(80));

const opt1System = `You are an AI model researcher for security analysis.

Find the SINGLE BEST AI model across ALL providers.

**DISCOVERY MISSION:**
- Major providers (OpenAI, Anthropic, Google, Meta, DeepSeek)
- Emerging providers (xAI/Grok, Inflection/Pi, Character.AI, etc.)
- Models released last 3-6 months
- Search for ANY other AI providers not listed

**DISCOVERY CRITERIA:**
- Latest versions only
- Demonstrated javascript capabilities
- small repository performance
- 2 complexity handling

**OUTPUT FORMAT:**
Return EXACTLY 2 rows in CSV format:
provider,model,cost_input,cost_output,tier,context_tokens

**CRITICAL:** 
- Find THE SINGLE BEST across ALL providers for specific context
- Return EXACTLY 2 rows: primary and fallback`;

const opt1User = `**RESEARCH REQUEST:**

**CONTEXT:**
- Language: javascript
- Repository Size: small
- Complexity: 2x
- Agent Role: security
- Price Tier: standard

**OBJECTIVE:**
Find optimal model for javascript security analysis in small repositories.

**OUTPUT:**
CSV format. Return EXACTLY 2 rows: primary and fallback. Maximum 500 chars.`;

console.log('\n📊 TOKEN ESTIMATE: ~' + Math.ceil((opt1System + opt1User).length / 4) + ' tokens');

/**
 * OPTIMIZATION 2: Minimal Core (50% reduction)
 */
console.log('\n\n' + '='.repeat(80));
console.log('OPTIMIZATION 2: MINIMAL CORE (50% REDUCTION)');
console.log('='.repeat(80));

const opt2System = `You are an AI model researcher. Find the BEST AI model for security analysis.

**PROVIDERS TO SEARCH:**
- OpenAI, Anthropic, Google, Meta, DeepSeek
- xAI/Grok, Inflection/Pi, Character.AI
- ANY other AI providers

**CRITERIA:**
- Latest versions only
- javascript capabilities
- small repository performance

**OUTPUT:**
Return EXACTLY 2 CSV rows:
provider,model,cost_input,cost_output,tier,context_tokens`;

const opt2User = `Find optimal models for:
- Language: javascript
- Role: security
- Size: small
- Complexity: 2x

Return 2 CSV rows: primary and fallback. Max 500 chars.`;

console.log('\n📊 TOKEN ESTIMATE: ~' + Math.ceil((opt2System + opt2User).length / 4) + ' tokens');

/**
 * COMPARISON SUMMARY
 */
console.log('\n\n' + '='.repeat(80));
console.log('COMPARISON SUMMARY');
console.log('='.repeat(80));

const baselineTokens = Math.ceil((baselineSystem + baselineUser).length / 4);
const opt1Tokens = Math.ceil((opt1System + opt1User).length / 4);
const opt2Tokens = Math.ceil((opt2System + opt2User).length / 4);

console.log(`
📏 TOKEN COMPARISON:
   Baseline (Current):      ~${baselineTokens} tokens
   Optimization 1 (25% cut): ~${opt1Tokens} tokens (-${baselineTokens - opt1Tokens} tokens, ${Math.round(((baselineTokens - opt1Tokens) / baselineTokens) * 100)}% reduction)
   Optimization 2 (50% cut): ~${opt2Tokens} tokens (-${baselineTokens - opt2Tokens} tokens, ${Math.round(((baselineTokens - opt2Tokens) / baselineTokens) * 100)}% reduction)

🎯 PROGRESSIVE OPTIMIZATION STRATEGY:
   - Start with current production prompt (baseline)
   - Test 25% reduction (remove verbose sections)
   - Test 50% reduction (keep only core elements)
   - Measure quality degradation vs cost savings

📝 EXPECTED OUTPUTS (all variants):
   Each test should return exactly 2 CSV rows like:
   anthropic,claude-3-5-sonnet,3.0,15.0,PREMIUM,200000
   openai,gpt-4,5.0,15.0,PREMIUM,100000

🔬 TESTING PLAN:
   - 3 prompt variants (baseline + 2 optimized)
   - 3 test scenarios (different repos/roles)
   - 9 total tests (limited iterations)
   - Focus on identifying optimal cost/quality balance
`);

console.log('\n✅ Ready to test progressive optimization!');
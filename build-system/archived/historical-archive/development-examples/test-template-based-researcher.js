#!/usr/bin/env node

/**
 * Template-Based RESEARCHER Prompt Generation
 * 
 * Combines legacy parametrized loop with our recent dynamic discovery approach
 * using templates to reduce token costs while maintaining sophistication.
 */

console.log('🔬 Template-Based RESEARCHER Prompt System\n');

// Base template with common research methodology (reused for all prompts)
const RESEARCH_TEMPLATE = `You are a cutting-edge AI model researcher. Find the SINGLE BEST AI model across ALL providers for {AGENT_ROLE} analysis.

**OBJECTIVE:** Find optimal model for {REPOSITORY_CONTEXT} considering {CONTEXT_FACTORS}.

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

{ROLE_REQUIREMENTS}

{EVALUATION_CRITERIA}

**OUTPUT:** Primary + fallback recommendation with scores.

**CRITICAL:** Find THE SINGLE BEST across ALL providers for {SPECIFIC_CONTEXT}, NOT generic models.`;

// Role-specific requirements (compact versions)
const ROLE_REQUIREMENTS = {
  security: `**SECURITY REQUIREMENTS:**
- Threat detection in {LANGUAGE}/{FRAMEWORK}
- Authentication/authorization analysis
- Injection attack detection
- Cryptographic assessment`,

  performance: `**PERFORMANCE REQUIREMENTS:**
- Bottleneck identification in {LANGUAGE}/{FRAMEWORK}
- Database optimization
- Algorithm complexity analysis
- Memory/caching strategies`,

  architecture: `**ARCHITECTURE REQUIREMENTS:**
- System design evaluation in {LANGUAGE}/{FRAMEWORK}
- Code organization assessment
- SOLID principles review
- Scalability analysis`,

  codeQuality: `**CODE QUALITY REQUIREMENTS:**
- Code smell detection in {LANGUAGE}/{FRAMEWORK}
- Standards compliance
- Complexity assessment
- Refactoring suggestions`
};

// Evaluation criteria (compact versions with weights)
const EVALUATION_CRITERIA = {
  security: `**EVALUATION:**
- Threat Detection (30%): Real security issues
- False Positives (20%): Noise minimization
- Reasoning (25%): Explains WHY
- Coverage (15%): Issue diversity
- Cost (10%): Value for security`,

  performance: `**EVALUATION:**
- Optimization Quality (35%): Actionable improvements
- Technical Accuracy (25%): Correct analysis
- Analysis Breadth (20%): CPU/memory/I/O coverage
- Code Understanding (15%): Performance patterns
- Cost (5%): Value efficiency`,

  architecture: `**EVALUATION:**
- Design Understanding (40%): Complex systems
- Pattern Recognition (25%): Anti-patterns
- Strategic Thinking (20%): Long-term considerations
- Technical Depth (10%): Tech stack knowledge
- Communication (5%): Clear explanations`,

  codeQuality: `**EVALUATION:**
- Code Understanding (35%): Structure comprehension
- Best Practices (25%): Standards awareness
- Refactoring (20%): Improvement suggestions
- Language Expertise (15%): Multi-language skill
- Detail Level (5%): Thorough analysis`
};

// Generate context-specific prompt
function generateContextPrompt(language, sizeCategory, agentRole, frameworks, complexity) {
  const currentYear = new Date().getFullYear();
  
  // Build context string
  const repositoryContext = `${language} ${sizeCategory} repository`;
  const contextFactors = `${frameworks.join('/')} frameworks, ${complexity}x complexity`;
  const specificContext = `${language}/${frameworks.join('/')} ${agentRole} in ${sizeCategory} projects`;
  
  // Get role-specific content
  const roleRequirements = ROLE_REQUIREMENTS[agentRole]
    .replace(/{LANGUAGE}/g, language)
    .replace(/{FRAMEWORK}/g, frameworks.join('/'));
    
  const evaluationCriteria = EVALUATION_CRITERIA[agentRole];
  
  // Fill template
  const prompt = RESEARCH_TEMPLATE
    .replace(/{AGENT_ROLE}/g, agentRole.toUpperCase())
    .replace(/{REPOSITORY_CONTEXT}/g, repositoryContext)
    .replace(/{CONTEXT_FACTORS}/g, contextFactors)
    .replace(/{CURRENT_YEAR}/g, currentYear)
    .replace(/{LANGUAGE}/g, language)
    .replace(/{FRAMEWORK}/g, frameworks.join('/'))
    .replace(/{SIZE}/g, sizeCategory)
    .replace(/{COMPLEXITY}/g, complexity + 'x')
    .replace(/{ROLE_REQUIREMENTS}/g, roleRequirements)
    .replace(/{EVALUATION_CRITERIA}/g, evaluationCriteria)
    .replace(/{SPECIFIC_CONTEXT}/g, specificContext);
    
  return prompt;
}

// Test the template system with different contexts
const testContexts = [
  {
    language: 'python',
    sizeCategory: 'small',
    agentRole: 'performance',
    frameworks: ['fastapi', 'pydantic'],
    complexity: 2.3
  },
  {
    language: 'java',
    sizeCategory: 'large', 
    agentRole: 'security',
    frameworks: ['spring-boot', 'hibernate'],
    complexity: 3.1
  },
  {
    language: 'typescript',
    sizeCategory: 'medium',
    agentRole: 'architecture', 
    frameworks: ['electron', 'webpack'],
    complexity: 1.8
  }
];

console.log('📋 TEMPLATE-BASED PROMPT GENERATION:');
console.log('====================================');

testContexts.forEach((context, index) => {
  const prompt = generateContextPrompt(
    context.language,
    context.sizeCategory, 
    context.agentRole,
    context.frameworks,
    context.complexity
  );
  
  console.log(`\n${index + 1}. ${context.language.toUpperCase()} ${context.sizeCategory.toUpperCase()} ${context.agentRole.toUpperCase()}`);
  console.log('─'.repeat(60));
  console.log(`Context: ${context.language}/${context.frameworks.join('/')} | ${context.sizeCategory} | ${context.complexity}x`);
  console.log(`Length: ${prompt.length} characters`);
  console.log('\nPrompt:');
  console.log(prompt);
  console.log('\n' + '='.repeat(80));
});

console.log('\n📊 TOKEN COST ANALYSIS:');
console.log('=======================');

// Calculate token savings
const baseTemplateLength = RESEARCH_TEMPLATE.length;
const averageContextLength = testContexts.reduce((sum, context) => {
  const prompt = generateContextPrompt(
    context.language, context.sizeCategory, context.agentRole, 
    context.frameworks, context.complexity
  );
  return sum + prompt.length;
}, 0) / testContexts.length;

console.log(`Base Template Length: ${baseTemplateLength} characters`);
console.log(`Average Final Prompt: ${Math.round(averageContextLength)} characters`);
console.log(`Template Reuse: ${Math.round((baseTemplateLength / averageContextLength) * 100)}% of content is reusable`);

// Compare with full context approach
const fullContextEstimate = 4500; // From previous examples
const savings = ((fullContextEstimate - averageContextLength) / fullContextEstimate) * 100;

console.log(`\nCOMPARISON:`);
console.log(`Full Context Approach: ~${fullContextEstimate} characters`);
console.log(`Template Approach: ~${Math.round(averageContextLength)} characters`);
console.log(`Token Savings: ~${Math.round(savings)}% reduction`);

console.log(`\n✅ BENEFITS:`);
console.log(`• Maintains sophisticated research methodology`);
console.log(`• Preserves context-specific parameters`);
console.log(`• Reduces token costs by ~${Math.round(savings)}%`);
console.log(`• Template reusable across all ${testContexts.length * 4 * 3} combinations`);
console.log(`• Easy to update research methodology once for all prompts`);

console.log(`\n🔄 LOOP IMPLEMENTATION:`);
console.log(`const languages = ['javascript', 'typescript', 'python', 'java', ...];`);
console.log(`const sizeCategories = ['small', 'medium', 'large'];`);
console.log(`const agentRoles = ['security', 'performance', 'architecture', 'codeQuality'];`);
console.log(`const frameworks = getFrameworksForLanguage(language);`);
console.log(`const complexity = calculateComplexity(context);`);
console.log(``);
console.log(`for (language, size, role combinations) {`);
console.log(`  const prompt = generateContextPrompt(language, size, role, frameworks, complexity);`);
console.log(`  // Send to Gemini 2.5 Flash`);
console.log(`}`);
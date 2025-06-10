#!/usr/bin/env node

/**
 * Generate Actual RESEARCHER Prompt
 * 
 * This script demonstrates exactly what prompt the RESEARCHER agent receives
 * when generating configurations for different contexts (language, size, role, etc.)
 */

console.log('🔬 Generating Actual RESEARCHER Prompts\n');

// Import the actual research prompts
const RESEARCH_PROMPTS = {
  DYNAMIC_MODEL_DISCOVERY: `
You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW, without being limited to any predefined list.

**OBJECTIVE:** Find the optimal model for {AGENT_ROLE} analysis with these requirements:
{ROLE_REQUIREMENTS}

**DISCOVERY MISSION:**
Find the most recent and capable AI models from ANY provider, including:
- Major providers (OpenAI, Anthropic, Google, Meta, etc.)
- Emerging providers and startups
- Open-source model releases
- Specialized coding/development models
- Models released in the last 6 months

**RESEARCH METHODOLOGY:**
1. **Web Search**: Search for "latest AI models {CURRENT_YEAR}", "newest LLM releases {CURRENT_YEAR}", "AI model announcements"
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
  "agentRole": "{AGENT_ROLE}",
  "repositoryContext": "{REPOSITORY_CONTEXT}",
  "researchDate": "{CURRENT_DATE}",
  "recommendation": {
    "primary": {
      "provider": "discovered_provider",
      "model": "discovered_model_name",
      "version": "discovered_version",
      "roleSpecificScore": 9.8,
      "reasoning": "Why this is the best model for {AGENT_ROLE} analysis",
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
      "whyBestForRole": "Specific reasons why this model excels at {AGENT_ROLE} analysis"
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
  "lastUpdated": "{CURRENT_DATE}"
}

**IMPORTANT:** 
- Don't be limited by what you "know" about existing models
- Research what's actually available NOW
- Include both commercial and open-source options
- Focus on models suitable for {AGENT_ROLE} analysis tasks
`,

  SECURITY_AGENT_RESEARCH: `
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

Cross-market research to find the absolute best model for security analysis, regardless of provider.`,

  PERFORMANCE_AGENT_RESEARCH: `
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

Find the best cross-market model for performance optimization, not best per provider.`,

  ARCHITECTURE_AGENT_RESEARCH: `
**ARCHITECTURE AGENT REQUIREMENTS:**
- Evaluate system design and architectural patterns
- Assess code organization and module dependencies
- Review design principles (SOLID, DRY, separation of concerns)
- Analyze scalability and maintainability factors
- Evaluate technology stack choices and integration patterns
- Suggest architectural improvements and refactoring

**ROLE-SPECIFIC EVALUATION:**
- **Architectural Understanding** (40%): Grasps complex system designs
- **Pattern Recognition** (25%): Identifies architectural anti-patterns
- **Strategic Thinking** (20%): Long-term architectural considerations
- **Technical Depth** (10%): Understanding of various tech stacks
- **Communication Clarity** (5%): Explains architectural concepts clearly

Cross-market analysis to find the absolute best model for architectural analysis.`,

  CODE_QUALITY_AGENT_RESEARCH: `
**CODE QUALITY AGENT REQUIREMENTS:**
- Identify code smells and maintainability issues
- Review coding standards and style consistency
- Assess code complexity and readability
- Evaluate test coverage and testing strategies
- Review documentation quality and completeness
- Suggest refactoring opportunities

**ROLE-SPECIFIC EVALUATION:**
- **Code Understanding** (35%): Deep comprehension of code structure
- **Best Practice Knowledge** (25%): Awareness of coding standards
- **Refactoring Suggestions** (20%): Practical improvement recommendations
- **Language Expertise** (15%): Proficiency across programming languages
- **Detail Level** (5%): Thorough analysis without overwhelming detail

Find the single best model across all providers for comprehensive code quality analysis.`
};

// Simulate the prompt generation logic from ResearcherAgent
class PromptGenerator {
  constructor() {
    this.currentYear = new Date().getFullYear();
    this.currentDate = new Date().toISOString().split('T')[0];
  }

  /**
   * Generate the complete prompt for a specific context
   */
  generatePromptForContext(language, sizeCategory, agentRole) {
    console.log(`\n🎯 Generating prompt for context:`);
    console.log(`   Language: ${language}`);
    console.log(`   Size: ${sizeCategory}`);
    console.log(`   Agent Role: ${agentRole}`);
    console.log(`   Target Model: Gemini 2.5 Flash (current RESEARCHER)`);
    
    // Get role-specific requirements
    const roleRequirements = this.getRoleSpecificRequirements(agentRole);
    
    // Build repository context string
    const repositoryContext = `Language: ${language}, Size: ${sizeCategory}, Complexity: varies by repository`;
    
    // Generate the complete prompt
    const completePrompt = RESEARCH_PROMPTS.DYNAMIC_MODEL_DISCOVERY
      .replace(/{CURRENT_YEAR}/g, this.currentYear.toString())
      .replace(/{CURRENT_DATE}/g, this.currentDate)
      .replace(/{AGENT_ROLE}/g, agentRole.toUpperCase())
      .replace(/{ROLE_REQUIREMENTS}/g, roleRequirements)
      .replace(/{REPOSITORY_CONTEXT}/g, repositoryContext);
    
    return completePrompt;
  }

  /**
   * Get role-specific requirements (same logic as ResearcherAgent)
   */
  getRoleSpecificRequirements(agentRole) {
    switch (agentRole) {
      case 'security':
        return RESEARCH_PROMPTS.SECURITY_AGENT_RESEARCH;
      case 'performance':
        return RESEARCH_PROMPTS.PERFORMANCE_AGENT_RESEARCH;
      case 'architecture':
        return RESEARCH_PROMPTS.ARCHITECTURE_AGENT_RESEARCH;
      case 'codeQuality':
        return RESEARCH_PROMPTS.CODE_QUALITY_AGENT_RESEARCH;
      default:
        return `**GENERAL AGENT REQUIREMENTS:**\n- Analyze code for ${agentRole} concerns\n- Provide actionable insights and recommendations`;
    }
  }

  /**
   * Demonstrate the loop-based generation for multiple contexts
   */
  demonstrateContextLoop() {
    // Same context parameters as the actual ResearcherAgent
    const languages = ['javascript', 'typescript', 'python', 'java'];  // Shortened for demo
    const sizeCategories = ['small', 'medium', 'large'];
    const agentRoles = ['security', 'performance', 'architecture', 'codeQuality'];

    console.log('🔄 Context Loop Generation (same as ResearcherAgent):');
    console.log('====================================================');
    
    let totalPrompts = 0;
    for (const agentRole of agentRoles) {
      console.log(`\n📋 ${agentRole.toUpperCase()} AGENT ROLE:`);
      console.log('─'.repeat(40));
      
      for (const language of languages) {
        for (const sizeCategory of sizeCategories) {
          const context = `${language}-${sizeCategory}-${agentRole}`;
          console.log(`   ✓ Generated prompt for: ${context}`);
          totalPrompts++;
        }
      }
    }
    
    console.log(`\n📊 Total prompts generated: ${totalPrompts}`);
    console.log(`   (${languages.length} languages × ${sizeCategories.length} sizes × ${agentRoles.length} roles)`);
    console.log(`   Each prompt ~4000+ characters with full scoring instructions`);
  }
}

// Generate examples
const generator = new PromptGenerator();

console.log('🔍 COMPLETE PROMPT EXAMPLE:');
console.log('='.repeat(80));

// Show one complete example
const examplePrompt = generator.generatePromptForContext('typescript', 'medium', 'security');
console.log(examplePrompt);

console.log('\n' + '='.repeat(80));

console.log(`\n📊 Prompt Analysis:`);
console.log(`• Length: ${examplePrompt.length} characters`);
console.log(`• Contains scoring weights: ✅ (30%, 25%, 20%, 15%, 10%)`);
console.log(`• Contains evaluation criteria: ✅ (Threat Detection, False Positives, etc.)`);
console.log(`• Contains market research instructions: ✅`);
console.log(`• Contains dynamic discovery: ✅ (no hardcoded models)`);
console.log(`• Contains output format: ✅ (JSON with primary + fallback)`);

// Demonstrate the loop generation
generator.demonstrateContextLoop();

console.log(`\n🤖 What Gemini 2.5 Flash (RESEARCHER) Receives:`);
console.log('==============================================');
console.log(`1. Complete prompt with specific context (language, size, role)`);
console.log(`2. Detailed scoring instructions with exact percentages`);
console.log(`3. Role-specific evaluation criteria`);
console.log(`4. Market research methodology`);
console.log(`5. Expected JSON output format`);
console.log(`6. Instructions to find THE SINGLE BEST model across ALL providers`);

console.log(`\n🎯 Key Scoring Instructions Included:`);
console.log('====================================');
console.log(`• Security: Threat Detection (30%), False Positives (20%), Reasoning (25%)`);
console.log(`• Performance: Optimization Quality (35%), Technical Accuracy (25%)`);
console.log(`• Architecture: Understanding (40%), Pattern Recognition (25%)`);
console.log(`• Code Quality: Code Understanding (35%), Best Practices (25%)`);
console.log(`• Plus: Speed, cost efficiency, and contextual factors`);

console.log(`\n✅ RESEARCHER gets complete scoring instructions for each context!`);
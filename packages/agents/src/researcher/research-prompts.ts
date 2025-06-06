/**
 * Research Prompts for RESEARCHER Agent
 * 
 * These are the actual prompts the RESEARCHER agent uses to research
 * optimal AI models, considering quality, recency, cost, and performance.
 */

const RESEARCH_PROMPTS = {
  
  /**
   * Specialized Agent Requirement Research - Find best cross-market model for specific needs
   */
  AGENT_REQUIREMENT_RESEARCH: `
You are tasked with finding the SINGLE BEST AI model across ALL providers for a specific agent role requirement. 

**OBJECTIVE:** Find the optimal model (not per provider, but across the entire market) for:
{AGENT_ROLE}: {ROLE_DESCRIPTION}
{REPOSITORY_CONTEXT}: {CONTEXT_DETAILS}

**RESEARCH APPROACH:**
1. **Cross-Market Analysis**: Compare ALL available models from ALL providers
2. **Specific Requirements**: Focus on capabilities needed for this exact role
3. **Primary + Fallback**: Identify best model AND a reliable fallback option
4. **Cost-Effectiveness**: Balance quality with pricing for this specific use case

**EVALUATION CRITERIA FOR {AGENT_ROLE}:**
- **Role-Specific Capability** (50% weight): How well suited for this exact task
- **Quality & Accuracy** (25% weight): Proven performance in this domain  
- **Cost Efficiency** (15% weight): Value for this specific use case
- **Reliability & Speed** (10% weight): Consistent performance

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

**DISCOVERY METHOD:**
- Query each provider's current API documentation
- Search for recent model announcements and releases  
- Look for models released in the last 6 months (adjust timeframe based on current year)
- Don't limit to known model names - discover what's actually available NOW

**OUTPUT FORMAT:**
{
  "agentRole": "{AGENT_ROLE}",
  "repositoryContext": "{REPOSITORY_CONTEXT}",
  "researchDate": "2025-06-02",
  "recommendation": {
    "primary": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet",
      "version": "claude-3-5-sonnet-20250602",
      "roleSpecificScore": 9.8,
      "reasoning": "Exceptional reasoning capability ideal for security analysis",
      "capabilities": {
        "roleSpecific": 9.8,
        "quality": 9.5,
        "speed": 7.8,
        "costEfficiency": 7.2,
        "contextWindow": 200000
      },
      "pricing": {
        "input": 3.00,
        "output": 15.00,
        "estimatedCostPerTask": 0.45
      },
      "whyBestForRole": "Superior reasoning and security pattern recognition"
    },
    "fallback": {
      "provider": "google",
      "model": "gemini-2.5-flash",
      "version": "gemini-2.5-flash-20250602",
      "roleSpecificScore": 8.2,
      "reasoning": "Cost-effective with good security capabilities",
      "capabilities": {
        "roleSpecific": 8.2,
        "quality": 8.5,
        "speed": 9.2,
        "costEfficiency": 9.6,
        "contextWindow": 100000
      },
      "pricing": {
        "input": 0.075,
        "output": 0.30,
        "estimatedCostPerTask": 0.06
      },
      "whyFallback": "Reliable backup when primary is unavailable or cost is concern"
    }
  },
  "competitiveAnalysis": [
    {
      "model": "gpt-4o",
      "score": 8.9,
      "reason": "Good but slightly lower reasoning for security analysis"
    },
    {
      "model": "deepseek-coder-v2", 
      "score": 8.5,
      "reason": "Strong coding but less specialized for security"
    }
  ],
  "confidence": 0.92,
  "lastUpdated": "2025-06-02"
}

**CRITICAL:** Don't find "best OpenAI model" + "best Anthropic model" etc. Find THE SINGLE BEST model across ALL providers for this specific requirement.`,

  /**
   * Agent Role-Specific Research Templates
   */
  SECURITY_AGENT_RESEARCH: `
Find the SINGLE BEST AI model across ALL providers for SECURITY ANALYSIS tasks.

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
Find the SINGLE BEST AI model across ALL providers for PERFORMANCE OPTIMIZATION tasks.

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
Find the SINGLE BEST AI model across ALL providers for ARCHITECTURE ANALYSIS tasks.

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
Find the SINGLE BEST AI model across ALL providers for CODE QUALITY analysis tasks.

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

Find the single best model across all providers for comprehensive code quality analysis.`,

  EDUCATIONAL_AGENT_RESEARCH: (() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    
    return `Find the SINGLE BEST AI model across ALL providers for EDUCATIONAL CONTENT generation tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize models with the most recent training data (${currentYear} releases)
- Do NOT consider older models even if they were previously good
- Check for newest educational AI capabilities and features released in ${currentYear}

**EDUCATIONAL AGENT REQUIREMENTS:**
- Generate clear learning materials and tutorials
- Create step-by-step code walkthroughs and explanations
- Identify educational opportunities and knowledge gaps
- Suggest learning paths for code improvement
- Create interactive examples and demonstrations
- Explain complex concepts in simple, accessible terms

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- OpenAI: Latest GPT-4.1, GPT-4.o, or newer models with educational capabilities
- Anthropic: Newest Claude 4 Sonnet or latest Claude models optimized for teaching
- Google: Most recent Gemini Pro models with educational features
- Meta: Latest Llama 3+ models with instruction-following
- Emerging providers: Search for new AI companies with educational focus
- Specialized models: Look for models specifically trained for educational content

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **Educational Clarity** (35%): Creates clear, easy-to-understand explanations
- **Latest Model Advantages** (25%): Benefits from recent ${currentYear} training and improvements
- **Learning Path Generation** (20%): Suggests structured learning approaches
- **Concept Explanation Quality** (15%): Explains complex topics simply
- **Cost Efficiency** (5%): Good value for educational content generation

**EDUCATIONAL SPECIALIZATIONS:**
- Beginner-friendly explanations of advanced concepts
- Code-to-learning-material conversion
- Interactive tutorial generation
- Concept visualization and analogies
- Progressive skill building pathways
- Language-agnostic programming principles

Cross-market research to find the absolute best LATEST model for educational content generation available in ${currentMonth} ${currentYear}.`;
  })(),

  REPORTING_AGENT_RESEARCH: (() => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
    
    return `Find the SINGLE BEST AI model across ALL providers for REPORTING AND VISUALIZATION tasks.

**CRITICAL REQUIREMENT: LATEST MODELS ONLY**
- Focus EXCLUSIVELY on models released in the last 6 months (since ${currentMonth} ${currentYear - 1})
- Prioritize models with the most recent training data (${currentYear} releases)
- Do NOT consider older models even if they were previously good
- Check for newest data visualization and reporting AI capabilities released in ${currentYear}

**REPORTING AGENT REQUIREMENTS:**
- Generate comprehensive visual reports and dashboards
- Create charts, graphs, and diagrams (Grafana, Mermaid, Chart.js)
- Synthesize data into actionable insights
- Structure reports with clear executive summaries
- Generate automated reporting templates
- Visualize trends, metrics, and performance data

**LATEST MODEL DISCOVERY (${currentMonth} ${currentYear}):**
Search for the newest models from ALL providers released in ${currentYear}:
- OpenAI: Latest GPT-4.1, GPT-4.o, or newer models with data analysis and visualization capabilities
- Anthropic: Newest Claude 4 Sonnet or latest Claude models optimized for report generation
- Google: Most recent Gemini Pro models with data synthesis features
- Meta: Latest Llama 3+ models with analytical capabilities
- Emerging providers: Search for new AI companies specializing in data visualization
- Specialized models: Look for models trained specifically for business intelligence

**CURRENT YEAR CONTEXT:** ${currentYear}
**RESEARCH DATE:** ${currentDate.toISOString().split('T')[0]}

**ROLE-SPECIFIC EVALUATION:**
- **Visualization Quality** (30%): Creates effective charts and visual reports
- **Latest Model Advantages** (25%): Benefits from recent ${currentYear} training and improvements
- **Data Synthesis** (20%): Combines multiple data sources meaningfully
- **Report Structure** (15%): Organizes information logically and clearly
- **Chart and Graph Generation** (10%): Creates appropriate visual representations

**REPORTING SPECIALIZATIONS:**
- Grafana dashboard configuration and setup
- Mermaid diagram generation (flowcharts, sequence diagrams)
- Chart.js and D3.js visualization creation
- Executive summary and stakeholder communication
- Automated report scheduling and distribution
- KPI identification and tracking visualization

Cross-market analysis to find the absolute best LATEST model for comprehensive reporting and visualization available in ${currentMonth} ${currentYear}.`;
  })(),


  /**
   * Dynamic Discovery Prompt - No hardcoded models
   */
  DYNAMIC_MODEL_DISCOVERY: `
You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW, without being limited to any predefined list.

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
Provide a comprehensive discovery report with:
1. Summary of search methodology used
2. List of all models discovered
3. Assessment of each model's capabilities
4. Recommendations for further evaluation

**IMPORTANT:** 
- Don't be limited by what you "know" about existing models
- Research what's actually available NOW
- Include both commercial and open-source options
- Focus on models suitable for code analysis and development tasks
`,

  /**
   * Quality Assessment Prompt
   */
  QUALITY_ASSESSMENT: `
You are evaluating AI models for enterprise code analysis. Rate each model on a 1-10 scale:

**CODE QUALITY (1-10)**
- How well does it understand code structure and patterns?
- Can it identify subtle bugs and security issues?
- Does it provide accurate architectural analysis?

**REASONING (1-10)** 
- Can it handle complex, multi-step analysis?
- Does it consider context and dependencies?
- Can it explain the "why" behind recommendations?

**DETAIL LEVEL (1-10)**
- How thorough are its explanations?
- Does it provide actionable recommendations?
- Can it cite specific code examples and line numbers?

**SPEED (1-10)**
- Response latency for typical requests
- Throughput for batch operations
- Consistency of performance

**RECENCY SCORE (1-10)**
- Model release date (2025 = 10, 2024 = 7, 2023 = 4)
- Training data recency
- Awareness of latest programming practices

PROVIDE OVERALL QUALITY SCORE: Average of all factors with recency weighted 2x.`,

  /**
   * Use Case Specialization Prompt
   */
  USE_CASE_ANALYSIS: `
For each model, determine optimal use cases based on:

**REPOSITORY SIZE**
- Small (< 10k lines): Fast, cost-effective models
- Medium (10k-100k lines): Balanced performance/cost
- Large (> 100k lines): High-capability models with large context

**ANALYSIS TYPE**
- Security: Models with strong reasoning for threat detection
- Performance: Models good at optimization recommendations  
- Architecture: Models with strong structural understanding
- Code Quality: Models with detailed code review capabilities

**COST SENSITIVITY**
- High frequency operations: Cost-optimized models
- Critical analysis: Premium models regardless of cost
- Educational content: Balanced cost/capability

**SPECIALIZATIONS**
- TypeScript/JavaScript: Frontend development focus
- Python: Data science and backend analysis
- Java/C#: Enterprise application analysis
- Systems languages (Rust/Go): Performance-critical code

Recommend specific model for each use case with reasoning.`
};

/**
 * Research configuration templates for different scenarios
 */
export const RESEARCH_CONFIGS = {
  
  /**
   * Quality-First Research (for critical applications)
   */
  QUALITY_FIRST: {
    weights: {
      quality: 0.5,
      recency: 0.25, 
      performance: 0.15,
      cost: 0.1
    },
    criteria: "Prioritize the highest quality models regardless of cost",
    useCase: "Enterprise security analysis, critical code review"
  },

  /**
   * Balanced Research (default)
   */
  BALANCED: {
    weights: {
      quality: 0.4,
      recency: 0.25,
      performance: 0.2,
      cost: 0.15
    },
    criteria: "Balance quality, recency, and cost-effectiveness",
    useCase: "General code analysis, standard development workflows"
  },

  /**
   * Cost-Conscious Research (for high-volume operations)
   */
  COST_CONSCIOUS: {
    weights: {
      quality: 0.3,
      recency: 0.2,
      performance: 0.2,
      cost: 0.3
    },
    criteria: "Optimize for cost while maintaining acceptable quality",
    useCase: "Educational content, high-frequency analysis, CI/CD"
  },

  /**
   * Latest-and-Greatest Research (for cutting-edge features)
   */
  BLEEDING_EDGE: {
    weights: {
      quality: 0.35,
      recency: 0.4,
      performance: 0.15,
      cost: 0.1
    },
    criteria: "Prioritize newest models with latest capabilities",
    useCase: "Research, experimental features, advanced analysis"
  }
};

// Export individual prompts for easier importing
export const EDUCATIONAL_AGENT_RESEARCH = RESEARCH_PROMPTS.EDUCATIONAL_AGENT_RESEARCH;
export const REPORTING_AGENT_RESEARCH = RESEARCH_PROMPTS.REPORTING_AGENT_RESEARCH;

export { RESEARCH_PROMPTS };
export default RESEARCH_PROMPTS;
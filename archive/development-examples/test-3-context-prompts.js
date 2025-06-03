#!/usr/bin/env node

/**
 * Generate 3 Different RESEARCHER Prompts from Context Loop
 * 
 * Shows how different combinations of language, size, complexity, 
 * frameworks, and agent roles create completely different prompts.
 */

console.log('🔬 3 RESEARCHER Prompts from Context Loop\n');

// Define 3 different repository contexts from the loop
const contexts = [
  {
    // Context 1: Small Python API with high complexity
    repo: {
      owner: 'fastapi',
      repo: 'fastapi',
      language: 'python',
      secondaryLanguages: ['yaml', 'dockerfile'],
      sizeBytes: 3 * 1024 * 1024, // 3MB - small
      frameworks: ['fastapi', 'pydantic', 'uvicorn', 'pytest'],
      contributorCount: 180,
      metadata: { architecture: 'api', testCoverage: 0.92 }
    },
    tier: 'quick',
    strategy: 'performance', 
    agentRole: 'performance',
    prSize: 500 * 1024 // 500KB
  },
  {
    // Context 2: Large Java enterprise app with medium complexity
    repo: {
      owner: 'spring-projects',
      repo: 'spring-boot',
      language: 'java',
      secondaryLanguages: ['groovy', 'kotlin'],
      sizeBytes: 85 * 1024 * 1024, // 85MB - large
      frameworks: ['spring-boot', 'spring-security', 'hibernate', 'junit'],
      contributorCount: 850,
      metadata: { architecture: 'enterprise', testCoverage: 0.78 }
    },
    tier: 'comprehensive',
    strategy: 'detail',
    agentRole: 'security',
    prSize: 8 * 1024 * 1024 // 8MB
  },
  {
    // Context 3: Medium TypeScript frontend with low complexity
    repo: {
      owner: 'microsoft',
      repo: 'vscode',
      language: 'typescript',
      secondaryLanguages: ['javascript', 'css'],
      sizeBytes: 25 * 1024 * 1024, // 25MB - medium
      frameworks: ['electron', 'webpack', 'monaco-editor'],
      contributorCount: 450,
      metadata: { architecture: 'desktop-app', testCoverage: 0.65 }
    },
    tier: 'targeted',
    strategy: 'balanced',
    agentRole: 'architecture',
    prSize: 1.2 * 1024 * 1024 // 1.2MB
  }
];

// Helper functions (same as RepositoryModelSelectionService)
function getSizeCategory(sizeBytes) {
  if (sizeBytes < 5 * 1024 * 1024) return 'small';
  if (sizeBytes < 50 * 1024 * 1024) return 'medium';
  return 'large';
}

function getComplexityMultiplier(repository) {
  let multiplier = 1.0;
  
  if (repository.frameworks && repository.frameworks.length > 0) {
    multiplier += 0.2 * Math.min(repository.frameworks.length, 3);
  }
  
  if (repository.secondaryLanguages && repository.secondaryLanguages.length > 0) {
    multiplier += 0.1 * Math.min(repository.secondaryLanguages.length, 5);
  }
  
  if (repository.contributorCount && repository.contributorCount > 10) {
    multiplier += 0.1 * Math.min(Math.floor(repository.contributorCount / 10), 5);
  }
  
  return multiplier;
}

function getAgentRequirements(agentRole) {
  const requirements = {
    performance: `
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
- **Cost Efficiency** (5%): Good value for performance analysis`,

    security: `
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
- **Cost for Security Tasks** (10%): Value for security-focused analysis`,

    architecture: `
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
- **Communication Clarity** (5%): Explains architectural concepts clearly`
  };
  
  return requirements[agentRole] || requirements.performance;
}

function generatePrompt(context) {
  const { repo, tier, strategy, agentRole, prSize } = context;
  const sizeCategory = getSizeCategory(repo.sizeBytes);
  const complexityMultiplier = getComplexityMultiplier(repo);
  const agentRequirements = getAgentRequirements(agentRole);
  
  return `You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW for this specific repository context.

**REPOSITORY CONTEXT:**
- **Repository:** ${repo.owner}/${repo.repo}
- **Primary Language:** ${repo.language}
- **Secondary Languages:** ${repo.secondaryLanguages.join(', ')}
- **Repository Size:** ${Math.round(repo.sizeBytes / (1024 * 1024))}MB (${sizeCategory} repository)
- **Frameworks:** ${repo.frameworks.join(', ')}
- **Overall Complexity:** ${complexityMultiplier.toFixed(2)}x multiplier
- **Contributors:** ${repo.contributorCount}
- **Test Coverage:** ${(repo.metadata.testCoverage * 100).toFixed(0)}%
- **Architecture:** ${repo.metadata.architecture}

**ANALYSIS PARAMETERS:**
- **Analysis Tier:** ${tier} (depth level)
- **Selection Strategy:** ${strategy} (preference)
- **Agent Role:** ${agentRole.toUpperCase()} analysis
- **PR Size:** ${Math.round(prSize / (1024 * 1024))}MB changes

**OBJECTIVE:** Find the optimal model for ${agentRole.toUpperCase()} analysis considering ALL these context factors.

**CONTEXT-SPECIFIC REQUIREMENTS:**
- **Language Expertise:** Must excel at ${repo.language} and ${repo.secondaryLanguages.join('/')}
- **Framework Knowledge:** Must understand ${repo.frameworks.join(', ')} ecosystem
- **Repository Scale:** Must handle ${sizeCategory} repositories (${Math.round(repo.sizeBytes / (1024 * 1024))}MB)
- **Complexity Handling:** Must manage ${complexityMultiplier.toFixed(2)}x complexity
- **Analysis Depth:** ${tier} analysis (${strategy} strategy)
- **Team Context:** Must work with ${repo.contributorCount} contributors
- **Architecture Context:** Must understand ${repo.metadata.architecture} patterns

${agentRequirements}

**CONTEXT-WEIGHTED EVALUATION:**
- **Language/Framework Expertise** (25%): ${repo.language} + ${repo.frameworks.join('/')} knowledge
- **Scale Handling** (20%): Performance with ${sizeCategory} repositories (${complexityMultiplier.toFixed(2)}x complexity)
- **Analysis Strategy Fit** (15%): Optimized for ${tier} ${strategy} analysis
- **Team Integration** (10%): Works with ${repo.contributorCount}-person teams
- **Architecture Understanding** (10%): ${repo.metadata.architecture} expertise
- **Cost Efficiency** (20%): Value for this specific context

**DISCOVERY CRITERIA:**
- Models released in the last 3-6 months
- Proven expertise with ${repo.language} and ${repo.frameworks.join('/')}
- Capability to handle ${sizeCategory} repositories with ${complexityMultiplier.toFixed(2)}x complexity
- Performance suitable for ${tier} analysis with ${strategy} strategy
- Cost-effectiveness for teams of ${repo.contributorCount} contributors

**OUTPUT FORMAT:**
{
  "repositoryContext": {
    "repo": "${repo.owner}/${repo.repo}",
    "language": "${repo.language}",
    "frameworks": ${JSON.stringify(repo.frameworks)},
    "size": "${sizeCategory}",
    "complexity": ${complexityMultiplier.toFixed(2)},
    "tier": "${tier}",
    "strategy": "${strategy}",
    "agentRole": "${agentRole.toUpperCase()}"
  },
  "recommendation": {
    "primary": {
      "whyBestForContext": "Excels at ${repo.language}/${repo.frameworks.join('/')} ${agentRole} analysis in ${sizeCategory} ${repo.metadata.architecture} with ${tier} ${strategy} approach"
    }
  }
}

**CRITICAL:** Find models that excel specifically at ${repo.language}/${repo.frameworks.join('/')} ${agentRole} analysis in ${sizeCategory} ${repo.metadata.architecture} projects, NOT generic models.`;
}

// Generate and display all 3 prompts
contexts.forEach((context, index) => {
  const { repo, tier, strategy, agentRole } = context;
  const sizeCategory = getSizeCategory(repo.sizeBytes);
  const complexityMultiplier = getComplexityMultiplier(repo);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 PROMPT ${index + 1}: ${repo.language.toUpperCase()} ${sizeCategory.toUpperCase()} ${agentRole.toUpperCase()}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Context: ${repo.owner}/${repo.repo} | ${repo.language} | ${sizeCategory} | ${complexityMultiplier.toFixed(2)}x complexity | ${agentRole} | ${tier} ${strategy}`);
  console.log(`${'='.repeat(80)}`);
  
  const prompt = generatePrompt(context);
  console.log(prompt);
});

console.log(`\n${'='.repeat(80)}`);
console.log('📊 KEY DIFFERENCES BETWEEN THE 3 PROMPTS:');
console.log(`${'='.repeat(80)}`);

console.log('\n🔍 PROMPT 1: Python Small Performance');
console.log('────────────────────────────────────');
console.log('• Language: Python + YAML/Dockerfile');
console.log('• Size: Small (3MB) with quick performance analysis');
console.log('• Frameworks: FastAPI/Pydantic/Uvicorn ecosystem');
console.log('• Focus: Optimization Insight Quality (35%), speed-focused');
console.log('• Strategy: Performance-first for API optimization');

console.log('\n🔍 PROMPT 2: Java Large Security');
console.log('──────────────────────────────');
console.log('• Language: Java + Groovy/Kotlin');
console.log('• Size: Large (85MB) with comprehensive detailed analysis');
console.log('• Frameworks: Spring Boot/Security/Hibernate enterprise stack');
console.log('• Focus: Threat Detection (30%), enterprise security patterns');
console.log('• Strategy: Detail-first for thorough security review');

console.log('\n🔍 PROMPT 3: TypeScript Medium Architecture');
console.log('─────────────────────────────────────────');
console.log('• Language: TypeScript + JavaScript/CSS');
console.log('• Size: Medium (25MB) with targeted balanced analysis');
console.log('• Frameworks: Electron/Webpack desktop app stack');
console.log('• Focus: Architectural Understanding (40%), design patterns');
console.log('• Strategy: Balanced approach for architectural decisions');

console.log('\n✅ Each prompt is COMPLETELY DIFFERENT based on context parameters!');
console.log('   The RESEARCHER gets specialized instructions for each use case.');
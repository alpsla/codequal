#!/usr/bin/env node

/**
 * RESEARCHER Prompt with Full Context Parameters
 * 
 * This shows how RESEARCHER gets ALL the sophisticated context parameters:
 * language, size, complexity, price sensitivity, frameworks, contributor count, etc.
 */

console.log('🔬 RESEARCHER Prompt with FULL Context Parameters\n');

// Simulate a real repository context with ALL parameters
const repositoryContext = {
  owner: 'facebook',
  repo: 'react',
  repoType: 'github',
  language: 'javascript',
  secondaryLanguages: ['typescript', 'css'],
  sizeBytes: 45 * 1024 * 1024, // 45MB - medium repository
  visibility: 'public',
  frameworks: ['react', 'jest', 'babel', 'webpack'],
  description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
  isFork: false,
  lastCommitDate: '2025-06-03',
  defaultBranch: 'main',
  commitCount: 12500,
  contributorCount: 1200,
  createdAt: '2013-05-24',
  urls: {
    homepage: 'https://reactjs.org',
    documentation: 'https://reactjs.org/docs',
    issues: 'https://github.com/facebook/react/issues'
  },
  metadata: {
    architecture: 'library',
    testCoverage: 0.85,
    buildSystem: 'rollup',
    cicd: 'github-actions'
  }
};

// Analysis parameters
const analysisTier = 'comprehensive'; // quick | comprehensive | targeted
const selectionStrategy = 'balanced'; // performance | balanced | detail
const agentRole = 'security';
const prSize = 2 * 1024 * 1024; // 2MB PR changes

// Calculate derived parameters (same as RepositoryModelSelectionService)
function getSizeCategory(sizeBytes) {
  if (sizeBytes < 5 * 1024 * 1024) return 'small';
  if (sizeBytes < 50 * 1024 * 1024) return 'medium';
  return 'large';
}

function getSizeMultiplier(sizeBytes) {
  if (sizeBytes < 1 * 1024 * 1024) return 0.5;
  if (sizeBytes < 10 * 1024 * 1024) return 1.0;
  if (sizeBytes < 50 * 1024 * 1024) return 1.5;
  if (sizeBytes < 100 * 1024 * 1024) return 2.0;
  return 3.0;
}

function getComplexityMultiplier(repository) {
  let multiplier = 1.0;
  
  // Add complexity for frameworks
  if (repository.frameworks && repository.frameworks.length > 0) {
    multiplier += 0.2 * Math.min(repository.frameworks.length, 3);
  }
  
  // Add complexity for multiple languages
  if (repository.secondaryLanguages && repository.secondaryLanguages.length > 0) {
    multiplier += 0.1 * Math.min(repository.secondaryLanguages.length, 5);
  }
  
  // Add complexity for large contributor count
  if (repository.contributorCount && repository.contributorCount > 10) {
    multiplier += 0.1 * Math.min(Math.floor(repository.contributorCount / 10), 5);
  }
  
  return multiplier;
}

function estimateCalibrationTime(repository, calibrationType = 'full') {
  const baseTime = calibrationType === 'full' ? 20 : 10;
  const sizeMultiplier = getSizeMultiplier(repository.sizeBytes || 0);
  const complexityMultiplier = getComplexityMultiplier(repository);
  
  return Math.ceil(baseTime * sizeMultiplier * complexityMultiplier);
}

function identifyComplexFrameworks(frameworks) {
  const complexFrameworkPatterns = [
    /^react-native$/i, /^angular$/i, /^svelte$/i, /^next\.?js$/i,
    /^nuxt\.?js$/i, /^electron$/i, /^flutter$/i, /^django$/i,
    /^spring-boot$/i, /^quarkus$/i, /^symphony$/i, /^laravel$/i
  ];
  
  return frameworks.filter(framework => 
    complexFrameworkPatterns.some(pattern => pattern.test(framework))
  );
}

// Calculate all context parameters
const sizeCategory = getSizeCategory(repositoryContext.sizeBytes);
const sizeMultiplier = getSizeMultiplier(repositoryContext.sizeBytes);
const complexityMultiplier = getComplexityMultiplier(repositoryContext);
const calibrationTime = estimateCalibrationTime(repositoryContext);
const complexFrameworks = identifyComplexFrameworks(repositoryContext.frameworks);
const prSizeCategory = getSizeCategory(prSize);

console.log('📊 FULL CONTEXT ANALYSIS:');
console.log('=========================');
console.log(`Repository: ${repositoryContext.owner}/${repositoryContext.repo}`);
console.log(`Primary Language: ${repositoryContext.language}`);
console.log(`Secondary Languages: ${repositoryContext.secondaryLanguages.join(', ')}`);
console.log(`Repository Size: ${Math.round(repositoryContext.sizeBytes / (1024 * 1024))}MB (${sizeCategory})`);
console.log(`Size Multiplier: ${sizeMultiplier}x`);
console.log(`Frameworks: ${repositoryContext.frameworks.join(', ')}`);
console.log(`Complex Frameworks: ${complexFrameworks.join(', ') || 'None'}`);
console.log(`Complexity Multiplier: ${complexityMultiplier.toFixed(2)}x`);
console.log(`Contributors: ${repositoryContext.contributorCount}`);
console.log(`Commits: ${repositoryContext.commitCount}`);
console.log(`Age: ${new Date().getFullYear() - new Date(repositoryContext.createdAt).getFullYear()} years`);
console.log(`Test Coverage: ${(repositoryContext.metadata.testCoverage * 100).toFixed(0)}%`);
console.log(`Analysis Tier: ${analysisTier}`);
console.log(`Selection Strategy: ${selectionStrategy}`);
console.log(`Agent Role: ${agentRole}`);
console.log(`PR Size: ${Math.round(prSize / (1024 * 1024))}MB (${prSizeCategory})`);
console.log(`Estimated Calibration Time: ${calibrationTime} minutes`);

console.log('\n📋 COMPLETE RESEARCHER PROMPT WITH ALL PARAMETERS:');
console.log('='.repeat(70));

const fullContextPrompt = `You are a cutting-edge AI model researcher. Your task is to discover and research the NEWEST AI models available RIGHT NOW for this specific repository context.

**REPOSITORY CONTEXT:**
- **Repository:** ${repositoryContext.owner}/${repositoryContext.repo}
- **Primary Language:** ${repositoryContext.language}
- **Secondary Languages:** ${repositoryContext.secondaryLanguages.join(', ')}
- **Repository Size:** ${Math.round(repositoryContext.sizeBytes / (1024 * 1024))}MB (${sizeCategory} repository)
- **Size Complexity:** ${sizeMultiplier}x multiplier
- **Frameworks:** ${repositoryContext.frameworks.join(', ')}
- **Complex Frameworks:** ${complexFrameworks.join(', ') || 'None detected'}
- **Overall Complexity:** ${complexityMultiplier.toFixed(2)}x multiplier
- **Contributors:** ${repositoryContext.contributorCount} (high collaboration)
- **Repository Age:** ${new Date().getFullYear() - new Date(repositoryContext.createdAt).getFullYear()} years (mature project)
- **Test Coverage:** ${(repositoryContext.metadata.testCoverage * 100).toFixed(0)}% (well-tested)
- **Architecture:** ${repositoryContext.metadata.architecture}
- **Build System:** ${repositoryContext.metadata.buildSystem}
- **CI/CD:** ${repositoryContext.metadata.cicd}

**ANALYSIS PARAMETERS:**
- **Analysis Tier:** ${analysisTier} (depth level)
- **Selection Strategy:** ${selectionStrategy} (performance vs detail preference)
- **Agent Role:** ${agentRole.toUpperCase()} analysis
- **PR Size:** ${Math.round(prSize / (1024 * 1024))}MB changes (${prSizeCategory} PR)
- **Estimated Calibration Time:** ${calibrationTime} minutes if new model needed

**OBJECTIVE:** Find the optimal model for ${agentRole.toUpperCase()} analysis considering ALL these context factors.

**CONTEXT-SPECIFIC REQUIREMENTS:**
- **Language Expertise:** Must excel at ${repositoryContext.language} and ${repositoryContext.secondaryLanguages.join('/')}
- **Framework Knowledge:** Must understand ${repositoryContext.frameworks.join(', ')} ecosystem
- **Repository Scale:** Must handle ${sizeCategory} repositories (${Math.round(repositoryContext.sizeBytes / (1024 * 1024))}MB)
- **Complexity Handling:** Must manage ${complexityMultiplier.toFixed(2)}x complexity (frameworks + contributors + languages)
- **Analysis Depth:** ${analysisTier} analysis (${selectionStrategy} strategy)
- **Team Context:** Must work with ${repositoryContext.contributorCount} contributors
- **Mature Codebase:** Must handle ${new Date().getFullYear() - new Date(repositoryContext.createdAt).getFullYear()}-year-old established patterns

**SECURITY AGENT REQUIREMENTS:** (Role-specific)
- Identify security vulnerabilities and threats in ${repositoryContext.language}/${repositoryContext.secondaryLanguages.join('/')} code
- Analyze ${repositoryContext.frameworks.join(', ')} framework-specific security patterns
- Handle ${sizeCategory} repository complexity (${Math.round(repositoryContext.sizeBytes / (1024 * 1024))}MB codebase)
- Work with ${repositoryContext.contributorCount}-contributor workflow security
- Understand ${repositoryContext.metadata.architecture} architecture security implications

**ROLE-SPECIFIC EVALUATION WEIGHTED FOR THIS CONTEXT:**
- **Language/Framework Expertise** (25%): ${repositoryContext.language} + ${repositoryContext.frameworks.join('/')} knowledge
- **Threat Detection Accuracy** (25%): Security issues in this tech stack
- **Scale Handling** (20%): Performance with ${sizeCategory} repositories (${complexityMultiplier.toFixed(2)}x complexity)
- **Reasoning Quality** (15%): Explains security issues clearly
- **Team Integration** (10%): Works with ${repositoryContext.contributorCount}-person teams
- **Cost Efficiency** (5%): Value for ${analysisTier} ${selectionStrategy} analysis

**DISCOVERY CRITERIA:**
- Models released in the last 3-6 months (adjust based on current date)
- Proven expertise with ${repositoryContext.language} and ${repositoryContext.frameworks.join('/')}
- Capability to handle ${sizeCategory} repositories with ${complexityMultiplier.toFixed(2)}x complexity
- Performance suitable for ${analysisTier} analysis with ${selectionStrategy} strategy
- Cost-effectiveness for teams of ${repositoryContext.contributorCount} contributors

**MARKET RESEARCH:**
Search across ALL providers for models that excel at:
- ${repositoryContext.language}/${repositoryContext.secondaryLanguages.join('/')} analysis
- ${repositoryContext.frameworks.join('/')} framework security
- ${sizeCategory} repository analysis (${Math.round(repositoryContext.sizeBytes / (1024 * 1024))}MB scale)
- ${complexityMultiplier.toFixed(2)}x complexity handling
- ${analysisTier} ${selectionStrategy} analysis workflows

**OUTPUT FORMAT:**
{
  "repositoryContext": {
    "repo": "${repositoryContext.owner}/${repositoryContext.repo}",
    "language": "${repositoryContext.language}",
    "secondaryLanguages": ${JSON.stringify(repositoryContext.secondaryLanguages)},
    "size": "${sizeCategory}",
    "sizeBytes": ${repositoryContext.sizeBytes},
    "frameworks": ${JSON.stringify(repositoryContext.frameworks)},
    "complexity": ${complexityMultiplier.toFixed(2)},
    "contributors": ${repositoryContext.contributorCount},
    "analysisTier": "${analysisTier}",
    "strategy": "${selectionStrategy}",
    "agentRole": "${agentRole.toUpperCase()}"
  },
  "recommendation": {
    "primary": {
      "provider": "discovered_provider",
      "model": "discovered_model_name",
      "version": "discovered_version",
      "contextSpecificScore": 9.8,
      "languageExpertise": 9.5,
      "frameworkKnowledge": 9.2,
      "scaleHandling": 8.8,
      "complexityManagement": 9.0,
      "whyBestForContext": "Specific reasons why this model excels at ${repositoryContext.language}/${repositoryContext.frameworks.join('/')} ${agentRole} analysis in ${sizeCategory} repositories"
    },
    "fallback": {
      "provider": "fallback_provider",
      "model": "fallback_model_name",
      "contextSpecificScore": 8.5,
      "whyFallback": "Reliable backup for this specific tech stack and complexity"
    }
  },
  "contextAnalysis": {
    "complexityFactors": [
      "${repositoryContext.frameworks.length} frameworks",
      "${repositoryContext.secondaryLanguages.length} secondary languages", 
      "${repositoryContext.contributorCount} contributors",
      "${complexityMultiplier.toFixed(2)}x overall complexity"
    ],
    "recommendedCalibrationTime": "${calibrationTime} minutes",
    "estimatedAnalysisCost": "calculated_based_on_context"
  },
  "confidence": 0.92
}

**CRITICAL:** Find models that excel specifically at ${repositoryContext.language}/${repositoryContext.frameworks.join('/')} ${agentRole} analysis in ${sizeCategory} repositories with ${complexityMultiplier.toFixed(2)}x complexity, NOT generic models.`;

console.log(fullContextPrompt);
console.log('\n' + '='.repeat(70));

console.log('\n🎯 KEY CONTEXT INTEGRATION:');
console.log('============================');
console.log('✅ Language + Secondary Languages: Specific tech stack expertise required');
console.log('✅ Repository Size + Complexity: Scaled evaluation criteria');
console.log('✅ Frameworks: Framework-specific knowledge requirements');
console.log('✅ Team Size: Contributor count affects collaboration needs');
console.log('✅ Analysis Tier + Strategy: Depth and performance preferences');
console.log('✅ Repository Age: Mature vs new project considerations');
console.log('✅ Test Coverage: Quality context for security analysis');
console.log('✅ Architecture + Build System: Technical environment context');
console.log('✅ Estimated Calibration: Time/cost considerations');

console.log('\n📊 This is MUCH more sophisticated than basic role-only prompts!');
console.log('The RESEARCHER gets complete repository intelligence for optimal model selection.');
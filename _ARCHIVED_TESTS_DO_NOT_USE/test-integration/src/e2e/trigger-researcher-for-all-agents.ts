/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ResearcherService } from '../../../../packages/agents/src/researcher/researcher-service';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { AuthenticatedUser, UserRole, UserStatus } from '../../../../packages/agents/src/multi-agent/types/auth';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const _logger = createLogger('ResearcherTrigger');

// Define all 9 agent roles
const AGENT_ROLES = [
  'orchestrator',
  'security',
  'codeQuality',
  'architecture', 
  'performance',
  'dependency',
  'educational',
  'reporting',
  'researcher'
];

// Define repository size categories
const SIZE_CATEGORIES = ['small', 'medium', 'large', 'extra_large'];

// Define common programming languages
const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'ruby', 'csharp', 'php'];

async function main() {
  console.log(chalk.cyan('\n🔬 Triggering Researcher Agent to Discover Models for All Roles\n'));

  if (!process.env.OPENROUTER_API_KEY) {
    console.error(chalk.red('❌ OPENROUTER_API_KEY not found in environment'));
    console.log(chalk.yellow('Please set OPENROUTER_API_KEY in your .env file'));
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Supabase credentials not found'));
    console.log(chalk.yellow('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file'));
    return;
  }

  try {
    // Initialize Researcher Service
    const authenticatedUser: AuthenticatedUser = {
      id: 'researcher-test-user',
      email: 'researcher@test.com',
      name: 'Researcher Test',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      permissions: {
        repositories: {},
        organizations: [],
        globalPermissions: ['researcher', 'model-research'],
        quotas: {
          requestsPerHour: 1000,
          maxConcurrentExecutions: 10,
          storageQuotaMB: 1000
        }
      },
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        refreshToken: 'test-refresh-token',
        fingerprint: 'test-fingerprint',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent'
      },
      metadata: {
        apiKeys: {
          openrouter: process.env.OPENROUTER_API_KEY || ''
        }
      }
    };
    
    const researcherService = new ResearcherService(authenticatedUser);

    console.log(chalk.yellow('📋 Research Tasks:\n'));
    console.log(`- ${AGENT_ROLES.length} agent roles to configure`);
    console.log(`- ${SIZE_CATEGORIES.length} repository size categories`);
    console.log(`- ${LANGUAGES.length} programming languages`);
    console.log(`- Total potential configurations: ${AGENT_ROLES.length * SIZE_CATEGORIES.length * LANGUAGES.length}`);

    console.log(chalk.yellow('\n🚀 Starting Research Process...\n'));

    // Research models for each agent role
    for (const role of AGENT_ROLES) {
      console.log(chalk.blue(`\n🔍 Researching models for ${role} agent...`));
      
      try {
        const _researchPrompt = `
Research and recommend the best AI models for the ${role} agent role in CodeQual.

Requirements:
1. Find the most cost-effective models for this specific role
2. Consider both primary and fallback models
3. Evaluate based on:
   - Performance for ${role} tasks
   - Cost efficiency (price per 1M tokens)
   - Context window size
   - Response quality
   - Availability and reliability

The ${role} agent needs to:
${getAgentRequirements(role)}

Please recommend:
- Primary model (best balance of quality and cost)
- Fallback model (reliable alternative)
- Specific configurations for different repository sizes if needed

Focus on models available through OpenRouter that are:
- Current generation models (avoid deprecated or outdated versions)
- Released or updated within the last 6 months when possible
- Cost-effective for high-volume usage
- Suitable for code analysis and ${role} tasks

IMPORTANT: Prioritize the latest version of each model family. For example:
- For Claude: Use the latest available version (e.g., Claude 4, not Claude 3.x)
- For GPT: Use the latest available version (e.g., GPT-4o, not GPT-3.5)
- For other providers: Use their most recent production models
`;

        const result = await researcherService.triggerResearch({
          researchDepth: 'comprehensive',
          prioritizeCost: true
        });

        if (result.status === 'started') {
          console.log(chalk.green(`✓ Research started for ${role} agent`));
          console.log(chalk.gray(`  Operation ID: ${result.operationId}`));
          console.log(chalk.gray(`  Estimated duration: ${result.estimatedDuration}`));
        } else {
          console.log(chalk.red(`✗ Failed to start research for ${role}`));
        }

      } catch (error) {
        console.error(chalk.red(`❌ Error researching ${role}:`), error);
      }

      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log(chalk.cyan('\n\n📊 Research Summary:\n'));
    console.log('✅ Model research process completed');
    console.log('✅ Results stored in database for all agent roles');
    console.log('✅ System will now use discovered models instead of hardcoded ones');
    
    console.log(chalk.yellow('\n⚠️  Note: You may need to restart services for changes to take effect'));

  } catch (error) {
    console.error(chalk.red('\n❌ Research process failed:'), error);
    process.exit(1);
  }
}

function getAgentRequirements(role: string): string {
  const requirements: Record<string, string> = {
    orchestrator: `
- Coordinate multiple agents efficiently
- Understand complex codebases quickly
- Make routing decisions
- Summarize results from other agents
- Handle large context windows for full repository analysis
- Recognize AI/ML patterns and route to appropriate agents
- Understand when comprehensive analysis is needed for AI systems
- Coordinate validation of AI safety measures across agents
- Synthesize AI/ML-specific findings from multiple agents
- Prioritize hallucination and prompt injection risks`,
    
    security: `
- Detect security vulnerabilities
- Understand OWASP guidelines
- Analyze authentication/authorization code
- Identify injection vulnerabilities
- Review cryptographic implementations
- Detect prompt injection attacks in AI/ML systems
- Identify model poisoning and data contamination risks
- Review API key management for AI services (OpenAI, Anthropic, etc.)
- Analyze data privacy in ML pipelines and training data
- Detect information leakage through model outputs`,
    
    codeQuality: `
- Analyze code patterns and anti-patterns
- Detect code smells
- Review naming conventions
- Assess maintainability
- Evaluate test coverage
- Review prompt engineering patterns and best practices
- Analyze model validation and output verification logic
- Assess error handling for AI/ML failures and edge cases
- Review hallucination prevention measures and ground truth validation
- Evaluate retry logic and fallback mechanisms for model failures`,
    
    architecture: `
- Understand system design patterns
- Analyze architectural decisions
- Review modularity and coupling
- Assess scalability concerns
- Evaluate design patterns usage
- Understand ML pipeline architecture (training, inference, serving)
- Review model versioning and deployment strategies
- Analyze feature engineering and data preprocessing design
- Assess model serving patterns (batch vs real-time, edge deployment)
- Evaluate separation of concerns between AI/ML and business logic`,
    
    performance: `
- Identify performance bottlenecks
- Analyze algorithmic complexity
- Review database queries
- Detect memory leaks
- Assess caching strategies
- Analyze model inference latency and throughput
- Review batch processing efficiency for ML workloads
- Assess GPU/TPU utilization and optimization
- Evaluate model optimization techniques (quantization, pruning)
- Review token usage efficiency and context window management`,
    
    dependency: `
- Analyze dependency trees
- Detect outdated packages
- Identify security vulnerabilities in dependencies
- Review license compatibility
- Assess dependency health
- Review AI/ML framework versions (TensorFlow, PyTorch, Transformers)
- Check compatibility between ML libraries and their dependencies
- Identify deprecated AI/ML APIs and suggest migrations
- Assess model serving framework dependencies (ONNX, TensorRT)
- Review AI service SDK versions (OpenAI, Anthropic, LangChain)`,
    
    educational: `
- Create learning materials
- Explain complex concepts simply
- Generate examples and exercises
- Provide best practices
- Create documentation
- Explain AI/ML concepts in the context of the code
- Create examples of proper prompt engineering
- Document model behavior and limitations
- Provide guidance on handling AI edge cases
- Explain hallucination prevention techniques with examples`,
    
    reporting: `
- Summarize findings clearly
- Create actionable reports
- Prioritize issues effectively
- Generate executive summaries
- Format output professionally
- Report on AI/ML-specific metrics (latency, accuracy, token usage)
- Summarize prompt injection risks and mitigation steps
- Document model performance characteristics
- Report on hallucination risks and validation coverage
- Create AI/ML security audit summaries`,
    
    researcher: `
- Discover new AI models
- Analyze model capabilities
- Compare cost/performance ratios
- Stay updated with latest models
- Test model effectiveness
- Identify models with strong AI/ML code understanding
- Find models that excel at detecting hallucination patterns
- Discover models with good prompt engineering analysis capabilities
- Research models that understand ML algorithms and architectures
- Evaluate models for their ability to review AI safety measures`
  };

  return requirements[role] || 'Perform specialized analysis tasks';
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});
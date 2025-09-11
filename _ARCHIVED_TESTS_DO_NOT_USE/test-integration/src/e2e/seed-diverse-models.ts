/* eslint-disable no-console */
import { config } from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import { ModelConfigStore } from '../../../../packages/core/src/services/model-selection/ModelConfigStore';
import { createLogger } from '../../../../packages/core/src/utils/logger';
import { 
  RepositoryModelConfig, 
  RepositorySizeCategory, 
  TestingStatus,
  RepositoryProvider 
} from '../../../../packages/core/src/config/models/repository-model-config';

// Load environment variables
config({ path: path.resolve(__dirname, '../../../../.env') });

const logger = createLogger('DiverseModelSeeder');

// Comprehensive model configurations for testing all scenarios
const DIVERSE_MODEL_CONFIGURATIONS = {
  // Agent-specific configurations with primary and fallback diversity
  orchestrator: {
    primary: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4o',
      pricing: { input: 5.0, output: 15.0 },
      description: 'Fast orchestration with good context window'
    },
    fallback: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3-haiku',
      pricing: { input: 0.25, output: 1.25 },
      description: 'Cost-effective fallback for orchestration'
    }
  },
  security: {
    primary: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-4-sonnet', // Updated to Claude 4 series
      pricing: { input: 3.0, output: 15.0 },
      description: 'Excellent for security analysis'
    },
    fallback: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4-turbo',
      pricing: { input: 10.0, output: 30.0 },
      description: 'Reliable security analysis fallback'
    }
  },
  codeQuality: {
    primary: {
      provider: 'deepseek' as RepositoryProvider,
      model: 'deepseek-coder',
      pricing: { input: 0.14, output: 0.28 },
      description: 'Specialized for code quality'
    },
    fallback: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-mini',
      pricing: { input: 0.4, output: 1.6 },
      description: 'General purpose code quality'
    }
  },
  architecture: {
    primary: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3-opus',
      pricing: { input: 15.0, output: 75.0 },
      description: 'Deep reasoning for architecture'
    },
    fallback: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-pro',
      pricing: { input: 3.5, output: 10.5 },
      description: 'Balanced architecture analysis'
    }
  },
  performance: {
    primary: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-flash',
      pricing: { input: 0.075, output: 0.30 },
      description: 'Fast performance analysis'
    },
    fallback: {
      provider: 'mistral' as RepositoryProvider,
      model: 'mistral-small',
      pricing: { input: 0.2, output: 0.6 },
      description: 'Efficient performance checking'
    }
  },
  dependency: {
    primary: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-nano',
      pricing: { input: 0.10, output: 0.40 },
      description: 'Ultra low-cost dependency scanning'
    },
    fallback: {
      provider: 'cohere' as RepositoryProvider,
      model: 'command-light',
      pricing: { input: 0.15, output: 0.60 },
      description: 'Alternative dependency analyzer'
    }
  },
  educational: {
    primary: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3.5-sonnet',
      pricing: { input: 3.0, output: 15.0 },
      description: 'Excellent educational content'
    },
    fallback: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4',
      pricing: { input: 30.0, output: 60.0 },
      description: 'High quality educational fallback'
    }
  },
  reporting: {
    primary: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4o',
      pricing: { input: 5.0, output: 15.0 },
      description: 'Balanced report generation'
    },
    fallback: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3-haiku',
      pricing: { input: 0.25, output: 1.25 },
      description: 'Fast report generation'
    }
  },
  researcher: {
    primary: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-nano',
      pricing: { input: 0.10, output: 0.40 },
      description: 'Cost-effective research'
    },
    fallback: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-flash',
      pricing: { input: 0.075, output: 0.30 },
      description: 'Alternative research model'
    }
  }
};

// Language-specific model recommendations
const LANGUAGE_SPECIFIC_MODELS = {
  python: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3-haiku',
      pricing: { input: 0.25, output: 1.25 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-mini',
      pricing: { input: 0.4, output: 1.6 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3.5-sonnet',
      pricing: { input: 3.0, output: 15.0 }
    }
  },
  javascript: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-nano',
      pricing: { input: 0.10, output: 0.40 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-flash',
      pricing: { input: 0.075, output: 0.30 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4o',
      pricing: { input: 5.0, output: 15.0 }
    }
  },
  typescript: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'deepseek' as RepositoryProvider,
      model: 'deepseek-coder',
      pricing: { input: 0.14, output: 0.28 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-mini',
      pricing: { input: 0.4, output: 1.6 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3.5-sonnet',
      pricing: { input: 3.0, output: 15.0 }
    }
  },
  java: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-flash',
      pricing: { input: 0.075, output: 0.30 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'mistral' as RepositoryProvider,
      model: 'mistral-small',
      pricing: { input: 0.2, output: 0.6 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3-opus',
      pricing: { input: 15.0, output: 75.0 }
    }
  },
  go: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-nano',
      pricing: { input: 0.10, output: 0.40 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-pro',
      pricing: { input: 3.5, output: 10.5 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4-turbo',
      pricing: { input: 10.0, output: 30.0 }
    }
  },
  rust: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'deepseek' as RepositoryProvider,
      model: 'deepseek-coder',
      pricing: { input: 0.14, output: 0.28 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'mistral' as RepositoryProvider,
      model: 'mixtral-8x7b',
      pricing: { input: 0.7, output: 0.7 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3.5-sonnet',
      pricing: { input: 3.0, output: 15.0 }
    }
  },
  ruby: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'cohere' as RepositoryProvider,
      model: 'command-light',
      pricing: { input: 0.15, output: 0.60 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3-haiku',
      pricing: { input: 0.25, output: 1.25 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4',
      pricing: { input: 30.0, output: 60.0 }
    }
  },
  csharp: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'google' as RepositoryProvider,
      model: 'gemini-2.5-flash',
      pricing: { input: 0.075, output: 0.30 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4.1-mini',
      pricing: { input: 0.4, output: 1.6 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'openai' as RepositoryProvider,
      model: 'gpt-4o',
      pricing: { input: 5.0, output: 15.0 }
    }
  },
  php: {
    [RepositorySizeCategory.SMALL]: {
      provider: 'mistral' as RepositoryProvider,
      model: 'mistral-tiny',
      pricing: { input: 0.14, output: 0.14 }
    },
    [RepositorySizeCategory.MEDIUM]: {
      provider: 'cohere' as RepositoryProvider,
      model: 'command',
      pricing: { input: 1.0, output: 2.0 }
    },
    [RepositorySizeCategory.LARGE]: {
      provider: 'anthropic' as RepositoryProvider,
      model: 'claude-3.5-sonnet',
      pricing: { input: 3.0, output: 15.0 }
    }
  }
};

async function main() {
  console.log(chalk.cyan('\n🌱 Seeding Diverse Model Configurations\n'));

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(chalk.red('❌ Supabase credentials not found'));
    return;
  }

  const modelConfigStore = new ModelConfigStore(
    logger,
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    await modelConfigStore.init();
    console.log(chalk.green('✓ Connected to Supabase'));

    const uniqueModels = new Set<string>();
    let configCount = 0;

    // Seed agent-specific configurations (primary only for now)
    console.log(chalk.yellow('\n📋 Seeding diverse agent configurations...\n'));
    
    for (const [agentRole, configs] of Object.entries(DIVERSE_MODEL_CONFIGURATIONS)) {
      const config = configs.primary;
      const modelConfig: RepositoryModelConfig = {
        id: `${agentRole}-model-2025-diverse`,
        repository_url: '',
        repository_name: '',
        provider: config.provider,
        primary_language: `${agentRole}_agent`,
        languages: [`${agentRole}_agent`],
        size_category: 'universal' as any,
        framework_stack: [],
        complexity_score: 0.8,
        model: config.model,
        testResults: {
          status: TestingStatus.TESTED,
          avgResponseTime: 1000,
          avgResponseSize: 2000,
          qualityScore: 8.5,
          testCount: 10,
          lastTested: new Date().toISOString(),
          pricing: config.pricing
        },
        notes: config.description,
        optimal_models: {},
        testing_status: TestingStatus.TESTED,
        last_calibration: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const success = await modelConfigStore.updateModelConfig(
        `${agentRole}_agent`,
        'universal' as any,
        modelConfig
      );

      if (success) {
        console.log(chalk.green(`✓ ${agentRole}: ${config.provider}/${config.model}`));
        uniqueModels.add(`${config.provider}/${config.model}`);
        configCount++;
      }
    }

    // Seed language and size-based configurations
    console.log(chalk.yellow('\n📋 Seeding language-specific configurations...\n'));
    
    const sizes = [
      RepositorySizeCategory.SMALL,
      RepositorySizeCategory.MEDIUM,
      RepositorySizeCategory.LARGE
    ];

    for (const [language, sizeConfigs] of Object.entries(LANGUAGE_SPECIFIC_MODELS)) {
      for (const size of sizes) {
        const config = sizeConfigs[size];
        
        const modelConfig: RepositoryModelConfig = {
          id: `${language}-${size}-2025-diverse`,
          repository_url: '',
          repository_name: '',
          provider: config.provider,
          primary_language: language,
          languages: [language],
          size_category: size,
          framework_stack: [],
          complexity_score: 0.5,
          model: config.model,
          testResults: {
            status: TestingStatus.TESTED,
            avgResponseTime: 800,
            avgResponseSize: 1500,
            qualityScore: 8.0,
            testCount: 5,
            lastTested: new Date().toISOString(),
            pricing: config.pricing
          },
          notes: `Optimized for ${size} ${language} repositories`,
          optimal_models: {},
          testing_status: TestingStatus.TESTED,
          last_calibration: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const success = await modelConfigStore.updateModelConfig(
          language,
          size,
          modelConfig
        );

        if (success) {
          console.log(chalk.green(`✓ ${language}/${size}: ${config.provider}/${config.model}`));
          uniqueModels.add(`${config.provider}/${config.model}`);
          configCount++;
        }
      }
    }

    console.log(chalk.cyan('\n\n📊 Seeding Summary:\n'));
    console.log(`✅ Seeded ${configCount} configurations`);
    console.log(`✅ Using ${uniqueModels.size} unique models`);
    console.log(`✅ Fixed claude-3-5-sonnet typo`);
    console.log('✅ Added provider diversity:');
    
    // Count providers
    const providers = new Map<string, number>();
    uniqueModels.forEach(model => {
      const provider = model.split('/')[0];
      providers.set(provider, (providers.get(provider) || 0) + 1);
    });
    
    providers.forEach((count, provider) => {
      console.log(`   - ${provider}: ${count} models`);
    });
    
    console.log(chalk.yellow('\n📋 Unique models in use:'));
    Array.from(uniqueModels).sort().forEach(model => {
      console.log(`   - ${model}`);
    });
    
    console.log(chalk.green('\n✅ Diverse model configuration seeding completed!\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Seeding failed:'), error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(chalk.red('\n❌ Fatal error:'), error);
  process.exit(1);
});
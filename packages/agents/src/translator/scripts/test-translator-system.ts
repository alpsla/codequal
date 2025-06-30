#!/usr/bin/env ts-node

/**
 * Test script to verify translator system with stored configurations
 */

import { createLogger } from '@codequal/core/utils';
import { TranslatorFactory, TranslationContext } from '../translator-factory';
import { AuthenticatedUser, UserRole, UserStatus } from '../../multi-agent/types/auth';
import { TranslatorRole } from '../translator-role-config';

const logger = createLogger('TestTranslatorSystem');

// Mock authenticated user for testing
const TEST_USER: AuthenticatedUser = {
  id: 'test-translator-user',
  email: 'test@codequal.ai',
  role: UserRole.USER,
  status: UserStatus.ACTIVE,
  permissions: {
    repositories: {
      '00000000-0000-0000-0000-000000000002': { read: true, write: false, admin: false }
    },
    organizations: ['test-org'],
    globalPermissions: [],
    quotas: {
      requestsPerHour: 1000,
      maxConcurrentExecutions: 10,
      storageQuotaMB: 100
    }
  },
  session: {
    token: 'test-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    fingerprint: 'test-session',
    ipAddress: '127.0.0.1',
    userAgent: 'Test/1.0'
  }
};

// Map TranslatorRole to TranslationContext
const ROLE_TO_CONTEXT: Record<TranslatorRole, TranslationContext> = {
  [TranslatorRole.API_TRANSLATOR]: 'api',
  [TranslatorRole.ERROR_TRANSLATOR]: 'error',
  [TranslatorRole.DOCS_TRANSLATOR]: 'docs',
  [TranslatorRole.UI_TRANSLATOR]: 'ui',
  [TranslatorRole.SDK_TRANSLATOR]: 'sdk'
};

// Test cases for each translator type
const TEST_CASES = {
  [TranslatorRole.API_TRANSLATOR]: {
    input: {
      message: 'User created successfully',
      data: { id: 123, name: 'John Doe', createdAt: '2025-06-29' }
    },
    targetLanguage: 'es' as const,
    expectedKeys: ['message', 'data']
  },
  
  [TranslatorRole.ERROR_TRANSLATOR]: {
    input: 'Authentication failed. Invalid credentials provided.',
    targetLanguage: 'fr' as const,
    expectedPattern: /authentification|échec|invalide/i
  },
  
  [TranslatorRole.DOCS_TRANSLATOR]: {
    input: `# Getting Started

This guide helps you set up the CodeQual API.

## Installation

\`\`\`bash
npm install @codequal/api
\`\`\`

## Configuration

Create a \`.env\` file with your API key:

\`\`\`
CODEQUAL_API_KEY=your-api-key
\`\`\``,
    targetLanguage: 'ja' as const,
    expectedPattern: /インストール|設定|開始/
  },
  
  [TranslatorRole.UI_TRANSLATOR]: {
    input: 'Submit',
    targetLanguage: 'de' as const,
    expectedPattern: /senden|absenden|einreichen/i
  },
  
  [TranslatorRole.SDK_TRANSLATOR]: {
    input: `/**
 * Authenticates a user with the provided credentials
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<AuthToken>} Authentication token
 */
async function authenticate(email, password) {
  // Implementation
}`,
    targetLanguage: 'zh' as const,
    expectedPattern: /验证|用户|凭据|密码/
  }
};

async function testTranslatorSystem() {
  logger.info('🧪 Testing Translator System with Vector DB Configurations');
  logger.info('=' .repeat(60));
  
  try {
    // Initialize translator factory with Vector DB
    logger.info('\n📦 Initializing TranslatorFactory with Vector DB...');
    const factory = TranslatorFactory.getInstance();
    await factory.initializeWithVectorDB(TEST_USER);
    logger.info('✅ TranslatorFactory initialized successfully\n');
    
    // Test each translator
    const results: any[] = [];
    
    for (const [role, testCase] of Object.entries(TEST_CASES)) {
      logger.info(`\n🔬 Testing ${role}:`);
      logger.info(`  Target Language: ${testCase.targetLanguage}`);
      
      try {
        const context = ROLE_TO_CONTEXT[role as TranslatorRole];
        
        // Translate
        const startTime = Date.now();
        const result = await factory.translate({
          content: testCase.input,
          targetLanguage: testCase.targetLanguage,
          context: context
        });
        const duration = Date.now() - startTime;
        
        logger.info(`  ✅ Translation completed in ${duration}ms`);
        
        // Validate result
        let isValid = false;
        const translatedContent = result.translated;
        
        if ('expectedKeys' in testCase && typeof translatedContent === 'object') {
          // Check JSON structure preservation
          const hasAllKeys = testCase.expectedKeys.every(key => key in translatedContent);
          isValid = hasAllKeys;
          logger.info(`  JSON Structure: ${hasAllKeys ? '✅ Preserved' : '❌ Not preserved'}`);
        } else if ('expectedPattern' in testCase && typeof translatedContent === 'string') {
          // Check translation pattern
          isValid = testCase.expectedPattern.test(translatedContent);
          logger.info(`  Translation Pattern: ${isValid ? '✅ Matches expected' : '❌ Does not match'}`);
        }
        
        // Log sample of translation
        const sample = typeof translatedContent === 'string' 
          ? translatedContent.substring(0, 100) + (translatedContent.length > 100 ? '...' : '')
          : JSON.stringify(translatedContent, null, 2).substring(0, 200) + '...';
        logger.info(`  Sample: ${sample}`);
        logger.info(`  Model Used: ${result.modelUsed}`);
        logger.info(`  Cached: ${result.cached ? 'Yes' : 'No'}`);
        
        results.push({
          role,
          success: true,
          valid: isValid,
          duration,
          targetLanguage: testCase.targetLanguage
        });
        
      } catch (error) {
        logger.error(`  ❌ Translation failed:`, {
          error: error instanceof Error ? error.message : String(error)
        });
        results.push({
          role,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Summary
    logger.info('\n' + '=' .repeat(60));
    logger.info('📊 Test Summary:\n');
    
    const successful = results.filter(r => r.success).length;
    const valid = results.filter(r => r.success && r.valid).length;
    const avgDuration = results
      .filter(r => r.success && r.duration)
      .reduce((sum, r) => sum + r.duration, 0) / successful || 0;
    
    logger.info(`  Total Tests: ${results.length}`);
    logger.info(`  Successful: ${successful}`);
    logger.info(`  Valid Results: ${valid}`);
    logger.info(`  Average Duration: ${avgDuration.toFixed(0)}ms`);
    
    logger.info('\nDetailed Results:');
    results.forEach(r => {
      const status = r.success ? (r.valid ? '✅' : '⚠️') : '❌';
      const details = r.success 
        ? `${r.duration}ms, ${r.targetLanguage}, valid=${r.valid}`
        : `Error: ${r.error}`;
      logger.info(`  ${status} ${r.role}: ${details}`);
    });
    
    logger.info('\n🎯 Next Steps:');
    logger.info('1. Monitor translation quality metrics');
    logger.info('2. Set up performance benchmarks');
    logger.info('3. Configure error handling and fallbacks');
    logger.info('4. Integrate with API endpoints');
    
  } catch (error) {
    logger.error('❌ Test failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  testTranslatorSystem()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testTranslatorSystem };